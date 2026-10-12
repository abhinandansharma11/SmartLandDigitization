"""System of record: search, record detail, parcels (GeoJSON), and the public integration API."""
from fastapi import APIRouter, Depends, HTTPException, Request
from rapidfuzz import fuzz
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import audit, in_jurisdiction, require
from ..db import get_db
from ..models import Document, ExtractedField, Owner, Parcel, Plot, Record, User, Village
from sqlalchemy import func
from ..pipeline.textutil import norm_digits, search_key

router = APIRouter(prefix="/api/v1", tags=["records"])


def _record_out(r: Record, db: Session, full=False) -> dict:
    v = r.village
    doc = db.get(Document, r.document_id) if r.document_id else None
    out = {"id": r.id, "village": v.name, "village_en": v.name_en, "village_lgd": v.lgd_code, "tehsil": v.tehsil,
           "district": v.district, "state": v.state, "doc_type": doc.doc_type if doc else None,
           # mean reading confidence of the source scan (human-confirmed fields count as 100)
           "confidence": round(db.scalar(select(func.avg(ExtractedField.confidence)).where(
               ExtractedField.document_id == r.document_id)) or 0) if r.document_id else None, "khata_no": r.khata_no, "category": r.category, "fasli_year": r.fasli_year,
           "total_area_ha": r.total_area_ha, "version": r.version, "is_current": r.is_current,
           "owners": [{"name": o.name, "relation": o.relation, "relative_name": o.relative_name, "share": o.share,
                       "residence": o.residence} for o in r.owners],
           "plots": [], "published_at": r.published_at.isoformat(), "published_by": r.published_by,
           "document_id": r.document_id}
    for p in r.plots:
        parcel = db.get(Parcel, p.parcel_id) if p.parcel_id else None
        out["plots"].append({"khasra_no": p.khasra_no, "area_ha": p.area_ha, "area_raw": p.area_raw,
                             "ulpin": parcel.ulpin if parcel else None,
                             "map_area_ha": parcel.area_ha if parcel else None,
                             "parcel_id": parcel.id if parcel else None})
    if full:
        out["mutations"] = [{"case_no": m.case_no, "order_date": m.order_date, "description": m.description} for m in r.mutations]
        out["registrations"] = [{"deed_no": g.deed_no, "office": g.office, "date": g.reg_date} for g in r.registrations]
        out["record_hash"], out["signature"] = r.record_hash, r.signature
        out["history"] = [{"id": h.id, "version": h.version, "published_at": h.published_at.isoformat(),
                           "published_by": h.published_by, "owners": [o.name for o in h.owners],
                           "document_id": h.document_id}
                          for h in db.scalars(select(Record).where(Record.village_id == r.village_id,
                                                                   Record.khata_no == r.khata_no).order_by(Record.version.desc()))]
    return out


@router.get("/records")
def search(q: str = "", village_id: int | None = None, district: str | None = None, include_history: bool = False,
           user: User = Depends(require("view_records")), db: Session = Depends(get_db)):
    """Fuzzy, transliteration-aware search over owner names, khata, khasra, ULPIN and village."""
    stmt = select(Record).join(Village)
    if not include_history:
        stmt = stmt.where(Record.is_current.is_(True))
    if village_id:
        stmt = stmt.where(Record.village_id == village_id)
    if district:
        stmt = stmt.where(Village.district == district)
    if user.state:
        stmt = stmt.where(Village.state == user.state)
    if user.district:
        stmt = stmt.where(Village.district == user.district)
    return _rank(db.scalars(stmt).all(), q, db)


def _token_match(query: str, name: str) -> float:
    """Each query word against its best-matching name word, so "imran" finds "imaran khan"
    (transliteration keeps an inherent vowel that people usually drop when typing)."""
    qt, nt = query.split(), name.split()
    if not qt or not nt:
        return 0.0
    return sum(max(fuzz.ratio(a, b) for b in nt) for a in qt) / len(qt) * (0.97 if len(qt) < len(nt) else 1.0)


def _rank(records, q: str, db: Session) -> list[dict]:
    """Score records against a query: exact khata/khasra/ULPIN, fuzzy owner name (any script), village name."""
    q = norm_digits(q.strip())
    if not q:
        return [_record_out(r, db) for r in sorted(records, key=lambda r: r.published_at, reverse=True)[:100]]
    key = search_key(q)
    scored = []
    for r in records:
        s = 0.0
        if q == r.khata_no:
            s = 100
        for p in r.plots:
            if q == p.khasra_no:
                s = max(s, 100)
            if p.parcel_id:
                par = db.get(Parcel, p.parcel_id)
                if par and q.upper() == par.ulpin:
                    s = 100
        for o in r.owners:
            latin = o.name_latin or search_key(o.name)
            s = max(s, fuzz.token_set_ratio(key, latin), fuzz.token_set_ratio(q, o.name), _token_match(key, latin))
        v = r.village
        s = max(s, fuzz.partial_ratio(key, search_key(v.name)) * 0.8, fuzz.partial_ratio(q.lower(), v.name_en.lower()) * 0.8)
        if s >= 70:
            scored.append((s, r))
    scored.sort(key=lambda t: -t[0])
    return [_record_out(r, db) | {"score": round(s)} for s, r in scored[:50]]


# ---------------------------------------------------------------- citizen portal (no login)
# Records of rights are public documents; only current, published versions are exposed, without
# signatures or internal document IDs.
def _public(r: dict) -> dict:
    return {k: v for k, v in r.items() if k not in ("document_id", "published_by", "signature", "history")}


