"""End-to-end tests through the real OCR pipeline and the HTTP API.

    cd backend && pytest -q
"""
import os
import sys
import tempfile
from pathlib import Path

os.environ["BHU_DATA_DIR"] = tempfile.mkdtemp(prefix="bhu-test-")
os.environ["BHU_NO_WORKER"] = "1"
os.environ["QA_SAMPLE_RATE"] = "0"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.pipeline.textutil import krutidev_to_unicode, search_key  # noqa: E402
from app.pipeline.worker import run_document  # noqa: E402

SAMPLES = Path(__file__).resolve().parents[2] / "samples"


@pytest.fixture(scope="module")
def c():
    with TestClient(app) as client:
        yield client


def H(c, user):
    r = c.post("/api/v1/auth/login", json={"username": user, "password": "demo123"})
    assert r.status_code == 200
    return {"Authorization": "Bearer " + r.json()["token"]}


def upload(c, h, name, **meta):
    r = c.post("/api/v1/documents", headers=h, files=[("files", (name, (SAMPLES / name).read_bytes()))],
               data={k: str(v) for k, v in meta.items()})
    assert r.status_code == 200, r.text
    d = r.json()[0]
    if d["status"] == "RECEIVED":
        run_document(d["id"])
    return c.get(f"/api/v1/documents/{d['id']}", headers=h).json()


def test_text_utils():
    assert krutidev_to_unicode("jke izlkn") == "राम प्रसाद"
    assert krutidev_to_unicode("/kesZUnz") == "धर्मेन्द्र"
    assert search_key("राम प्रसाद") == search_key("Ram Prasad")


def test_login_rejects_bad_password(c):
    assert c.post("/api/v1/auth/login", json={"username": "operator", "password": "x"}).status_code == 401


def test_jurisdiction_blocks_other_district(c):
    op = H(c, "operator")
    r = c.post("/api/v1/documents", headers=op, files=[("files", ("x.png", (SAMPLES / "06_khatauni_sitapur_khata12.png").read_bytes()))],
               data={"district": "Sitapur"})
    assert r.status_code == 403


def test_digital_and_legacy_pdfs_auto_publish(c):
    op = H(c, "operator")
    d = upload(c, op, "07_khatauni_rampur_khata48_digital.pdf", district="Lucknow", tehsil="Malihabad")
    assert d["text_source"] == "pdf_text" and d["status"] == "PUBLISHED"
    d = upload(c, op, "08_khatauni_rampur_khata49_krutidev.pdf", district="Lucknow", tehsil="Malihabad")
    assert d["text_source"] == "legacy_font" and d["status"] == "PUBLISHED"
    names = {f["field_name"]: f["value"] for f in d["fields"]}
    assert names["owners.0.name"] == "गीता देवी"


def test_map_then_linked_khatauni(c):
    op = H(c, "operator")
    vid = next(v["id"] for v in c.get("/api/v1/villages", headers=op).json() if v["lgd_code"] == "900002")
    m = upload(c, op, "09_map_bahadurpur_sheet.png", district="Lucknow", tehsil="Malihabad", village_id=vid, doc_type_hint="map")
    assert m["doc_type"] == "map" and m["status"] == "PUBLISHED"
    assert len(m["fields"]) == 9
    k = upload(c, op, "10_khatauni_bahadurpur_khata7.png", district="Lucknow", tehsil="Malihabad")
    assert k["status"] == "PUBLISHED", k["route_reason"]
    fc = c.get(f"/api/v1/parcels?village_id={vid}", headers=op).json()
    linked = [f for f in fc["features"] if f["properties"]["status"] == "linked"]
    assert {f["properties"]["khasra_no"] for f in linked} == {"203", "207"}


def test_conflict_goes_to_supervisor_and_needs_justification(c):
    op, sup = H(c, "operator"), H(c, "supervisor")
    d = upload(c, op, "04_khatauni_rampur_khata47_conflict.png", district="Lucknow", tehsil="Malihabad")
    assert d["status"] == "SUPERVISOR"
    assert any(x["kind"] == "lrms_conflict" for x in d["duplicates"])
    r = c.post(f"/api/v1/review/{d['id']}/approve", headers=sup, json={})
    assert r.status_code == 409                       # justification required
    r = c.post(f"/api/v1/review/{d['id']}/approve", headers=sup, json={"comment": "Verified sale deed; LRMS outdated"})
    assert r.status_code == 200 and r.json()["status"] == "PUBLISHED"


