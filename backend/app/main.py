"""Bhu-Digitize API. Run: uvicorn app.main:app --reload (from backend/)."""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .api import admin, dashboard, documents, records, review
from .config import FRONTEND_DIST
from .pipeline.ocr import available_langs, engine_version
from .pipeline.worker import start_workers
from .seed import seed

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

@asynccontextmanager
async def lifespan(_app):
    seed()
    from .auth import migrate_audit_chain
    migrate_audit_chain()
    if os.getenv("BHU_NO_WORKER") != "1":
        start_workers(int(os.getenv("WORKERS", "1")))
    yield


app = FastAPI(lifespan=lifespan, title="Bhu-Digitize: Land Record Digitization & Validation", version="1.0.0",
              description="AI-assisted digitization of legacy land records: UP Khatauni, Maharashtra 7/12, WB Khatian, TN Patta, Punjab Jamabandi.")
@app.middleware("http")
async def _seal_audit(request, call_next):
    response = await call_next(request)
    # link this request's audit rows into the hash chain now that they are committed
    if request.url.path.startswith("/api/"):
        from starlette.concurrency import run_in_threadpool
        from .auth import seal_audit_chain
        await run_in_threadpool(seal_audit_chain)
    return response


app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
                   allow_methods=["*"], allow_headers=["*"])
for r in (admin.router, documents.router, review.router, records.router, dashboard.router):
    app.include_router(r)


@app.get("/api/v1/health")
def health():
    langs = sorted(available_langs())
    from .pipeline.indic import engine_status
    return {"ok": True, "ocr_engine": engine_version(), "ocr_languages": langs, "hindi_ready": "hin" in langs,
            "indic": engine_status()}


if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        f = FRONTEND_DIST / path
        if path and f.is_file():
            return FileResponse(f)
        return FileResponse(FRONTEND_DIST / "index.html")
