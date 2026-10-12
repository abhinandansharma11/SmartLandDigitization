"""Indic text helpers: digit normalisation, script detection, romanisation for search,
and legacy (non-Unicode) Kruti Dev → Unicode conversion."""
import re
import unicodedata

_DIGIT_SETS = ["०१२३४५६७८९", "০১২৩৪৫৬৭৮৯", "੦੧੨੩੪੫੬੭੮੯", "૦૧૨૩૪૫૬૭૮૯", "୦୧୨୩୪୫୬୭୮୯",
               "௦௧௨௩௪௫௬௭௮௯", "౦౧౨౩౪౫౬౭౮౯", "೦೧೨೩೪೫೬೭೮೯", "൦൧൨൩൪൫൬൭൮൯", "۰۱۲۳۴۵۶۷۸۹", "٠١٢٣٤٥٦٧٨٩"]
DEV_DIGITS = str.maketrans("".join(_DIGIT_SETS), "0123456789" * len(_DIGIT_SETS))   # all Indic digit sets


def norm_digits(s: str) -> str:
    return (s or "").translate(DEV_DIGITS)


def nfc(s: str) -> str:
    return unicodedata.normalize("NFC", s or "")


SCRIPT_RANGES = {
    "Devanagari": (0x0900, 0x097F), "Bengali": (0x0980, 0x09FF), "Gurmukhi": (0x0A00, 0x0A7F),
    "Gujarati": (0x0A80, 0x0AFF), "Odia": (0x0B00, 0x0B7F), "Tamil": (0x0B80, 0x0BFF),
    "Telugu": (0x0C00, 0x0C7F), "Kannada": (0x0C80, 0x0CFF), "Malayalam": (0x0D00, 0x0D7F),
    "Arabic": (0x0600, 0x06FF),
}


def detect_script(text: str) -> str:
    counts = {}
    for ch in text or "":
        cp = ord(ch)
        if ch.isascii():
            if ch.isalpha():
                counts["Latin"] = counts.get("Latin", 0) + 1
            continue
        for name, (lo, hi) in SCRIPT_RANGES.items():
            if lo <= cp <= hi:
                counts[name] = counts.get(name, 0) + 1
                break
    return max(counts, key=counts.get) if counts else "Unknown"


# ------------------------------------------------------------------ Devanagari → Latin (for fuzzy search)
_V = {"अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo", "ऋ": "ri", "ए": "e", "ऐ": "ai",
      "ओ": "o", "औ": "au"}
_M = {"ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "ृ": "ri", "े": "e", "ै": "ai", "ो": "o",
      "ौ": "au", "ं": "n", "ँ": "n", "ः": "h"}
_C = {"क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "n", "च": "ch", "छ": "chh", "ज": "j", "झ": "jh",
      "ञ": "n", "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n", "त": "t", "थ": "th", "द": "d",
      "ध": "dh", "न": "n", "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m", "य": "y", "र": "r",
      "ल": "l", "व": "v", "श": "sh", "ष": "sh", "स": "s", "ह": "h", "ड़": "r", "ढ़": "rh", "क़": "q",
      "ख़": "kh", "ग़": "g", "ज़": "z", "फ़": "f", "ऩ": "n", "ऱ": "r", "ळ": "l", "ऴ": "l"}


def romanize(text: str) -> str:
    """Loose phonetic romanisation (schwa-deleting at word ends) good enough for fuzzy matching."""
    text = nfc(text)
    out = []
    chars = list(text)
    for i, ch in enumerate(chars):
        nxt = chars[i + 1] if i + 1 < len(chars) else ""
        if ch in _C:
            out.append(_C[ch])
            if nxt in _M or nxt == "्" or nxt == "़":
                continue
            # inherent 'a' unless at word end
            if nxt and (nxt in _C or nxt in _V):
                out.append("a")
        elif ch in _M:
            out.append(_M[ch])
        elif ch in _V:
            out.append(_V[ch])
        elif ch in ("्", "़"):
            continue
        else:
            out.append(ch)
    s = "".join(out).lower()
    s = re.sub(r"aa", "a", s)          # collapse long vowels so 'ram' ~ 'raam'
    s = re.sub(r"ee", "i", s)
    s = re.sub(r"oo", "u", s)
    return re.sub(r"\s+", " ", s).strip()


_SANSCRIPT = {"Bengali": "bengali", "Gurmukhi": "gurmukhi", "Gujarati": "gujarati", "Odia": "oriya",
              "Tamil": "tamil", "Telugu": "telugu", "Kannada": "kannada", "Malayalam": "malayalam"}


