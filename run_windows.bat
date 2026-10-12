@echo off
REM One-time setup + start for Windows. Needs Python 3.10+ and Tesseract (with Hindi) installed.
cd /d %~dp0
if not exist .venv (
  echo Creating virtual environment...
  python -m venv .venv || goto :err
  call .venv\Scripts\activate
  pip install -r backend\requirements.txt || goto :err
) else (
  call .venv\Scripts\activate
  echo Checking packages...
  pip install -q -r backend\requirements.txt || goto :err
)
cd backend
echo.
echo Open http://localhost:8000  (pick a demo officer on the sign-in page, password demo123)
echo.
python -m uvicorn app.main:app --port 8000
goto :eof
:err
echo Setup failed - see messages above.
pause
