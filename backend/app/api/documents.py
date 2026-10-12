"""Ingestion and document tracking."""
import hashlib
import io
import json
import mimetypes
import os
import stat
import zipfile
from pathlib import Path

import imagehash
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from PIL import Image
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..auth import audit, check_doc_access, in_jurisdiction, require, scope_documents
from ..config import STORAGE_DIR
from ..db import get_db
from ..models import (Document, DocumentEvent, DuplicateCandidate, ExtractedField, Page, User, ValidationResult,
                      Village)
from ..pipeline.worker import enqueue, transition

router = APIRouter(prefix="/api/v1", tags=["documents"])
ALLOWED = {".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff"}


def _phash(path: Path, mime: str) -> str | None:
    try:
        if mime == "application/pdf":
            import pymupdf
            pix = pymupdf.open(path)[0].get_pixmap(dpi=60, colorspace=pymupdf.csGRAY)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
        else:
            img = Image.open(path)
        img = img.convert("L")
        # hash the body band only: the printed form header is identical on every page of a register
        # and would make different records look alike
        body = img.crop((0, int(img.height * 0.25), img.width, int(img.height * 0.70)))
        return str(imagehash.phash(body, hash_size=16))
    except Exception:  # noqa: BLE001
        return None


def ingest(db: Session, user: User, filename: str, data: bytes, meta: dict, request: Request | None = None) -> Document:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED:
        raise HTTPException(400, f"{filename}: {ext or 'this'} files are not supported. Use PDF, JPG, PNG or TIFF")
    if len(data) > 50 * 1024 * 1024:
        raise HTTPException(413, f"{filename}: larger than 50 MB")
    district = meta.get("district") or user.district
    state = meta.get("state") or user.state or "Uttar Pradesh"
    tehsil = meta.get("tehsil") or user.tehsil
    village_id = meta.get("village_id")
    if meta.get("village_lgd") and not village_id:
        v = db.scalars(select(Village).where(Village.lgd_code == meta["village_lgd"])).first()
        village_id = v.id if v else None
    if district and not village_id and not meta.get("state"):
        dv = db.scalars(select(Village).where(Village.district == district)).first()
        if dv:                                    # the district decides the state (and its record format)
            state = dv.state
            if tehsil and not db.scalars(select(Village).where(Village.district == district, Village.tehsil == tehsil)).first():
                tehsil = None
    if village_id:
        v = db.get(Village, int(village_id))
        if not v:
            raise HTTPException(400, "Unknown village")
        district, tehsil, state = v.district, v.tehsil, v.state
    if not district:
        raise HTTPException(400, "District is required")
    if not in_jurisdiction(user, state, district, tehsil):
        raise HTTPException(403, f"You can only upload records from your own jurisdiction, not {district}{' / ' + tehsil if tehsil else ''}")

    sha = hashlib.sha256(data).hexdigest()
    raw_dir = STORAGE_DIR / "raw" / sha[:2]
    raw_dir.mkdir(parents=True, exist_ok=True)
    raw = raw_dir / f"{sha}{ext}"
    if not raw.exists():                      # write-once original (legal source of truth)
        raw.write_bytes(data)
        os.chmod(raw, stat.S_IREAD | stat.S_IRGRP | stat.S_IROTH)
    mime = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    doc = Document(filename=filename, source_uri=str(raw), sha256=sha, mime=mime, channel=meta.get("channel", "upload"),
                   doc_type_hint=meta.get("doc_type_hint") or None, state=state, district=district, tehsil=tehsil,
                   village_id=int(village_id) if village_id else None, register_ref=meta.get("register_ref"),
                   year=meta.get("year"), language=meta.get("language") or "hi", gcp=meta.get("gcp"),
                   uploaded_by=user.id, phash=_phash(raw, mime))
    db.add(doc)
    db.flush()
    db.add(DocumentEvent(document_id=doc.id, from_status=None, to_status="RECEIVED", actor=user.username,
                         note=f"via {doc.channel}, sha256 {sha[:12]}…"))
    exact = db.scalars(select(Document).where(Document.sha256 == sha, Document.id != doc.id,
                                              Document.status != "FAILED")).first()
    if exact:
        doc.duplicate_of = exact.id
        db.add(DuplicateCandidate(document_id=doc.id, kind="image", candidate_document_id=exact.id, score=100,
                                  detail=f"Byte-identical to {exact.filename}", resolution="auto"))
        transition(db, doc, "DUPLICATE", note=f"Exact duplicate of {exact.id[:8]}")
    else:
        if doc.phash:
            h = imagehash.hex_to_hash(doc.phash)
            for oid, ofn, oph in db.execute(select(Document.id, Document.filename, Document.phash)
                                            .where(Document.id != doc.id, Document.phash.is_not(None))):
                dist = h - imagehash.hex_to_hash(oph)
                if dist <= 32:                  # 256-bit hash: ≤32 bits apart ≈ same page rescanned
                    db.add(DuplicateCandidate(document_id=doc.id, kind="image", candidate_document_id=oid,
                                              score=round(100 - dist * 100 / 256, 1),
                                              detail=f"Looks like a rescan of {ofn} ({dist} bits differ)"))
    audit(db, user, "upload", "document", doc.id, {"filename": filename, "channel": doc.channel}, request)
    return doc


