#!/usr/bin/env bash
# One-time setup + start for macOS / Linux. Needs Python 3.10+ and Tesseract with Hindi (tesseract-ocr-hin).
set -e
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  python3 -m venv .venv
  . .venv/bin/activate
  pip install -r backend/requirements.txt
else
  . .venv/bin/activate
fi
cd backend
echo "Open http://localhost:8000  (demo users: operator / reviewer / supervisor / admin, password demo123)"
exec python -m uvicorn app.main:app --port 8000
