"""Stage 2a: triage. Split a document into page images and decide, per page, whether OCR is
needed. Born-digital PDFs use their text layer directly; legacy-font (Kruti Dev etc.) text layers
are converted to Unicode first."""
from pathlib import Path

import cv2
import numpy as np

from .preprocess import load_gray, save_png
from .textutil import krutidev_to_unicode, looks_like_legacy_font, nfc

RENDER_DPI = 200


def _pdf_text_lines(page, zoom: float, legacy: bool) -> list[dict]:
    lines = []
    for block in page.get_text("dict")["blocks"]:
        for ln in block.get("lines", []):
            spans = [s for s in ln["spans"] if s["text"].strip()]
            if not spans:
                continue
            words = []
            for s in spans:
                txt = krutidev_to_unicode(s["text"]) if legacy else nfc(s["text"])
                x0, y0, x1, y1 = [v * zoom for v in s["bbox"]]
                toks = txt.split()
                total = sum(len(t) for t in toks) or 1
                cx = x0
                for t in toks:                                 # approximate per-word boxes
                    w = (x1 - x0) * len(t) / total
                    words.append({"text": t, "conf": 97.0 if legacy else 99.0,
                                  "bbox": [int(cx), int(y0), int(w), int(y1 - y0)]})
                    cx += w
            if not words:
                continue
            x0 = min(w["bbox"][0] for w in words); y0 = min(w["bbox"][1] for w in words)
            x1 = max(w["bbox"][0] + w["bbox"][2] for w in words); y1 = max(w["bbox"][1] + w["bbox"][3] for w in words)
            lines.append({"text": " ".join(w["text"] for w in words), "words": words,
                          "conf": words[0]["conf"], "bbox": [x0, y0, x1 - x0, y1 - y0],
                          "script": "Devanagari", "engine": "pdf-text-legacy" if legacy else "pdf-text",
                          "handwriting": False})
    lines.sort(key=lambda l: (l["bbox"][1] // 10, l["bbox"][0]))
    return lines


def split_pages(src: Path, out_dir: Path, mime: str) -> list[dict]:
    """Returns [{page_no, image_path, text_lines|None, text_source}]"""
    out_dir.mkdir(parents=True, exist_ok=True)
    pages = []
    if mime == "application/pdf" or src.suffix.lower() == ".pdf":
        import pymupdf
        doc = pymupdf.open(src)
        zoom = RENDER_DPI / 72
        for i, page in enumerate(doc, 1):
            img_path = out_dir / f"p{i}.png"
            pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), colorspace=pymupdf.csGRAY)
            pix.save(str(img_path))
            spans = [s for b in page.get_text("dict")["blocks"] for l in b.get("lines", []) for s in l["spans"]]
            n_chars = sum(len(s["text"].strip()) for s in spans)
            if n_chars > 40:
                legacy = looks_like_legacy_font([s["font"] for s in spans])
                pages.append({"page_no": i, "image_path": img_path,
                              "text_lines": _pdf_text_lines(page, zoom, legacy),
                              "text_source": "legacy_font" if legacy else "pdf_text"})
            else:
                pages.append({"page_no": i, "image_path": img_path, "text_lines": None, "text_source": "ocr"})
    else:
        gray = load_gray(str(src))
        img_path = out_dir / "p1.png"
        save_png(str(img_path), gray)
        pages.append({"page_no": 1, "image_path": img_path, "text_lines": None, "text_source": "ocr"})
    return pages


def line_density(bw: np.ndarray) -> float:
    """Share of pixels belonging to long straight strokes — high for maps and ruled registers."""
    inv = 255 - bw
    h, w = bw.shape
    horiz = cv2.morphologyEx(inv, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (w // 8, 1)))
    vert = cv2.morphologyEx(inv, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, h // 8)))
    return float((cv2.add(horiz, vert) > 0).mean())