@router.post("/documents")
async def upload(request: Request, files: list[UploadFile] = File(...), district: str = Form(None),
                 tehsil: str = Form(None), village_id: int = Form(None), doc_type_hint: str = Form(None),
                 year: str = Form(None), register_ref: str = Form(None), channel: str = Form("upload"),
                 gcp: str = Form(None), user: User = Depends(require("upload")), db: Session = Depends(get_db)):
    meta = dict(district=district, tehsil=tehsil, village_id=village_id, doc_type_hint=doc_type_hint, year=year,
                register_ref=register_ref, channel=channel, gcp=json.loads(gcp) if gcp else None)
    docs = []
    for f in files:
        docs.append(ingest(db, user, f.filename, await f.read(), meta, request))
    db.commit()
    for d in docs:
        if d.status == "RECEIVED":
            enqueue(d.id)
    return [{"id": d.id, "filename": d.filename, "status": d.status} for d in docs]


@router.post("/batches")
async def batch_upload(request: Request, archive: UploadFile = File(...), user: User = Depends(require("upload")),
                       db: Session = Depends(get_db)):
    """Vendor bulk ingestion: a zip with scans + manifest.json
    {"files": [{"file", "district", "tehsil", "village_lgd", "doc_type_hint", "year", "register_ref"}],
     "map_gcp": {"file.png": {"bbox": [minlon, minlat, maxlon, maxlat]}}}"""
    zf = zipfile.ZipFile(io.BytesIO(await archive.read()))
    names = zf.namelist()
    manifest = json.loads(zf.read("manifest.json")) if "manifest.json" in names else {"files": []}
    entries = {e["file"]: e for e in manifest.get("files", [])}
    gcps = manifest.get("map_gcp", {})
    docs, errors = [], []
    for n in names:
        base = Path(n).name
        if Path(n).suffix.lower() not in ALLOWED or n.endswith("/"):
            continue
        meta = dict(entries.get(base, {}))
        meta["channel"] = "batch"
        if base in gcps:
            meta["gcp"] = gcps[base]
        try:
            docs.append(ingest(db, user, base, zf.read(n), meta, request))
        except HTTPException as e:
            errors.append({"file": base, "error": e.detail})
    db.commit()
    for d in docs:
        if d.status == "RECEIVED":
            enqueue(d.id)
    return {"accepted": [{"id": d.id, "filename": d.filename, "status": d.status} for d in docs], "rejected": errors}


def doc_summary(d: Document, village_names: dict | None = None) -> dict:
    return {"id": d.id, "filename": d.filename, "status": d.status, "doc_type": d.doc_type or d.doc_type_hint,
            "district": d.district, "tehsil": d.tehsil, "village_id": d.village_id,
            "village": (village_names or {}).get(d.village_id), "channel": d.channel,
            "quality_score": d.quality_score, "low_quality": d.low_quality, "qa_sample": d.qa_sample,
            "min_confidence": d.min_confidence, "route_reason": d.route_reason, "text_source": d.text_source,
            "in_dlq": d.in_dlq, "error": (d.error or "").split("\n")[0] or None, "duplicate_of": d.duplicate_of,
            "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
            "updated_at": d.updated_at.isoformat() if d.updated_at else None,
            "lease_by": d.lease_by}


@router.get("/documents")
def list_documents(status: str | None = None, q: str | None = None, district: str | None = None,
                   limit: int = 100, offset: int = 0, user: User = Depends(require("view_docs")),
                   db: Session = Depends(get_db)):
    stmt = scope_documents(select(Document), user)
    if status:
        stmt = stmt.where(Document.status.in_(status.split(",")))
    if district:
        stmt = stmt.where(Document.district == district)
    if q:
        stmt = stmt.where(or_(Document.filename.ilike(f"%{q}%"), Document.id.startswith(q)))
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(Document.uploaded_at.desc()).limit(limit).offset(offset)).all()
    vnames = {v.id: v.name for v in db.scalars(select(Village))}
    return {"total": total, "items": [doc_summary(d, vnames) for d in rows]}