def to_devanagari(text: str) -> str:
    """Any Brahmic script → Devanagari, so names in every script share one romanisation for search."""
    script = detect_script(text)
    if script not in _SANSCRIPT:
        return text
    try:
        from indic_transliteration import sanscript
        return sanscript.transliterate(text, _SANSCRIPT[script], sanscript.DEVANAGARI)
    except Exception:  # noqa: BLE001
        return text


def search_key(text: str) -> str:
    text = to_devanagari(text or "")
    s = romanize(text) if detect_script(text) == "Devanagari" else (text or "").lower()
    s = s.replace("aa", "a").replace("ee", "i").replace("oo", "u")
    s = re.sub(r"(.)\1", r"\1", s)     # prasaad/prasad, shyaam/shyam
    s = s.replace("w", "v")
    return s


# ------------------------------------------------------------------ Kruti Dev 010 → Unicode
# Partial but covers the common character set used in revenue documents. Order matters:
# multi-character sequences first. Source: widely used public KrutiDev↔Unicode tables.
_KRUTI = [
    ("‘", "\""), ("’", "\""), ("“", "'"), ("”", "'"),
    ("å", "०"), ("ƒ", "१"), ("„", "२"), ("…", "३"), ("†", "४"), ("‡", "५"), ("ˆ", "६"), ("‰", "७"), ("Š", "८"), ("‹", "९"),
    ("Ù", "त्त्"), ("Ì", "त्त"), ("Û", "क्त"), ("Ñ", "कृ"), ("Í", "द्द"), ("{k", "क्ष"), ("{", "क्ष्"),
    ("=", "त्र"), ("«", "त्र्"), ("K", "ज्ञ"), ("J", "श्र"), ("Ø", "क्र"), ("Ÿ", "ह्य"), ("Ö", "द्ध"),
    ("¼", "("), ("½", ")"), ("¿", "?"), ("A", "।"),
    ("vks", "ओ"), ("vkS", "औ"), ("vk", "आ"), ("v", "अ"), ("bZ", "ई"), ("Ã", "ई"), ("b", "इ"),
    ("m", "उ"), ("Å", "ऊ"), ("_", "ऋ"), (",s", "ऐ"), (",", "ए"),
    ("[k", "ख"), ("[", "ख्"), ("x", "ग"), ("X", "ग्"), ("?k", "घ"), ("?", "घ्"), ("³", "ङ"),
    ("p", "च"), ("P", "च्"), ("N", "छ"), ("t", "ज"), ("T", "ज्"), (">", "झ"), ("¥", "ञ"),
    ("V", "ट"), ("B", "ठ"), ("M", "ड"), ("<", "ढ"), (".k", "ण"), (".", "ण्"),
    ("r", "त"), ("R", "त्"), ("Fk", "थ"), ("F", "थ्"), ("n", "द"), ("/k", "ध"), ("/", "ध्"),
    ("u", "न"), ("U", "न्"), ("i", "प"), ("I", "प्"), ("Q", "फ"), ("c", "ब"), ("C", "ब्"),
    ("Hk", "भ"), ("H", "भ्"), ("e", "म"), ("E", "म्"), (";", "य"), ("¸", "य्"), ("j", "र"),
    ("y", "ल"), ("Y", "ल्"), ("G", "ळ"), ("o", "व"), ("O", "व्"), ("'k", "श"), ("'", "श्"),
    ("\"k", "ष"), ("\"", "ष्"), ("l", "स"), ("L", "स्"), ("g", "ह"), ("d", "क"), ("D", "क्"),
    ("kS", "ौ"), ("ks", "ो"), ("k", "ा"), ("h", "ी"), ("q", "ु"), ("w", "ू"), ("`", "ृ"),
    ("s", "े"), ("S", "ै"), ("a", "ं"), ("¡", "ँ"), ("%", ":"), ("-", "."), ("&", "-"), ("@", "/"), ("~", "्"),
]
_KRUTI.sort(key=lambda kv: -len(kv[0]))


def krutidev_to_unicode(text: str) -> str:
    s = text
    # reph 'Z' (र्) is typed after the syllable in Kruti; move it before the consonant cluster
    for src, dst in _KRUTI:
        if src == "z":
            continue
        s = s.replace(src, dst)
    s = s.replace("z", "्र")
    # short i matra 'f' is typed before the consonant it follows in Unicode
    s = re.sub(r"f([क-ह](?:्[क-ह])*)", r"\1ि", s)
    s = re.sub(r"([क-ह](?:्[क-ह])*[ािीुूृेैोौंँ]*)Z", r"र्\1", s)
    s = s.replace("ि्", "्ि")
    s = s.replace("्ा", "")          # halant + aa sign collapses to full consonant
    return nfc(s)


def looks_like_legacy_font(font_names: list[str]) -> bool:
    legacy = ("kruti", "devlys", "chanakya", "shusha", "walkman", "agra")
    return any(any(k in (f or "").lower() for k in legacy) for f in font_names)
