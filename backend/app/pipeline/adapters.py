"""Integration gateway: one adapter per external system, so the rest of the code never talks to
government endpoints directly. Mock implementations are used unless a base URL is configured."""
import os
from datetime import datetime, timezone

import httpx
from rapidfuzz import fuzz

from ..sample_data import MOCK_LRMS


class LRMSAdapter:
    """State Land Records Management System (e.g. UP Bhulekh)."""

    def __init__(self):
        self.base = os.getenv("LRMS_BASE_URL")

    def lookup(self, village_lgd: str, khata_no: str) -> dict | None:
        if self.base:
            try:
                r = httpx.get(f"{self.base}/khata", params={"lgd": village_lgd, "khata": khata_no}, timeout=5)
                return r.json() if r.status_code == 200 else None
            except httpx.HTTPError:
                raise RuntimeError("LRMS unreachable")          # retried by the orchestrator
        return MOCK_LRMS.get((village_lgd, str(khata_no)))

    def push(self, payload: dict) -> str:
        if self.base:
            r = httpx.post(f"{self.base}/records", json=payload, timeout=10)
            r.raise_for_status()
            return r.text[:200]
        return "mock: accepted"


class DILRMPAdapter:
    """DILRMP MIS progress reporting."""
    def push(self, payload: dict) -> str:
        url = os.getenv("DILRMP_MIS_URL")
        if url:
            r = httpx.post(url, json=payload, timeout=10)
            r.raise_for_status()
            return "delivered"
        return "mock: progress recorded"


class BhuNakshaAdapter:
    """Cadastral map system: receives newly digitized / linked parcel geometry."""
    def push(self, payload: dict) -> str:
        url = os.getenv("BHUNAKSHA_URL")
        if url:
            r = httpx.post(url, json=payload, timeout=10)
            r.raise_for_status()
            return "delivered"
        return "mock: parcel geometry accepted"


class WebhookAdapter:
    def push(self, payload: dict) -> str:
        url = os.getenv("WEBHOOK_URL")
        if url:
            httpx.post(url, json=payload, timeout=5)
            return "delivered"
        return "mock: no webhook configured"


ADAPTERS = {"lrms": LRMSAdapter(), "dilrmp_mis": DILRMPAdapter(), "bhunaksha": BhuNakshaAdapter(),
            "webhook": WebhookAdapter()}


def owners_match(a: list[str], b: list[str]) -> float:
    """Set similarity of two owner-name lists (0-100)."""
    if not a or not b:
        return 0.0
    scores = [max(fuzz.token_sort_ratio(x, y) for y in b) for x in a]
    penalty = abs(len(a) - len(b)) * 15
    return max(0.0, sum(scores) / len(scores) - penalty)


def dispatch_pending(db):
    """Deliver pending outbox rows. Called by the background worker."""
    from ..models import IntegrationEvent
    rows = db.query(IntegrationEvent).filter(IntegrationEvent.status == "pending").limit(50).all()
    for ev in rows:
        ev.attempts += 1
        try:
            ev.response = ADAPTERS[ev.target].push(ev.payload)
            ev.status = "delivered"
            ev.delivered_at = datetime.now(timezone.utc)
        except Exception as e:  # noqa: BLE001
            ev.response = str(e)[:500]
            if ev.attempts >= 5:
                ev.status = "failed"
    db.commit()
