"""Idempotent seed: master data (villages), demo users, pre-existing parcels, thresholds."""
import math

from shapely.geometry import Polygon, mapping
from sqlalchemy import select

from .auth import hash_password
from .db import Base, SessionLocal, engine
from .models import Parcel, Setting, User, Village
from .pipeline.mapdigitize import area_ha
from .pipeline.publish import make_ulpin
from .sample_data import DEFAULT_THRESHOLDS, DEMO_PASSWORD, DEMO_USERS, RAMPUR_PARCELS, STATE_PARCELS, VILLAGES


def _square(lon0, lat0, side_m):
    dlon = side_m / (111320 * math.cos(math.radians(lat0)))
    dlat = side_m / 110540
    return Polygon([(lon0, lat0), (lon0 + dlon, lat0), (lon0 + dlon, lat0 + dlat), (lon0, lat0 + dlat)])


def _add_parcels(db, village, parcels: dict):
    """Lay out square parcels of the given areas inside the village extent."""
    minlon, minlat = village.bbox[0] + 0.0004, village.bbox[1] + 0.0004
    x, y = minlon, minlat
    for i, (kh, ha) in enumerate(parcels.items()):
        side = math.sqrt(ha * 10000)
        poly = _square(x, y, side)
        poly = _square(x, y, side * math.sqrt(ha / area_ha(poly)))   # correct for projection
        db.add(Parcel(village_id=village.id, khasra_no=kh, ulpin=make_ulpin(village.lgd_code, kh),
                      geojson=mapping(poly), area_ha=round(area_ha(poly), 4), source_document_id=None))
        x = poly.bounds[2] + 0.00005
        if i % 5 == 4:
            x, y = minlon, poly.bounds[3] + 0.00005


def seed():
    """Idempotent: adds whatever master data / users / parcels are missing (safe on an existing DB)."""
    Base.metadata.create_all(engine)
    db = SessionLocal()
    try:
        vs = {v.lgd_code: v for v in db.scalars(select(Village))}
        for lgd, native, en, teh, dist, state, bbox in VILLAGES:
            if lgd not in vs:
                vs[lgd] = Village(lgd_code=lgd, name=native, name_en=en, tehsil=teh, district=dist, state=state, bbox=bbox)
                db.add(vs[lgd])
        users = {u.username for u in db.scalars(select(User))}
        for u, name, role, st, di, te in DEMO_USERS:
            if u not in users:
                db.add(User(username=u, full_name=name, role=role, state=st, district=di, tehsil=te,
                            password_hash=hash_password(DEMO_PASSWORD)))
        db.flush()
        with_parcels = set(db.scalars(select(Parcel.village_id).distinct()))
        for lgd, parcels in {"900001": RAMPUR_PARCELS, **STATE_PARCELS}.items():
            if vs[lgd].id not in with_parcels:
                _add_parcels(db, vs[lgd], parcels)
        have = {s.key for s in db.scalars(select(Setting))}
        for k, v in DEFAULT_THRESHOLDS.items():
            if f"threshold:{k}" not in have:
                db.add(Setting(key=f"threshold:{k}", value=str(v)))
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("seeded")
