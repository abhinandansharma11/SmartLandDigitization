"""Stage 4: validation, cross-database verification, duplicate/conflict detection, confidence
scoring and routing.

Severity:
  hard  → needs a supervisor (ownership conflict with LRMS or a published record, invalid shares)
  soft  → needs a reviewer (format errors, unmatched master data, area mismatch, missing parcel)
  info  → recorded only
"""
import random
import re
from datetime import date
from fractions import Fraction

from rapidfuzz import fuzz
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import DEFAULT_THRESHOLD, QA_SAMPLE_RATE
from ..models import Document, ExtractedField, Parcel, Record, Setting, Village
from ..sample_data import DEFAULT_THRESHOLDS, NATIVE
from .templates import for_state
from .adapters import ADAPTERS, owners_match
from .extract import threshold_key

KHASRA_RE = re.compile(r"^\d{1,5}[क-ह]?(/\d{1,3})?$")      # UP default; each state's template has its own


def val(f: ExtractedField | None):
    if f is None:
        return None
    return f.final_value if f.final_value is not None else f.value


def thresholds(db: Session) -> dict:
    t = dict(DEFAULT_THRESHOLDS)
    for s in db.scalars(select(Setting).where(Setting.key.like("threshold:%"))):
        t[s.key.split(":", 1)[1]] = float(s.value)
    return t


class Ctx:
    def __init__(self, db, doc, fields):
        self.db, self.doc, self.fields = db, doc, fields
        self.by = {f.field_name: f for f in fields}
        self.results, self.dups = [], []
        for f in fields:
            f.flags = []

    def add(self, rule, passed, severity, msg, field=None):
        self.results.append({"rule_code": rule, "field_name": field, "passed": passed,
                             "severity": severity, "message": msg})
        if not passed and severity != "info" and field and field in self.by:
            f = self.by[field]
            f.flags = (f.flags or []) + [rule]

    def group(self, prefix):
        out = {}
        for f in self.fields:
            if f.field_name.startswith(prefix + "."):
                _, idx, key = f.field_name.split(".", 2)
                out.setdefault(int(idx), {})[key] = f
        return [out[k] for k in sorted(out)]


def _resolve_village(c: Ctx) -> Village | None:
    doc = c.doc
    f = c.by.get("village")
    q = select(Village).where(Village.district == doc.district)
    cands = c.db.scalars(q).all()
    if doc.village_id:
        meta = c.db.get(Village, doc.village_id)
        if f and val(f):
            s = fuzz.ratio(val(f), meta.name)
            if s >= 75:
                f.value = f.value if f.edited else meta.name
                if not f.edited:
                    f.confidence = max(f.confidence, min(99.0, 60 + s * 0.35))
                c.add("V02_VILLAGE_MASTER", True, "info", f"Village matches master '{meta.name}' (LGD {meta.lgd_code}), score {s:.0f}", "village")
            else:
                c.add("V02_VILLAGE_MASTER", False, "soft", f"Village on page '{val(f)}' differs from upload metadata '{meta.name}'", "village")
        return meta
    if not f or not val(f):
        c.add("V01_MANDATORY", False, "soft", "Village not found on the page", "village")
        return None
    ranked = sorted(cands, key=lambda v: -fuzz.ratio(val(f), v.name))
    best = ranked[0] if ranked else None
    s = fuzz.ratio(val(f), best.name) if best else 0
    runner_up = fuzz.ratio(val(f), ranked[1].name) if len(ranked) > 1 else 0
    # accept a clear match, or a weaker one that is unambiguous within the district's village list
    if best and (s >= 75 or (s >= 55 and s - runner_up >= 20)):
        if not f.edited:
            f.value = best.name
            f.confidence = max(f.confidence, min(99.0, 60 + s * 0.35))
        doc.village_id = best.id
        c.add("V02_VILLAGE_MASTER", True, "info", f"Village resolved to '{best.name}' (LGD {best.lgd_code}), score {s:.0f}", "village")
        return best
    c.add("V02_VILLAGE_MASTER", False, "soft", f"Village '{val(f)}' not found in {doc.district} master data", "village")
    return None


