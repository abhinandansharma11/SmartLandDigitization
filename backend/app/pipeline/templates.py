"""Record-format templates: one per state / record type.

A template says which Tesseract language to use, which printed labels mark each field, how owners
and plots are laid out, which relation words appear between names, how area is written (hectare-
are-sq.m, acre/decimal, hectare-are, kanal-marla, bigha-biswa…) and what a valid plot number looks
like. Adding a state = adding one Template below (no code changes elsewhere).

The UP Khatauni keeps its dedicated extractor (extract.extract_khatauni); every other state uses the
generic, label-driven extractor in this module."""
import re
import statistics
from dataclasses import dataclass, field
from typing import Callable

from rapidfuzz import fuzz

from .textutil import norm_digits

ACRE_HA = 0.4046856
KANAL_HA = ACRE_HA / 8          # Punjab: 8 kanal = 1 acre, 20 marla = 1 kanal


# ------------------------------------------------------------------ area parsers → (hectare, note)
def _n(s: str) -> str:
    return norm_digits(s or "").replace(",", ".")


def area_hectare(text):                       # 0.405
    m = re.search(r"\d+\.\d+|\d+", _n(text))
    return (float(m.group()), "hectare") if m else (None, "unreadable")


def area_h_a_sqm(text):                        # Maharashtra / Gujarat: 1.20.50 = 1 ha 20 are 50 m²
    t = _n(text)
    m = re.search(r"(\d+)\s*\.\s*(\d{1,2})\s*\.\s*(\d{1,2})", t)
    if m:
        h, a, s = map(int, m.groups())
        return round(h + a / 100 + s / 10000, 4), f"{h} ha {a} are {s} m²"
    return area_hectare(t)


def area_ha_are(text):                         # Tamil Nadu: 0 - 45.50 = 0 ha 45.50 are
    t = _n(text)
    m = re.search(r"(\d+)\s*[-–]\s*(\d+(?:\.\d+)?)", t)
    if m:
        h, a = int(m.group(1)), float(m.group(2))
        return round(h + a / 100, 4), f"{h} ha {a} are"
    return area_hectare(t)


def area_acre(text):                           # West Bengal: 0.33 একর or 33 শতক (decimal)
    t = _n(text)
    m = re.search(r"(\d+(?:\.\d+)?)\s*শত", t)
    if m:
        dec = float(m.group(1))
        return round(dec / 100 * ACRE_HA, 4), f"{dec} decimal"
    m = re.search(r"(\d+(?:\.\d+)?)\s*(?:একর|acre)", t) or re.search(r"\d+\.\d+|\d+", t)
    if not m:
        return None, "unreadable"
    ac = float(m.group(1) if m.groups() else m.group())
    return round(ac * ACRE_HA, 4), f"{ac} acre"


def area_kanal_marla(text):                    # Punjab / Haryana: 8-10 = 8 kanal 10 marla
    t = _n(text)
    m = re.search(r"(\d+)\s*[-–]\s*(\d+)", t)
    if m:
        k, mr = int(m.group(1)), int(m.group(2))
        return round((k + mr / 20) * KANAL_HA, 4), f"{k} kanal {mr} marla"
    return None, "unreadable"


# ------------------------------------------------------------------ template
@dataclass
class Template:
    code: str
    state: str
    name: str
    doc_type: str
    tess_lang: str
    title_keywords: list[str]
    labels: dict[str, list[str]]                 # canonical field → printed label variants
    owner_header: list[str]
    plot_header: list[str]
    total_labels: list[str]
    area: Callable
    khasra_re: str
    plot_label: str = "Plot no."
    khata_label: str = "Khata no."
    relations: list[str] = field(default_factory=list)
    residence_words: list[str] = field(default_factory=list)
    has_shares: bool = False
    categories: list[str] | None = None
    mutation_labels: list[str] = field(default_factory=list)
    stop_labels: list[str] = field(default_factory=list)      # printed labels we don't extract (J.L. no., year…)
    extractor: Callable | None = None            # custom extractor (UP)

    def extract(self, lines, page_no, district, source="ocr"):
        if self.extractor:
            return self.extractor(lines, page_no, district, source)
        return generic_extract(self, lines, page_no, district, source)


