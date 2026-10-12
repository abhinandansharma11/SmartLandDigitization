"""Stage 3b: cadastral map sheet digitization.

1. Find the sheet frame (outer neat-line) → 4 ground control points.
2. Georeference: affine from frame pixels to the sheet's lon/lat extent (from upload GCPs or the
   village extent in master data).
3. Extract the boundary network (remove text blobs), then each enclosed face is a parcel polygon.
4. Read the khasra number printed inside each parcel.
5. Topology checks: overlaps, gaps against the frame, slivers.
6. Area of every parcel in a projected CRS (UTM) for reconciliation with the textual record.

Works well on clean sheets like the demo; real historical sheets need a trained boundary
segmentation model in step 3 (drop-in replacement for `_boundary_mask`)."""
import cv2
import numpy as np
from pyproj import Transformer
from shapely.geometry import Polygon, mapping
from shapely.ops import transform, unary_union

from ..config import AREA_CRS
from .ocr import ocr_region
from .textutil import norm_digits

_to_utm = Transformer.from_crs("EPSG:4326", AREA_CRS, always_xy=True).transform


def area_ha(poly_lonlat: Polygon) -> float:
    return transform(_to_utm, poly_lonlat).area / 10_000


def _frame(lines: np.ndarray):
    """Neat-line of the sheet: the outermost rows/columns that are mostly boundary pixels
    (corner tick marks and marginal text don't qualify)."""
    h, w = lines.shape
    rows = np.where((lines > 0).sum(axis=1) > 0.6 * w)[0]
    cols = np.where((lines > 0).sum(axis=0) > 0.6 * h)[0]
    if len(rows) < 2 or len(cols) < 2:
        inv = 255 - lines
        x, y, cw, ch = cv2.boundingRect(max(cv2.findContours(inv, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0], key=cv2.contourArea))
        return x, y, x + cw, y + ch
    # centre of the frame stroke
    top = rows[rows < h / 2]; bot = rows[rows > h / 2]; lef = cols[cols < w / 2]; rig = cols[cols > w / 2]
    return int(np.median(lef[:6])), int(np.median(top[:6])), int(np.median(rig[-6:])), int(np.median(bot[-6:]))


def _boundary_mask(bw: np.ndarray) -> np.ndarray:
    inv = 255 - bw
    n, labels, stats, _ = cv2.connectedComponentsWithStats(inv, connectivity=8)
    mask = np.zeros_like(inv)
    h, w = inv.shape
    for i in range(1, n):
        cw, ch = stats[i, cv2.CC_STAT_WIDTH], stats[i, cv2.CC_STAT_HEIGHT]
        if max(cw, ch) > min(h, w) * 0.15:       # long strokes are boundaries; text blobs are small
            mask[labels == i] = 255
    return cv2.dilate(mask, np.ones((3, 3), np.uint8))


def digitize(bw: np.ndarray, extent: list[float], lang: str = "hin") -> dict:
    minlon, minlat, maxlon, maxlat = extent
    lines = _boundary_mask(bw)
    fx0, fy0, fx1, fy1 = _frame(lines)

    def to_lonlat(x, y):
        return (minlon + (x - fx0) / (fx1 - fx0) * (maxlon - minlon),
                maxlat - (y - fy0) / (fy1 - fy0) * (maxlat - minlat))

    faces = 255 - lines
    n, labels, stats, _ = cv2.connectedComponentsWithStats(faces, connectivity=4)
    parcels = []
    frame_area = (fx1 - fx0) * (fy1 - fy0)
    for i in range(1, n):
        x, y, w, h, a = stats[i]
        if a < frame_area * 0.005:               # specks / slivers
            continue
        if x < fx0 - 10 or y < fy0 - 10 or x + w > fx1 + 10 or y + h > fy1 + 10:
            continue                             # outside the frame
        m = (labels == i).astype(np.uint8) * 255
        cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        c = max(cnts, key=cv2.contourArea)
        approx = cv2.approxPolyDP(c, 0.01 * cv2.arcLength(c, True), True).reshape(-1, 2)
        if len(approx) < 3:
            continue
        # khasra number: OCR the parcel interior only
        crop = bw[y:y + h, x:x + w].copy()
        crop[m[y:y + h, x:x + w] == 0] = 255
        text, conf = ocr_region(crop, psm=6, lang=lang)
        kh = norm_digits(text)
        kh = "".join(ch for ch in kh if ch.isdigit() or "क" <= ch <= "ह" or ch == "/" or (ch.isascii() and ch.isalpha())).upper()
        # expand polygon by half the line width so neighbouring parcels share edges
        px_poly = Polygon(approx).buffer(5, join_style=2)
        ll = Polygon([to_lonlat(px, py) for px, py in px_poly.exterior.coords])
        parcels.append({"khasra_no": kh, "confidence": round(conf, 1),
                        "bbox": [int(x), int(y), int(w), int(h)],
                        "geometry": mapping(ll), "area_ha": round(area_ha(ll), 4)})

    # topology
    polys = [Polygon(p["geometry"]["coordinates"][0]) for p in parcels]
    issues = []
    for i in range(len(polys)):
        for j in range(i + 1, len(polys)):
            inter = polys[i].intersection(polys[j]).area
            if inter > 0.02 * min(polys[i].area, polys[j].area):
                issues.append(f"overlap between {parcels[i]['khasra_no']} and {parcels[j]['khasra_no']}")
    frame_poly = Polygon([to_lonlat(fx0, fy0), to_lonlat(fx1, fy0), to_lonlat(fx1, fy1), to_lonlat(fx0, fy1)])
    union = unary_union(polys) if polys else Polygon()
    gap = (frame_poly.area - union.intersection(frame_poly).area) / frame_poly.area if frame_poly.area else 0
    if gap > 0.03:
        issues.append(f"{gap:.1%} of the sheet is not covered by any parcel (gaps)")
    dup = {p["khasra_no"] for p in parcels if [q["khasra_no"] for q in parcels].count(p["khasra_no"]) > 1}
    for d in dup:
        issues.append(f"khasra {d} appears on more than one polygon")
    parcels.sort(key=lambda p: p["khasra_no"])
    return {"frame_px": [fx0, fy0, fx1, fy1], "extent": extent, "parcels": parcels,
            "topology_issues": issues, "coverage": round(1 - gap, 4)}
