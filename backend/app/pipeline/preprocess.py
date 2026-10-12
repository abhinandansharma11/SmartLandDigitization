"""Stage 2: image clean-up and quality scoring (OpenCV).

Low quality is *flagged*, never rejected — a damaged historical register cannot be rescanned."""
import cv2
import numpy as np


def load_gray(path: str) -> np.ndarray:
    data = np.fromfile(path, dtype=np.uint8)          # works with non-ASCII Windows paths
    img = cv2.imdecode(data, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"Unreadable image: {path}")
    return img


def save_png(path: str, img: np.ndarray):
    ok, buf = cv2.imencode(".png", img)
    if not ok:
        raise IOError("PNG encode failed")
    buf.tofile(path)


def estimate_skew(gray: np.ndarray) -> float:
    """Projection-profile skew estimate in degrees (range ±10)."""
    h, w = gray.shape
    scale = 1000 / max(h, w) if max(h, w) > 1000 else 1.0
    small = cv2.resize(gray, (int(w * scale), int(h * scale))) if scale < 1 else gray
    _, bw = cv2.threshold(small, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    center = (bw.shape[1] / 2, bw.shape[0] / 2)

    def score(angle):
        m = cv2.getRotationMatrix2D(center, angle, 1.0)
        rot = cv2.warpAffine(bw, m, (bw.shape[1], bw.shape[0]), flags=cv2.INTER_NEAREST)
        prof = rot.sum(axis=1, dtype=np.float64)
        return float(np.var(prof))

    coarse = max(np.arange(-10, 10.5, 1.0), key=score)
    fine = max(np.arange(coarse - 1, coarse + 1.01, 0.1), key=score)
    return float(round(fine, 2))


def rotate(img: np.ndarray, angle: float) -> np.ndarray:
    if abs(angle) < 0.05:
        return img
    h, w = img.shape[:2]
    m = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
    return cv2.warpAffine(img, m, (w, h), flags=cv2.INTER_CUBIC, borderValue=255)


def quality(gray: np.ndarray) -> dict:
    sharp = cv2.Laplacian(gray, cv2.CV_64F).var()
    contrast = float(gray.std())
    # salt-and-pepper noise: share of isolated specks
    _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    n, _, stats, _ = cv2.connectedComponentsWithStats(bw, connectivity=8)
    specks = int((stats[1:, cv2.CC_STAT_AREA] <= 3).sum()) if n > 1 else 0
    noise = specks / max(n - 1, 1)
    s_sharp = min(sharp / 400.0, 1.0)
    s_contrast = min(contrast / 60.0, 1.0)
    s_noise = 1.0 - min(noise * 2, 1.0)
    score = round(0.45 * s_sharp + 0.35 * s_contrast + 0.20 * s_noise, 3)
    return {"score": score, "sharpness": round(sharp, 1), "contrast": round(contrast, 1), "noise": round(noise, 3)}


def preprocess(gray: np.ndarray) -> tuple[np.ndarray, dict]:
    """Returns the cleaned image used for OCR and metrics about the original."""
    q = quality(gray)
    # upscale small scans — Tesseract wants ~300 dpi (x-height ≥ 20 px)
    h, w = gray.shape
    if max(h, w) < 1800:
        f = 1800 / max(h, w)
        gray = cv2.resize(gray, (int(w * f), int(h * f)), interpolation=cv2.INTER_CUBIC)
    den = cv2.medianBlur(gray, 3)
    den = cv2.fastNlMeansDenoising(den, None, h=12, templateWindowSize=7, searchWindowSize=21)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enh = clahe.apply(den)
    skew = estimate_skew(enh)
    enh = rotate(enh, skew)
    # background flattening removes stains / uneven lighting before thresholding
    bg = cv2.morphologyEx(enh, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (31, 31)))
    flat = cv2.divide(enh, bg, scale=255)
    _, bw = cv2.threshold(flat, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    q["skew_deg"] = skew
    return bw, q
