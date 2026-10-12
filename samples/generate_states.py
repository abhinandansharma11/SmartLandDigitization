"""Synthetic (fictional) record pages for Maharashtra, West Bengal, Tamil Nadu and Punjab.

    python samples/generate_states.py        (also called from generate.py)
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from generate import H, W, degrade, save  # noqa: E402

NOTO = "/usr/share/fonts/truetype/noto/"
WIN = "C:/Windows/Fonts/"
FONTS = {  # script → (regular, bold) candidates; Nirmala UI covers every Indic script on Windows
    "deva": ([NOTO + "NotoSansDevanagari-Regular.ttf", WIN + "Nirmala.ttf"], [NOTO + "NotoSansDevanagari-Bold.ttf", WIN + "NirmalaB.ttf"]),
    "beng": ([NOTO + "NotoSansBengali-Regular.ttf", WIN + "Nirmala.ttf"], [NOTO + "NotoSansBengali-Bold.ttf", WIN + "NirmalaB.ttf"]),
    "taml": ([NOTO + "NotoSansTamil-Regular.ttf", WIN + "Nirmala.ttf"], [NOTO + "NotoSansTamil-Bold.ttf", WIN + "NirmalaB.ttf"]),
    "guru": ([NOTO + "NotoSansGurmukhi-Regular.ttf", WIN + "Nirmala.ttf"], [NOTO + "NotoSansGurmukhi-Bold.ttf", WIN + "NirmalaB.ttf"]),
    "latn": ([NOTO + "NotoSans-Regular.ttf", WIN + "arial.ttf"], [NOTO + "NotoSans-Bold.ttf", WIN + "arialbd.ttf"]),
}
DIGITS = {"deva": "०१२३४५६७८९", "beng": "০১২৩৪৫৬৭৮৯"}


def _font(script, size, bold=False):
    for p in FONTS[script][1 if bold else 0]:
        if Path(p).exists():
            return ImageFont.truetype(p, size, layout_engine=ImageFont.Layout.RAQM)
    raise SystemExit(f"no font for {script}")


class Page:
    """Draws mixed-script text: runs of ASCII use a Latin font, everything else the native font."""

    def __init__(self, script, native_digits):
        self.img = Image.new("L", (W, H), 255)
        self.d = ImageDraw.Draw(self.img)
        self.script = script
        self.tr = str.maketrans("0123456789", DIGITS[script]) if native_digits and script in DIGITS else None
        self.y = 90

    def _runs(self, text):
        runs, cur, cur_ascii = [], "", None
        for ch in text:
            a = ch.isascii() and not ch.isspace()
            if ch.isspace():
                cur += ch
                continue
            if cur_ascii is None or a == cur_ascii:
                cur += ch
                cur_ascii = a
            else:
                runs.append((cur, cur_ascii)); cur, cur_ascii = ch, a
        if cur:
            runs.append((cur, bool(cur_ascii)))
        return runs

    def text(self, x, s, size=34, bold=False, center=False):
        if self.tr:
            s = s.translate(self.tr)
        runs = [(t, _font("latn" if a else self.script, size, bold)) for t, a in self._runs(s)]
        width = sum(f.getlength(t) for t, f in runs)
        if center:
            x = (W - width) / 2
        for t, f in runs:
            self.d.text((x, self.y), t, font=f)
            x += f.getlength(t)

    def row(self, *cols, xs=(120, 900), size=34, bold=False, step=64):
        for c, x in zip(cols, xs):
            self.text(x, c, size, bold)
        self.y += step

    def rule(self, w=3, gap=16):
        self.d.line((100, self.y, W - 100, self.y), width=w)
        self.y += gap


def record(script, titles, kv_rows, owner_hdr, owners, plot_hdr, plots, total, extra=(), native_digits=True):
    p = Page(script, native_digits)
    for t in titles:
        p.text(0, t, 44, True, center=True); p.y += 76
    p.y += 30
    for r in kv_rows:
        p.row(*r)
    p.y += 30
    p.rule(); p.row(*owner_hdr, xs=(120, 270, 1350), bold=True, step=62); p.rule(2)
    for o in owners:
        p.row(*o, xs=(130, 270, 1360), step=62)
    p.rule(3, 70)
    p.rule(); p.row(*plot_hdr, xs=(160, 700), bold=True, step=62); p.rule(2)
    for pl in plots:
        p.row(*pl, xs=(180, 720), step=62)
    p.rule(3, 30)
    p.row(total, xs=(160,), bold=True, step=100)
    for e in extra:
        p.row(e, step=70)
    return p.img


SPECS = {
    "11_satbara_maharashtra_shirgaon_khate312.png": dict(
        script="deva", titles=["महाराष्ट्र शासन", "गाव नमुना सात (अधिकार अभिलेख पत्रक) - सातबारा"],
        kv_rows=[("गाव: शिरगाव", "तालुका: हवेली"), ("जिल्हा: पुणे",), ("खाते क्रमांक: 312",), ("भोगवटादार वर्ग: वर्ग-1",)],
        owner_hdr=("अ.क्र.", "भोगवटादाराचे नाव", ""), owners=[("1", "रमेश गणपत पाटील", ""), ("2", "सुनिता रमेश पाटील", "")],
        plot_hdr=("गट क्रमांक", "क्षेत्र (हे.आर.चौ.मी)"), plots=[("45/1", "1.20.50")], total="एकूण क्षेत्र: 1.20.50",
        extra=["फेरफार क्रमांक: 876 दिनांक 15-06-2020"]),
    "12_khatian_westbengal_ramnagar_56.png": dict(
        script="beng", titles=["পশ্চিমবঙ্গ সরকার", "খতিয়ান (রেকর্ড অফ রাইটস)"],
        kv_rows=[("মৌজা: রামনগর", "জে.এল. নং: 45"), ("থানা: সিঙ্গুর", "জেলা: হুগলি"), ("খতিয়ান নং: 56",)],
        owner_hdr=("ক্রম", "রায়তের নাম, পিতা/স্বামীর নাম ও ঠিকানা", "অংশ"),
        owners=[("1", "রহিম শেখ পিতা করিম শেখ সাং রামনগর", "1/2"), ("2", "সালমা বিবি স্বামী রহিম শেখ সাং রামনগর", "1/2")],
        plot_hdr=("দাগ নং", "জমির পরিমাণ (একর)"), plots=[("112", "0.33"), ("113", "0.50")], total="মোট: 2 দাগ 0.83 একর"),
    "13_patta_tamilnadu_vadakkupatti_1024.png": dict(
        script="taml", titles=["தமிழ்நாடு அரசு", "பட்டா (உரிமைச் சான்று)"],
        kv_rows=[("கிராமம்: வடக்குப்பட்டி", "வட்டம்: மேலூர்"), ("மாவட்டம்: மதுரை",), ("பட்டா எண்: 1024",)],
        owner_hdr=("வ.எண்", "உரிமையாளர் பெயர்", ""), owners=[("1", "முருகன் த/பெ கந்தசாமி", "")],
        plot_hdr=("புல எண்", "பரப்பு (ஹெக்டேர் - ஏர்)"), plots=[("112/3A", "0 - 45.50")], total="மொத்தம்: 0 - 45.50",
        native_digits=False),
    "14_jamabandi_punjab_rampura_khewat88.png": dict(
        script="guru", titles=["ਪੰਜਾਬ ਸਰਕਾਰ", "ਜਮ੍ਹਾਂਬੰਦੀ"],
        kv_rows=[("ਪਿੰਡ: ਰਾਮਪੁਰਾ", "ਤਹਿਸੀਲ: ਖਰੜ"), ("ਜ਼ਿਲ੍ਹਾ: ਮੋਹਾਲੀ", "ਸਾਲ: 2020-21"), ("ਖੇਵਟ ਨੰਬਰ: 88",)],
        owner_hdr=("ਲੜੀ", "ਮਾਲਕ ਦਾ ਨਾਮ ਅਤੇ ਹਿੱਸਾ", ""),
        owners=[("1", "ਗੁਰਪ੍ਰੀਤ ਸਿੰਘ ਪੁੱਤਰ ਕਰਤਾਰ ਸਿੰਘ ਵਾਸੀ ਦੇਹ", "1/2"), ("2", "ਹਰਪ੍ਰੀਤ ਸਿੰਘ ਪੁੱਤਰ ਕਰਤਾਰ ਸਿੰਘ ਵਾਸੀ ਦੇਹ", "1/2")],
        plot_hdr=("ਖਸਰਾ ਨੰਬਰ", "ਰਕਬਾ (ਕਨਾਲ-ਮਰਲੇ)"), plots=[("45//12", "8-0"), ("45//13", "4-0")], total="ਕੁੱਲ: 12-0",
        extra=["ਇੰਤਕਾਲ ਨੰਬਰ: 1234"], native_digits=False),
    "15_khatian_westbengal_old_57.jpg": dict(
        script="beng", titles=["পশ্চিমবঙ্গ সরকার", "খতিয়ান (রেকর্ড অফ রাইটস)"],
        kv_rows=[("মৌজা: রামনগর", "জে.এল. নং: 45"), ("থানা: সিঙ্গুর", "জেলা: হুগলি"), ("খতিয়ান নং: 57",)],
        owner_hdr=("ক্রম", "রায়তের নাম, পিতা/স্বামীর নাম ও ঠিকানা", "অংশ"),
        owners=[("1", "আমিনা খাতুন স্বামী রফিক আলি সাং রামনগর", "1/1")],
        plot_hdr=("দাগ নং", "জমির পরিমাণ (একর)"), plots=[("114/1", "20 শতক")], total="মোট: 1 দাগ 20 শতক"),
}


def text_lines(name: str) -> list[str]:
    """Ground-truth transcription of a sample page (what a perfect OCR engine would return)."""
    sp = SPECS[name]
    tr = str.maketrans("0123456789", DIGITS[sp["script"]]) if sp.get("native_digits", True) and sp["script"] in DIGITS else None
    rows = [*sp["titles"], *[" ".join(r) for r in sp["kv_rows"]], " ".join(sp["owner_hdr"]).strip(),
            *[" ".join(o).strip() for o in sp["owners"]], " ".join(sp["plot_hdr"]),
            *[" ".join(p) for p in sp["plots"]], sp["total"], *sp.get("extra", [])]
    return [r.translate(tr) if tr else r for r in rows]


def main():
    for name, sp in SPECS.items():
        img = record(**sp)
        if "old" in name:
            save(degrade(img, angle=2.4, noise=12, blur=0.9, stain=True), name, jpeg=72)
        else:
            save(img, name)


if __name__ == "__main__":
    main()