@router.get("/public/search", tags=["citizen"])
def public_search(q: str = "", district: str | None = None, db: Session = Depends(get_db)):
    q = q.strip()
    if not q or (len(q) < 2 and not q.isdigit()):
        return []
    stmt = select(Record).join(Village).where(Record.is_current.is_(True))
    if district:
        stmt = stmt.where(Village.district == district)
    return [_public(r) for r in _rank(db.scalars(stmt).all(), q, db)[:25]]


@router.get("/public/record/{record_id}", tags=["citizen"])
def public_record(record_id: int, db: Session = Depends(get_db)):
    r = db.get(Record, record_id)
    if not r or not r.is_current:
        raise HTTPException(404, "No current record with this ID")
    out = _public(_record_out(r, db, full=True))
    # plot outlines so the citizen page can show where the land is
    out["parcels"] = {"type": "FeatureCollection", "features": [
        {"type": "Feature", "geometry": par.geojson, "properties": {"khasra_no": par.khasra_no, "ulpin": par.ulpin}}
        for par in (db.get(Parcel, p["parcel_id"]) for p in out["plots"] if p.get("parcel_id")) if par]}
    return out


@router.get("/records/{record_id}")
def record_detail(record_id: int, request: Request, user: User = Depends(require("view_records")),
                  db: Session = Depends(get_db)):
    r = db.get(Record, record_id)
    if not r:
        raise HTTPException(404)
    v = r.village
    if not in_jurisdiction(user, v.state, v.district):
        raise HTTPException(403, "Outside your jurisdiction")
    audit(db, user, "view", "record", r.id, {"khata": r.khata_no, "village": v.lgd_code}, request)   # access audit
    db.commit()
    return _record_out(r, db, full=True)


@router.get("/parcels")
def parcels(village_id: int | None = None, user: User = Depends(require("view_records")), db: Session = Depends(get_db)):
    """GeoJSON FeatureCollection; each parcel carries its linked record and a status for styling."""
    stmt = select(Parcel).join(Village)
    if village_id:
        stmt = stmt.where(Parcel.village_id == village_id)
    if user.state:
        stmt = stmt.where(Village.state == user.state)
    if user.district:
        stmt = stmt.where(Village.district == user.district)
    feats = []
    for p in db.scalars(stmt):
        plot = db.scalars(select(Plot).join(Record).where(Plot.parcel_id == p.id, Record.is_current.is_(True))).first()
        rec = db.get(Record, plot.record_id) if plot else None
        status = "linked" if rec else "unlinked"
        if rec and plot.area_ha and abs(plot.area_ha - p.area_ha) / p.area_ha > 0.10:
            status = "area_mismatch"
        feats.append({"type": "Feature", "geometry": p.geojson,
                      "properties": {"id": p.id, "khasra_no": p.khasra_no, "ulpin": p.ulpin, "area_ha": p.area_ha,
                                     "village": p.village.name, "village_en": p.village.name_en, "status": status,
                                     "tehsil": p.village.tehsil, "district": p.village.district,
                                     "record_id": rec.id if rec else None, "khata_no": rec.khata_no if rec else None,
                                     "owners": [o.name for o in rec.owners] if rec else [],
                                     "record_area_ha": plot.area_ha if plot else None,
                                     "source_document_id": p.source_document_id}})
    return {"type": "FeatureCollection", "features": feats}


# ------------------------------------------------------------------ public integration API (versioned)
@router.get("/public/records/{village_lgd}/{khata_no}", tags=["integration"])
def public_record(village_lgd: str, khata_no: str, request: Request, user: User = Depends(require("view_records")),
                  db: Session = Depends(get_db)):
    v = db.scalars(select(Village).where(Village.lgd_code == village_lgd)).first()
    if not v:
        raise HTTPException(404, "Unknown village LGD code")
    r = db.scalars(select(Record).where(Record.village_id == v.id, Record.khata_no == khata_no,
                                        Record.is_current.is_(True))).first()
    if not r:
        raise HTTPException(404, "No published record")
    audit(db, user, "api_read", "record", r.id, {"village": village_lgd, "khata": khata_no}, request)
    db.commit()
    return _record_out(r, db, full=True)


@router.get("/public/parcels/{ulpin}", tags=["integration"])
def public_parcel(ulpin: str, user: User = Depends(require("view_records")), db: Session = Depends(get_db)):
    p = db.scalars(select(Parcel).where(Parcel.ulpin == ulpin.upper())).first()
    if not p:
        raise HTTPException(404)
    plot = db.scalars(select(Plot).join(Record).where(Plot.parcel_id == p.id, Record.is_current.is_(True))).first()
    return {"ulpin": p.ulpin, "khasra_no": p.khasra_no, "village_lgd": p.village.lgd_code, "area_ha": p.area_ha,
            "geometry": p.geojson, "record": _record_out(db.get(Record, plot.record_id), db) if plot else None}


@router.get("/documents/{doc_id}/record")
def record_for_document(doc_id: str, user: User = Depends(require("view_records")), db: Session = Depends(get_db)):
    r = db.scalars(select(Record).where(Record.document_id == doc_id)).first()
    return {"record_id": r.id if r else None}


@router.get("/public/stats", tags=["citizen"])
def public_stats(db: Session = Depends(get_db)):
    """Headline numbers and the latest publications for the citizen portal."""
    current = db.scalars(select(Record).where(Record.is_current.is_(True)).order_by(Record.published_at.desc())).all()
    vs = {r.village_id: r.village for r in current}
    return {"records": len(current), "villages": len(vs),
            "districts": len({v.district for v in vs.values()}), "states": len({v.state for v in vs.values()}),
            "district_names": sorted({v.district for v in db.scalars(select(Village))}),
            "recent": [{"village": r.village.name_en, "district": r.village.district, "published_at": r.published_at.isoformat()}
                       for r in current[:4]]}