def validate_text(db: Session, doc: Document, fields: list[ExtractedField]) -> Ctx:
    c = Ctx(db, doc, fields)
    tpl = for_state(doc.state)
    khasra_re = re.compile(tpl.khasra_re)
    village = _resolve_village(c)

    # ---- mandatory fields
    for name in ("khata_no",):
        if not val(c.by.get(name)):
            c.add("V01_MANDATORY", False, "soft", f"{name} missing", name)
    owners, plots = c.group("owners"), c.group("plots")
    if not owners:
        c.add("V01_MANDATORY", False, "soft", "No owner found")
    if not plots:
        c.add("V01_MANDATORY", False, "soft", f"No plot ({tpl.plot_label}) found")

    # ---- metadata consistency
    for key, lookup, meta in (("tehsil", NATIVE, doc.tehsil or (village.tehsil if village else None)),
                              ("district", NATIVE, doc.district)):
        f = c.by.get(key)
        if f and val(f) and meta and meta in lookup:
            s = fuzz.ratio(val(f), lookup[meta])
            if s >= 70:
                if not f.edited:
                    f.value = lookup[meta]
                    f.confidence = max(f.confidence, 90.0)
                c.add("V03_JURISDICTION", True, "info", f"{key} matches upload metadata", key)
            else:
                c.add("V03_JURISDICTION", False, "soft", f"{key.capitalize()} on the page ('{val(f)}') does not match the upload ('{lookup[meta]}')", key)

    # ---- formats
    kf = c.by.get("khata_no")
    if kf and val(kf) and not re.fullmatch(r"\d{1,5}", val(kf)):
        c.add("V04_KHATA_FORMAT", False, "soft", f"Khata no. '{val(kf)}' is not 1-5 digits", "khata_no")
    cf = c.by.get("category")
    if cf and val(cf) and tpl.categories:
        if val(cf) in tpl.categories:
            c.add("V05_CATEGORY", True, "info", f"Category {val(cf)} is valid for {tpl.state}", "category")
        else:
            c.add("V05_CATEGORY", False, "soft", f"Category '{val(cf)}' is not one of {', '.join(tpl.categories)}", "category")
    ff = c.by.get("fasli_year")
    if ff and val(ff):
        yrs = [int(y) for y in re.findall(r"\d{4}", val(ff))]
        if not yrs or not all(1250 <= y <= 1450 for y in yrs):
            c.add("V16_FASLI_RANGE", False, "soft", f"Fasli year '{val(ff)}' outside 1250-1450", "fasli_year")

    # ---- owners & shares
    total = Fraction(0)
    share_ok = True
    for i, o in enumerate(owners):
        rel = o.get("relation")
        if rel and val(rel) not in tpl.relations:
            c.add("V10_RELATION", False, "soft", f"Owner {i + 1}: unknown relation '{val(rel)}'", rel.field_name)
        if not tpl.has_shares:
            continue
        sh = o.get("share")
        m = re.fullmatch(r"(\d+)/(\d+)", val(sh) or "")
        if not m or int(m.group(2)) == 0:
            c.add("V09_SHARE_FORMAT", False, "soft", f"Owner {i + 1}: share '{val(sh)}' unreadable", sh.field_name if sh else None)
            share_ok = False
        else:
            total += Fraction(int(m.group(1)), int(m.group(2)))
    if owners and share_ok and tpl.has_shares:
        if total == 1:
            c.add("V09_SHARES_SUM", True, "info", "Owner shares add up to 1")
        else:
            c.add("V09_SHARES_SUM", False, "hard", f"Owner shares add up to {total}, not 1",
                  owners[-1]["share"].field_name)

    # ---- plots & areas
    area_sum = 0.0
    for i, p in enumerate(plots):
        kh = p.get("khasra_no")
        if kh and not khasra_re.fullmatch(val(kh) or ""):
            c.add("V06_KHASRA_FORMAT", False, "soft", f"Plot {i + 1}: {tpl.plot_label} '{val(kh)}' has an invalid format", kh.field_name)
        a = p.get("area_ha")
        try:
            av = float(val(a))
            area_sum += av
            if not 0.001 <= av <= 50:
                c.add("V07_AREA_RANGE", False, "soft", f"Plot {i + 1}: area {av} ha is implausible", a.field_name)
        except (TypeError, ValueError):
            c.add("V07_AREA_RANGE", False, "soft", f"Plot {i + 1}: area unreadable", a.field_name if a else None)
    tf = c.by.get("total_area_ha")
    if tf and val(tf) and plots:
        try:
            if abs(float(val(tf)) - area_sum) > 0.0021:
                c.add("V08_TOTAL_AREA", False, "soft", f"Plot areas add up to {area_sum:.4f} ha but the total says {val(tf)} ha", "total_area_ha")
            else:
                c.add("V08_TOTAL_AREA", True, "info", "Plot areas add up to the total")
                for p in plots:                       # arithmetic cross-check raises trust in the areas
                    if p.get("area_ha") and not p["area_ha"].edited:
                        p["area_ha"].confidence = max(p["area_ha"].confidence, 92.0)
                tf.confidence = max(tf.confidence, 92.0)
        except ValueError:
            c.add("V08_TOTAL_AREA", False, "soft", "Total area unreadable", "total_area_ha")

    # ---- dates
    for name in ("mutation.order_date", "registration.date"):
        f = c.by.get(name)
        if f and val(f):
            m = re.fullmatch(r"(\d{1,2})-(\d{1,2})-(\d{4})", val(f))
            try:
                ok = bool(m) and date(int(m.group(3)), int(m.group(2)), int(m.group(1))) <= date.today() and int(m.group(3)) >= 1850
            except ValueError:
                ok = False
            if not ok:
                c.add("V15_DATE", False, "soft", f"{name} '{val(f)}' is not a valid past date", name)

    if doc.low_quality:
        c.add("V00_IMAGE_QUALITY", False, "info", f"Low image quality ({doc.quality_score}); compare carefully with the scan")

    khata = val(kf)
    if village and khata:
        # ---- parcels / ULPIN linkage and map-vs-text area reconciliation
        for i, p in enumerate(plots):
            kh = val(p.get("khasra_no"))
            if not kh:
                continue
            parcel = db.scalars(select(Parcel).where(Parcel.village_id == village.id, Parcel.khasra_no == kh)).first()
            if not parcel:
                c.add("V12_PARCEL_LINK", False, "soft", f"Khasra {kh} has no plot on the {village.name} map (map sheet not uploaded yet, or the number was misread)", p["khasra_no"].field_name)
                continue
            c.add("V12_PARCEL_LINK", True, "info", f"Khasra {kh} linked to ULPIN {parcel.ulpin}", p["khasra_no"].field_name)
            if not p["khasra_no"].edited:          # the number exists in the village's parcel master → corroborated
                p["khasra_no"].confidence = max(p["khasra_no"].confidence, 90.0)
            try:
                av = float(val(p.get("area_ha")))
                diff = abs(av - parcel.area_ha) / parcel.area_ha
                if diff > 0.10:
                    c.add("V13_MAP_AREA", False, "soft", f"Khasra {kh}: record area {av:.3f} ha vs map {parcel.area_ha:.3f} ha ({diff:.0%} apart)", p["area_ha"].field_name)
                else:
                    c.add("V13_MAP_AREA", True, "info", f"Khasra {kh}: record area within {diff:.1%} of map area")
            except (TypeError, ValueError):
                pass

        names = [val(o.get("name")) for o in owners if o.get("name") and val(o.get("name"))]

        # ---- cross-database verification with the state LRMS
        lrms = ADAPTERS["lrms"].lookup(village.lgd_code, khata)
        if lrms is None:
            c.add("V11_LRMS", True, "info", f"Khata {khata} is not in the state LRMS yet (new digitization)")
        else:
            s = owners_match(names, lrms["owners"])
            if s >= 85:
                c.add("V11_LRMS", True, "info", f"Owners match the state LRMS ({s:.0f}%)")
                for o in owners:            # corroborate only names that individually match the LRMS
                    if o.get("name") and not o["name"].edited and \
                            max(fuzz.token_sort_ratio(val(o["name"]), n) for n in lrms["owners"]) >= 95:
                        o["name"].confidence = max(o["name"].confidence, 92.0)
            else:
                c.add("V11_LRMS", False, "hard", f"Owners differ from the state LRMS: page has {', '.join(str(n) for n in names if n) or 'none read'}; LRMS has {', '.join(lrms['owners'])}")
                c.dups.append({"kind": "lrms_conflict", "score": s,
                               "detail": f"LRMS lists {', '.join(lrms['owners'])} for khata {khata}"})
            got = {val(p.get("khasra_no")) for p in plots}
            if set(lrms["khasras"]) != got:
                c.add("V11_LRMS_PLOTS", False, "soft", f"Khasra numbers on the page ({', '.join(sorted(str(x) for x in got if x)) or 'none read'}) differ from the state LRMS ({', '.join(lrms['khasras'])})")

        # ---- duplicates and conflicts with published records
        rec = db.scalars(select(Record).where(Record.village_id == village.id, Record.khata_no == khata,
                                              Record.is_current.is_(True))).first()
        if rec and rec.document_id != doc.id:
            s = owners_match(names, [o.name for o in rec.owners])
            if s >= 85:
                c.add("V14_DUPLICATE", False, "soft", f"Khata {khata} already published (v{rec.version}) with the same owners")
                c.dups.append({"kind": "record", "score": s, "candidate_record_id": rec.id,
                               "candidate_document_id": rec.document_id,
                               "detail": f"Published record v{rec.version} from document {rec.document_id[:8]}"})
            else:
                c.add("V14_CONFLICT", False, "hard", f"Khata {khata} already published with different owners")
                c.dups.append({"kind": "conflict", "score": s, "candidate_record_id": rec.id,
                               "candidate_document_id": rec.document_id,
                               "detail": f"Published owners: {', '.join(o.name for o in rec.owners)}"})
        # in-flight documents for the same khata
        others = db.execute(
            select(Document.id).join(ExtractedField, ExtractedField.document_id == Document.id)
            .where(Document.id != doc.id, Document.village_id == village.id,
                   Document.status.notin_(["DUPLICATE", "FAILED", "PUBLISHED", "REJECTED"]),
                   ExtractedField.field_name == "khata_no", ExtractedField.value == khata)).scalars().all()
        for oid in set(others):
            c.add("V14_DUPLICATE", False, "soft", f"Another upload ({oid[:8]}) for khata {khata} is still being reviewed")
            c.dups.append({"kind": "record", "score": 100, "candidate_document_id": oid,
                           "detail": "Same village + khata in another in-flight document"})
    return c


