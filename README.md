# Bhu-Digitize — AI Land Record Digitization & Validation (demo build)

A working end-to-end prototype of the workflow in [`docs/workflow.md`](docs/workflow.md), tuned for
**Uttar Pradesh Khatauni** (Record of Rights) in Hindi. Upload a scan → it is cleaned, classified, OCR'd,
turned into structured fields, validated against master data / the state LRMS / existing records,
scored, and either auto-published or routed to a human reviewer (and a supervisor for ownership changes).
Published records link to cadastral parcels (ULPIN) on a map, are searchable in Hindi or English, and
every action is in a tamper-evident audit log.

> All villages, names, LGD codes and ULPINs in the sample data are **fictional**.

---

## 1. Run it

### Option A — Windows (no Docker)

1. **Python 3.10+** — https://www.python.org/downloads/ (tick "Add python.exe to PATH").
2. **Tesseract OCR with Hindi** — install the UB-Mannheim build
   (https://github.com/UB-Mannheim/tesseract/wiki). In the installer, expand
   *Additional language data* and tick **Hindi**. Default path `C:\Program Files\Tesseract-OCR` is
   detected automatically; otherwise set `TESSERACT_CMD` to the full path of `tesseract.exe`.
3. Double-click **`run_windows.bat`** (first run creates `.venv` and installs packages — a few minutes).
4. Open **http://localhost:8000**. The sidebar shows "OCR: Hindi ready" when Tesseract is found.

### Option B — macOS / Linux

```bash
# Ubuntu: sudo apt install tesseract-ocr tesseract-ocr-hin     macOS: brew install tesseract tesseract-lang
./run.sh
```

### Option C — Docker

```bash
docker compose up --build        # then http://localhost:8000
```
(The Dockerfile bundles Tesseract + Hindi and builds the frontend. It was written but not built in the
authoring environment — Options A/B are the tested paths.)

The frontend is **pre-built** in `frontend/dist` and served by the API, so Node.js is only needed if you
change the UI (`cd frontend && npm install && npm run dev` → http://localhost:5173, proxies `/api` to :8000).

### Frontend: BhumiSetu

`frontend/` is the team's BhumiSetu UI (github.com/abhinandansharma11/SmartLandDigitization: React 19, Tailwind 4,
framer-motion, zustand), wired to this backend. What is real and what is still demo:

| Screen | Data |
|---|---|
| Officer login | Real sign-in. The profile picker signs in as the seeded demo users (password `demo123`); "Sign in with username" for any account. |
| Dashboard / command center | `/dashboard/summary`, latest documents, audit log, OCR health. Operators (no dashboard permission) see numbers from their own uploads. |
| Document Processing (upload) | Real upload with district/village/record type, live pipeline status, real extracted fields, duplicate/rescan detection. |
| AI Processing Workspace `/processing/:docId` | Real scan with field boxes, OCR text, fields, checks, duplicates, pipeline stages. |
| Verification Queue | Real reviewer + supervisor queues, 20-minute lease, field corrections with reason codes, approve / reject / re-scan / send back / manual entry. |
| Land Records, GIS / Maps, Reports, Audit Logs, Users, Settings | Real API (records search across scripts, parcels GeoJSON, hash-chain check, user creation, thresholds, dead-letter queue). |
| Citizen portal `/` | Search and record view use the public, no-login endpoints (`/public/search`, `/public/record/{id}`, `/public/stats`). |
| Track Application, Certificates, MFA | Still demo data: the digitization backend has no mutation-application or certificate service. |

Sidebar items follow the backend permissions of the signed-in user. The previous plain UI is kept in
`frontend-classic/` (not built or served).

### Indic OCR (Bodhan IndicOCR)

The app reads pages with **Bodhan IndicOCR** (open model, Sept 2026: 22 Indian languages printed,
12 handwritten) and uses Tesseract as an independent second reader. A word both engines read the same
gets high confidence; where they disagree the field goes to a reviewer; if IndicOCR is unreachable the
page falls back to Tesseract (noted in the document history). Pick one option, then copy
`backend\.env.example` to `backend\.env`, fill it in and restart:

| Option | Works on | Setup |
|---|---|---|
| `OCR_ENGINE=bodhan_api` | any laptop | Sign up at console.bodhan.ai (₹10 free credit, ~₹0.20/page), set `BODHAN_API_KEY` and `BODHAN_MODEL` (the document-OCR model id from their API docs). Scans leave your machine. |
| `OCR_ENGINE=indic_server` | any laptop + free Colab GPU | Open `ocr_server/colab_indic_ocr.ipynb` in Google Colab (T4 GPU), accept the model licence on Hugging Face, run all cells, paste the printed `INDIC_OCR_URL` / `INDIC_OCR_TOKEN` into `.env`. |
| `OCR_ENGINE=indic_local` | PC with NVIDIA GPU | Install IndicOCR per its model card (`bodhan-ai/indic-ocr`, uses vLLM/CUDA) into the same venv. |
| `OCR_ENGINE=tesseract` | anywhere, offline | default |

The sidebar shows which engine is active. The integration (API call format, block parsing, merge,
confidence, fallback) is covered by tests with a mock engine; the real model has not been run in the
authoring environment (no GPU), and the Bodhan API model id must be taken from their docs.

### Multiple states and languages

| State | Record | Language / script | Plot no. | Area units | Sample | Reviewer login |
|---|---|---|---|---|---|---|
| Uttar Pradesh | Khatauni | Hindi (Devanagari) | khasra / gata | hectare, bigha-biswa | `01`–`10` | `reviewer` |
| Maharashtra | 7/12 (Satbara) | Marathi (Devanagari) | gat / survey no. | hectare.are.sq-m (1.20.50) | `11` | `pune` |
| West Bengal | Khatian | Bengali | dag no. | acre, decimal (শতক) | `12`, `15` (old, stained) | `hooghly` |
| Tamil Nadu | Patta | Tamil | survey no. (112/3A) | hectare - are (0 - 45.50) | `13` | `madurai` |
| Punjab | Jamabandi | Punjabi (Gurmukhi) | khasra (murabba//killa) | kanal-marla (8-0) | `14` | `mohali` |

Sign in as **`multi_op`** to upload for any state; the district you pick decides the state and therefore
the record format, Tesseract language and validation rules. Each format is one `Template` in
`backend/app/pipeline/templates.py` (printed labels, owner/plot layout, relation words, area parser,
plot-number pattern) — add a state by adding a template, its villages to the master data and its
Tesseract `.traineddata` to `backend/tessdata`. Search works across scripts (e.g. `gurpreet singh`
finds ਗੁਰਪ੍ਰੀਤ ਸਿੰਘ). Every document page has a **Raw OCR text** panel showing exactly what was read.

Honest limits: the sample pages share a simplified layout; real registers from each state vary and
will need their labels added to the template. Tesseract is weak on Bengali/Marathi scans, so for those
states IndicOCR matters most — with Tesseract alone expect most fields to go to review.

### Demo accounts (password `demo123`)

| user | role | jurisdiction |
|---|---|---|
| `operator` | data-entry operator (uploads only) | Lucknow / Malihabad tehsil |
| `reviewer` | reviewer (can also upload) | Lucknow district |
| `supervisor` | supervisor / Tehsildar: approves owner, plot and area changes | Lucknow district |
| `gis` | GIS reviewer (map sheets) | Lucknow district |
| `sitapur` | reviewer | Sitapur district only |
| `dadmin` / `stateadmin` | district / state admin | Lucknow / Uttar Pradesh |
| `admin` | super admin (thresholds, DLQ) | all |
| `auditor` | read-only audit | all |
| `vendor` | integration (bulk upload API) | Uttar Pradesh |
| `multi_op` | operator for all states | all |
| `pune` / `hooghly` / `madurai` / `mohali` | reviewers | Pune / Hooghly / Madurai / Mohali |

---

## 2. Five-minute demo script

Sample files are in `samples/` (regenerate with `python samples/generate.py`). Menu names below are the
left sidebar of the officer portal. To start from an empty system, stop the server and delete `data/`.

1. **Sign in as `reviewer`** (the default profile) → **Upload Document** (sidebar, or the button on the
   Dashboard). First upload **`09_map_bahadurpur_sheet.png`** with Village *Bahadurpur* and Record type
   *Cadastral map sheet*: 9 plot outlines are digitised, khasra labels read, ULPINs issued, published.
2. Upload the rest with District *Lucknow* and the other two boxes left on automatic. The screen follows
   each file through the pipeline, then shows what was read. **Documents** lists everything with live status.
   | file | what happens |
   |---|---|
   | `07_…_digital.pdf` | born-digital: text layer used, OCR skipped → **auto-published** |
   | `08_…_krutidev.pdf` | legacy **Kruti Dev** font → converted to Unicode → auto-published |
   | `10_…_bahadurpur_khata7.png` | plots link to the parcels from step 1 → auto-published (if 09 went first). A share of auto-approvable records is picked at random for a human spot check, so it may appear in review marked *Random QA check* |
   | `01_…_khata45_clean.png` | one khasra misread (`११३क`) → **Needs review** (format rule, no parcel, LRMS mismatch) |
   | `02_…_rescan.jpg` | flagged as a **rescan** of 01 and same khata still in review |
   | `03_…_old_bigha.jpg` | stained, 3° skewed, areas in **bigha-biswa** → deskewed, converted to hectares, needs review |
   | `04_…_conflict.png` | owner differs from state LRMS → **With supervisor** (blocking check) |
   | `05_…_bad_shares.png` | shares ½ + 1 ≠ 1 → **With supervisor** |
   | re-upload `01` | byte-identical → **Duplicate upload, nothing to do** |
   Sign in as `operator` and the District box only offers Lucknow: uploads are limited to your jurisdiction.
3. **Verification Queue** → open `01_…_khata45`. The scan zooms to whichever field you are on. Click
   *Plot 2 khasra*, type `113क`, press Enter (saved with a reason code), confirm the other flagged fields
   with Enter, then
   **Approve & Route** → it goes to the supervisor, because a plot number was changed.
4. **Sign in as `supervisor`** → Verification Queue → **Approve & Publish**. Approving `04_…_conflict`
   without writing a justification is refused.
5. **Land Records** → search `ram prasad` or `राम प्रसाद` → owners, plots with ULPINs, map, mutations,
   hash and signature, version history. **GIS / Maps** → plots coloured linked / no record / area conflict.
6. **Dashboard** → live counts; the pulse button (top right) opens *Live processing details*.
   **Reports & Analytics** → field accuracy from human review, why records were held, progress by district.
7. **Other states**: sign in as `multi_op` and upload `11`–`15` with District Pune / Hooghly / Madurai /
   Mohali. Then sign in as `pune`, `hooghly`, `madurai` or `mohali` to review them.
8. **`auditor`** → Audit Logs → *Verify Hash Chain*. **`admin`** → Settings (OCR engine, thresholds,
   failed jobs), User Management (create an officer with role and jurisdiction).
9. **Citizen portal**: sign out, open `/` → search `imran` → Record of Rights extract with owners,
   plots and map; *Print / Save as PDF*.

---

## 3. What maps to the problem statement

| Expected solution | Where |
|---|---|
| Multilingual recognition | per-line script ID + routing to matching Tesseract pack (`pipeline/ocr.py`); Hindi tuned; install more packs (`ben`, `guj`, `tam`…) to enable them |
| Extraction from scans, PDFs, maps | `triage.py` (PDF text layer, Kruti Dev → Unicode), `preprocess.py` (deskew/denoise/flatten), `mapdigitize.py` (georeference + vectorise) |
| Classification into fields | `extract.py` — UP Khatauni template: village, tehsil, district, fasli, khata, category, owners[] (relation, share), plots[] (khasra, area), total, mutation, registration |
| Business rules, cross-DB, duplicates | `validate.py` — 20+ rules, LGD master match, LRMS cross-check (`adapters.py`), parcel/ULPIN link, map-vs-text area, record dedup/conflict, image pHash + SHA-256 |
| Confidence scoring | OCR word confidence ⊕ rule outcomes ⊕ dictionary/LRMS/arithmetic corroboration, vs **per-field thresholds** (Admin) |
| Human-assisted verification | review workspace with source crop, reason codes, leases, maker-checker, manual-entry path |
| Learning over time | every verified field exported as (crop, label) to `data/labelled/ocr/<date>/labels.jsonl` |
| LRMS / DILRMP / GIS integration | transactional outbox → LRMS, DILRMP MIS, Bhu-Naksha, webhook adapters (mock unless URLs set); versioned public API |
| Secure repository, metadata, audit | write-once originals + SHA-256, document metadata, hash-chained audit log incl. views, append-only field audit |
| Dashboards | `/dashboard` — all six metrics asked for, with state → district → tehsil → village drill-down |
| APIs | OpenAPI at **http://localhost:8000/docs**; `/api/v1/public/records/{lgd}/{khata}`, `/api/v1/public/parcels/{ulpin}`, `/api/v1/batches` |
| Role-based access | 9 roles + jurisdiction scoping (state/district/tehsil) on every query |

## 4. Architecture of this build

```
React SPA ──► FastAPI (auth, RBAC+jurisdiction, REST) ──► SQLite / PostgreSQL
                    │                                        ▲
                    └─► durable pipeline worker ─────────────┘
                        RECEIVED → PREPROCESSING → CLASSIFIED → EXTRACTING → VALIDATING
                        → AUTO_APPROVED/PUBLISHED | IN_REVIEW | SUPERVISOR | FAILED(DLQ)
                        (idempotent stages, 3 retries with backoff, resume after restart)
                    └─► outbox dispatcher → LRMS / DILRMP MIS / Bhu-Naksha / webhook
```
Code: `backend/app/pipeline/*` (one module per workflow stage), `backend/app/api/*` (HTTP),
`frontend/src/pages/*` (UI; API adapters in `frontend/src/services/`). Tests: `cd backend && pytest -q` (10 end-to-end tests through real OCR).

## 5. Honest limits of the demo — and the production path

| Demo | Production (per the v3 architecture) |
|---|---|
| IndicOCR via API / Colab server, Tesseract cross-check | IndicOCR self-hosted on state GPUs (Triton/vLLM); fine-tune on `data/labelled` |
| Handwriting: detected (low confidence) and forced to human review; `HTR_MODEL` hook loads a TrOCR checkpoint if you have one (`pipeline/htr.py`) | fine-tuned TrOCR/CRNN per script |
| Template extraction for UP Khatauni only | per-state/per-doc-type templates + IndicBERT NER |
| Map vectorisation works on clean sheets | trained boundary-segmentation model for historical sheets; GCP picking UI |
| In-process worker queue | Temporal workflows + GPU worker pools |
| SQLite, GeoJSON geometry | PostgreSQL + PostGIS (set `DATABASE_URL`; not tested in this build), OpenSearch with Indic analyzers, GeoServer |
| Mock LRMS / DILRMP / Bhu-Naksha | real adapters — set `LRMS_BASE_URL`, `DILRMP_MIS_URL`, `BHUNAKSHA_URL` |
| Demo ULPIN (hash) and HMAC "signature" | state-issued ULPIN; DSC / eSign |
| Kruti Dev table covers common characters | full legacy-font tables (Kruti, DevLys, Chanakya…) |
| Bigha size is config (0.2529 ha) | per-district unit tables from the revenue department |

## 6. Configuration (environment variables)

`DATABASE_URL`, `BHU_DATA_DIR` (default `./data`), `JWT_SECRET`, `TESSERACT_CMD`, `OCR_LANGS` (default `hin`),
`HTR_MODEL`, `DEFAULT_THRESHOLD`, `QA_SAMPLE_RATE` (default 0.05), `LOW_QUALITY`, `AREA_CRS` (default EPSG:32644),
`WORKERS`, `LRMS_BASE_URL`, `DILRMP_MIS_URL`, `BHUNAKSHA_URL`, `WEBHOOK_URL`, `CORS_ORIGINS`.

To reset the demo, stop the server and delete the `data/` folder.