@router.get("/documents/{doc_id}")
def get_document(doc_id: str, request: Request, user: User = Depends(require("view_docs")), db: Session = Depends(get_db)):
    d = db.get(Document, doc_id)
    if not d:
        raise HTTPException(404)
    check_doc_access(user, d)
    vnames = {v.id: v.name for v in db.scalars(select(Village))}
    fields = db.scalars(select(ExtractedField).where(ExtractedField.document_id == d.id).order_by(ExtractedField.sort_key)).all()
    pages = db.scalars(select(Page).where(Page.document_id == d.id).order_by(Page.page_no)).all()
    out = doc_summary(d, vnames)
    out |= {
        "sha256": d.sha256, "year": d.year, "register_ref": d.register_ref, "gcp": d.gcp,
        "error_full": d.error, "failed_stage": d.failed_stage, "attempts": d.attempts,
        "pages": [{"page_no": p.page_no, "quality_score": p.quality_score, "skew_deg": p.skew_deg,
                   "width": p.width, "height": p.height,
                   "lines": p.lines if isinstance(p.lines, list) else None,
                   "map": p.lines if isinstance(p.lines, dict) else None} for p in pages],
        "fields": [{"id": f.id, "field_name": f.field_name, "label": f.label, "raw_value": f.raw_value,
                    "value": f.value, "final_value": f.final_value, "confidence": f.confidence,
                    "threshold": f.threshold, "bbox": f.bbox, "page_no": f.page_no, "source": f.source,
                    "model_version": f.model_version, "flags": f.flags or [], "edited": f.edited} for f in fields],
        "validations": [{"rule_code": v.rule_code, "field_name": v.field_name, "passed": v.passed,
                         "severity": v.severity, "message": v.message}
                        for v in db.scalars(select(ValidationResult).where(ValidationResult.document_id == d.id))],
        "duplicates": [{"id": c.id, "kind": c.kind, "candidate_document_id": c.candidate_document_id,
                        "candidate_record_id": c.candidate_record_id, "score": c.score, "detail": c.detail,
                        "resolution": c.resolution}
                       for c in db.scalars(select(DuplicateCandidate).where(DuplicateCandidate.document_id == d.id))],
        "events": [{"from": e.from_status, "to": e.to_status, "actor": e.actor, "note": e.note, "ts": e.ts.isoformat()}
                   for e in db.scalars(select(DocumentEvent).where(DocumentEvent.document_id == d.id).order_by(DocumentEvent.id))],
    }
    audit(db, user, "view", "document", d.id, None, request)
    db.commit()
    return out


@router.get("/documents/{doc_id}/pages/{page_no}/image")
def page_image(doc_id: str, page_no: int, kind: str = "processed", user: User = Depends(require("view_docs")),
               db: Session = Depends(get_db)):
    d = db.get(Document, doc_id)
    if not d:
        raise HTTPException(404)
    check_doc_access(user, d)
    p = db.scalars(select(Page).where(Page.document_id == doc_id, Page.page_no == page_no)).first()
    if not p:
        raise HTTPException(404)
    path = p.processed_uri if kind == "processed" else p.image_uri
    return FileResponse(path, media_type="image/png")


@router.get("/documents/{doc_id}/original")
def original(doc_id: str, request: Request, user: User = Depends(require("view_docs")), db: Session = Depends(get_db)):
    d = db.get(Document, doc_id)
    if not d:
        raise HTTPException(404)
    check_doc_access(user, d)
    audit(db, user, "download_original", "document", d.id, None, request)
    db.commit()
    return FileResponse(d.source_uri, media_type=d.mime, filename=d.filename)


@router.get("/villages")
def villages(user: User = Depends(require("view_records")), db: Session = Depends(get_db)):
    vs = db.scalars(select(Village).order_by(Village.district, Village.name_en)).all()
    return [{"id": v.id, "lgd_code": v.lgd_code, "name": v.name, "name_en": v.name_en, "tehsil": v.tehsil,
             "district": v.district, "state": v.state, "bbox": v.bbox,
             "in_jurisdiction": in_jurisdiction(user, v.state, v.district, v.tehsil)} for v in vs]
