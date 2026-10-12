"""Auth, users, dead-letter queue, thresholds, integration outbox, audit log, learning-loop dataset."""
import hashlib
import json
from datetime import timezone
from pathlib import Path

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import PERMISSIONS, audit, audit_body, seal_audit_chain, current_user, hash_password, make_token, require, scope_documents, verify_password
from ..config import DATASET_DIR
from ..db import get_db
from ..models import AuditLog, Document, FieldAudit, IntegrationEvent, Setting, User
from ..pipeline.worker import enqueue, transition
from .documents import doc_summary

router = APIRouter(prefix="/api/v1", tags=["admin"])


# ------------------------------------------------------------------ auth
@router.post("/auth/login")
def login(request: Request, body: dict = Body(...), db: Session = Depends(get_db)):
    u = db.scalars(select(User).where(User.username == body.get("username", ""))).first()
    if not u or not u.active or not verify_password(body.get("password", ""), u.password_hash):
        audit(db, None, "login_failed", "user", body.get("username"), None, request)
        db.commit()
        raise HTTPException(401, "Invalid username or password")
    audit(db, u, "login", "user", u.id, None, request)
    db.commit()
    return {"token": make_token(u), "user": _user_out(u)}


def _user_out(u: User):
    return {"id": u.id, "username": u.username, "full_name": u.full_name, "role": u.role, "state": u.state,
            "district": u.district, "tehsil": u.tehsil, "active": u.active,
            "permissions": sorted(p for p, roles in PERMISSIONS.items() if u.role in roles)}


@router.get("/auth/me")
def me(user: User = Depends(current_user)):
    return _user_out(user)


@router.get("/users")
def users(user: User = Depends(require("admin")), db: Session = Depends(get_db)):
    stmt = select(User)
    if user.district:
        stmt = stmt.where(User.district == user.district)
    return [_user_out(u) for u in db.scalars(stmt.order_by(User.id))]


@router.post("/users")
def create_user(request: Request, body: dict = Body(...), user: User = Depends(require("admin")), db: Session = Depends(get_db)):
    role = body.get("role")
    if role not in {r for roles in PERMISSIONS.values() for r in roles}:
        raise HTTPException(400, "Unknown role")
    if role == "super_admin" and user.role != "super_admin":
        raise HTTPException(403, "Only a super admin can create super admins")
    if user.district and body.get("district") != user.district:
        raise HTTPException(403, "District admins can only create users in their district")
    if db.scalars(select(User).where(User.username == body.get("username"))).first():
        raise HTTPException(409, "Username exists")
    u = User(username=body["username"], full_name=body.get("full_name") or body["username"], role=role,
             state=body.get("state") or user.state, district=body.get("district"), tehsil=body.get("tehsil"),
             password_hash=hash_password(body.get("password") or "changeme"))
    db.add(u)
    db.flush()
    audit(db, user, "create_user", "user", u.id, {"username": u.username, "role": role}, request)
    db.commit()
    return _user_out(u)


@router.patch("/users/{uid}")
def update_user(uid: int, request: Request, body: dict = Body(...), user: User = Depends(require("admin")),
                db: Session = Depends(get_db)):
    u = db.get(User, uid)
    if not u or (user.district and u.district != user.district):
        raise HTTPException(404)
    for k in ("active", "role", "district", "tehsil", "full_name"):
        if k in body:
            setattr(u, k, body[k])
    audit(db, user, "update_user", "user", u.id, body, request)
    db.commit()
    return _user_out(u)


# ------------------------------------------------------------------ DLQ
@router.get("/admin/dlq")
def dlq(user: User = Depends(require("admin")), db: Session = Depends(get_db)):
    rows = db.scalars(scope_documents(select(Document).where(Document.in_dlq.is_(True)), user)).all()
    return [doc_summary(d) | {"failed_stage": d.failed_stage, "error_full": d.error, "attempts": d.attempts} for d in rows]


@router.post("/admin/dlq/{doc_id}/redrive")
def redrive(doc_id: str, request: Request, user: User = Depends(require("admin")), db: Session = Depends(get_db)):
    d = db.get(Document, doc_id)
    if not d or not d.in_dlq:
        raise HTTPException(404)
    d.in_dlq, d.error, d.failed_stage = False, None, None
    transition(db, d, "RECEIVED", actor=user.username, note="Re-driven from dead-letter queue")
    audit(db, user, "redrive", "document", d.id, None, request)
    db.commit()
    enqueue(d.id)
    return {"status": d.status}


@router.post("/admin/dlq/{doc_id}/manual")
def dlq_manual(doc_id: str, request: Request, user: User = Depends(require("admin")), db: Session = Depends(get_db)):
    d = db.get(Document, doc_id)
    if not d:
        raise HTTPException(404)
    d.in_dlq = False
    transition(db, d, "MANUAL_ENTRY", actor=user.username, note="Sent to manual entry from DLQ")
    audit(db, user, "dlq_manual", "document", d.id, None, request)
    db.commit()
    return {"status": d.status}


