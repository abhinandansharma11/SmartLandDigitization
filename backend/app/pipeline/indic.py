"""Indic OCR engines (Bodhan IndicOCR) + cross-check against Tesseract.

OCR_ENGINE selects the primary reader:
  tesseract     – Tesseract only (default, offline)
  bodhan_api    – Bodhan hosted API (OpenAI-compatible). Needs BODHAN_API_KEY and BODHAN_MODEL.
  indic_server  – our ocr_server/ running IndicOCR on a GPU box (e.g. free Colab). Needs INDIC_OCR_URL.
  indic_local   – IndicOCR in this process (`pip install` per the model card; needs an NVIDIA GPU).

Whatever the primary engine, Tesseract also reads the page. The Indic engine's text is used, and each
word's confidence comes from whether the two independent engines agree:
  both read the same word      → high confidence (auto-approvable)
  close but not identical       → medium
  only the Indic engine read it → below threshold → human review
Tesseract also supplies word positions when the Indic engine returns only text (hosted API).
If the Indic engine fails, the page falls back to Tesseract and the document is marked accordingly.
"""
import base64
import functools
import html
import logging
import os
import re

import cv2
import httpx
import numpy as np
from rapidfuzz import fuzz

from .. import config  # noqa: F401  (loads backend/.env before the settings below are read)
from .textutil import detect_script, nfc, norm_digits

log = logging.getLogger("indic-ocr")

ENGINE = os.getenv("OCR_ENGINE", "tesseract").lower()
BODHAN_URL = os.getenv("BODHAN_API_URL", "https://api.bodhan.ai/v1/chat/completions")
BODHAN_KEY = os.getenv("BODHAN_API_KEY")
BODHAN_MODEL = os.getenv("BODHAN_MODEL")            # copy the OCR model id from console.bodhan.ai/api-docs
INDIC_OCR_URL = os.getenv("INDIC_OCR_URL")          # e.g. https://xxxx.trycloudflare.com
INDIC_OCR_TOKEN = os.getenv("INDIC_OCR_TOKEN")
INDIC_REPO = os.getenv("INDIC_OCR_REPO", "bodhan-ai/indic-ocr")
PROMPT = ("Transcribe this scanned Indian land record page exactly as written, in reading order. "
          "Keep the original script and numerals. Output tables as Markdown tables.")


class EngineError(RuntimeError):
    pass


def engine_name() -> str:
    return {"bodhan_api": "bodhan-api", "indic_server": "indicocr-server", "indic_local": "indicocr-local"}.get(ENGINE, "tesseract")


def engine_status() -> dict:
    missing = []
    if ENGINE == "bodhan_api":
        missing += [k for k, v in (("BODHAN_API_KEY", BODHAN_KEY), ("BODHAN_MODEL", BODHAN_MODEL)) if not v]
    if ENGINE == "indic_server" and not INDIC_OCR_URL:
        missing.append("INDIC_OCR_URL")
    return {"engine": ENGINE, "ready": not missing, "missing": missing}


# ------------------------------------------------------------------ text → lines
def _clean_line(s: str) -> str:
    s = html.unescape(s)
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"^\s*#{1,6}\s*", "", s)
    s = re.sub(r"[*_`]{1,3}", "", s)
    s = s.replace("|", " ")
    return nfc(re.sub(r"\s+", " ", s).strip())


def text_to_lines(text: str) -> list[str]:
    """Markdown / HTML-table output → plain text lines (one table row per line)."""
    text = text or ""
    text = re.sub(r"(?is)</tr\s*>", "\n", text)
    text = re.sub(r"(?is)<br\s*/?>", "\n", text)
    text = re.sub(r"(?is)</t[dh]\s*>", " ", text)
    out = []
    for raw in text.splitlines():
        if re.fullmatch(r"\s*\|?\s*:?-{2,}.*", raw):       # markdown table separator
            continue
        ln = _clean_line(raw)
        if ln:
            out.append(ln)
    return out


# ------------------------------------------------------------------ engines
def _png_b64(img: np.ndarray) -> str:
    ok, buf = cv2.imencode(".png", img)
    if not ok:
        raise EngineError("PNG encode failed")
    return base64.b64encode(buf.tobytes()).decode()


def _bodhan_api(img: np.ndarray) -> list[dict]:
    if not (BODHAN_KEY and BODHAN_MODEL):
        raise EngineError("Set BODHAN_API_KEY and BODHAN_MODEL (model id from console.bodhan.ai/api-docs)")
    body = {"model": BODHAN_MODEL, "temperature": 0,
            "messages": [{"role": "user", "content": [
                {"type": "image_url", "image_url": {"url": "data:image/png;base64," + _png_b64(img)}},
                {"type": "text", "text": PROMPT}]}]}
    try:
        r = httpx.post(BODHAN_URL, json=body, headers={"Authorization": f"Bearer {BODHAN_KEY}"}, timeout=120)
    except httpx.HTTPError as e:
        raise EngineError(f"Bodhan API unreachable: {e}") from e
    if r.status_code != 200:
        raise EngineError(f"Bodhan API {r.status_code}: {r.text[:300]}")
    text = r.json()["choices"][0]["message"]["content"]
    return [{"text": t, "bbox": None} for t in text_to_lines(text)]


