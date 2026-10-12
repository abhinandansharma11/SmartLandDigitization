"""Multi-state records: Maharashtra 7/12, West Bengal khatian, Tamil Nadu patta, Punjab jamabandi."""
import os
import sys
import tempfile
from pathlib import Path

os.environ.setdefault("BHU_DATA_DIR", tempfile.mkdtemp(prefix="bhu-test-"))
os.environ.setdefault("BHU_NO_WORKER", "1")
os.environ.setdefault("QA_SAMPLE_RATE", "0")
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "samples"))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import generate_states  # noqa: E402
from app.main import app  # noqa: E402
from app.pipeline import indic  # noqa: E402
from app.pipeline.templates import area_acre, area_h_a_sqm, area_ha_are, area_kanal_marla  # noqa: E402
from app.pipeline.worker import run_document  # noqa: E402

CASES = {  # file → (district, state, doc_type, khata, first owner, first plot, total ha)
    "11_satbara_maharashtra_shirgaon_khate312.png": ("Pune", "Maharashtra", "satbara", "312", "रमेश गणपत पाटील", "45/1", 1.205),
    "12_khatian_westbengal_ramnagar_56.png": ("Hooghly", "West Bengal", "khatian", "56", "রহিম শেখ", "112", 0.3359),
    "13_patta_tamilnadu_vadakkupatti_1024.png": ("Madurai", "Tamil Nadu", "patta", "1024", "முருகன்", "112/3A", 0.455),
    "14_jamabandi_punjab_rampura_khewat88.png": ("Mohali", "Punjab", "jamabandi", "88", "ਗੁਰਪ੍ਰੀਤ ਸਿੰਘ", "45//12", 0.607),
}


@pytest.fixture(scope="module")
def c():
    with TestClient(app) as client:
        yield client


def H(c, u):
    return {"Authorization": "Bearer " + c.post("/api/v1/auth/login", json={"username": u, "password": "demo123"}).json()["token"]}


def up(c, name, district, variant=False):
    data = (ROOT / "samples" / name).read_bytes()
    if variant:                          # a byte-different copy, so it isn't caught as an exact duplicate
        import io
        from PIL import Image
        im = Image.open(io.BytesIO(data)).convert("L"); im.putpixel((0, 0), 254)
        buf = io.BytesIO(); im.save(buf, "PNG"); data = buf.getvalue()
    r = c.post("/api/v1/documents", headers=H(c, "multi_op"), files=[("files", (name, data))],
               data={"district": district})
    assert r.status_code == 200, r.text
    run_document(r.json()[0]["id"])
    return c.get(f"/api/v1/documents/{r.json()[0]['id']}", headers=H(c, "admin")).json()


def test_area_units():
    assert area_h_a_sqm("१.२०.५०")[0] == 1.205
    assert abs(area_acre("০.৮৩ একর")[0] - 0.3359) < 1e-3 and abs(area_acre("২০ শতক")[0] - 0.0809) < 1e-3
    assert area_ha_are("0 - 45.50")[0] == 0.455
    assert abs(area_kanal_marla("12-0")[0] - 0.607) < 1e-3 and abs(area_kanal_marla("8-10")[0] - 0.4300) < 1e-3


@pytest.mark.parametrize("name", list(CASES))
def test_state_record_with_indic_text(c, name, monkeypatch):
    """With a correct Indic OCR reading, every state's fields come out right and link to master data."""
    district, state, dtype, khata, owner, plot, total = CASES[name]
    monkeypatch.setattr(indic, "ENGINE", "indic_server")
    monkeypatch.setattr(indic, "read_indic", lambda img: [{"text": t, "bbox": None} for t in generate_states.text_lines(name)])
    d = up(c, name, district)
    assert d["status"] in ("PUBLISHED", "IN_REVIEW"), d["route_reason"]
    f = {x["field_name"]: x["value"] for x in d["fields"]}
    assert d["doc_type"] == dtype
    assert f["khata_no"] == khata
    assert f["owners.0.name"] == owner
    assert f["plots.0.khasra_no"] == plot
    assert abs(float(f["total_area_ha"]) - total) < 2e-3
    assert d["village_id"], "village should resolve against master data"
    fails = [v for v in d["validations"] if not v["passed"] and v["severity"] != "info"]
    assert not fails, fails
    assert any(v["rule_code"] == "V12_PARCEL_LINK" and v["passed"] for v in d["validations"])


@pytest.mark.parametrize("name", list(CASES))
def test_state_record_tesseract_only(c, name):
    """Tesseract alone (offline fallback) still identifies the state format and the holding number."""
    district, state, dtype, khata, *_ = CASES[name]
    d = up(c, name, district, variant=True)
    assert d["status"] not in ("FAILED",), d["error_full"]
    f = {x["field_name"]: x["value"] for x in d["fields"]}
    assert d["doc_type"] == dtype
    assert f.get("khata_no") == khata


def test_cross_script_search(c):
    hits = c.get("/api/v1/records?q=gurpreet singh", headers=H(c, "admin")).json()
    assert any(h["khata_no"] == "88" for h in hits)
