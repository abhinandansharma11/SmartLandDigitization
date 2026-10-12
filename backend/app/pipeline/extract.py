"""Stage 3 (cont.): document classification and template-driven field extraction.

The Uttar Pradesh Khatauni template turns OCR lines into canonical fields. Labels are matched
fuzzily because OCR frequently garbles them (e.g. "खाता सख्या", "खाता eau"). Each field keeps the
bounding box of the words it came from so reviewers see the exact source crop."""
import re
import statistics

from rapidfuzz import fuzz

from ..sample_data import AREA_UNITS
from .textutil import norm_digits

RELATIONS = ["पुत्रवधू", "पुत्री", "पुत्र", "पत्नी", "विधवा"]
NUM = r"[0-9०-९]"

LABELS = {"khatauni": ["खतौनी", "खतोनी", "अधिकार अभिलेख"],
          "khasra": ["खसरा", "खसरा पंजी", "गस्ती खसरा", "नक्शा इन्तखाब", "पंचशाला"],
          "mutation_register": ["नामांतरण पंजी", "दाखिल खारिज", "दाखिल-खारिज"],
          "sale_deed": ["बैनामा", "विक्रय विलेख"],
          "map": ["शजरा", "मानचित्र", "कैडस्ट्रल"]}


def classify(header_text: str, line_density: float, n_words: int, hint: str | None,
             state: str | None = None) -> tuple[str, float]:
    """Keyword + visual heuristics. Returns (doc_type, confidence 0-1)."""
    best, score = None, 0.0
    from .templates import for_state
    tpl = for_state(state)          # only the record type of this document's state competes
    kinds = {k: v for k, v in LABELS.items() if k != "khatauni"} | {tpl.doc_type: tpl.title_keywords}
    for dtype, keys in kinds.items():
        for k in keys:
            s = fuzz.partial_ratio(k, header_text) / 100
            if s > score:
                best, score = dtype, s
    if hint == "map":
        return "map", max(score, 0.9)
    if line_density > 0.012 and n_words < 25 and score < 0.8:
        # long strokes and almost no readable words: a map sheet even if the title is unreadable.
        # Ruled registers also have long strokes, but they carry plenty of text.
        best, score = "map", max(score, 0.75)
    if score < 0.7 and hint:
        return hint, 0.6
    return best or (hint or "unknown"), round(score, 2)


# ------------------------------------------------------------------ helpers
def _words_after(line, label_pat: str):
    """Words that follow the first word fuzzily matching the label (handles ':' and ';')."""
    ws = line["words"]
    for i, w in enumerate(ws):
        if fuzz.ratio(label_pat, w["text"].rstrip(":;")) >= 70:
            return ws[i + 1:]
    return None


def _span(words):
    if not words:
        return None, 0.0, None
    text = " ".join(w["text"] for w in words)
    conf = statistics.mean(w["conf"] for w in words)
    x0 = min(w["bbox"][0] for w in words); y0 = min(w["bbox"][1] for w in words)
    x1 = max(w["bbox"][0] + w["bbox"][2] for w in words); y1 = max(w["bbox"][1] + w["bbox"][3] for w in words)
    return text, round(conf, 1), [x0, y0, x1 - x0, y1 - y0]


def _line_matches(line, keyword: str, threshold=75) -> bool:
    head = " ".join(w["text"] for w in line["words"][:3])
    return fuzz.partial_ratio(keyword, head) >= threshold


def _num(s: str) -> str:
    s = norm_digits(s or "").replace(",", ".")
    s = re.sub(r"[^0-9./\-a-zA-Zऀ-ॿ]", "", s)
    return s


def _decimal(s: str) -> float | None:
    s = norm_digits(s).replace(",", ".")
    s = re.sub(r"(?<=\d)[oO]", "0", s)
    m = re.search(r"\d+\.\d+|\d+", s)
    return float(m.group()) if m else None


def bigha_to_ha(text: str, district: str) -> tuple[float | None, str]:
    u = AREA_UNITS.get(district, AREA_UNITS["default"])
    t = norm_digits(text)
    b = re.search(r"(\d+)\s*बी", t)
    bi = re.search(r"(\d+)\s*बि", t)
    bs = re.search(r"(\d+)\s*बिस्वांसी", t)
    if not b and not bi:
        return None, "no bigha/biswa found"
    bigha = int(b.group(1)) if b else 0
    biswa = int(bi.group(1)) if bi else 0
    biswansi = int(bs.group(1)) if bs else 0
    total_bigha = bigha + biswa / u["biswa_per_bigha"] + biswansi / (u["biswa_per_bigha"] * u["biswansi_per_biswa"])
    return round(total_bigha * u["bigha_ha"], 4), f"{bigha} bigha {biswa} biswa × {u['bigha_ha']} ha"


