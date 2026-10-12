"""IndicOCR (Bodhan AI, open weights) as a small HTTP service for Bhu-Digitize.

Run this on a machine with an NVIDIA GPU (or a free Google Colab GPU — see colab_indic_ocr.ipynb):
    uvicorn server:app --host 0.0.0.0 --port 8000
Then in the app's backend/.env:
    OCR_ENGINE=indic_server
    INDIC_OCR_URL=http://<this-machine>:8000        (or the trycloudflare URL from Colab)
    INDIC_OCR_TOKEN=<same token as below>
"""
import os
import tempfile

import sys

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from huggingface_hub import snapshot_download

TOKEN = os.getenv("INDIC_OCR_TOKEN")    # shared secret; strongly recommended when exposed via a tunnel
REPO = snapshot_download(os.getenv("INDIC_OCR_REPO", "bodhan-ai/indic-ocr"))
# the `indic_ocr` package ships inside the model repo; install.sh installs its dependencies,
# so make the repo importable whether or not the package itself was pip-installed
for _p in (REPO, os.path.join(REPO, "src")):
    if (os.path.isdir(os.path.join(_p, "indic_ocr")) or os.path.isfile(os.path.join(_p, "indic_ocr.py"))) \
            and _p not in sys.path:
        sys.path.insert(0, _p)
from indic_ocr import IndicOCR  # noqa: E402
parser = IndicOCR.from_pretrained(REPO, table_format="markdown")
app = FastAPI(title="IndicOCR server")


@app.get("/health")
def health():
    return {"ok": True, "model": "bodhan-ai/indic-ocr"}


@app.post("/parse")
async def parse(file: UploadFile = File(...), x_token: str | None = Header(default=None)):
    if TOKEN and x_token != TOKEN:
        raise HTTPException(401, "bad token")
    data = await file.read()
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as fh:
        fh.write(data)
        path = fh.name
    try:
        page = parser.parse(path)
    finally:
        os.unlink(path)
    return {"width": page.get("width"), "height": page.get("height"), "blocks": page.get("blocks", []),
            "markdown": page.get("markdown")}