# ------------------------------------------------------------------ generic extractor
def _clean(w: str) -> str:
    return w.replace("\u200c", "").replace("\u200d", "").strip(":;।|,.")


def _is_colon(w: str) -> bool:
    return w.rstrip().endswith((":", ";", ".")) or w in (":", ";", ".")


def _find_label(words, label: str, start=0, threshold=72, need_colon=None):
    """Index just after `label` (possibly multi-word) in `words`, fuzzy per word; else None.
    Labels printed as "label:" are preferred, so a label word inside a title doesn't match."""
    parts = label.split()
    passes = [True, False] if need_colon is None else [need_colon]
    for colon in passes:
        for i in range(start, len(words) - len(parts) + 1):
            scores = [fuzz.ratio(p, _clean(words[i + k]["text"])) for k, p in enumerate(parts)]
            # with a colon we can be strict (avoids வட்டம் matching மாவட்டம்); without, allow OCR noise
            if statistics.mean(scores) < (90 if colon else threshold):
                continue
            last = words[i + len(parts) - 1]["text"]
            nxt = words[i + len(parts)]["text"] if i + len(parts) < len(words) else ""
            if colon and not (_is_colon(last) or _is_colon(nxt[:1])):
                continue
            return i + len(parts)
    return None


def _span(words):
    if not words:
        return None, 0.0, None
    text = " ".join(w["text"] for w in words)
    conf = statistics.mean(w["conf"] for w in words)
    x0 = min(w["bbox"][0] for w in words); y0 = min(w["bbox"][1] for w in words)
    x1 = max(w["bbox"][0] + w["bbox"][2] for w in words); y1 = max(w["bbox"][1] + w["bbox"][3] for w in words)
    return text, round(conf, 1), [x0, y0, x1 - x0, y1 - y0]


def _f(name, label, raw, value, conf, bbox, page_no, source, note=None):
    d = {"field_name": name, "label": label, "raw_value": raw, "value": value, "confidence": float(conf),
         "bbox": bbox, "page_no": page_no, "source": source}
    if note:
        d["note"] = note
    return d


def _line_has(line, keys, threshold=78):
    return any(fuzz.partial_ratio(k, line["text"]) >= threshold for k in keys)


def _best_line(lines, keys, after=-1, threshold=78):
    """Index of the line that best matches any of `keys` (headers often share words with other labels)."""
    best, best_s = None, threshold - 0.01
    for i, l in enumerate(lines):
        if i <= after:
            continue
        s = max(fuzz.partial_ratio(k, l["text"]) for k in keys)
        if s > best_s:
            best, best_s = i, s
    return best


FRACTION = re.compile(r"^\d+\s*/\s*\d+$")
DATE = re.compile(r"(\d{1,2})[-./](\d{1,2})[-./](\d{4})")