# ------------------------------------------------------------------ thresholds
@router.get("/admin/thresholds")
def get_thresholds(user: User = Depends(require("dashboard")), db: Session = Depends(get_db)):
    return {s.key.split(":", 1)[1]: float(s.value) for s in db.scalars(select(Setting).where(Setting.key.like("threshold:%")))}


@router.put("/admin/thresholds")
def put_thresholds(request: Request, body: dict = Body(...), user: User = Depends(require("system_admin")),
                   db: Session = Depends(get_db)):
    for k, v in body.items():
        v = float(v)
        if not 0 <= v <= 100:
            raise HTTPException(400, f"{k}: threshold must be 0-100")
        s = db.get(Setting, f"threshold:{k}")
        if s:
            s.value = str(v)
        else:
            db.add(Setting(key=f"threshold:{k}", value=str(v)))
    audit(db, user, "update_thresholds", "settings", None, body, request)
    db.commit()
    return get_thresholds(user, db)


# ------------------------------------------------------------------ integrations
@router.get("/admin/integration-events")
def integration_events(limit: int = 100, user: User = Depends(require("admin")), db: Session = Depends(get_db)):
    rows = db.scalars(select(IntegrationEvent).order_by(IntegrationEvent.id.desc()).limit(limit)).all()
    return [{"id": e.id, "target": e.target, "event": e.event, "payload": e.payload, "status": e.status,
             "attempts": e.attempts, "response": e.response, "created_at": e.created_at.isoformat()} for e in rows]


# ------------------------------------------------------------------ audit
@router.get("/audit")
def audit_log(action: str | None = None, username: str | None = None, entity_id: str | None = None, limit: int = 200,
              user: User = Depends(require("audit")), db: Session = Depends(get_db)):
    stmt = select(AuditLog)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if username:
        stmt = stmt.where(AuditLog.username == username)
    if entity_id:
        stmt = stmt.where(AuditLog.entity_id == entity_id)
    rows = db.scalars(stmt.order_by(AuditLog.id.desc()).limit(limit)).all()
    return [{"id": a.id, "ts": a.ts.isoformat(), "username": a.username, "action": a.action, "entity_type": a.entity_type,
             "entity_id": a.entity_id, "detail": a.detail, "ip": a.ip, "row_hash": a.row_hash} for a in rows]


@router.get("/audit/verify")
def verify_chain(user: User = Depends(require("audit")), db: Session = Depends(get_db)):
    """Recompute the hash chain; any edited or deleted row breaks it."""
    seal_audit_chain()
    db.expire_all()
    prev = "0" * 64
    n = 0
    for a in db.scalars(select(AuditLog).order_by(AuditLog.id)):
        if a.prev_hash != prev or hashlib.sha256(audit_body(prev, a).encode()).hexdigest() != a.row_hash:
            return {"ok": False, "broken_at": a.id, "checked": n}
        prev = a.row_hash
        n += 1
    return {"ok": True, "checked": n}


@router.get("/field-audit/{doc_id}")
def field_audit(doc_id: str, user: User = Depends(require("view_docs")), db: Session = Depends(get_db)):
    names = {u.id: u.username for u in db.scalars(select(User))}
    rows = db.scalars(select(FieldAudit).where(FieldAudit.document_id == doc_id).order_by(FieldAudit.id)).all()
    return [{"field": a.field_name, "old": a.old_value, "new": a.new_value, "reason": a.reason_code,
             "user": names.get(a.user_id), "model_version": a.model_version, "ts": a.ts.isoformat()} for a in rows]


# ------------------------------------------------------------------ learning loop
@router.get("/admin/learning")
def learning(user: User = Depends(require("dashboard")), db: Session = Depends(get_db)):
    total, corrected, by_field, days = 0, 0, {}, []
    for part in sorted((DATASET_DIR / "ocr").glob("*")) if (DATASET_DIR / "ocr").exists() else []:
        n = c = 0
        lf = part / "labels.jsonl"
        if lf.exists():
            for line in lf.read_text(encoding="utf-8").splitlines():
                r = json.loads(line)
                n += 1
                c += r["corrected"]
                k = r["field"].split(".")[-1]
                by_field.setdefault(k, [0, 0])
                by_field[k][0] += 1
                by_field[k][1] += r["corrected"]
        days.append({"partition": part.name, "labels": n, "corrections": c})
        total += n
        corrected += c
    edits = db.scalar(select(func.count()).select_from(FieldAudit)) or 0
    retrain_after = int(db.get(Setting, "retrain_min_labels").value) if db.get(Setting, "retrain_min_labels") else 500
    return {"dataset_dir": str(DATASET_DIR), "labels": total, "corrections": corrected, "field_edits_audited": edits,
            "partitions": days, "by_field": [{"field": k, "labels": v[0], "corrections": v[1]} for k, v in by_field.items()],
            "retrain_min_labels": retrain_after, "ready_to_retrain": total >= retrain_after,
            "note": "Corrections are exported as (image crop, text) pairs. Fine-tune OCR/NER on a GPU with these, "
                    "evaluate on a frozen gold set, register in MLflow, run in shadow mode, then promote."}
