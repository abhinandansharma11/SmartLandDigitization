"""Pipeline orchestrator — a durable, per-document state machine.

Each stage is idempotent (it replaces its own previous output), is retried with exponential backoff,
and moves the document to FAILED + dead-letter queue once retries are exhausted. On start-up, any
document left mid-pipeline is re-enqueued, so a crash never loses work. In production this module
maps 1:1 onto a Temporal workflow with one activity per stage."""
import logging
import queue
import threading
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import delete, select

from ..config import LOW_QUALITY, MAX_RETRIES, STORAGE_DIR
from ..db import SessionLocal
from ..models import (Document, DocumentEvent, DuplicateCandidate, ExtractedField, Page, ValidationResult, Village)
from . import ocr as ocr_mod
from .extract import classify
from .templates import for_state
from .mapdigitize import digitize
from .preprocess import load_gray, preprocess, save_png
from .publish import publish_map, publish_text
from .triage import line_density, split_pages
from .validate import route, validate_map, validate_text

log = logging.getLogger("pipeline")
PROCESSING = ["RECEIVED", "PREPROCESSING", "CLASSIFIED", "EXTRACTING", "VALIDATING"]
_q: "queue.Queue[str]" = queue.Queue()
_started = False


def transition(db, doc: Document, to: str, actor: str = "system", note: str | None = None):
    if doc.status == to and not note:
        return
    db.add(DocumentEvent(document_id=doc.id, from_status=doc.status, to_status=to, actor=actor, note=note))
    doc.status = to
    doc.updated_at = datetime.now(timezone.utc)


# ------------------------------------------------------------------ stages
def stage_preprocess(db, doc: Document):
    out_dir = STORAGE_DIR / "pages" / doc.id
    db.execute(delete(Page).where(Page.document_id == doc.id))
    pages = split_pages(Path(doc.source_uri), out_dir, doc.mime)
    qualities = []
    sources = set()
    for p in pages:
        page = Page(document_id=doc.id, page_no=p["page_no"], image_uri=str(p["image_path"]))
        if p["text_lines"] is not None:
            page.processed_uri = str(p["image_path"])
            page.lines = p["text_lines"]
            page.quality_score = 1.0
            rendered = load_gray(str(p["image_path"]))       # digital PDF: boxes are in rendered-pixel space
            page.width, page.height = rendered.shape[1], rendered.shape[0]
            qualities.append(1.0)
        else:
            gray = load_gray(str(p["image_path"]))
            bw, q = preprocess(gray)
            proc = out_dir / f"p{p['page_no']}_clean.png"
            save_png(str(proc), bw)
            page.processed_uri = str(proc)
            page.quality_score, page.skew_deg = q["score"], q["skew_deg"]
            page.width, page.height = bw.shape[1], bw.shape[0]
            qualities.append(q["score"])
        sources.add(p["text_source"])
        db.add(page)
    doc.quality_score = round(min(qualities), 3) if qualities else None
    doc.low_quality = bool(qualities) and min(qualities) < LOW_QUALITY
    doc.text_source = "legacy_font" if "legacy_font" in sources else ("pdf_text" if "pdf_text" in sources else "ocr")


class NeedsPerson(Exception):
    """The document is fine but cannot be finished automatically; hand it to an officer (no retries)."""


_OCR_ENGINE: dict[int, str] = {}      # page id -> engine that produced page.lines during classification


def _good_words(lines) -> int:
    """Words read with reasonable confidence: separates text pages from map sheets."""
    n = 0
    for ln in lines or []:
        for w in ln.get("words", []):
            if len(w.get("text", "").strip()) >= 2 and w.get("conf", 0) >= 50:
                n += 1
    return n


