"""Analytics: processing volume, accuracy, validation status, backlog, errors, geographic progress."""
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import require, scope_documents
from ..db import get_db
from ..models import Document, DocumentEvent, ExtractedField, FieldAudit, User, ValidationResult, Village

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


def _aware(dt):
    return dt.replace(tzinfo=timezone.utc) if dt and dt.tzinfo is None else dt


@router.get("/summary")
def summary(district: str | None = None, user: User = Depends(require("dashboard")), db: Session = Depends(get_db)):
    stmt = scope_documents(select(Document), user)
    if district:
        stmt = stmt.where(Document.district == district)
    docs = db.scalars(stmt).all()
    ids = [d.id for d in docs]
    now = datetime.now(timezone.utc)
    status = Counter(d.status for d in docs)
    published = [d for d in docs if d.status == "PUBLISHED"]

    # extraction accuracy = share of machine-extracted fields a human left unchanged, measured on
    # human-verified documents (reviewed + QA-sampled). Auto-approved docs are only counted via QA samples.
    fields = db.scalars(select(ExtractedField).where(ExtractedField.document_id.in_(ids))).all() if ids else []
    reviewed_docs = {a.document_id for a in db.scalars(select(FieldAudit).where(FieldAudit.document_id.in_(ids)))} if ids else set()
    pub_events = db.scalars(select(DocumentEvent).where(DocumentEvent.document_id.in_(ids),
                                                        DocumentEvent.to_status == "PUBLISHED")).all() if ids else []
    auto_ids = {e.document_id for e in pub_events if e.actor == "system"}
    reviewed_docs |= {e.document_id for e in pub_events if e.actor != "system"}
    verified = [f for f in fields if f.document_id in reviewed_docs and f.source != "human"]
    correct = [f for f in verified if not f.edited]
    by_field = defaultdict(lambda: [0, 0])
    for f in verified:
        k = f.field_name.split(".")[-1] if "." in f.field_name else f.field_name
        by_field[k][0] += 1
        by_field[k][1] += 0 if f.edited else 1
    qa = [d for d in docs if d.qa_sample and d.id in reviewed_docs]
    qa_fields = [f for f in fields if f.document_id in {d.id for d in qa} and f.source != "human"]

    conf_hist = [0] * 10
    for f in fields:
        conf_hist[min(int(f.confidence // 10), 9)] += 1

    vals = db.scalars(select(ValidationResult).where(ValidationResult.document_id.in_(ids), ValidationResult.passed.is_(False),
                                                     ValidationResult.severity != "info")).all() if ids else []
    errors = Counter(v.rule_code for v in vals)
    failed_stages = Counter(d.failed_stage for d in docs if d.status == "FAILED")

    pending = [d for d in docs if d.status in ("IN_REVIEW", "SUPERVISOR", "MANUAL_ENTRY")]
    ages = sorted(((now - _aware(d.updated_at)).total_seconds() / 3600 for d in pending))

    # geography: state → district → tehsil → village
    vmap = {v.id: v for v in db.scalars(select(Village))}
    geo = defaultdict(lambda: Counter())
    for d in docs:
        v = vmap.get(d.village_id)
        for key in (("state", d.state), ("district", f"{d.state} / {d.district}"), ("tehsil", f"{d.district}/{d.tehsil}"),
                    ("village", f"{d.district}/{d.tehsil}/{v.name_en}" if v else f"{d.district}/{d.tehsil}/(unresolved)")):
            geo[key]["total"] += 1
            geo[key]["published"] += d.status == "PUBLISHED"
            geo[key]["pending"] += d.status in ("IN_REVIEW", "SUPERVISOR", "MANUAL_ENTRY")
            geo[key]["failed"] += d.status == "FAILED"
    progress = defaultdict(list)
    for (level, name), c in sorted(geo.items()):
        progress[level].append({"name": name, **c, "pct": round(100 * c["published"] / c["total"], 1) if c["total"] else 0})

    days = []
    for i in range(13, -1, -1):
        day = (now - timedelta(days=i)).date()
        days.append({"date": day.isoformat(),
                     "uploaded": sum(1 for d in docs if _aware(d.uploaded_at).date() == day),
                     "published": sum(1 for d in published if _aware(d.updated_at).date() == day)})

    return {
        "kpis": {
            "documents": len(docs), "published": len(published),
            "auto_approved": len(auto_ids),
            "pending_review": status.get("IN_REVIEW", 0), "pending_supervisor": status.get("SUPERVISOR", 0) + status.get("MANUAL_ENTRY", 0),
            "failed": status.get("FAILED", 0), "duplicates": status.get("DUPLICATE", 0), "rejected": status.get("REJECTED", 0),
            "in_pipeline": sum(status.get(s, 0) for s in ("RECEIVED", "PREPROCESSING", "CLASSIFIED", "EXTRACTING", "VALIDATING")),
            "extraction_accuracy": round(100 * len(correct) / len(verified), 1) if verified else None,
            "verified_fields": len(verified),
            "qa_accuracy": round(100 * sum(1 for f in qa_fields if not f.edited) / len(qa_fields), 1) if qa_fields else None,
            "qa_samples": len(qa),
            "median_backlog_hours": round(ages[len(ages) // 2], 1) if ages else 0,
            "oldest_backlog_hours": round(ages[-1], 1) if ages else 0,
        },
        "status": dict(status),
        "accuracy_by_field": sorted([{"field": k, "verified": n, "accuracy": round(100 * c / n, 1)} for k, (n, c) in by_field.items()],
                                    key=lambda x: x["accuracy"]),
        "confidence_histogram": [{"bucket": f"{i * 10}-{i * 10 + 9}", "count": c} for i, c in enumerate(conf_hist)],
        "errors": [{"rule": k, "count": v} for k, v in errors.most_common(12)],
        "failed_stages": dict(failed_stages),
        "progress": progress,
        "daily": days,
        "doc_types": dict(Counter(d.doc_type or "unclassified" for d in docs)),
        "channels": dict(Counter(d.channel for d in docs)),
    }