def generic_extract(t: Template, lines, page_no, district, source="ocr"):
    out = []
    lines = [l for l in lines if l.get("words")]
    all_labels = [lab for labs in t.labels.values() for lab in labs] + t.stop_labels

    # ---- key: value fields (several may share one printed line)
    for name, labs in t.labels.items():
        found = False
        for ln, colon in [(ln, c) for c in (True, False) for ln in lines]:
            ws = ln["words"]
            for lab in labs:
                j = _find_label(ws, lab, need_colon=colon)
                if j is None:
                    continue
                # value runs until the next known label on the same line
                end = len(ws)
                for other in all_labels:
                    if other in labs:
                        continue
                    k = _find_label(ws, other, start=j)
                    if k is not None:
                        end = min(end, k - len(other.split()))
                vals = []
                for w in ws[j:end]:
                    if vals and _is_colon(w["text"]) and len(_clean(w["text"])) > 1:
                        break                       # "something:" = an unrecognised next label
                    if _clean(w["text"]):
                        vals.append(w)
                if not vals:
                    continue
                raw, conf, bbox = _span(vals)
                raw_c = " ".join(_clean(w["text"]) for w in vals).strip()
                if name == "khata_no":
                    nums = re.findall(r"\d+", norm_digits(raw_c))
                    value = (nums[-1].lstrip("0") or "0") if nums else None
                elif name == "category":
                    m = re.search(r"\d", norm_digits(raw_c))
                    value = m.group() if m else raw_c
                else:
                    value = raw_c
                label = {"village": "Village", "tehsil": "Tehsil / Taluka", "district": "District",
                         "khata_no": t.khata_label, "category": "Occupant class / category"}.get(name, name)
                out.append(_f(name, label, raw, value, conf, bbox, page_no, source))
                found = True
                break
            if found:
                break

    # ---- owners: rows between the owner header and the plot header
    ph = _best_line(lines, t.plot_header)
    start = _best_line(lines[:ph] if ph is not None else lines, t.owner_header)
    start = -1 if start is None else start
    end = ph if ph is not None and ph > start else len(lines)
    if ph is None:   # header unreadable: the plot table starts at the first "plot-no  area" row
        kre = re.compile(t.khasra_re)
        for i, l in enumerate(lines):
            w0 = l["words"][0]["text"] if l["words"] else ""
            k0 = re.sub(r"[^0-9/A-Za-z\u0900-\u097F]", "", norm_digits(_clean(w0))).upper()
            if i > max(start, 0) and len(l["words"]) >= 2 and not re.fullmatch(r"\d{1,2}", k0) and kre.fullmatch(k0) \
                    and t.area(" ".join(w["text"] for w in l["words"][1:]))[0] is not None:
                ph = i - 1
                end = min(end, ph)
                break
    idx = 0
    for ln in lines[start + 1:end]:
        ws = [w for w in ln["words"] if _clean(w["text"])]
        if not ws or any(_find_label(ws, lab, need_colon=True) is not None for lab in all_labels):
            continue
        serial = bool(re.fullmatch(r"\d{1,3}[.)]?", norm_digits(_clean(ws[0]["text"]))))
        has_rel = any(fuzz.ratio(r, _clean(w["text"])) >= 80 for w in ws for r in t.relations)
        has_share = bool(FRACTION.match(norm_digits(_clean(ws[-1]["text"]))))
        if not (serial or has_rel or has_share) or (start < 0 and not (has_rel or has_share)):
            continue                                     # titles / stray text are not owner rows
        if serial or len(_clean(ws[0]["text"])) <= 1:
            ws = ws[1:]                                  # serial number
        share_w = ws[-1] if ws and FRACTION.match(norm_digits(_clean(ws[-1]["text"]))) else None
        if share_w:
            ws = ws[:-1]
        rel_i = next((i for i, w in enumerate(ws) if any(fuzz.ratio(r, _clean(w["text"])) >= 80 for r in t.relations)), None)
        res_i = next((i for i, w in enumerate(ws) if any(fuzz.ratio(r, _clean(w["text"])) >= 80 for r in t.residence_words)), None)
        name_ws = ws[:rel_i] if rel_i is not None else ws[:res_i]
        if not name_ws:
            continue
        p = f"owners.{idx}."
        raw, conf, bbox = _span(name_ws)
        out.append(_f(p + "name", f"Owner {idx + 1} name", raw, " ".join(_clean(w["text"]) for w in name_ws), conf, bbox, page_no, source))
        if rel_i is not None:
            rw = ws[rel_i]
            rel = max(t.relations, key=lambda r: fuzz.ratio(r, _clean(rw["text"])))
            out.append(_f(p + "relation", f"Owner {idx + 1} relation", rw["text"], rel, rw["conf"], rw["bbox"], page_no, source))
            rel_ws = ws[rel_i + 1: res_i if res_i and res_i > rel_i else len(ws)]
            raw, conf, bbox = _span(rel_ws)
            if raw:
                out.append(_f(p + "relative_name", f"Owner {idx + 1} father/husband", raw, raw, conf, bbox, page_no, source))
        if res_i is not None:
            raw, conf, bbox = _span(ws[res_i + 1:])
            if raw:
                out.append(_f(p + "residence", f"Owner {idx + 1} residence", raw, raw, conf, bbox, page_no, source))
        if t.has_shares:
            if share_w:
                out.append(_f(p + "share", f"Owner {idx + 1} share", share_w["text"],
                              re.sub(r"\s", "", norm_digits(_clean(share_w["text"]))), share_w["conf"], share_w["bbox"], page_no, source))
            else:
                out.append(_f(p + "share", f"Owner {idx + 1} share", None, None, 0.0, None, page_no, source))
        idx += 1

    # ---- plots: rows after the plot header until the total line
    if ph is not None:
        idx = 0
        for ln in lines[ph + 1:]:
            if _line_has(ln, t.total_labels, 85):
                break
            ws = [w for w in ln["words"] if _clean(w["text"])]
            if len(ws) < 2 or not re.search(r"\d", norm_digits(ws[0]["text"])):
                continue
            kw = ws[0]
            kh = re.sub(r"[^0-9/A-Za-zऀ-ॿ]", "", norm_digits(_clean(kw["text"]))).upper()
            p = f"plots.{idx}."
            out.append(_f(p + "khasra_no", f"Plot {idx + 1} {t.plot_label}", kw["text"], kh, kw["conf"], kw["bbox"], page_no, source))
            raw, conf, bbox = _span(ws[1:])
            ha, note = t.area(raw)
            out.append(_f(p + "area_ha", f"Plot {idx + 1} area (ha)", raw, None if ha is None else f"{ha:.4f}",
                          conf, bbox, page_no, "derived", note))
            idx += 1

    # ---- total
    for ln in lines:
        ws = ln["words"]
        j = next((_find_label(ws, lab) for lab in t.total_labels if _find_label(ws, lab) is not None), None)
        if j is None:
            continue
        rest = ws[j:]
        raw, conf, bbox = _span(rest)
        ha, note = t.area(raw or "")
        if ha is not None:
            out.append(_f("total_area_ha", "Total area (ha)", raw, f"{ha:.4f}", conf, bbox, page_no, "derived", note))
        break

    # ---- mutation
    for ln in lines:
        ws = ln["words"]
        j = next((_find_label(ws, lab) for lab in t.mutation_labels if _find_label(ws, lab) is not None), None)
        if j is None:
            continue
        raw, conf, bbox = _span(ws[j:])
        txt = norm_digits(raw or "")
        m = re.search(r"\d+(?:/\d+)?", txt)
        d = DATE.search(txt)
        out.append(_f("mutation.case_no", "Mutation no.", m.group() if m else None, m.group() if m else None, conf if m else 0, bbox, page_no, source))
        if d:
            out.append(_f("mutation.order_date", "Mutation date", d.group(), "-".join(d.groups()), conf, bbox, page_no, source))
        break
    return out


