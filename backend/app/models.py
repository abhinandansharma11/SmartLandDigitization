"""Relational model. Geometry is stored as GeoJSON text so the demo runs on SQLite;
on PostgreSQL deployments swap `Parcel.geojson` for a PostGIS geometry column."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text,
                        UniqueConstraint)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def now():
    return datetime.now(timezone.utc)


def uid():
    return uuid.uuid4().hex


# --------------------------------------------------------------------------- people & places
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True)
    full_name: Mapped[str] = mapped_column(String(128))
    role: Mapped[str] = mapped_column(String(32))          # operator|reviewer|supervisor|gis_reviewer|district_admin|state_admin|super_admin|auditor|integration
    state: Mapped[str | None] = mapped_column(String(64))
    district: Mapped[str | None] = mapped_column(String(64))
    tehsil: Mapped[str | None] = mapped_column(String(64))
    password_hash: Mapped[str] = mapped_column(String(256))
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Village(Base):
    __tablename__ = "villages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lgd_code: Mapped[str] = mapped_column(String(16), unique=True)
    name: Mapped[str] = mapped_column(String(128))         # Devanagari
    name_en: Mapped[str] = mapped_column(String(128))
    tehsil: Mapped[str] = mapped_column(String(64))
    district: Mapped[str] = mapped_column(String(64))
    state: Mapped[str] = mapped_column(String(64))
    bbox: Mapped[list | None] = mapped_column(JSON)         # [minlon, minlat, maxlon, maxlat]


# --------------------------------------------------------------------------- documents
class Document(Base):
    __tablename__ = "documents"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    filename: Mapped[str] = mapped_column(String(256))
    source_uri: Mapped[str] = mapped_column(String(512))
    sha256: Mapped[str] = mapped_column(String(64), index=True)
    phash: Mapped[str | None] = mapped_column(String(32))
    mime: Mapped[str] = mapped_column(String(64))
    channel: Mapped[str] = mapped_column(String(16), default="upload")   # upload|batch|pwa
    doc_type_hint: Mapped[str | None] = mapped_column(String(32))
    doc_type: Mapped[str | None] = mapped_column(String(32))
    state: Mapped[str] = mapped_column(String(64))
    district: Mapped[str] = mapped_column(String(64), index=True)
    tehsil: Mapped[str | None] = mapped_column(String(64))
    village_id: Mapped[int | None] = mapped_column(ForeignKey("villages.id"))
    register_ref: Mapped[str | None] = mapped_column(String(128))
    year: Mapped[str | None] = mapped_column(String(16))
    language: Mapped[str | None] = mapped_column(String(32))
    gcp: Mapped[dict | None] = mapped_column(JSON)           # map sheets: corner coordinates
    status: Mapped[str] = mapped_column(String(32), default="RECEIVED", index=True)
    route_reason: Mapped[str | None] = mapped_column(Text)
    quality_score: Mapped[float | None] = mapped_column(Float)
    low_quality: Mapped[bool] = mapped_column(Boolean, default=False)
    qa_sample: Mapped[bool] = mapped_column(Boolean, default=False)
    text_source: Mapped[str | None] = mapped_column(String(16))   # ocr|pdf_text|legacy_font
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    failed_stage: Mapped[str | None] = mapped_column(String(32))
    error: Mapped[str | None] = mapped_column(Text)
    in_dlq: Mapped[bool] = mapped_column(Boolean, default=False)
    duplicate_of: Mapped[str | None] = mapped_column(String(32))
    lease_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    min_confidence: Mapped[float | None] = mapped_column(Float)
    uploaded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

    village = relationship("Village")
    pages = relationship("Page", back_populates="document", cascade="all, delete-orphan", order_by="Page.page_no")
    fields = relationship("ExtractedField", back_populates="document", cascade="all, delete-orphan")


class Page(Base):
    __tablename__ = "pages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    page_no: Mapped[int] = mapped_column(Integer)
    image_uri: Mapped[str | None] = mapped_column(String(512))       # rendered original page
    processed_uri: Mapped[str | None] = mapped_column(String(512))   # cleaned page used for OCR
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    quality_score: Mapped[float | None] = mapped_column(Float)
    skew_deg: Mapped[float | None] = mapped_column(Float)
    lines: Mapped[list | None] = mapped_column(JSON)   # OCR lines: [{text, conf, bbox, words:[...], script, handwriting}]
    document = relationship("Document", back_populates="pages")


class ExtractedField(Base):
    __tablename__ = "extracted_fields"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    page_no: Mapped[int] = mapped_column(Integer, default=1)
    field_name: Mapped[str] = mapped_column(String(64))       # e.g. khata_no, owners.0.name, plots.1.area_ha
    label: Mapped[str] = mapped_column(String(128))
    raw_value: Mapped[str | None] = mapped_column(Text)       # exactly what OCR read
    value: Mapped[str | None] = mapped_column(Text)           # normalised machine value
    final_value: Mapped[str | None] = mapped_column(Text)     # after human review
    confidence: Mapped[float] = mapped_column(Float, default=0)
    threshold: Mapped[float] = mapped_column(Float, default=85)
    bbox: Mapped[list | None] = mapped_column(JSON)           # [x, y, w, h] on processed page
    source: Mapped[str] = mapped_column(String(16), default="ocr")
    model_version: Mapped[str] = mapped_column(String(64))
    flags: Mapped[list | None] = mapped_column(JSON)          # rule codes that failed for this field
    edited: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_key: Mapped[int] = mapped_column(Integer, default=0)
    document = relationship("Document", back_populates="fields")


class ValidationResult(Base):
    __tablename__ = "validation_results"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    rule_code: Mapped[str] = mapped_column(String(64))
    field_name: Mapped[str | None] = mapped_column(String(64))
    passed: Mapped[bool] = mapped_column(Boolean)
    severity: Mapped[str] = mapped_column(String(8))          # hard|soft|info
    message: Mapped[str] = mapped_column(Text)


class DuplicateCandidate(Base):
    __tablename__ = "duplicate_candidates"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    kind: Mapped[str] = mapped_column(String(16))             # image|record|conflict|lrms_conflict
    candidate_document_id: Mapped[str | None] = mapped_column(String(32))
    candidate_record_id: Mapped[int | None] = mapped_column(Integer)
    score: Mapped[float] = mapped_column(Float)
    detail: Mapped[str] = mapped_column(Text)
    resolution: Mapped[str] = mapped_column(String(16), default="open")


class FieldAudit(Base):
    """Append-only: the API never updates or deletes rows in this table."""
    __tablename__ = "field_audit"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    field_id: Mapped[int] = mapped_column(ForeignKey("extracted_fields.id"))
    document_id: Mapped[str] = mapped_column(String(32), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    field_name: Mapped[str] = mapped_column(String(64))
    old_value: Mapped[str | None] = mapped_column(Text)
    new_value: Mapped[str | None] = mapped_column(Text)
    reason_code: Mapped[str] = mapped_column(String(32))
    model_version: Mapped[str | None] = mapped_column(String(64))
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class DocumentEvent(Base):
    __tablename__ = "document_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[str] = mapped_column(String(32), index=True)
    from_status: Mapped[str | None] = mapped_column(String(32))
    to_status: Mapped[str] = mapped_column(String(32))
    actor: Mapped[str] = mapped_column(String(64), default="system")
    note: Mapped[str | None] = mapped_column(Text)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(Integer)
    username: Mapped[str | None] = mapped_column(String(64))
    action: Mapped[str] = mapped_column(String(48))
    entity_type: Mapped[str] = mapped_column(String(32))
    entity_id: Mapped[str | None] = mapped_column(String(64))
    detail: Mapped[dict | None] = mapped_column(JSON)
    ip: Mapped[str | None] = mapped_column(String(64))
    prev_hash: Mapped[str | None] = mapped_column(String(64))
    row_hash: Mapped[str | None] = mapped_column(String(64))   # hash chain for tamper evidence
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


# --------------------------------------------------------------------------- system of record
class Record(Base):
    __tablename__ = "records"
    __table_args__ = (UniqueConstraint("village_id", "khata_no", "version"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"))
    village_id: Mapped[int] = mapped_column(ForeignKey("villages.id"), index=True)
    khata_no: Mapped[str] = mapped_column(String(16), index=True)
    category: Mapped[str | None] = mapped_column(String(64))
    fasli_year: Mapped[str | None] = mapped_column(String(32))
    total_area_ha: Mapped[float | None] = mapped_column(Float)
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    record_hash: Mapped[str] = mapped_column(String(64))
    signature: Mapped[str] = mapped_column(String(128))      # demo HMAC standing in for DSC / eSign
    published_by: Mapped[str] = mapped_column(String(64))
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    village = relationship("Village")
    owners = relationship("Owner", cascade="all, delete-orphan")
    plots = relationship("Plot", cascade="all, delete-orphan")
    mutations = relationship("MutationEntry", cascade="all, delete-orphan")
    registrations = relationship("RegistrationEntry", cascade="all, delete-orphan")


class Owner(Base):
    __tablename__ = "owners"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    record_id: Mapped[int] = mapped_column(ForeignKey("records.id"), index=True)
    name: Mapped[str] = mapped_column(String(128))
    relation: Mapped[str | None] = mapped_column(String(16))      # पुत्र/पुत्री/पत्नी
    relative_name: Mapped[str | None] = mapped_column(String(128))
    share: Mapped[str | None] = mapped_column(String(16))
    residence: Mapped[str | None] = mapped_column(String(128))
    name_latin: Mapped[str | None] = mapped_column(String(128))   # for search


class Plot(Base):
    __tablename__ = "plots"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    record_id: Mapped[int] = mapped_column(ForeignKey("records.id"), index=True)
    khasra_no: Mapped[str] = mapped_column(String(16))
    area_ha: Mapped[float | None] = mapped_column(Float)
    area_raw: Mapped[str | None] = mapped_column(String(64))
    parcel_id: Mapped[int | None] = mapped_column(ForeignKey("parcels.id"))


class MutationEntry(Base):
    __tablename__ = "mutations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    record_id: Mapped[int] = mapped_column(ForeignKey("records.id"))
    case_no: Mapped[str | None] = mapped_column(String(64))
    order_date: Mapped[str | None] = mapped_column(String(16))
    description: Mapped[str | None] = mapped_column(Text)


class RegistrationEntry(Base):
    __tablename__ = "registrations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    record_id: Mapped[int] = mapped_column(ForeignKey("records.id"))
    deed_no: Mapped[str | None] = mapped_column(String(64))
    office: Mapped[str | None] = mapped_column(String(128))
    reg_date: Mapped[str | None] = mapped_column(String(16))


class Parcel(Base):
    __tablename__ = "parcels"
    __table_args__ = (UniqueConstraint("village_id", "khasra_no"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    village_id: Mapped[int] = mapped_column(ForeignKey("villages.id"), index=True)
    khasra_no: Mapped[str] = mapped_column(String(16))
    ulpin: Mapped[str] = mapped_column(String(14), unique=True)
    geojson: Mapped[dict] = mapped_column(JSON)
    area_ha: Mapped[float] = mapped_column(Float)
    source_document_id: Mapped[str | None] = mapped_column(String(32))
    village = relationship("Village")


class Setting(Base):
    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(Text)


class IntegrationEvent(Base):
    """Transactional outbox: rows written in the same transaction as the record, then delivered
    to external systems (LRMS, DILRMP MIS, Bhu-Naksha, webhooks) by the dispatcher."""
    __tablename__ = "integration_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    target: Mapped[str] = mapped_column(String(32))          # lrms|dilrmp_mis|bhunaksha|webhook
    event: Mapped[str] = mapped_column(String(48))
    payload: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(16), default="pending")   # pending|delivered|failed
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    response: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
