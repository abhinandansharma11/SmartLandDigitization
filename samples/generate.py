"""Generates synthetic (fictional) UP Khatauni pages, a legacy Kruti Dev PDF, a born-digital
Unicode PDF and a cadastral map sheet for the demo.

    python samples/generate.py

Needs a Devanagari font (Noto Sans Devanagari / Mangal) and Pillow with raqm for correct shaping."""
import json
import math
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "backend"))
from app.sample_data import DISTRICT_HI, TEHSIL_HI, VILLAGES  # noqa: E402

OUT = HERE
FONT_CANDIDATES = ["/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf",
                   "C:/Windows/Fonts/Nirmala.ttf", "C:/Windows/Fonts/mangal.ttf"]
FONT_BOLD = ["/usr/share/fonts/truetype/noto/NotoSansDevanagari-Bold.ttf", "C:/Windows/Fonts/NirmalaB.ttf"]
W, H = 1654, 2339
random.seed(7)


def font(size, bold=False):
    for p in (FONT_BOLD if bold else []) + FONT_CANDIDATES:
        if Path(p).exists():
            return ImageFont.truetype(p, size, layout_engine=ImageFont.Layout.RAQM)
    raise SystemExit("No Devanagari font found")


DEV = str.maketrans("0123456789", "०१२३४५६७८९")


class _DevDraw:
    """Wraps ImageDraw so every string is written with Devanagari numerals, as on UP registers."""
    def __init__(self, d, on):
        self.d, self.on = d, on

    def text(self, xy, s, **kw):
        self.d.text(xy, s.translate(DEV) if self.on else s, **kw)

    def __getattr__(self, k):
        return getattr(self.d, k)