def blocks_to_lines(blocks: list[dict]) -> list[dict]:
    """IndicOCR parse() blocks → lines with approximate boxes (block box split evenly by line)."""
    out = []
    for b in sorted(blocks, key=lambda b: b.get("order", 0)):
        lines = text_to_lines(b.get("text", ""))
        if not lines:
            continue
        x0, y0, x1, y1 = b.get("bbox_xyxy") or [0, 0, 0, 0]
        h = (y1 - y0) / len(lines)
        for i, t in enumerate(lines):
            out.append({"text": t, "bbox": [int(x0), int(y0 + i * h), int(x1 - x0), int(max(h, 1))]})
    return out


def _indic_server(img: np.ndarray) -> list[dict]:
    if not INDIC_OCR_URL:
        raise EngineError("Set INDIC_OCR_URL to the address printed by ocr_server")
    ok, buf = cv2.imencode(".png", img)
    try:
        r = httpx.post(INDIC_OCR_URL.rstrip("/") + "/parse", files={"file": ("page.png", buf.tobytes(), "image/png")},
                       headers={"x-token": INDIC_OCR_TOKEN} if INDIC_OCR_TOKEN else {}, timeout=180)
    except httpx.HTTPError as e:
        raise EngineError(f"IndicOCR server unreachable: {e}") from e
    if r.status_code != 200:
        raise EngineError(f"IndicOCR server {r.status_code}: {r.text[:300]}")
    return blocks_to_lines(r.json().get("blocks", []))


@functools.lru_cache
def _local_parser():
    from huggingface_hub import snapshot_download
    from indic_ocr import IndicOCR           # installed from the model repo's install.sh
    return IndicOCR.from_pretrained(snapshot_download(INDIC_REPO), table_format="markdown")


def _indic_local(img: np.ndarray) -> list[dict]:
    import tempfile
    try:
        parser = _local_parser()
    except Exception as e:  # noqa: BLE001
        raise EngineError(f"IndicOCR not installed / no GPU: {e}") from e
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as fh:
        cv2.imencode(".png", img)[1].tofile(fh.name)
        path = fh.name
    try:
        return blocks_to_lines(parser.parse(path).get("blocks", []))
    finally:
        os.unlink(path)


def read_indic(img: np.ndarray) -> list[dict]:
    fn = {"bodhan_api": _bodhan_api, "indic_server": _indic_server, "indic_local": _indic_local}[ENGINE]
    return fn(img)


# ------------------------------------------------------------------ merge with Tesseract
def _norm(w: str) -> str:
    return re.sub(r"[\s:;,.।|()\-\u200c\u200d]", "", norm_digits(nfc(w)))


def _word_conf(word: str, tess_words: list[dict]) -> tuple[float, list[int] | None]:
    """Agreement-based confidence for one Indic word + the box of the best matching Tesseract word."""
    n = _norm(word)
    best, box = 0.0, None
    for tw in tess_words:
        s = 100.0 if n and n == _norm(tw["text"]) else fuzz.ratio(n, _norm(tw["text"]))
        if s > best:
            best, box = s, tw["bbox"]
    if best == 100:
        return 97.0, box            # two independent engines agree exactly
    if best >= 80:
        return 84.0, box            # near agreement (one character apart)
    return 70.0, None               # engines disagree → reviewer decides


def merge(indic_lines: list[dict], tess_lines: list[dict]) -> list[dict]:
    """Use Indic text; borrow positions from Tesseract; confidence = cross-engine agreement.

    Both engines emit lines in reading order, so lines are aligned monotonically: each Indic line is
    matched to the most similar Tesseract line among the next few unmatched ones."""
    tess_lines = sorted(tess_lines, key=lambda l: (l["bbox"][1] // 12, l["bbox"][0]))
    out, pos, prev_box = [], 0, None
    for il in indic_lines:
        best_i, best_s = None, 0.0
        for i in range(pos, min(pos + 6, len(tess_lines))):
            s = fuzz.token_set_ratio(_norm_line(il["text"]), _norm_line(tess_lines[i]["text"]))
            s -= (i - pos) * 3                      # prefer the nearest line in reading order
            if s > best_s:
                best_i, best_s = i, s
        tl = None
        if best_i is not None and best_s >= 50:
            tl, pos = tess_lines[best_i], best_i + 1
        if tl:
            line_box = tl["bbox"]
        elif prev_box:                               # unmatched: place just below the previous line
            line_box = [prev_box[0], prev_box[1] + prev_box[3] + 6, prev_box[2], prev_box[3]]
        else:
            line_box = il["bbox"] or [0, 0, 0, 0]
        prev_box = line_box
        toks = il["text"].split()
        total = sum(len(t) for t in toks) or 1
        words, cx = [], line_box[0]
        for t in toks:
            w = int(line_box[2] * len(t) / total)
            conf, box = _word_conf(t, tl["words"]) if tl else (72.0, None)
            words.append({"text": t, "conf": conf, "bbox": box or [int(cx), line_box[1], w, line_box[3]]})
            cx += w
        if not words:
            continue
        out.append({"text": il["text"], "words": words, "conf": round(sum(w["conf"] for w in words) / len(words), 1),
                    "bbox": line_box, "script": detect_script(il["text"]), "engine": engine_name(),
                    "handwriting": False, "tesseract_text": tl["text"] if tl else None})
    return out


def _norm_line(s: str) -> str:
    return " ".join(_norm(w) for w in s.split())