# ------------------------------------------------------------------ registry
def _up_extractor(lines, page_no, district, source):
    from .extract import extract_khatauni
    return extract_khatauni(lines, page_no, district, source)


TEMPLATES: dict[str, Template] = {
    "Uttar Pradesh": Template(
        code="UP_KHATAUNI", state="Uttar Pradesh", name="Khatauni (RoR)", doc_type="khatauni", tess_lang="hin",
        title_keywords=["खतौनी", "खतोनी", "अधिकार अभिलेख"], labels={}, owner_header=[], plot_header=[],
        total_labels=["योग"], area=area_hectare, khasra_re=r"^\d{1,5}[क-ह]?(/\d{1,3})?$",
        plot_label="khasra/gata no.", khata_label="Khata no.",
        relations=["पुत्र", "पुत्री", "पत्नी", "पुत्रवधू", "विधवा"], residence_words=["निवासी"], has_shares=True,
        categories=["1-क", "1-ख", "2", "3", "4", "5", "6"], mutation_labels=["नामांतरण"], extractor=_up_extractor),
    "Maharashtra": Template(
        code="MH_712", state="Maharashtra", name="7/12 extract (Satbara)", doc_type="satbara", tess_lang="mar",
        title_keywords=["सातबारा", "गाव नमुना सात", "७/१२", "अधिकार अभिलेख पत्रक"],
        labels={"village": ["गाव"], "tehsil": ["तालुका"], "district": ["जिल्हा"],
                "khata_no": ["खाते क्रमांक", "खाता क्रमांक"], "category": ["भोगवटादार वर्ग"]},
        owner_header=["भोगवटादाराचे नाव"], plot_header=["गट क्रमांक", "भूमापन क्रमांक"],
        total_labels=["एकूण क्षेत्र", "एकूण"], area=area_h_a_sqm, khasra_re=r"^\d{1,5}(/\d{1,3}[क-हA-Z]?)?[क-ह]?$",
        plot_label="gat / survey no.", khata_label="Khate no.", categories=["1", "2"],
        mutation_labels=["फेरफार क्रमांक"]),
    "West Bengal": Template(
        code="WB_KHATIAN", state="West Bengal", name="Khatian (RoR)", doc_type="khatian", tess_lang="ben",
        title_keywords=["খতিয়ান", "রেকর্ড অফ রাইটস"],
        labels={"village": ["মৌজা"], "tehsil": ["থানা", "ব্লক"], "district": ["জেলা"], "khata_no": ["খতিয়ান নং"]},
        stop_labels=["জে.এল. নং"],
        owner_header=["রায়তের নাম"], plot_header=["দাগ নং"], total_labels=["মোট"], area=area_acre,
        khasra_re=r"^\d{1,6}(/\d{1,4})?$", plot_label="dag no.", khata_label="Khatian no.",
        relations=["পিতা", "স্বামী"], residence_words=["সাং"], has_shares=True),
    "Tamil Nadu": Template(
        code="TN_PATTA", state="Tamil Nadu", name="Patta", doc_type="patta", tess_lang="tam+eng",
        title_keywords=["பட்டா", "உரிமைச் சான்று"],
        labels={"village": ["கிராமம்"], "tehsil": ["வட்டம்"], "district": ["மாவட்டம்"], "khata_no": ["பட்டா எண்"]},
        owner_header=["உரிமையாளர் பெயர்"], plot_header=["புல எண்"], total_labels=["மொத்தம்"], area=area_ha_are,
        khasra_re=r"^\d{1,5}(/\d{1,3}[A-Z]?\d?)?$", plot_label="survey no.", khata_label="Patta no.",
        relations=["த/பெ", "க/பெ", "மகன்", "மனைவி"]),
    "Punjab": Template(
        code="PB_JAMABANDI", state="Punjab", name="Jamabandi", doc_type="jamabandi", tess_lang="pan+eng",
        title_keywords=["ਜਮ੍ਹਾਂਬੰਦੀ", "ਜਮਾਬੰਦੀ"],
        labels={"village": ["ਪਿੰਡ"], "tehsil": ["ਤਹਿਸੀਲ"], "district": ["ਜ਼ਿਲ੍ਹਾ", "ਜਿਲ੍ਹਾ"], "khata_no": ["ਖੇਵਟ ਨੰਬਰ"]},
        stop_labels=["ਸਾਲ"],
        owner_header=["ਮਾਲਕ ਦਾ ਨਾਮ"], plot_header=["ਖਸਰਾ ਨੰਬਰ"], total_labels=["ਕੁੱਲ"], area=area_kanal_marla,
        khasra_re=r"^\d{1,4}(//?\d{1,3})?$", plot_label="khasra no.", khata_label="Khewat no.",
        relations=["ਪੁੱਤਰ", "ਪੁੱਤਰੀ", "ਪਤਨੀ"], residence_words=["ਵਾਸੀ"], has_shares=True,
        mutation_labels=["ਇੰਤਕਾਲ ਨੰਬਰ"]),
}
DEFAULT = TEMPLATES["Uttar Pradesh"]


def for_state(state: str | None) -> Template:
    return TEMPLATES.get(state or "", DEFAULT)


def doc_type_keywords() -> dict[str, list[str]]:
    return {t.doc_type: t.title_keywords for t in TEMPLATES.values()}
