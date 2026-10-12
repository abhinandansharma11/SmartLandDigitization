"""Stage 3: layout analysis + OCR routing.

* Ruling lines of register tables are detected (layout) and removed so they don't corrupt OCR.
* Every line gets a script ID; lines in a script other than the page default are re-read with
  the matching Tesseract language pack if it is installed.
* Lines that look handwritten (very low confidence) are sent to the handwriting (HTR) engine when
  one is configured via HTR_MODEL; otherwise they are marked `handwriting` and their confidence
  is capped so the fields they feed always go to human review.
"""
import functools
import logging
import statistics

import cv2
import numpy as np
import pytesseract

from ..config import HTR_MODEL, OCR_LANGS, TESSERACT_CMD
from .textutil import detect_script, nfc

log = logging.getLogger("ocr")

if TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

SCRIPT_TO_TESS = {"Devanagari": "hin", "Bengali": "ben", "Gurmukhi": "pan", "Gujarati": "guj",
                  "Odia": "ori", "Tamil": "tam", "Telugu": "tel", "Kannada": "kan",
                  "Malayalam": "mal", "Arabic": "urd", "Latin": "eng"}


@functools.lru_cache
def available_langs() -> set[str]:
    try:
        return set(pytesseract.get_languages(config=""))
    except Exception:
        return set()


def engine_version(lang: str | None = None) -> str:
    try:
        return f"tesseract-{pytesseract.get_tesseract_version()}-{lang or OCR_LANGS}"
    except Exception:
        return "tesseract-unavailable"


