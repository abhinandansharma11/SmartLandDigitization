"""Stage 6: commit approved data to the system of record, sign it, and emit outbox events.
Also stage 7's input: corrected fields are copied into the labelled dataset."""
import hashlib
import json
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import sign
from ..config import DATASET_DIR
from ..models import (Document, ExtractedField, IntegrationEvent, MutationEntry, Owner, Page, Parcel, Plot,
                      Record, RegistrationEntry, Village)
from .textutil import search_key
from .validate import val


def make_ulpin(lgd: str, khasra: str) -> str:
    """DEMO ULPIN: 14 alphanumerics derived from state code + village + khasra.
    Real ULPINs are issued by the state from parcel-boundary geometry (DoLR standard)."""
    h = hashlib.sha1(f"{lgd}:{khasra}".encode()).hexdigest().upper()
    return ("UP" + lgd[-4:] + h)[:14]


def _group(fields, prefix):
    out = {}
    for f in fields:
        if f.field_name.startswith(prefix + "."):
            _, idx, key = f.field_name.split(".", 2)
            out.setdefault(int(idx), {})[key] = val(f)
    return [out[k] for k in sorted(out)]


def publish_text(db: Session, doc: Document, actor: str) -> Record:
    fields = doc.fields
    by = {f.field_name: val(f) for f in fields}
    if not doc.village_id:
        raise ValueError(f"The village on this record is not in the village master (LGD list) for {doc.district}, "
                         "so it cannot be published. Correct the village name to match the master, or ask an "
                         "admin to add the village first.")
    village = db.get(Village, doc.village_id)
    khata = by.get("khata_no")
    if not khata:
        raise ValueError("Khata number missing: add it under \"Type in the record\" (or \"Something missing?\") before approving")
    prev = db.scalars(select(Record).where(Record.village_id == village.id, Record.khata_no == khata,
                                           Record.is_current.is_(True))).first()
    version = 1
    if prev:
        prev.is_current = False
        version = prev.version + 1
    owners = [o for o in _group(fields, "owners") if o.get("name")]
    plots = [p for p in _group(fields, "plots") if p.get("khasra_no")]
    raw_area = {f.field_name.split(".")[1]: f.raw_value for f in fields if f.field_name.startswith("plots.") and f.field_name.endswith("area_ha")}
    for i, p in enumerate(plots):
        p["area_raw"] = raw_area.get(str(i))
    total = by.get("total_area_ha")
    try:
        total_f = float(total) if total else sum(float(p.get("area_ha") or 0) for p in plots)
    except ValueError:
        total_f = None
    canonical = json.dumps({"village": village.lgd_code, "khata": khata, "owners": owners, "plots": plots,
                            "category": by.get("category"), "version": version}, ensure_ascii=False, sort_keys=True)
    rhash = hashlib.sha256(canonical.encode()).hexdigest()
    rec = Record(document_id=doc.id, village_id=village.id, khata_no=khata, category=by.get("category"),
                 fasli_year=by.get("fasli_year"), total_area_ha=total_f, version=version, is_current=True,
                 record_hash=rhash, signature=sign(rhash), published_by=actor)
    db.add(rec)
    db.flush()
    for o in owners:
        db.add(Owner(record_id=rec.id, name=o["name"], relation=o.get("relation"), relative_name=o.get("relative_name"),
                     share=o.get("share"), residence=o.get("residence"), name_latin=search_key(o["name"])))
    for p in plots:
        parcel = db.scalars(select(Parcel).where(Parcel.village_id == village.id, Parcel.khasra_no == p["khasra_no"])).first()
        try:
            a = float(p.get("area_ha")) if p.get("area_ha") else None
        except ValueError:
            a = None
        db.add(Plot(record_id=rec.id, khasra_no=p["khasra_no"], area_ha=a, area_raw=p.get("area_raw"),
                    parcel_id=parcel.id if parcel else None))
    if by.get("mutation.case_no") or by.get("mutation.order_date"):
        db.add(MutationEntry(record_id=rec.id, case_no=by.get("mutation.case_no"),
                             order_date=by.get("mutation.order_date"), description=by.get("mutation.description")))
    if by.get("registration.deed_no"):
        db.add(RegistrationEntry(record_id=rec.id, deed_no=by.get("registration.deed_no"),
                                 office=by.get("registration.office"), reg_date=by.get("registration.date")))
    payload = {"event": "record.published", "village_lgd": village.lgd_code, "khata_no": khata, "version": version,
               "record_hash": rhash, "owners": [o["name"] for o in owners], "khasras": [p["khasra_no"] for p in plots],
               "document_id": doc.id}
    for target in ("lrms", "webhook"):
        db.add(IntegrationEvent(target=target, event="record.published", payload=payload))
    db.add(IntegrationEvent(target="dilrmp_mis", event="progress.increment",
                            payload={"state": doc.state, "district": doc.district, "tehsil": doc.tehsil,
                                     "village_lgd": village.lgd_code, "records": 1}))
    return rec