def _f(name, label, raw, value, conf, bbox, page_no, source):
    return {"field_name": name, "label": label, "raw_value": raw, "value": value,
            "confidence": float(conf), "bbox": bbox, "page_no": page_no, "source": source}


# ------------------------------------------------------------------ UP Khatauni template
def extract_khatauni(lines: list[dict], page_no: int, district: str, source: str = "ocr") -> list[dict]:
    out = []
    lines = [l for l in lines if l["words"]]
    add = out.append

    def kv(key, name, label, parse=lambda s: s.strip(), stop=None, anywhere=False):
        for ln in lines:
            if not anywhere and not _line_matches(ln, key):
                continue
            ws = _words_after(ln, key)
            if ws is None:
                continue
            if stop:
                cut = next((i for i, w in enumerate(ws) if any(fuzz.ratio(s, w["text"].rstrip(":;")) >= 70 for s in stop)), None)
                ws = ws[:cut] if cut is not None else ws
            ws = [w for w in ws if w["text"] not in (":", ";", "-")]
            raw, conf, bbox = _span(ws)
            if raw:
                add(_f(name, label, raw, parse(raw), conf, bbox, page_no, source))
                return ln
        return None

    kv("ग्राम", "village", "Village (ग्राम)", stop=["परगना", "तहसील", "जनपद"])
    kv("तहसील", "tehsil", "Tehsil (तहसील)", stop=["जनपद", "परगना"], anywhere=True)
    kv("जनपद", "district", "District (जनपद)", stop=["परगना", "तहसील"], anywhere=True)
    kv("फसली", "fasli_year", "Fasli year (फसली वर्ष)",
       parse=lambda s: "-".join(re.findall(r"\d{3,4}", norm_digits(s))))

    # khata number: "खाता संख्या: 45" but not the owners header ("खातेदार")
    for ln in lines:
        first = ln["words"][0]["text"]
        if fuzz.ratio("खाता", first) >= 75 and "दार" not in first:
            nums = [w for w in ln["words"][1:] if re.search(NUM, w["text"])]
            if nums:
                raw, conf, bbox = _span(nums[-1:])
                add(_f("khata_no", "Khata no. (खाता संख्या)", raw, re.sub(r"\D", "", norm_digits(raw)).lstrip("0") or "0",
                       conf, bbox, page_no, source))
                break

    def parse_cat(s):
        m = re.search(r"(\d)\s*[-–]?\s*([कख])?", norm_digits(s))
        return (m.group(1) + ("-" + m.group(2) if m.group(2) else "")) if m else s.split()[0]
    kv("श्रेणी", "category", "Category (श्रेणी)", parse=parse_cat)

    # ---- owners block: between the owner header and the plot header
    start = next((i for i, l in enumerate(lines) if any(fuzz.partial_ratio(k, l["text"]) >= 80 for k in ("पिता/पति", "खातेदार का नाम"))), -1)
    end = next((i for i, l in enumerate(lines) if i > start and _line_matches(l, "गाटा")), len(lines))
    if True:
        idx = 0
        for ln in lines[start + 1:end]:
            ws = list(ln["words"])
            rel_i = next((i for i, w in enumerate(ws) if any(fuzz.ratio(r, w["text"]) >= 80 for r in RELATIONS)), None)
            if rel_i is None:
                continue
            # drop a leading serial number / OCR junk before the name
            name_ws = ws[:rel_i]
            if name_ws and (re.fullmatch(r"[0-9०-९।|il.g]+", name_ws[0]["text"]) or len(name_ws[0]["text"]) <= 1):
                name_ws = name_ws[1:]
            nv_i = next((i for i, w in enumerate(ws) if fuzz.ratio("निवासी", w["text"]) >= 75), None)
            share_i = len(ws) - 1 if re.search(r"[0-9०-९]\s*/\s*[0-9०-९]", ws[-1]["text"]) else None
            rel_ws = ws[rel_i + 1: nv_i if nv_i else share_i]
            res_ws = ws[nv_i + 1: share_i] if nv_i else []
            p = f"owners.{idx}."
            raw, conf, bbox = _span(name_ws)
            add(_f(p + "name", f"Owner {idx + 1} name", raw, raw, conf, bbox, page_no, source))
            rel_word = ws[rel_i]
            rel_norm = max(RELATIONS, key=lambda r: fuzz.ratio(r, rel_word["text"]))
            add(_f(p + "relation", f"Owner {idx + 1} relation", rel_word["text"], rel_norm, rel_word["conf"], rel_word["bbox"], page_no, source))
            raw, conf, bbox = _span(rel_ws)
            add(_f(p + "relative_name", f"Owner {idx + 1} father/husband", raw, raw, conf, bbox, page_no, source))
            raw, conf, bbox = _span(res_ws)
            if raw:
                add(_f(p + "residence", f"Owner {idx + 1} residence", raw, raw, conf, bbox, page_no, source))
            if share_i is not None:
                sw = ws[share_i]
                add(_f(p + "share", f"Owner {idx + 1} share", sw["text"], _num(sw["text"]), sw["conf"], sw["bbox"], page_no, source))
            else:
                add(_f(p + "share", f"Owner {idx + 1} share", None, None, 0.0, None, page_no, source))
            idx += 1

    # ---- plots block: after the plot header until "योग"
    try:
        ph = next(i for i, l in enumerate(lines) if _line_matches(l, "गाटा") and not re.search(NUM, l["words"][0]["text"]))
    except StopIteration:
        ph = None
    unit_bigha = False
    if ph is not None:
        unit_bigha = any(k in lines[ph]["text"] for k in ("बीघा", "बिस्वा", "नोपा", "बिस्या"))
        idx = 0
        for ln in lines[ph + 1:]:
            if _line_matches(ln, "योग"):
                break
            ws = ln["words"]
            if len(ws) < 2 or not re.search(NUM, ws[0]["text"]):
                continue
            p = f"plots.{idx}."
            kw = ws[0]
            kh = norm_digits(kw["text"])
            kh = re.sub(r"[^0-9क-ह/]", "", kh)
            add(_f(p + "khasra_no", f"Plot {idx + 1} khasra/gata no.", kw["text"], kh, kw["conf"], kw["bbox"], page_no, source))
            raw, conf, bbox = _span(ws[1:])
            if unit_bigha or "बीघा" in raw:
                ha, note = bigha_to_ha(raw, district)
            else:
                ha = _decimal(raw)
                note = "hectare"
            add(_f(p + "area_ha", f"Plot {idx + 1} area (ha)", raw, None if ha is None else f"{ha:.4f}",
                   conf, bbox, page_no, "derived" if unit_bigha else source) | {"note": note})
            idx += 1

    for ln in lines:
        if _line_matches(ln, "योग"):
            ws = _words_after(ln, "योग") or []
            decs = [w for w in ws if re.search(r"[0-9०-९][.,][0-9०-९]", w["text"])]
            if decs:
                raw, conf, bbox = _span(decs[-1:])
                add(_f("total_area_ha", "Total area (ha)", raw, f"{_decimal(raw):.4f}", conf, bbox, page_no, source))
            break

    ln = next((l for l in lines if _line_matches(l, "नामांतरण")), None)
    if ln:
        t = norm_digits(ln["text"])
        _, conf, bbox = _span(ln["words"][1:])
        m = re.search(r"संख्या\S*\s*([\d/]+)", t)
        d = re.search(r"(\d{1,2}[-./]\d{1,2}[-./]\d{4})", t)
        add(_f("mutation.case_no", "Mutation case no.", m.group(1) if m else None, m.group(1) if m else None, conf if m else 0, bbox, page_no, source))
        add(_f("mutation.order_date", "Mutation order date", d.group(1) if d else None, d.group(1).replace(".", "-") if d else None, conf if d else 0, bbox, page_no, source))
        desc = t.split(d.group(1))[-1].strip() if d else ""
        add(_f("mutation.description", "Mutation basis", desc or None, desc or None, conf, bbox, page_no, source))

    ln = next((l for l in lines if _line_matches(l, "पंजीकरण")), None)
    if ln:
        t = norm_digits(ln["text"])
        _, conf, bbox = _span(ln["words"][1:])
        m = re.search(r"संख्य\S*\s*([\d/]+)", t)
        o = re.search(r"(उप निबंधक.*?)\s+दिनांक", t)
        d = re.search(r"(\d{1,2}[-./]\d{1,2}[-./]\d{4})", t)
        add(_f("registration.deed_no", "Registration deed no.", m.group(1) if m else None, m.group(1) if m else None, conf if m else 0, bbox, page_no, source))
        add(_f("registration.office", "Sub-registrar office", o.group(1) if o else None, o.group(1) if o else None, conf if o else 0, bbox, page_no, source))
        add(_f("registration.date", "Registration date", d.group(1) if d else None, d.group(1) if d else None, conf if d else 0, bbox, page_no, source))
    return out


def threshold_key(field_name: str) -> str:
    """owners.0.name -> owner.name ; plots.1.area_ha -> plot.area_ha ; mutation.case_no -> mutation"""
    parts = field_name.split(".")
    if parts[0] == "owners":
        return "owner." + parts[-1]
    if parts[0] == "plots":
        return "plot." + parts[-1]
    if parts[0] == "parcels":
        return "map.khasra_no"
    if parts[0] in ("mutation", "registration"):
        return parts[0]
    return field_name