def validate_map(db: Session, doc: Document, fields: list[ExtractedField], mapdata: dict) -> Ctx:
    c = Ctx(db, doc, fields)
    if not doc.village_id:
        c.add("M01_VILLAGE", False, "soft", "Map sheet has no village selected; choose one so the plots can be placed on the map")
    seen = {}
    for f in fields:
        if not f.field_name.endswith("khasra_no"):
            continue
        kh = val(f)
        if not kh or not re.fullmatch(for_state(doc.state).khasra_re, kh):
            c.add("M02_KHASRA", False, "soft", f"Parcel label '{kh}' unreadable", f.field_name)
        elif kh in seen:
            c.add("M03_DUP_KHASRA", False, "soft", f"Khasra {kh} labelled on two polygons", f.field_name)
        seen[kh] = f
        if kh and doc.village_id:
            ex = db.scalars(select(Parcel).where(Parcel.village_id == doc.village_id, Parcel.khasra_no == kh)).first()
            if ex and ex.source_document_id != doc.id:
                c.add("M04_EXISTS", False, "info", f"Khasra {kh} already has a plot outline; this sheet will replace it", f.field_name)
    for issue in mapdata.get("topology_issues", []):
        c.add("M05_TOPOLOGY", False, "soft", issue)
    if not mapdata.get("topology_issues"):
        c.add("M05_TOPOLOGY", True, "info", f"No overlaps; sheet coverage {mapdata.get('coverage', 0):.1%}")
    return c