def stage_classify(db, doc: Document):
    page = db.scalars(select(Page).where(Page.document_id == doc.id).order_by(Page.page_no)).first()
    tpl = for_state(doc.state)
    if page.lines and isinstance(page.lines, list):
        text_lines = page.lines
        density = 0.0
    else:
        bw = load_gray(page.processed_uri)
        density = line_density(bw)
        if doc.doc_type_hint == "map":
            text_lines = []
        else:
            # read the whole page once here; extraction reuses it. Classifying on the full text is far
            # more reliable than on a header crop (real registers are ruled tables, often rotated titles).
            text_lines, _regions, used = ocr_mod.ocr_page(bw, tpl.tess_lang)
            weak = [l for l in text_lines if l.get("conf", 0) < 50]
            if text_lines and len(weak) / len(text_lines) > 0.3:
                # much of the page did not read upright: look for sideways title/entries
                side, angle = ocr_mod.sideways_lines(bw, tpl.tess_lang.split("+")[0])
                if side:
                    text_lines = side + text_lines           # sideways title first, it names the record
                    db.add(DocumentEvent(document_id=doc.id, from_status="CLASSIFIED", to_status="CLASSIFIED",
                                         note=f"Part of the page is turned {angle}°; read {len(side)} sideways lines too"))
            page.lines = text_lines
            db.flush()
            _OCR_ENGINE[page.id] = used
    header = " ".join(l["text"] for l in text_lines[:8])
    full = " ".join(l["text"] for l in text_lines)
    n_words = _good_words(text_lines) if text_lines else (0 if doc.doc_type_hint == "map" else 99)
    doc.doc_type, conf = classify(header + " " + full[:1500], density, n_words, doc.doc_type_hint, doc.state)
    return f"{doc.doc_type} ({conf:.0%})"


def stage_extract(db, doc: Document):
    db.execute(delete(ExtractedField).where(ExtractedField.document_id == doc.id))
    pages = db.scalars(select(Page).where(Page.document_id == doc.id).order_by(Page.page_no)).all()
    tpl = for_state(doc.state)
    version = ocr_mod.engine_version(tpl.tess_lang)
    fields = []
    if doc.doc_type == "map":
        page = pages[0]
        bw = load_gray(page.processed_uri)
        village = db.get(Village, doc.village_id) if doc.village_id else None
        extent = (doc.gcp or {}).get("bbox") or (village.bbox if village else None)
        if not extent:
            raise NeedsPerson("This looks like a map sheet, but no village was chosen, so it cannot be placed on the map. "
                              "Upload it again with the village selected, or reject it if it is not a map.")
        md = digitize(bw, extent, lang=tpl.tess_lang.split("+")[0])
        page.lines = md
        for i, p in enumerate(md["parcels"]):
            fields.append({"field_name": f"parcels.{i}.khasra_no", "label": f"Parcel {i + 1} khasra no.",
                           "raw_value": p["khasra_no"], "value": p["khasra_no"], "confidence": p["confidence"],
                           "bbox": p["bbox"], "page_no": 1, "source": "map", "note": f"{p['area_ha']:.3f} ha"})
        version = f"mapvec-1.0+{version}"
    else:
        engines = set()
        for page in pages:
            if page.lines is None or page.lines == []:
                bw = load_gray(page.processed_uri)
                lines, regions, used = ocr_mod.ocr_page(bw, tpl.tess_lang)
                page.lines = lines
                engines.add(used)
            elif doc.text_source == "ocr":
                engines.add(_OCR_ENGINE.pop(page.id, "tesseract"))
            src = "pdf" if doc.text_source in ("pdf_text", "legacy_font") else "ocr"
            fields += tpl.extract(page.lines, page.page_no, doc.district, src)
        if doc.text_source != "ocr":
            version = f"pdf-text{'+krutidev' if doc.text_source == 'legacy_font' else ''}"
        elif engines == {"tesseract-fallback"}:
            version = f"{version} (indic engine unavailable)"
        elif engines and engines != {"tesseract"}:
            version = "+".join(sorted(engines - {"tesseract-fallback"})) + f"|x-check:{version}"
            if "tesseract-fallback" in engines:
                db.add(DocumentEvent(document_id=doc.id, from_status="EXTRACTING", to_status="EXTRACTING",
                                     note="Indic OCR engine unavailable — used Tesseract for this page"))
    # a label found with nothing after it is not a reading; the field-missing check reports it instead
    fields = [f for f in fields if f.get("value") not in (None, "")]
    for i, f in enumerate(fields):
        f.pop("note", None)
        db.add(ExtractedField(document_id=doc.id, model_version=version, sort_key=i, **f))
    return f"{len(fields)} fields"


