"""Human-in-the-loop verification: queue with leases, field edits with reason codes (append-only
audit), maker-checker approval, rejection, manual entry."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from sqlalchemy import case, select
from sqlalchemy.orm import Session

from ..auth import audit, check_doc_access, require, scope_documents
from ..db import get_db
from ..models import Document, DuplicateCandidate, ExtractedField, FieldAudit, User, ValidationResult
from ..pipeline.publish import export_labels, publish_map, publish_text
from ..pipeline.textutil import norm_digits
from ..pipeline.worker import enqueue, revalidate, transition
from .documents import doc_summary

router = APIRouter(prefix="/api/v1/review", tags=["review"])
LEASE = timedelta(minutes=20)
REASON_CODES = {"OCR_ERROR": "OCR misread", "MISSING": "Value missing on extraction", "WRONG_FIELD": "Mapped to wrong field",
                "SOURCE_UNCLEAR": "Source illegible (best reading)", "MASTER_DATA": "Corrected to master data",
                "CONFIRMED": "Confirmed as correct"}
SENSITIVE = ("owners.", "plots.", "khata_no", "total_area_ha")   # changes here need supervisor approval


def _now():
    return datetime.now(timezone.utc)


def _aware(dt):
    return dt.replace(tzinfo=timezone.utc) if dt and dt.tzinfo is None else dt


def _get(db, doc_id, user) -> Document:
    d = db.get(Document, doc_id)
    if not d:
        raise HTTPException(404)
    check_doc_access(user, d)
    return d


def _check_lease(d: Document, user: User):
    if d.lease_by and d.lease_by != user.id and _aware(d.lease_until) and _aware(d.lease_until) > _now():
        raise HTTPException(409, "Another officer has this document open")


@router.get("/reason-codes")
def reason_codes():
    return REASON_CODES


@router.get("/queue")
def queue(kind: str = "review", user: User = Depends(require("review")), db: Session = Depends(get_db)):
    """review → IN_REVIEW (reviewers); supervisor → SUPERVISOR + MANUAL_ENTRY; ordered lowest-confidence, oldest first."""
    statuses = ["SUPERVISOR", "MANUAL_ENTRY"] if kind == "supervisor" else ["IN_REVIEW"]
    if kind == "supervisor" and user.role not in ("supervisor", "super_admin"):
        raise HTTPException(403, "Supervisor queue is for supervisors")
    stmt = scope_documents(select(Document).where(Document.status.in_(statuses)), user)
    if user.role == "gis_reviewer":
        stmt = stmt.where(Document.doc_type == "map")
    stmt = stmt.order_by(case((Document.qa_sample.is_(True), 1), else_=0), Document.min_confidence.asc().nulls_last(),
                         Document.uploaded_at.asc())
    rows = db.scalars(stmt).all()
    out = []
    for d in rows:
        s = doc_summary(d)
        s["leased_by_me"] = d.lease_by == user.id
        s["locked"] = bool(d.lease_by and d.lease_by != user.id and _aware(d.lease_until) and _aware(d.lease_until) > _now())
        out.append(s)
    return out


@router.post("/{doc_id}/claim")
def claim(doc_id: str, request: Request, user: User = Depends(require("review")), db: Session = Depends(get_db)):
    d = _get(db, doc_id, user)
    _check_lease(d, user)
    d.lease_by, d.lease_until = user.id, _now() + LEASE
    audit(db, user, "claim", "document", d.id, None, request)
    db.commit()
    return {"lease_until": d.lease_until.isoformat()}


@router.post("/{doc_id}/release")
def release(doc_id: str, user: User = Depends(require("review")), db: Session = Depends(get_db)):
    d = _get(db, doc_id, user)
    if d.lease_by == user.id:
        d.lease_by = d.lease_until = None
        db.commit()
    return {"ok": True}


@router.patch("/{doc_id}/fields/{field_id}")
def edit_field(doc_id: str, field_id: int, request: Request, body: dict = Body(...),
               user: User = Depends(require("review")), db: Session = Depends(get_db)):
    d = _get(db, doc_id, user)
    if d.status not in ("IN_REVIEW", "SUPERVISOR", "MANUAL_ENTRY"):
        raise HTTPException(409, f"This document is {d.status.replace('_', ' ').lower()} and can no longer be edited")
    _check_lease(d, user)
    f = db.get(ExtractedField, field_id)
    if not f or f.document_id != d.id:
        raise HTTPException(404)
    reason = body.get("reason_code")
    if reason not in REASON_CODES:
        raise HTTPException(400, "reason_code required: " + ", ".join(REASON_CODES))
    new = body.get("value")
    new = norm_digits(new).strip() if isinstance(new, str) else new
    old = f.final_value if f.final_value is not None else f.value
    if reason == "CONFIRMED":
        new = old
    db.add(FieldAudit(field_id=f.id, document_id=d.id, user_id=user.id, field_name=f.field_name, old_value=old,
                      new_value=new, reason_code=reason, model_version=f.model_version))
    f.final_value = new
    f.edited = f.edited or (new != f.value)
    f.confidence = 100.0                    # human-verified
    f.flags = []
    d.lease_by, d.lease_until = user.id, _now() + LEASE
    audit(db, user, "edit_field", "field", f.id, {"document": d.id, "field": f.field_name, "old": old, "new": new,
                                                   "reason": reason}, request)
    db.commit()
    return {"id": f.id, "final_value": f.final_value, "confidence": f.confidence}


@router.post("/{doc_id}/fields")
def add_field(doc_id: str, request: Request, body: dict = Body(...), user: User = Depends(require("review")),
              db: Session = Depends(get_db)):
    """Add a field the extractor missed (e.g. a second owner, or a whole record in MANUAL_ENTRY)."""
    d = _get(db, doc_id, user)
    _check_lease(d, user)
    name, value = body.get("field_name"), body.get("value")
    if not name:
        raise HTTPException(400, "field_name required")
    f = ExtractedField(document_id=d.id, field_name=name, label=body.get("label") or name, raw_value=None, value=None,
                       final_value=norm_digits(value or ""), confidence=100.0, source="human",
                       model_version="human", edited=True, sort_key=999, page_no=body.get("page_no", 1),
                       bbox=body.get("bbox"))
    db.add(f)
    db.flush()
    db.add(FieldAudit(field_id=f.id, document_id=d.id, user_id=user.id, field_name=name, old_value=None,
                      new_value=f.final_value, reason_code="MISSING"))
    audit(db, user, "add_field", "field", f.id, {"document": d.id, "field": name, "value": value}, request)
    db.commit()
    return {"id": f.id}


def _publish(db, d: Document, user: User):
    try:
        (publish_map if d.doc_type == "map" else publish_text)(db, d, user.username)
    except ValueError as e:            # data problem the officer can fix, not a server error
        db.rollback()
        raise HTTPException(409, str(e))
    transition(db, d, "PUBLISHED", actor=user.username, note="Published after human verification")
    d.lease_by = d.lease_until = None
    db.flush()
    n = export_labels(db, d)
    return n


@router.post("/{doc_id}/approve")
def approve(doc_id: str, request: Request, body: dict = Body(default={}), user: User = Depends(require("review")),
            db: Session = Depends(get_db)):
    d = _get(db, doc_id, user)
    _check_lease(d, user)
    comment = (body or {}).get("comment")
    if d.status == "IN_REVIEW":
        # every field must now be at/above threshold (reviewer confirmed or corrected it)
        c = revalidate(db, d)
        db.flush()
        low = [f.label for f in d.fields if f.confidence < f.threshold and f.value not in (None, "")]
        if low:
            raise HTTPException(409, "Confirm or correct these flagged fields first: " + ", ".join(low[:6]))
        hard = [r["message"] for r in c.results if not r["passed"] and r["severity"] == "hard"]
        soft = [r["message"] for r in c.results if not r["passed"] and r["severity"] == "soft"]
        sensitive = db.scalars(select(FieldAudit).where(FieldAudit.document_id == d.id)).all()
        sensitive = [a for a in sensitive if a.field_name.startswith(SENSITIVE) and a.old_value != a.new_value]
        if hard or sensitive:
            why = hard[:2] + [f"{len(sensitive)} correction{'s' if len(sensitive) != 1 else ''} to owners, plots or area {'need' if len(sensitive) != 1 else 'needs'} a supervisor's approval"] * bool(sensitive)
            d.route_reason = "; ".join(why)
            transition(db, d, "SUPERVISOR", actor=user.username, note=d.route_reason)
            d.lease_by = d.lease_until = None
            audit(db, user, "escalate", "document", d.id, {"reasons": why, "comment": comment}, request)
            db.commit()
            return {"status": d.status, "reason": d.route_reason}
        if soft and not comment:
            raise HTTPException(409, "Some checks still show warnings. Add a comment to approve anyway: " + "; ".join(soft[:3]))
        n = _publish(db, d, user)
        audit(db, user, "approve", "document", d.id, {"comment": comment, "warnings": soft, "labels": n}, request)
        db.commit()
        return {"status": d.status}
    if d.status in ("SUPERVISOR", "MANUAL_ENTRY"):
        if user.role not in ("supervisor", "super_admin"):
            raise HTTPException(403, "Only a supervisor can approve this document")
        # maker-checker: the supervisor cannot sign off their own ownership corrections
        own = db.scalars(select(FieldAudit).where(FieldAudit.document_id == d.id, FieldAudit.user_id == user.id)).all()
        own = [a for a in own if a.field_name.startswith(SENSITIVE) and a.old_value != a.new_value]
        if own and user.role != "super_admin":
            raise HTTPException(409, "You corrected owner, plot or area fields yourself, so another supervisor must approve")
        c = revalidate(db, d)
        hard = [r["message"] for r in c.results if not r["passed"] and r["severity"] == "hard"]
        if hard and not comment:
            raise HTTPException(409, "Blocking checks still fail. Write a justification in the comment box to override: " + "; ".join(hard[:3]))
        for dup in db.scalars(select(DuplicateCandidate).where(DuplicateCandidate.document_id == d.id,
                                                               DuplicateCandidate.resolution == "open")):
            dup.resolution = "overridden"
        n = _publish(db, d, user)
        audit(db, user, "supervisor_approve", "document", d.id, {"comment": comment, "overrides": hard, "labels": n}, request)
        db.commit()
        return {"status": d.status}
    raise HTTPException(409, f"This document is {d.status.replace('_', ' ').lower()} and cannot be approved")


@router.post("/{doc_id}/reject")
def reject(doc_id: str, request: Request, body: dict = Body(...), user: User = Depends(require("review")),
           db: Session = Depends(get_db)):
    d = _get(db, doc_id, user)
    reason = (body or {}).get("reason")
    if not reason:
        raise HTTPException(400, "reason required")
    transition(db, d, "REJECTED", actor=user.username, note=reason)
    d.lease_by = d.lease_until = None
    audit(db, user, "reject", "document", d.id, {"reason": reason}, request)
    db.commit()
    return {"status": d.status}


@router.post("/{doc_id}/send-back")
def send_back(doc_id: str, request: Request, body: dict = Body(default={}), user: User = Depends(require("supervise")),
              db: Session = Depends(get_db)):
    d = _get(db, doc_id, user)
    if d.status not in ("SUPERVISOR", "MANUAL_ENTRY"):
        raise HTTPException(409, "Only supervisor-stage documents can be sent back")
    note = (body or {}).get("comment") or "Sent back for correction"
    transition(db, d, "IN_REVIEW", actor=user.username, note=note)
    d.route_reason = note
    d.lease_by = d.lease_until = None
    audit(db, user, "send_back", "document", d.id, {"comment": note}, request)
    db.commit()
    return {"status": d.status}


@router.post("/{doc_id}/manual-entry")
def manual_entry(doc_id: str, request: Request, user: User = Depends(require("review")), db: Session = Depends(get_db)):
    """Page is unreadable: switch to typing the record in; always ends at a supervisor."""
    d = _get(db, doc_id, user)
    transition(db, d, "MANUAL_ENTRY", actor=user.username, note="Marked for manual data entry")
    d.lease_by, d.lease_until = user.id, _now() + LEASE
    audit(db, user, "manual_entry", "document", d.id, None, request)
    db.commit()
    return {"status": d.status}


@router.post("/{doc_id}/reprocess")
def reprocess(doc_id: str, request: Request, user: User = Depends(require("review")), db: Session = Depends(get_db)):
    d = _get(db, doc_id, user)
    if d.status in ("PUBLISHED",):
        raise HTTPException(409, "Published documents cannot be reprocessed")
    transition(db, d, "RECEIVED", actor=user.username, note="Re-run pipeline")
    d.in_dlq, d.error, d.failed_stage = False, None, None
    db.commit()
    enqueue(d.id)
    return {"status": d.status}