def test_review_correction_then_maker_checker(c):
    op, rv, sup = H(c, "operator"), H(c, "reviewer"), H(c, "supervisor")
    d = upload(c, op, "01_khatauni_rampur_khata45_clean.png", district="Lucknow", tehsil="Malihabad")
    assert d["status"] == "IN_REVIEW"
    q = c.get("/api/v1/review/queue", headers=rv).json()
    assert any(x["id"] == d["id"] for x in q)
    assert c.post(f"/api/v1/review/{d['id']}/claim", headers=rv).status_code == 200
    # another reviewer is locked out while the lease is held
    assert c.post(f"/api/v1/review/{d['id']}/claim", headers=H(c, "supervisor")).status_code == 409
    fields = {f["field_name"]: f for f in d["fields"]}
    for f in d["fields"]:
        if f["confidence"] < f["threshold"] and f["value"]:
            if f["field_name"] == "plots.1.khasra_no":
                body = {"value": "113क", "reason_code": "OCR_ERROR"}
            else:
                body = {"value": f["value"], "reason_code": "CONFIRMED"}
            r = c.patch(f"/api/v1/review/{d['id']}/fields/{f['id']}", headers=rv, json=body)
            assert r.status_code == 200, r.text
    if fields.get("plots.1.khasra_no", {}).get("value") != "113क":
        c.patch(f"/api/v1/review/{d['id']}/fields/{fields['plots.1.khasra_no']['id']}", headers=rv,
                json={"value": "113क", "reason_code": "OCR_ERROR"})
    r = c.post(f"/api/v1/review/{d['id']}/approve", headers=rv, json={"comment": "checked"})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "SUPERVISOR"         # plot correction → maker-checker
    r = c.post(f"/api/v1/review/{d['id']}/approve", headers=sup, json={"comment": "ok"})
    assert r.json()["status"] == "PUBLISHED", r.text
    hits = c.get("/api/v1/records?q=ram prasad", headers=rv).json()
    assert any(h["khata_no"] == "45" for h in hits)
    rec = c.get(f"/api/v1/records/{hits[0]['id']}", headers=rv).json()
    assert {p["khasra_no"] for p in rec["plots"]} == {"112", "113क"}
    assert all(p["ulpin"] for p in rec["plots"])


def test_exact_duplicate_detected(c):
    op = H(c, "operator")
    d = upload(c, op, "07_khatauni_rampur_khata48_digital.pdf", district="Lucknow", tehsil="Malihabad")
    assert d["status"] == "DUPLICATE"


def test_sitapur_reviewer_cannot_see_lucknow(c):
    s = H(c, "sitapur")
    docs = c.get("/api/v1/documents", headers=s).json()["items"]
    assert all(d["district"] == "Sitapur" for d in docs)


def test_dashboard_and_audit_chain(c):
    a = H(c, "admin")
    s = c.get("/api/v1/dashboard/summary", headers=a).json()
    assert s["kpis"]["published"] >= 5
    assert s["kpis"]["extraction_accuracy"] is not None
    assert c.get("/api/v1/audit/verify", headers=H(c, "auditor")).json()["ok"] is True
    assert c.get("/api/v1/admin/learning", headers=a).json()["labels"] > 0


def test_audit_chain_survives_concurrent_writers(c):
    """Two sessions writing audit rows at the same time used to fork the hash chain."""
    import threading
    from app.auth import audit
    from app.db import SessionLocal
    barrier = threading.Barrier(4)

    def writer(i):
        db = SessionLocal()
        barrier.wait()
        audit(db, None, "test", "system", i)
        audit(db, None, "test2", "system", i)      # two rows in one transaction
        db.commit()
        db.close()
    ts = [threading.Thread(target=writer, args=(i,)) for i in range(4)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    r = c.get("/api/v1/audit/verify", headers=H(c, "admin")).json()
    assert r["ok"], r


def test_map_without_village_goes_to_a_person_not_failed(c):
    """A map sheet with no village cannot be georeferenced; that is a job for an officer, not a crash."""
    import io
    from PIL import Image
    im = Image.open(SAMPLES / "09_map_bahadurpur_sheet.png").convert("L")
    im.putpixel((2, 2), 90)                        # different bytes, so it is not a duplicate
    buf = io.BytesIO(); im.save(buf, "PNG")
    op = H(c, "operator")
    r = c.post("/api/v1/documents", headers=op, files=[("files", ("map_no_village.png", buf.getvalue()))],
               data={"district": "Lucknow", "doc_type_hint": "map"})
    doc_id = r.json()[0]["id"]
    run_document(doc_id)
    d = c.get(f"/api/v1/documents/{doc_id}", headers=op).json()
    assert d["status"] == "MANUAL_ENTRY", d["status"]
    assert d["attempts"] == 0 and "village" in d["route_reason"]


def test_ruled_register_is_not_mistaken_for_a_map():
    """Registers are ruled tables: lots of long lines, but also lots of text."""
    from app.pipeline.extract import classify
    assert classify("क्रमांक क्षेत्रफल कब्जेदार का नाम", 0.05, 80, None, "Uttar Pradesh")[0] != "map"
    assert classify("", 0.05, 5, None, "Uttar Pradesh")[0] == "map"
    assert classify("नक्शा इन्तखाब नया पंचशाला बरुये नकल गस्ती खसरा", 0.05, 60, None, "Uttar Pradesh")[0] == "khasra"