def stage_validate(db, doc: Document):
    db.execute(delete(ValidationResult).where(ValidationResult.document_id == doc.id))
    db.execute(delete(DuplicateCandidate).where(DuplicateCandidate.document_id == doc.id,
                                                DuplicateCandidate.kind != "image"))
    db.flush()
    fields = db.scalars(select(ExtractedField).where(ExtractedField.document_id == doc.id)
                        .order_by(ExtractedField.sort_key)).all()
    if doc.doc_type == "map":
        page = db.scalars(select(Page).where(Page.document_id == doc.id)).first()
        c = validate_map(db, doc, fields, page.lines or {})
    else:
        c = validate_text(db, doc, fields)
    if doc.doc_type != "map":
        before = len(c.results)
        _page_checks(db, doc, c, fields)
        c.results = c.results[before:] + c.results[:before]    # page-level explanations lead the review reason
    for r in c.results:
        db.add(ValidationResult(document_id=doc.id, **r))
    for d in c.dups:
        db.add(DuplicateCandidate(document_id=doc.id, kind=d["kind"], score=d["score"], detail=d["detail"],
                                  candidate_document_id=d.get("candidate_document_id"),
                                  candidate_record_id=d.get("candidate_record_id")))
    return c


# Words on the page that name a state. Used to catch a record from a state whose format is not set up.
STATE_MARKERS = {
    "Uttar Pradesh": ["उत्तर प्रदेश", "उ.प्र", "उ0प्र0"], "Madhya Pradesh": ["मध्य प्रदेश", "मध्यप्रदेश", "म.प्र", "म0प्र0"],
    "Rajasthan": ["राजस्थान"], "Bihar": ["बिहार"], "Chhattisgarh": ["छत्तीसगढ़"], "Haryana": ["हरियाणा"],
    "Uttarakhand": ["उत्तराखण्ड", "उत्तराखंड"], "Jharkhand": ["झारखण्ड", "झारखंड"], "Himachal Pradesh": ["हिमाचल"],
    "Maharashtra": ["महाराष्ट्र"], "Gujarat": ["ગુજરાત", "गुजरात"], "West Bengal": ["পশ্চিমবঙ্গ"], "Tamil Nadu": ["தமிழ்நாடு"],
    "Punjab": ["ਪੰਜਾਬ"],
}
SUPPORTED_STATES = {"Uttar Pradesh", "Maharashtra", "West Bengal", "Tamil Nadu", "Punjab"}


def _page_checks(db, doc: Document, c, fields):
    """Checks that need the page text rather than single fields: wrong/unsupported state, handwriting,
    and pages where almost nothing could be read. They explain *why* a record needs a person."""
    pages = db.scalars(select(Page).where(Page.document_id == doc.id)).all()
    lines = [l for p in pages for l in (p.lines if isinstance(p.lines, list) else [])]
    text = " ".join(l.get("text", "") for l in lines)
    compact = text.replace(" ", "")
    named = [st for st, keys in STATE_MARKERS.items() if any(k.replace(" ", "") in compact for k in keys)]
    other = [st for st in named if st != doc.state]
    if other and doc.state not in named:
        st = other[0]
        support = ("its format is set up, so choose one of its districts when uploading" if st in SUPPORTED_STATES
                   else "that state's record format is not set up yet, so fields may be missing or mislabelled")
        c.add("V17_STATE", False, "soft", f"The page says it is from {st}, but it was uploaded under {doc.district} "
              f"({doc.state}); {support}. Type in the key fields from the scan.")
    hw = [l for l in lines if l.get("handwriting")]
    if len(hw) >= 3 or (lines and len(hw) / len(lines) > 0.25):
        c.add("V18_HANDWRITING", False, "soft", f"{len(hw)} line{'s' if len(hw) != 1 else ''} look handwritten. Printed text "
              "is read automatically; handwritten values need to be typed in (or an HTR model enabled).")
    readable = [f for f in fields if f.value not in (None, "")]
    if len(readable) < 3:
        c.add("V19_FEW_FIELDS", False, "soft", f"Only {len(readable)} field{'s' if len(readable) != 1 else ''} could be "
              "read automatically. The full text is in the processing view; add the missing fields by hand.")


