"""Central configuration. Everything can be overridden with environment variables."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent          # backend/

# Optional settings file: backend/.env with KEY=VALUE lines (real environment variables win).
_env = BASE_DIR / ".env"
if _env.exists():
    for _line in _env.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))
ROOT_DIR = BASE_DIR.parent                                  # project root
DATA_DIR = Path(os.getenv("BHU_DATA_DIR", ROOT_DIR / "data"))
STORAGE_DIR = DATA_DIR / "storage"        # raw scans (write-once), processed pages, crops
DATASET_DIR = DATA_DIR / "labelled"       # human-corrected training examples
FRONTEND_DIST = Path(os.getenv("BHU_FRONTEND_DIST", ROOT_DIR / "frontend" / "dist"))

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'bhu.db'}")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-only-secret-change-me-in-production-please")
JWT_TTL_MIN = int(os.getenv("JWT_TTL_MIN", "480"))

TESSERACT_CMD = os.getenv("TESSERACT_CMD")
if not TESSERACT_CMD and os.name == "nt":                # default location of the UB-Mannheim Windows installer
    for _p in (r"C:\Program Files\Tesseract-OCR\tesseract.exe", r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"):
        if os.path.exists(_p):
            TESSERACT_CMD = _p
            break
# Use the Hindi/English language data bundled in backend/tessdata when the installed Tesseract
# doesn't have Hindi (the Windows installer leaves it out unless you tick it).
_bundled = BASE_DIR / "tessdata"
if not os.getenv("TESSDATA_PREFIX") and (_bundled / "hin.traineddata").exists():
    os.environ["TESSDATA_PREFIX"] = str(_bundled)     # hin, mar, ben, tam, pan, eng, osd ship with the project
OCR_LANGS = os.getenv("OCR_LANGS", "hin")
HTR_MODEL = os.getenv("HTR_MODEL")                       # optional path/name of a TrOCR handwriting model

# Pipeline behaviour
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))
DEFAULT_THRESHOLD = float(os.getenv("DEFAULT_THRESHOLD", "85"))
QA_SAMPLE_RATE = float(os.getenv("QA_SAMPLE_RATE", "0.05"))   # share of auto-approved docs sent to QA
LOW_QUALITY = float(os.getenv("LOW_QUALITY", "0.4"))          # flagged, never rejected

# Projected CRS used for area computation (UTM 44N covers most of Uttar Pradesh)
AREA_CRS = os.getenv("AREA_CRS", "EPSG:32644")

for d in (DATA_DIR, STORAGE_DIR, DATASET_DIR):
    d.mkdir(parents=True, exist_ok=True)