def khatauni(v, khata, category, owners, plots, unit="ha", mutation=None, registration=None,
             fasli="1428 से 1433", dev_digits=True):
    lgd, vhi, ven, teh, dist, state, _ = v
    img = Image.new("L", (W, H), 255)
    d = _DevDraw(ImageDraw.Draw(img), dev_digits)
    f, fb, ft = font(34), font(36, True), font(46, True)
    y = 90
    d.text((W // 2, y), "उत्तर प्रदेश शासन - राजस्व विभाग", font=ft, anchor="mt"); y += 80
    d.text((W // 2, y), "खतौनी (अधिकार अभिलेख)", font=ft, anchor="mt"); y += 110
    d.text((120, y), f"ग्राम: {vhi}", font=f); d.text((900, y), f"परगना: {TEHSIL_HI[teh]}", font=f); y += 64
    d.text((120, y), f"तहसील: {TEHSIL_HI[teh]}", font=f); d.text((900, y), f"जनपद: {DISTRICT_HI[dist]}", font=f); y += 64
    d.text((120, y), f"फसली वर्ष: {fasli}", font=f); y += 90
    d.text((120, y), f"खाता संख्या: {khata}", font=fb); y += 64
    d.text((120, y), f"श्रेणी: {category}", font=f); y += 100

    # owners table
    d.line((100, y, W - 100, y), width=3); y += 16
    d.text((120, y), "क्रम", font=fb); d.text((230, y), "खातेदार का नाम, पिता/पति का नाम व निवास", font=fb); d.text((1350, y), "हिस्सा", font=fb); y += 62
    d.line((100, y, W - 100, y), width=2); y += 16
    for i, (name, rel, relname, res, share) in enumerate(owners, 1):
        d.text((130, y), str(i), font=f)
        d.text((230, y), f"{name} {rel} {relname} निवासी {res}", font=f)
        d.text((1360, y), share, font=f); y += 62
    d.line((100, y, W - 100, y), width=3); y += 70

    # plots table
    d.line((100, y, W - 100, y), width=3); y += 16
    hdr = "क्षेत्रफल (हेक्टेयर)" if unit == "ha" else "क्षेत्रफल (बीघा-बिस्वा)"
    d.text((160, y), "गाटा संख्या", font=fb); d.text((700, y), hdr, font=fb); y += 62
    d.line((100, y, W - 100, y), width=2); y += 16
    for kh, area in plots:
        d.text((180, y), kh, font=f); d.text((720, y), area, font=f); y += 62
    d.line((100, y, W - 100, y), width=3); y += 30
    if unit == "ha":
        total = sum(float(a) for _, a in plots)
        d.text((160, y), f"योग: {len(plots)} गाटा  {total:.3f} हेक्टेयर", font=fb)
    else:
        d.text((160, y), f"योग: {len(plots)} गाटा", font=fb)
    y += 110
    if mutation:
        d.text((120, y), f"नामांतरण: {mutation}", font=f); y += 70
    if registration:
        d.text((120, y), f"पंजीकरण: {registration}", font=f); y += 70
    y += 60
    d.text((1150, y), "हस्ताक्षर राजस्व निरीक्षक", font=f)
    return img


def degrade(img, angle=0.0, noise=0.0, blur=0.0, stain=False, jpeg=None):
    img = img.convert("L")
    if stain:
        arr = np.array(img).astype(np.float32)
        yy, xx = np.mgrid[0:H, 0:W]
        for _ in range(3):
            cx, cy, r = random.randint(200, W - 200), random.randint(300, H - 300), random.randint(150, 350)
            arr -= 45 * np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * r * r))
        arr = arr * 0.85 + 20                     # yellowed, lower contrast paper
        img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    if blur:
        img = img.filter(ImageFilter.GaussianBlur(blur))
    if noise:
        arr = np.array(img).astype(np.float32) + np.random.default_rng(1).normal(0, noise, (H, W))
        img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    if angle:
        img = img.rotate(angle, expand=False, fillcolor=235, resample=Image.BICUBIC)
    return img


def save(img, name, jpeg=None):
    p = OUT / name
    if jpeg:
        img.convert("RGB").save(p, quality=jpeg)
    else:
        img.save(p)
    print("wrote", p.name)


# ---------------------------------------------------------------------------------------- map sheet
def map_sheet(v):
    """A clean cadastral sheet: parcels drawn as polygons with khasra numbers and 4 corner ticks.
    Returns image + the exact parcel list (pixel polygons) for area-consistent Khatauni generation."""
    img = Image.new("L", (W, H), 255)
    d = ImageDraw.Draw(img)
    fb, ft = font(40, True), font(44, True)
    d.text((W // 2, 70), f"शजरा (कैडस्ट्रल मानचित्र) - ग्राम {v[1]}", font=ft, anchor="mt")
    m = 150
    x0, y0, x1, y1 = m, 200, W - m, H - 150
    d.rectangle((x0, y0, x1, y1), outline=0, width=6)
    for (cx, cy) in [(x0, y0), (x1, y0), (x0, y1), (x1, y1)]:
        d.line((cx - 30, cy, cx + 30, cy), width=4); d.line((cx, cy - 30, cx, cy + 30), width=4)
    # 3 columns, rows of different heights, with one skewed boundary
    cols = [x0, x0 + 430, x0 + 900, x1]
    rows = [y0, y0 + 620, y0 + 1300, y1]
    parcels, num = [], 201
    for r in range(3):
        for c in range(3):
            xa, xb, ya, yb = cols[c], cols[c + 1], rows[r], rows[r + 1]
            poly = [(xa, ya), (xb, ya), (xb, yb), (xa, yb)]
            parcels.append((str(num), poly)); num += 1
    for _, poly in parcels:
        d.polygon(poly, outline=0, width=5)
    for kh, poly in parcels:
        cx = sum(p[0] for p in poly) / 4; cy = sum(p[1] for p in poly) / 4
        d.text((cx, cy), kh.translate(DEV), font=fb, anchor="mm")
    return img, parcels, (x0, y0, x1, y1)


def pixel_area_ha(poly, frame, bbox):
    """Approximate area of a pixel polygon given the frame→bbox affine (equirectangular)."""
    x0, y0, x1, y1 = frame
    minlon, minlat, maxlon, maxlat = bbox
    mx = (maxlon - minlon) / (x1 - x0) * 111320 * math.cos(math.radians((minlat + maxlat) / 2))
    my = (maxlat - minlat) / (y1 - y0) * 110540
    xs = [p[0] for p in poly]; ys = [p[1] for p in poly]
    a = 0.5 * abs(sum(xs[i] * ys[(i + 1) % len(poly)] - xs[(i + 1) % len(poly)] * ys[i] for i in range(len(poly))))
    return a * mx * my / 10000


# ---------------------------------------------------------------------------------------- PDFs
def unicode_pdf(v, path):
    import pymupdf
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    fontfile = next(p for p in FONT_CANDIDATES if Path(p).exists())
    page.insert_font(fontname="noto", fontfile=fontfile)
    lines = [
        "उत्तर प्रदेश शासन - राजस्व विभाग", "खतौनी (अधिकार अभिलेख)",
        f"ग्राम: {v[1]}   तहसील: {TEHSIL_HI[v[3]]}   जनपद: {DISTRICT_HI[v[4]]}",
        "फसली वर्ष: 1428 से 1433", "खाता संख्या: 48", "श्रेणी: 1-क",
        "क्रम खातेदार का नाम, पिता/पति का नाम व निवास हिस्सा",
        f"1 सुरेश कुमार पुत्र रमेश चन्द्र निवासी {v[1]} 1/1",
        "गाटा संख्या क्षेत्रफल (हेक्टेयर)", "116 0.295", "117 0.450",
        "योग: 2 गाटा 0.745 हेक्टेयर",
    ]
    y = 60
    for ln in lines:
        page.insert_text((50, y), ln, fontname="noto", fontsize=13)
        y += 28
    doc.save(path)
    print("wrote", Path(path).name)


def krutidev_pdf(path):
    """Legacy PDF whose text layer is Kruti Dev 010 ASCII (as produced by old DTP software)."""
    import pymupdf
    from fontTools.ttLib import TTFont
    src = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    renamed = HERE / "_krutidev_standin.ttf"
    t = TTFont(src)
    for rec in t["name"].names:
        if rec.nameID in (1, 4, 6, 16):
            rec.string = "KrutiDev010" if rec.nameID == 6 else "Kruti Dev 010"
    t.save(renamed)
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    page.insert_font(fontname="kruti", fontfile=str(renamed))
    lines = ["[krkSuh ¼vf/kdkj vfHkys[k½", "xzke% jkeiqj dyka", "[kkrk la[;k% 49", "Js.kh% 1&d",
             "1 xhrk nsoh iRuh jkts'k dqekj fuoklh jkeiqj dyka 1@1",
             "xkVk la[;k {ks=Qy ¼gsDVs;j½", "118 0-330", ";ksx% 1 xkVk 0-330 gsDVs;j"]
    y = 60
    for ln in lines:
        page.insert_text((50, y), ln, fontname="kruti", fontsize=13)
        y += 28
    doc.save(path)
    renamed.unlink()
    print("wrote", Path(path).name)


def main():
    rampur, bahadurpur, sarai = VILLAGES
    # 1 · clean modern record, two joint owners — should auto-approve (unless QA-sampled)
    k45 = khatauni(rampur, "45", "1-क भूमिधर जिनके अधिकार संक्रमणीय हैं",
                   [("राम प्रसाद", "पुत्र", "शिव प्रसाद", "रामपुर कलां", "1/2"),
                    ("श्याम लाल", "पुत्र", "शिव प्रसाद", "रामपुर कलां", "1/2")],
                   [("112", "0.405"), ("113क", "0.250")],
                   mutation="वाद संख्या 234/2019 आदेश दिनांक 12-03-2019 उत्तराधिकार",
                   registration="विलेख संख्या 1456/2018 उप निबंधक मलिहाबाद दिनांक 05-07-2018")
    save(k45, "01_khatauni_rampur_khata45_clean.png")
    # 2 · rescanned copy of the same page → image near-duplicate + record duplicate
    save(degrade(k45, angle=0.8, noise=6), "02_khatauni_rampur_khata45_rescan.jpg", jpeg=80)
    # 3 · old, stained, skewed register with bigha-biswa areas → normalisation + human review
    k46 = khatauni(rampur, "46", "1-क", [("गीता देवी", "पत्नी", "हरि शंकर", "रामपुर कलां", "1/1")],
                   [("114", "2 बीघा 8 बिस्वा")], unit="bigha", fasli="1398 से 1403")
    save(degrade(k46, angle=-3.2, noise=14, blur=1.1, stain=True), "03_khatauni_rampur_khata46_old_bigha.jpg", jpeg=70)
    # 4 · owner differs from state LRMS → ownership conflict → supervisor
    k47 = khatauni(rampur, "47", "1-क", [("सोहन सिंह", "पुत्र", "करन सिंह", "रामपुर कलां", "1/1")],
                   [("115", "0.380")])
    save(degrade(k47, noise=4), "04_khatauni_rampur_khata47_conflict.png")
    # 5 · shares add up to 3/2 → hard rule failure
    k50 = khatauni(rampur, "50", "1-ख", [("अमर नाथ", "पुत्र", "दीना नाथ", "रामपुर कलां", "1/2"),
                                        ("विजय नाथ", "पुत्र", "दीना नाथ", "रामपुर कलां", "1/1")],
                   [("110", "0.310"), ("111", "0.520")])
    save(k50, "05_khatauni_rampur_khata50_bad_shares.png")
    # 6 · Sitapur record — only visible to Sitapur users (jurisdiction scoping)
    k12 = khatauni(sarai, "12", "1-क", [("कमला देवी", "पत्नी", "राम सिंह", "सराय खेड़ा", "1/1")],
                   [("301", "0.720")])
    save(degrade(k12, angle=1.5, noise=5), "06_khatauni_sitapur_khata12.png")
    # 7 · born-digital PDF with Unicode text layer → OCR skipped
    unicode_pdf(rampur, OUT / "07_khatauni_rampur_khata48_digital.pdf")
    # 8 · legacy PDF typed in Kruti Dev → font conversion
    krutidev_pdf(OUT / "08_khatauni_rampur_khata49_krutidev.pdf")
    # 9 · cadastral map sheet for Bahadurpur → georeference + vectorise
    msheet, parcels, frame = map_sheet(bahadurpur)
    save(degrade(msheet, noise=3), "09_map_bahadurpur_sheet.png")
    areas = {kh: pixel_area_ha(poly, frame, bahadurpur[6]) for kh, poly in parcels}
    # 10 · Khatauni for Bahadurpur whose plots exist only on the digitized map
    k7 = khatauni(bahadurpur, "7", "1-क", [("इमरान खान", "पुत्र", "सलीम खान", "बहादुरपुर", "1/1")],
                  [("203", f"{areas['203']:.3f}"), ("207", f"{areas['207']:.3f}")])
    save(k7, "10_khatauni_bahadurpur_khata7.png")

    manifest = {
        "note": "Batch manifest for the vendor bulk-upload endpoint (POST /api/v1/batches).",
        "map_gcp": {"09_map_bahadurpur_sheet.png": {"frame_px": list(frame), "bbox": bahadurpur[6]}},
        "files": [
            {"file": "01_khatauni_rampur_khata45_clean.png", "district": "Lucknow", "tehsil": "Malihabad", "village_lgd": "900001", "doc_type_hint": "khatauni"},
            {"file": "03_khatauni_rampur_khata46_old_bigha.jpg", "district": "Lucknow", "tehsil": "Malihabad", "village_lgd": "900001", "year": "1398"},
        ],
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print("parcel areas (ha):", {k: round(a, 3) for k, a in areas.items()})
    import generate_states
    generate_states.main()


if __name__ == "__main__":
    main()