STAGES = [("PREPROCESSING", stage_preprocess), ("CLASSIFIED", stage_classify),
          ("EXTRACTING", stage_extract), ("VALIDATING", stage_validate)]


def run_document(doc_id: str):
    db = SessionLocal()
    try:
        doc = db.get(Document, doc_id)
        if not doc or doc.status not in PROCESSING:
            return
        start = PROCESSING.index(doc.status)
        # resume from the stage the document was in (idempotent stages make re-running safe)
        stages = STAGES[max(start - 1, 0):] if start > 0 else STAGES
        ctx = None
        for status, fn in stages:
            transition(db, doc, status)
            db.commit()
            for attempt in range(1, MAX_RETRIES + 1):
                try:
                    note = fn(db, doc)
                    if status == "VALIDATING":
                        ctx = note
                        note = None
                    if note:
                        db.add(DocumentEvent(document_id=doc.id, from_status=status, to_status=status, note=note))
                    db.commit()
                    break
                except NeedsPerson as e:
                    db.rollback()
                    doc = db.get(Document, doc_id)
                    doc.route_reason = str(e)
                    transition(db, doc, "MANUAL_ENTRY", note=str(e))
                    db.commit()
                    return
                except Exception as e:  # noqa: BLE001
                    db.rollback()
                    doc = db.get(Document, doc_id)
                    doc.attempts += 1
                    doc.error = f"{type(e).__name__}: {e}"
                    log.warning("stage %s failed for %s (attempt %d): %s", status, doc_id, attempt, e)
                    if attempt == MAX_RETRIES:
                        doc.failed_stage, doc.in_dlq = status, True
                        doc.error = doc.error + "\n" + traceback.format_exc(limit=3)
                        transition(db, doc, "FAILED", note=f"{status} failed after {MAX_RETRIES} attempts")
                        db.commit()
                        return
                    db.commit()
                    time.sleep(0.5 * 2 ** (attempt - 1))
        target, reason = route(db, doc, ctx)
        doc.route_reason = reason
        transition(db, doc, target, note=reason)
        if target == "AUTO_APPROVED":
            (publish_map if doc.doc_type == "map" else publish_text)(db, doc, "system")
            transition(db, doc, "PUBLISHED", note="Published automatically")
        db.commit()
    except Exception:  # noqa: BLE001
        log.exception("unexpected pipeline error for %s", doc_id)
        db.rollback()
    finally:
        db.close()


def revalidate(db, doc: Document):
    """Re-run validation after human edits (used by the review service before approval)."""
    return stage_validate(db, doc)


def enqueue(doc_id: str):
    _q.put(doc_id)


def _loop():
    from ..auth import seal_audit_chain
    from .adapters import dispatch_pending
    while True:
        try:
            doc_id = _q.get(timeout=2)
            run_document(doc_id)
        except queue.Empty:
            pass
        try:
            seal_audit_chain()
        except Exception:  # noqa: BLE001
            log.exception("audit sealing failed")
        # outbox dispatcher piggybacks on the worker loop
        db = SessionLocal()
        try:
            dispatch_pending(db)
        except Exception:  # noqa: BLE001
            log.exception("outbox dispatch failed")
        finally:
            db.close()


def start_workers(n: int = 1):
    global _started
    if _started:
        return
    _started = True
    db = SessionLocal()
    try:   # durability: resume anything interrupted by a restart
        for d in db.scalars(select(Document).where(Document.status.in_(PROCESSING))).all():
            enqueue(d.id)
    finally:
        db.close()
    for i in range(n):
        threading.Thread(target=_loop, name=f"pipeline-{i}", daemon=True).start()
