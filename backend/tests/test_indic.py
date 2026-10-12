"""Indic OCR integration: markdown/HTML parsing, cross-engine merge, confidence, fallback."""
import os
import sys
import tempfile
from pathlib import Path

os.environ.setdefault("BHU_DATA_DIR", tempfile.mkdtemp(prefix="bhu-test-"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.pipeline import indic, ocr  # noqa: E402
from app.pipeline.extract import extract_khatauni  # noqa: E402
from app.pipeline.preprocess import load_gray, preprocess  # noqa: E402
from tests.mock_indic_server import PAGE  # noqa: E402

SAMPLE = Path(__file__).resolve().parents[2] / "samples" / "01_khatauni_rampur_khata45_clean.png"


def test_text_to_lines_handles_markdown_and_html_tables():
    lines = indic.text_to_lines(PAGE)
    assert "खाता संख्या: ४५" in lines
    assert "१ राम प्रसाद पुत्र शिव प्रसाद निवासी रामपुर कलां १/२" in lines
    assert "११३क ०.२५०" in lines
    assert not any(set(l) <= set("|-: ") for l in lines)


def test_merge_uses_indic_text_and_agreement_confidence(monkeypatch):
    monkeypatch.setattr(indic, "ENGINE", "indic_server")
    monkeypatch.setattr(indic, "read_indic", lambda img: [{"text": t, "bbox": None} for t in indic.text_to_lines(PAGE)])
    bw, _ = preprocess(load_gray(str(SAMPLE)))
    lines, _, used = ocr.ocr_page(bw)
    assert used == "indicocr-server"
    f = {x["field_name"]: x for x in extract_khatauni(lines, 1, "Lucknow")}
    assert f["plots.1.khasra_no"]["value"] == "113क"          # Tesseract alone misreads this
    assert f["plots.1.khasra_no"]["confidence"] < 85            # engines disagree → review
    assert f["owners.0.name"]["confidence"] >= 95               # engines agree → trusted
    assert f["owners.0.name"]["bbox"][2] > 0                    # position borrowed from Tesseract


def test_engine_failure_falls_back_to_tesseract(monkeypatch):
    monkeypatch.setattr(indic, "ENGINE", "indic_server")
    def boom(img):
        raise indic.EngineError("down")
    monkeypatch.setattr(indic, "read_indic", boom)
    bw, _ = preprocess(load_gray(str(SAMPLE)))
    lines, _, used = ocr.ocr_page(bw)
    assert used == "tesseract-fallback" and lines
