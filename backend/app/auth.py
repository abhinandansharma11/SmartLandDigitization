"""Authentication (JWT), role-based access and jurisdiction scoping, plus the hash-chained audit log."""
import hashlib
import hmac
import json
import threading
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import JWT_SECRET, JWT_TTL_MIN
from .db import get_db
from .models import AuditLog, Document, User

bearer = HTTPBearer(auto_error=False)

# What each role may do. Checked by `require()` on every protected route.
PERMISSIONS = {
    # Anyone in a tehsil/district office who handles records can scan one in; auditors stay read-only.
    "upload":        {"operator", "reviewer", "supervisor", "gis_reviewer", "integration", "district_admin", "state_admin", "super_admin"},
    "view_docs":     {"operator", "reviewer", "supervisor", "gis_reviewer", "district_admin", "state_admin", "super_admin", "auditor"},
    "review":        {"reviewer", "supervisor", "gis_reviewer", "super_admin"},
    "supervise":     {"supervisor", "super_admin"},
    "view_records":  {"operator", "reviewer", "supervisor", "gis_reviewer", "district_admin", "state_admin", "super_admin", "auditor", "integration"},
    "dashboard":     {"operator", "reviewer", "supervisor", "gis_reviewer", "district_admin", "state_admin", "super_admin", "auditor"},
    "admin":         {"district_admin", "state_admin", "super_admin"},
    "system_admin":  {"super_admin"},
    "audit":         {"auditor", "super_admin", "state_admin"},
}


# ---------------------------------------------------------------- passwords (PBKDF2, stdlib only)
def hash_password(pw: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 200_000)
    return f"pbkdf2${salt.hex()}${dk.hex()}"


def verify_password(pw: str, stored: str) -> bool:
    try:
        _, salt, digest = stored.split("$")
    except ValueError:
        return False
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 200_000)
    return hmac.compare_digest(dk.hex(), digest)


def make_token(user: User) -> str:
    payload = {
        "sub": str(user.id), "role": user.role,
        "state": user.state, "district": user.district, "tehsil": user.tehsil,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_TTL_MIN),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer),
                 request: Request = None, db: Session = Depends(get_db)) -> User:
    token = creds.credentials if creds else (request.query_params.get("token") if request else None)
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")
    user = db.get(User, int(data["sub"]))
    if not user or not user.active:
        raise HTTPException(401, "User disabled")
    return user


def require(permission: str):
    def dep(user: User = Depends(current_user)) -> User:
        if user.role not in PERMISSIONS[permission]:
            raise HTTPException(403, f"Your role ({user.role.replace('_', ' ')}) is not allowed to {permission.replace('_', ' ')}")
        return user
    return dep


# ---------------------------------------------------------------- jurisdiction (ABAC on top of RBAC)
def scope_documents(stmt, user: User):
    """Restrict a Document query to the user's state/district/tehsil."""
    if user.state:
        stmt = stmt.where(Document.state == user.state)
    if user.district:
        stmt = stmt.where(Document.district == user.district)
    if user.tehsil:
        stmt = stmt.where(Document.tehsil == user.tehsil)
    return stmt


def in_jurisdiction(user: User, state: str | None, district: str | None, tehsil: str | None = None) -> bool:
    if user.state and state != user.state:
        return False
    if user.district and district != user.district:
        return False
    if user.tehsil and tehsil and tehsil != user.tehsil:
        return False
    return True


def check_doc_access(user: User, doc: Document):
    if not in_jurisdiction(user, doc.state, doc.district, doc.tehsil):
        raise HTTPException(403, "Document outside your jurisdiction")


# ---------------------------------------------------------------- audit log with hash chain
def audit(db: Session, user: User | None, action: str, entity_type: str, entity_id=None,
          detail: dict | None = None, request: Request | None = None):
    """Append an audit row. It joins the hash chain when `seal_audit_chain()` runs after the commit:
    hashing at insert time raced when two requests (or two audits in one request) read the same
    'previous' row and forked the chain."""
    row = AuditLog(user_id=user.id if user else None, username=user.username if user else "system",
                   action=action, entity_type=entity_type, entity_id=str(entity_id) if entity_id else None,
                   detail=detail, ip=request.client.host if request and request.client else None,
                   prev_hash=None, row_hash=None, ts=datetime.now(timezone.utc))
    db.add(row)
    return row


def audit_body(prev: str, a: AuditLog) -> str:
    ts = a.ts if a.ts.tzinfo else a.ts.replace(tzinfo=timezone.utc)
    return json.dumps([prev, a.user_id, a.action, a.entity_type, str(a.entity_id), a.detail, ts.isoformat()],
                      ensure_ascii=False, sort_keys=True, default=str)


_seal_lock = threading.Lock()


def seal_audit_chain():
    """Link committed, unsealed audit rows into the chain in id order. One sealer at a time."""
    from .db import SessionLocal
    with _seal_lock:
        db = SessionLocal()
        try:
            rows = db.scalars(select(AuditLog).where(AuditLog.row_hash.is_(None)).order_by(AuditLog.id)).all()
            if not rows:
                return
            last = db.scalars(select(AuditLog).where(AuditLog.row_hash.is_not(None))
                              .order_by(AuditLog.id.desc()).limit(1)).first()
            prev = last.row_hash if last else "0" * 64
            for a in rows:
                a.prev_hash = prev
                a.row_hash = prev = hashlib.sha256(audit_body(prev, a).encode()).hexdigest()
            db.commit()
        finally:
            db.close()


def sign(payload: str) -> str:
    """Demo stand-in for DSC/eSign: HMAC over the record hash."""
    return hmac.new(JWT_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()


def migrate_audit_chain():
    """One-time: builds before v2 hashed at insert time and could fork the chain under concurrent
    requests. Re-link every existing row once, in id order, and record that it was done."""
    from .db import SessionLocal
    from .models import Setting
    db = SessionLocal()
    try:
        if db.get(Setting, "audit_chain_v2"):
            return
        for a in db.scalars(select(AuditLog)):
            a.prev_hash = a.row_hash = None
        db.add(Setting(key="audit_chain_v2", value=datetime.now(timezone.utc).isoformat()))
        db.commit()
    finally:
        db.close()
    seal_audit_chain()