def publish_map(db: Session, doc: Document, actor: str) -> list[Parcel]:
    if not doc.village_id:
        raise ValueError("Select the village for this map sheet before approving")
    village = db.get(Village, doc.village_id)
    page = doc.pages[0]
    mapdata = (page.lines or {}) if isinstance(page.lines, dict) else {}
    geoms = mapdata.get("parcels", [])
    out = []
    for f in doc.fields:
        if not f.field_name.endswith("khasra_no"):
            continue
        idx = int(f.field_name.split(".")[1])
        kh = val(f)
        g = geoms[idx]
        parcel = db.scalars(select(Parcel).where(Parcel.village_id == village.id, Parcel.khasra_no == kh)).first()
        if parcel:
            parcel.geojson, parcel.area_ha, parcel.source_document_id = g["geometry"], g["area_ha"], doc.id
        else:
            parcel = Parcel(village_id=village.id, khasra_no=kh, ulpin=make_ulpin(village.lgd_code, kh),
                            geojson=g["geometry"], area_ha=g["area_ha"], source_document_id=doc.id)
            db.add(parcel)
        out.append(parcel)
        # link any published plots that were waiting for this geometry
        db.flush()
        for plot in db.scalars(select(Plot).join(Record).where(Record.village_id == village.id, Plot.khasra_no == kh,
                                                               Plot.parcel_id.is_(None))):
            plot.parcel_id = parcel.id
    db.add(IntegrationEvent(target="bhunaksha", event="parcels.digitized",
                            payload={"village_lgd": village.lgd_code, "count": len(out),
                                     "ulpins": [p.ulpin for p in out], "document_id": doc.id}))
    return out


def export_labels(db: Session, doc: Document):
    """Copy every human-verified field (edited or approved) into the labelled dataset as
    (image crop, text) pairs, partitioned by date, for OCR/NER retraining."""
    import cv2

    from .preprocess import load_gray
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    out_dir = DATASET_DIR / "ocr" / day
    out_dir.mkdir(parents=True, exist_ok=True)
    pages = {p.page_no: p for p in doc.pages}
    cache = {}
    n = 0
    with open(out_dir / "labels.jsonl", "a", encoding="utf-8") as fh:
        for f in doc.fields:
            if not f.bbox or val(f) is None or f.field_name.endswith(("area_ha", "relation")):
                continue
            page = pages.get(f.page_no)
            if not page or not page.processed_uri:
                continue
            img = cache.get(page.page_no)
            if img is None:
                img = cache[page.page_no] = load_gray(page.processed_uri)
            x, y, w, h = f.bbox
            crop = img[max(y - 6, 0): y + h + 6, max(x - 6, 0): x + w + 6]
            if crop.size == 0:
                continue
            name = f"{doc.id}_{f.id}.png"
            ok, buf = cv2.imencode(".png", crop)
            if ok:
                buf.tofile(str(out_dir / name))
            fh.write(json.dumps({"image": name, "text": f.raw_value if not f.edited else f.final_value,
                                 "label": val(f), "field": f.field_name, "ocr_text": f.raw_value,
                                 "corrected": f.edited, "model_version": f.model_version,
                                 "document_id": doc.id}, ensure_ascii=False) + "\n")
            n += 1
    return n