# ------------------------------------------------------------------ layout
def detect_layout(bw: np.ndarray) -> tuple[np.ndarray, list[dict]]:
    """Find table ruling lines, return an image with them removed + table regions."""
    inv = 255 - bw
    h, w = bw.shape
    horiz = cv2.morphologyEx(inv, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (max(w // 25, 30), 1)))
    vert = cv2.morphologyEx(inv, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(h // 30, 30))))
    grid = cv2.add(horiz, vert)
    regions = []
    cnts, _ = cv2.findContours(cv2.dilate(grid, np.ones((5, 5), np.uint8)), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for c in cnts:
        x, y, cw, ch = cv2.boundingRect(c)
        if cw > w * 0.3 and ch > 40:
            regions.append({"type": "table", "bbox": [int(x), int(y), int(cw), int(ch)]})
    cleaned = cv2.bitwise_or(bw, cv2.dilate(grid, np.ones((3, 3), np.uint8)))
    return cleaned, regions


# ------------------------------------------------------------------ OCR
def _tess_lines(img: np.ndarray, lang: str, psm: int = 6) -> list[dict]:
    d = pytesseract.image_to_data(img, lang=lang, config=f"--psm {psm} --oem 1",
                                  output_type=pytesseract.Output.DICT)
    lines: dict[tuple, dict] = {}
    for i, word in enumerate(d["text"]):
        word = (word or "").strip()
        conf = float(d["conf"][i])
        if not word or conf < 0:
            continue
        key = (d["block_num"][i], d["par_num"][i], d["line_num"][i])
        ln = lines.setdefault(key, {"words": []})
        ln["words"].append({"text": nfc(word), "conf": conf,
                            "bbox": [d["left"][i], d["top"][i], d["width"][i], d["height"][i]]})
    out = []
    for ln in lines.values():
        ws = ln["words"]
        x0 = min(w["bbox"][0] for w in ws); y0 = min(w["bbox"][1] for w in ws)
        x1 = max(w["bbox"][0] + w["bbox"][2] for w in ws); y1 = max(w["bbox"][1] + w["bbox"][3] for w in ws)
        out.append({"text": " ".join(w["text"] for w in ws), "words": ws,
                    "conf": round(statistics.mean(w["conf"] for w in ws), 1),
                    "bbox": [x0, y0, x1 - x0, y1 - y0]})
    out.sort(key=lambda l: (l["bbox"][1] // 12, l["bbox"][0]))
    return out


def _htr(crop: np.ndarray) -> tuple[str, float] | None:
    """Optional TrOCR-style handwriting recogniser. Returns (text, confidence 0-100)."""
    if not HTR_MODEL:
        return None
    try:
        from .htr import recognise           # heavy import only when configured
        return recognise(crop)
    except Exception:
        return None


def ocr_page(bw: np.ndarray, lang: str | None = None) -> tuple[list[dict], list[dict], str]:
    """Returns (lines, layout regions, engine actually used). `lang` = Tesseract language(s) for the page."""
    lines, regions = _tesseract_page(bw, lang or OCR_LANGS)
    from . import indic
    if indic.ENGINE == "tesseract":
        return lines, regions, "tesseract"
    try:
        merged = indic.merge(indic.read_indic(bw), lines)
        if merged:
            return merged, regions, indic.engine_name()
        log.warning("Indic engine returned no text — using Tesseract")
    except indic.EngineError as e:
        log.warning("Indic engine failed, falling back to Tesseract: %s", e)
    return lines, regions, "tesseract-fallback"


def _tesseract_page(bw: np.ndarray, lang: str) -> tuple[list[dict], list[dict]]:
    cleaned, regions = detect_layout(bw)
    langs_ok = available_langs()
    missing = [l for l in lang.split("+") if langs_ok and l not in langs_ok]
    if missing:
        raise RuntimeError(f"Tesseract language pack(s) {missing} not installed — copy *.traineddata into backend/tessdata")
    lines = _tess_lines(cleaned, lang)
    langs = available_langs()
    for ln in lines:
        ln["script"] = detect_script(ln["text"])
        ln["engine"] = "tesseract"
        ln["handwriting"] = False
        x, y, w, h = ln["bbox"]
        crop = cleaned[max(y - 4, 0): y + h + 4, max(x - 4, 0): x + w + 4]
        # script routing: re-read with the language pack that matches this line
        tl = SCRIPT_TO_TESS.get(ln["script"])
        if tl and tl not in lang.split("+") and tl in langs and crop.size:
            alt = _tess_lines(crop, tl, psm=7)
            if alt:
                ln.update(text=" ".join(a["text"] for a in alt), conf=alt[0]["conf"], engine=f"tesseract-{tl}")
        # handwriting heuristic: a long line with very low confidence
        if ln["conf"] < 45 and len(ln["text"]) > 4:
            ln["handwriting"] = True
            res = _htr(crop) if crop.size else None
            if res:
                ln["text"], ln["conf"] = res
                ln["engine"] = "htr"
            else:
                ln["conf"] = min(ln["conf"], 40.0)
    return lines, regions


def ocr_region(bw: np.ndarray, psm: int = 7, whitelist: str | None = None, lang: str = "eng") -> tuple[str, float]:
    cfg = f"--psm {psm} --oem 1"
    if whitelist:
        cfg += f" -c tessedit_char_whitelist={whitelist}"
    d = pytesseract.image_to_data(bw, lang=lang, config=cfg, output_type=pytesseract.Output.DICT)
    words = [(t.strip(), float(c)) for t, c in zip(d["text"], d["conf"]) if t.strip() and float(c) >= 0]
    if not words:
        return "", 0.0
    return "".join(w for w, _ in words), statistics.mean(c for _, c in words)


def _unrotate_box(b, angle: int, W: int, H: int, s: float):
    """Map a bbox found on a rotated, downscaled copy back to the original page."""
    x, y, w, h = [v / s for v in b]
    if angle == 90:          # copy was rotated 90° clockwise
        return [round(y), round(H - (x + w)), round(h), round(w)]
    return [round(W - (y + h)), round(x), round(h), round(w)]   # 270: copy rotated counter-clockwise


def sideways_lines(bw: np.ndarray, lang: str, min_words: int = 12) -> tuple[list[dict], int]:
    """Phone scans of registers often mix upright headings with a sideways title and sideways
    entries. Read the page turned 90° both ways and return the confident lines from the better side
    (bboxes mapped back to the upright page), plus that angle. Empty if neither side has real text."""
    H, W = bw.shape[:2]
    s = min(1.0, 1800 / max(H, W))
    small = cv2.resize(bw, None, fx=s, fy=s, interpolation=cv2.INTER_AREA) if s < 1 else bw
    best, best_angle, best_n = [], 0, 0
    for angle, code in ((270, cv2.ROTATE_90_COUNTERCLOCKWISE), (90, cv2.ROTATE_90_CLOCKWISE)):
        lines = _tess_lines(cv2.rotate(small, code), lang, psm=6)
        good = [ln for ln in lines if ln["conf"] >= 45
                and sum(1 for w in ln["words"] if w["conf"] >= 60 and len(w["text"]) >= 2) >= 3]
        n = sum(len(ln["words"]) for ln in good)
        if n > best_n:
            best, best_angle, best_n = good, angle, n
    if best_n < min_words:
        return [], 0
    for ln in best:
        ln["bbox"] = _unrotate_box(ln["bbox"], best_angle, W, H, s)
        for w in ln["words"]:
            w["bbox"] = _unrotate_box(w["bbox"], best_angle, W, H, s)
        ln.update(script=detect_script(ln["text"]), engine="tesseract-sideways", handwriting=False,
                  rotated=best_angle)
    return best, best_angle