def route(db: Session, doc: Document, c: Ctx, qa_rate: float = QA_SAMPLE_RATE) -> tuple[str, str]:
    th = thresholds(db)
    low = []
    for f in c.fields:
        f.threshold = th.get(threshold_key(f.field_name), DEFAULT_THRESHOLD)
        if f.flags:
            f.confidence = min(f.confidence, 50.0)
        if f.source != "system" and f.confidence < f.threshold:
            low.append(f.label)
    confs = [f.confidence for f in c.fields] or [0]
    doc.min_confidence = min(confs)
    hard = [r["message"] for r in c.results if not r["passed"] and r["severity"] == "hard"]
    soft = [r["message"] for r in c.results if not r["passed"] and r["severity"] == "soft"]
    if hard:
        return "SUPERVISOR", "Supervisor needed: " + "; ".join(hard[:3])
    if low or soft:
        parts = []
        page_level = [r["message"] for r in c.results if not r["passed"] and r["rule_code"] in ("V17_STATE", "V18_HANDWRITING", "V19_FEW_FIELDS")]
        if page_level:
            parts.append(" ".join(page_level))
            soft = [m for m in soft if m not in page_level]
        if low:
            parts.append(f"Low confidence in {len(low)} field{'s' if len(low) != 1 else ''}: " + ", ".join(low[:4]))
        if soft:
            parts.append("; ".join(soft[:3]))
        return "IN_REVIEW", " | ".join(parts)
    if random.random() < qa_rate:
        doc.qa_sample = True
        return "IN_REVIEW", "Random QA sample of an auto-approvable record"
    return "AUTO_APPROVED", "All fields above threshold and all rules passed"
