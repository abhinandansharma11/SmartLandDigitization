"""End-to-end run of every sample through the real pipeline (synchronously)."""
import json, os, sys, time
os.environ.setdefault("BHU_NO_WORKER", "1")
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from fastapi.testclient import TestClient
from app.main import app
from app.pipeline.worker import run_document
from app.db import SessionLocal
from app.models import Village

S = os.path.join(os.path.dirname(__file__), "..", "..", "samples")

def login(c, u):
    return {"Authorization": "Bearer " + c.post("/api/v1/auth/login", json={"username": u, "password": "demo123"}).json()["token"]}

def up(c, h, name, **meta):
    with open(os.path.join(S, name), "rb") as fh:
        r = c.post("/api/v1/documents", headers=h, files=[("files", (name, fh.read()))], data={k: str(v) for k, v in meta.items()})
    assert r.status_code == 200, r.text
    d = r.json()[0]
    if d["status"] == "RECEIVED":
        t = time.time(); run_document(d["id"]); d["secs"] = round(time.time() - t, 1)
    return d

with TestClient(app) as c:
    op, sa = login(c, "operator"), login(c, "stateadmin")
    db = SessionLocal(); V = {v.lgd_code: v.id for v in db.query(Village)}; db.close()
    order = [("09_map_bahadurpur_sheet.png", op, {"district": "Lucknow", "tehsil": "Malihabad", "village_id": V["900002"], "doc_type_hint": "map"}),
             ("01_khatauni_rampur_khata45_clean.png", op, {"district": "Lucknow", "tehsil": "Malihabad"}),
             ("02_khatauni_rampur_khata45_rescan.jpg", op, {"district": "Lucknow", "tehsil": "Malihabad"}),
             ("03_khatauni_rampur_khata46_old_bigha.jpg", op, {"district": "Lucknow", "tehsil": "Malihabad"}),
             ("04_khatauni_rampur_khata47_conflict.png", op, {"district": "Lucknow", "tehsil": "Malihabad"}),
             ("05_khatauni_rampur_khata50_bad_shares.png", op, {"district": "Lucknow", "tehsil": "Malihabad"}),
             ("06_khatauni_sitapur_khata12.png", sa, {"district": "Sitapur", "tehsil": "Sidhauli"}),
             ("07_khatauni_rampur_khata48_digital.pdf", op, {"district": "Lucknow", "tehsil": "Malihabad"}),
             ("08_khatauni_rampur_khata49_krutidev.pdf", op, {"district": "Lucknow", "tehsil": "Malihabad"}),
             ("10_khatauni_bahadurpur_khata7.png", op, {"district": "Lucknow", "tehsil": "Malihabad"}),
             ("01_khatauni_rampur_khata45_clean.png", op, {"district": "Lucknow", "tehsil": "Malihabad"})]
    # jurisdiction: operator cannot upload for Sitapur
    with open(os.path.join(S, "06_khatauni_sitapur_khata12.png"), "rb") as fh:
        r = c.post("/api/v1/documents", headers=op, files=[("files", ("x.png", fh.read()))], data={"district": "Sitapur"})
    print("operator→Sitapur upload:", r.status_code)
    for name, h, meta in order:
        d = up(c, h, name, **meta)
        det = c.get(f"/api/v1/documents/{d['id']}", headers=sa).json()
        print(f"\n### {name}: {det['status']} ({d.get('secs')}s) type={det['doc_type']} src={det['text_source']} q={det['quality_score']}")
        print("   reason:", det["route_reason"])
        for f in det["fields"]:
            mark = "!" if f["confidence"] < f["threshold"] else " "
            print(f"   {mark}{f['confidence']:5.1f}/{f['threshold']:<4} {f['field_name']:24} {f['value']} {f['flags'] or ''}")
        for v in det["validations"]:
            if not v["passed"]: print(f"   ✗ [{v['severity']}] {v['rule_code']}: {v['message']}")
        for dup in det["duplicates"]: print(f"   ≈ {dup['kind']} {dup['score']} {dup['detail']}")
