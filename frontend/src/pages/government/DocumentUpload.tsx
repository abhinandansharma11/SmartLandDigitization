// ==========================================
// BhumiSetu - Document Upload & Processing Pipeline
// Uploads to the real pipeline, follows its state, then shows what was read.
// ==========================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileText, FileImage, ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle, Check,
  Sparkles, Clock3, Languages, FileCheck2, ArrowRight, Copy, XCircle,
} from 'lucide-react';
import { Button, StatusBadge } from '../../components/ui';
import { documentsService } from '../../services/documents.service';
import { BDocDetail, BDocSummary, BVillage, BACKEND_STATUS_LABEL, DOC_TYPE_OPTIONS, PROCESSING_STATUSES, REVIEWABLE, fmtAgo, toDocType, toVerificationStatus } from '../../services/backend';
import { DOCUMENT_TYPE_LABELS } from '../../types/land-records';
import { useAuthStore } from '../../store/auth.store';
import { toast } from '../../store/ui.store';
import { useLiveInterval } from '../../hooks/useLiveUpdates';
import { DocStatusBadge, docLanguage, fieldValue, overallConfidence, reasons } from './shared';

type ProcessState = 'select' | 'pipeline' | 'review' | 'success' | 'batch';

const PROCESS_STAGES = [
  'Reading your document',
  'Organising the details',
  'Checking the information',
  'Preparing it for review',
];
// backend status -> which of the four plain-language stages we are in
const STAGE_OF: Record<string, number> = { RECEIVED: 0, PREPROCESSING: 0, CLASSIFIED: 1, EXTRACTING: 1, VALIDATING: 2 };

// Browser-side pre-check so a blurry phone photo can be retaken before it is queued.
async function photoWarning(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null;
  const bmp = await createImageBitmap(file);
  const w = 500, h = Math.round((bmp.height / bmp.width) * 500);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d'); if (!ctx) return null;
  ctx.drawImage(bmp, 0, 0, w, h); bmp.close();
  const px = ctx.getImageData(0, 0, w, h).data;
  const g = new Float32Array(w * h); let sum = 0;
  for (let i = 0; i < w * h; i++) { g[i] = 0.299 * px[4 * i] + 0.587 * px[4 * i + 1] + 0.114 * px[4 * i + 2]; sum += g[i]; }
  let lap = 0, n = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; const v = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w]; lap += v * v; n++; }
  const blur = lap / n, bright = sum / (w * h);
  return blur < 60 ? 'Looks blurry. Retake the photo if you can.' : bright < 90 ? 'The photo is dark.' : bright > 245 ? 'The photo looks washed out.' : null;
}

export const DocumentUpload: React.FC = () => {
  const navigate = useNavigate();
  const { user, can } = useAuthStore();
  const [step, setStep] = useState<ProcessState>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [doc, setDoc] = useState<BDocDetail | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [recent, setRecent] = useState<BDocSummary[]>([]);

  // where the record comes from: the district decides the state format and language
  const [villages, setVillages] = useState<BVillage[]>([]);
  const mine = villages.filter(v => v.in_jurisdiction);
  const districts = useMemo(() => [...new Set(mine.map(v => `${v.state}|${v.district}`))], [mine]);
  const [district, setDistrict] = useState(user?.jurisdiction.district || '');
  const [villageId, setVillageId] = useState('');
  const [docType, setDocType] = useState('');
  // users with state-wide or national access start on Lucknow (the main demo district) if they can see it
  const d = district || (districts.find(x => x.endsWith('|Lucknow')) || districts[0])?.split('|')[1] || '';
  const vs = mine.filter(v => v.district === d && (!user?.jurisdiction.tehsil || v.tehsil === user.jurisdiction.tehsil));

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadRecent = () => documentsService.list({ limit: 8 }).then(r => setRecent(r.items)).catch(() => {});
  useEffect(() => { documentsService.villages().then(setVillages).catch(() => {}); loadRecent(); }, []);

  const handleFile = async (file: File) => {
    setSelectedFile(file); setUploadError(null); setDoc(null);
    setFilePreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    setWarning(await photoWarning(file).catch(() => null));
    setStep('pipeline');
    try {
      const created = await documentsService.upload(file, { district: d, tehsil: user?.jurisdiction.tehsil, village_id: villageId, doc_type_hint: docType });
      setDoc(await documentsService.get(created.id));
    } catch (e: any) {
      setUploadError(e.message);
    }
  };

  // ---- batch upload: many scans at once, each fingerprinted and queued separately ----
  const [batch, setBatch] = useState<BDocSummary[]>([]);
  const [batchErrors, setBatchErrors] = useState<string[]>([]);
  const [batchSending, setBatchSending] = useState(0);
  const handleFiles = async (list: FileList | File[]) => {
    const files = [...list];
    if (files.length === 1) return handleFile(files[0]);
    setBatch([]); setBatchErrors([]); setBatchSending(files.length); setStep('batch');
    const meta = { district: d, tehsil: user?.jurisdiction.tehsil, village_id: villageId, doc_type_hint: docType };
    for (let i = 0; i < files.length; i += 10) {            // 10 files per request keeps each request small
      const chunk = files.slice(i, i + 10);
      try { const created = await documentsService.uploadMany(chunk, meta); setBatch(b => [...b, ...created]); }
      catch (e: any) { setBatchErrors(x => [...x, `${chunk.map(f => f.name).join(', ')}: ${e.message}`]); }
      setBatchSending(n => n - chunk.length);
    }
  };
  const batchBusy = batch.some(b => PROCESSING_STATUSES.includes(b.status));
  useLiveInterval(async () => {
    const fresh = await Promise.all(batch.map(b => documentsService.get(b.id).catch(() => b)));
    setBatch(fresh.map(({ pages, fields, validations, duplicates, events, ...rest }: any) => rest));
  }, 1500, step === 'batch' && (batchBusy || batchSending > 0));

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  // follow the real pipeline
  const processing = !!doc && PROCESSING_STATUSES.includes(doc.status);
  useLiveInterval(async () => { if (doc) setDoc(await documentsService.get(doc.id)); }, 1200, step === 'pipeline' && processing);
  useEffect(() => {
    if (step === 'pipeline' && doc && !processing) { const t = setTimeout(() => setStep('review'), 700); return () => clearTimeout(t); }
  }, [step, doc, processing]);

  const currentStage = !doc ? 0 : processing ? STAGE_OF[doc.status] ?? 0 : PROCESS_STAGES.length - 1;
  const pct = !doc ? 5 : processing ? Math.round(((currentStage + 0.5) / PROCESS_STAGES.length) * 100) : 100;

  const reset = () => { setBatch([]); setBatchErrors([]); setBatchSending(0); setStep('select'); setSelectedFile(null); setFilePreview(null); setDoc(null); setWarning(null); setUploadError(null); loadRecent(); };

  const published = doc && ['PUBLISHED', 'AUTO_APPROVED'].includes(doc.status);
  const reviewable = doc && REVIEWABLE.includes(doc.status);
  const conf = doc ? overallConfidence(doc) : 0;

  const openRecord = async () => {
    if (!doc) return;
    const r = await documentsService.recordFor(doc.id).catch(() => ({ record_id: null }));
    navigate(r.record_id ? `/records/${r.record_id}` : `/processing/${doc.id}`);
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-fade-in relative">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <FileCheck2 className="w-6 h-6 text-gov-blue" />
          Upload Document
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Upload one or many scanned land records (images or PDFs). Each is read automatically; anything uncertain goes to a reviewer.
        </p>
      </div>

      <AnimatePresence mode="wait">

        {/* STEP 1: SELECT FILE */}
        {step === 'select' && (
          <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="card p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <label className="block text-left">
                  <span className="mb-1.5 block text-xs font-semibold text-text-secondary">District</span>
                  <select value={d} disabled={!!user?.jurisdiction.district} onChange={e => { setDistrict(e.target.value); setVillageId(''); }}
                    className="input-base w-full">
                    {districts.map(x => { const [st, di] = x.split('|'); return <option key={x} value={di}>{di} ({st})</option>; })}
                  </select>
                  <span className="mt-1 block text-[11px] text-text-tertiary">Decides the state format and language.</span>
                </label>
                <label className="block text-left">
                  <span className="mb-1.5 block text-xs font-semibold text-text-secondary">Village</span>
                  <select value={villageId} onChange={e => setVillageId(e.target.value)} className="input-base w-full">
                    <option value="">Read it from the page</option>
                    {vs.map(v => <option key={v.id} value={v.id}>{v.name_en} · {v.name} (LGD {v.lgd_code})</option>)}
                  </select>
                </label>
                <label className="block text-left">
                  <span className="mb-1.5 block text-xs font-semibold text-text-secondary">Record type</span>
                  <select value={docType} onChange={e => setDocType(e.target.value)} className="input-base w-full">
                    <option value="">Detect automatically</option>
                    {DOC_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {docType === 'map' && !villageId && <span className="mt-1 block text-[11px] text-amber-700">Map sheets need a village so they can be placed on the map.</span>}
                </label>
              </div>

              <div
                onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button" tabIndex={0} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center text-center ${
                  isDragging ? 'border-gov-blue bg-gov-blue-50/50 scale-[1.02]' : 'border-border-strong hover:border-gov-blue hover:bg-surface-secondary'
                }`}
              >
                <input type="file" multiple className="hidden" ref={fileInputRef} accept="image/*,.pdf,.tif,.tiff"
                  onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ''; }} />
                <div className="w-20 h-20 rounded-full bg-gov-blue/10 flex items-center justify-center mb-4">
                  <UploadCloud className="w-10 h-10 text-gov-blue" />
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-2">Drag & Drop Documents Here</h3>
                <p className="text-sm text-text-secondary max-w-md mx-auto">
                  One file or a whole batch at once. Scanned or digital PDF (multi-page is fine), JPG, PNG or TIFF, up to 50 MB each. Reads Hindi, Marathi, Bengali, Tamil, Punjabi and English.
                </p>
                <div className="mt-8">
                  <Button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>Browse Files</Button>
                </div>
              </div>
            </div>

            {recent.length > 0 && (
              <div className="card">
                <div className="px-6 py-3 border-b border-border-default flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">Recent uploads</h3>
                  <span className="text-xs text-text-tertiary">Click one to open it</span>
                </div>
                <div className="divide-y divide-border-default">
                  {recent.map(r => (
                    <button key={r.id} onClick={() => navigate(`/processing/${r.id}`)} className="w-full flex items-center gap-4 px-6 py-3 text-left hover:bg-surface-secondary">
                      <FileImage className="w-4 h-4 text-gov-blue flex-shrink-0" />
                      <span className="flex-1 min-w-0"><span className="block text-sm font-medium truncate">{r.filename}</span>
                        <span className="block text-xs text-text-tertiary">{DOCUMENT_TYPE_LABELS[toDocType(r.doc_type)]} · {r.village || r.district}</span></span>
                      <DocStatusBadge status={r.status} />
                      <span className="w-20 text-right text-xs text-text-tertiary">{fmtAgo(r.uploaded_at)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* BATCH: many documents at once */}
        {step === 'batch' && (
          <motion.div key="batch" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
            {(() => {
              const total = batch.length + batchSending;
              const done = batch.filter(b => !PROCESSING_STATUSES.includes(b.status)).length;
              const count = (...st: string[]) => batch.filter(b => st.includes(b.status)).length;
              const chips: [string, number, string][] = [
                ['Published', count('PUBLISHED', 'AUTO_APPROVED'), 'bg-verified-bg text-verified'],
                ['Needs review', count('IN_REVIEW'), 'bg-amber-50 text-amber-700'],
                ['With supervisor', count('SUPERVISOR', 'MANUAL_ENTRY'), 'bg-blue-50 text-blue-700'],
                ['Duplicate', count('DUPLICATE'), 'bg-gray-100 text-gray-700'],
                ['Failed', count('FAILED', 'REJECTED'), 'bg-red-50 text-error'],
              ];
              return <>
                <div className="px-6 py-4 border-b border-border-default">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-gov-blue" /> Batch of {total} documents</h3>
                    <span className="text-sm font-semibold text-text-secondary">{batchSending ? `Uploading ${batchSending} more...` : done === total ? 'All read' : `${done} of ${total} read`}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-tertiary"><motion.div className="h-full rounded-full bg-gov-blue" animate={{ width: `${total ? Math.max(4, (done / total) * 100) : 4}%` }} /></div>
                  <div className="mt-3 flex flex-wrap gap-2">{chips.filter(c => c[1] > 0).map(([l, n, cls]) => <span key={l} className={`rounded-full px-3 py-1 text-xs font-bold ${cls}`}>{n} {l}</span>)}</div>
                  <p className="mt-2 text-xs text-text-tertiary">Each file is fingerprinted and queued on its own; you can leave this page and follow them in Documents.</p>
                </div>
                {batchErrors.map(e => <p key={e} className="px-6 py-2 text-sm text-error border-b border-border-default">{e}</p>)}
                <div className="divide-y divide-border-default">
                  {batch.map(b => (
                    <button key={b.id} onClick={() => navigate(REVIEWABLE.includes(b.status) && can('review') ? `/verification/${b.id}` : `/processing/${b.id}`)}
                      className="w-full flex items-center gap-4 px-6 py-3 text-left hover:bg-surface-secondary">
                      <FileImage className="w-4 h-4 text-gov-blue flex-shrink-0" />
                      <span className="flex-1 min-w-0"><span className="block text-sm font-medium truncate">{b.filename}</span>
                        <span className="block text-xs text-text-tertiary truncate">{b.doc_type ? DOCUMENT_TYPE_LABELS[toDocType(b.doc_type)] : 'Identifying...'}{b.route_reason ? ` · ${reasons(b.route_reason)[0]}` : ''}</span></span>
                      {b.min_confidence != null && <span className={`text-xs font-bold ${b.min_confidence < 70 ? 'text-error' : b.min_confidence < 90 ? 'text-pending' : 'text-verified'}`}>{Math.round(b.min_confidence)}%</span>}
                      <DocStatusBadge status={b.status} />
                    </button>
                  ))}
                  {batchSending > 0 && <p className="px-6 py-3 text-sm text-text-tertiary">Uploading...</p>}
                </div>
                <div className="px-6 py-4 border-t border-border-default flex flex-wrap gap-2">
                  {can('review') && count('IN_REVIEW', 'SUPERVISOR', 'MANUAL_ENTRY') > 0 && <Button onClick={() => navigate('/verification')}>Open Verification Queue</Button>}
                  <Button variant="outline" onClick={() => navigate('/documents')}>View in Documents</Button>
                  <Button variant="ghost" onClick={reset}>Upload More</Button>
                </div>
              </>;
            })()}
          </motion.div>
        )}

        {/* STEP 2: PIPELINE PROCESSING */}
        {step === 'pipeline' && (
          <motion.div key="pipeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: Thumbnail Preview */}
            <div className="card p-4 h-[500px] flex flex-col bg-surface-secondary">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 min-w-0">
                  <FileImage className="w-5 h-5 text-gov-blue flex-shrink-0" />
                  <span className="text-sm font-semibold truncate max-w-[260px]">{selectedFile?.name}</span>
                </div>
                <span className="text-xs font-mono text-text-tertiary">{selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : ''}</span>
              </div>
              <div className="flex-1 rounded-xl overflow-hidden bg-surface-secondary relative shadow-inner flex items-center justify-center border border-border-strong">
                {filePreview ? (
                  <>
                    <img src={filePreview} alt="Preview" className="w-full h-full object-contain opacity-80" />
                    {!uploadError && <motion.div className="absolute left-0 right-0 h-1 bg-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.8)] z-10"
                      animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} />}
                  </>
                ) : (
                  <div className="text-center text-text-tertiary"><FileText className="w-16 h-16 mx-auto mb-2 opacity-50" /><p>PDF document</p></div>
                )}
              </div>
              {warning && <p className="mt-3 flex items-center gap-2 text-xs font-medium text-amber-700"><AlertTriangle className="w-4 h-4" /> {warning}</p>}
            </div>

            {/* Right: Plain-language progress */}
            <div className="card p-6 h-[500px] flex flex-col bg-white">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-text-primary"><Clock3 className="w-5 h-5 text-gov-blue" /> Processing progress</h3>
                {doc && <span className="text-xs font-mono text-text-tertiary bg-surface-tertiary px-3 py-1.5 rounded-full">{BACKEND_STATUS_LABEL[doc.status] || doc.status}</span>}
              </div>

              {uploadError ? (
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <XCircle className="w-14 h-14 text-error mb-3" />
                  <p className="text-lg font-bold text-text-primary">Upload not accepted</p>
                  <p className="mt-2 max-w-sm text-sm text-text-secondary">{uploadError}</p>
                  <Button className="mt-6" variant="secondary" onClick={reset}>Choose another file</Button>
                </div>
              ) : (
                <div className="flex flex-1 flex-col justify-center">
                  <div className="relative mx-auto mb-8 flex h-44 w-44 items-center justify-center rounded-full border-[14px] border-surface-tertiary">
                    <motion.div className="absolute inset-[-14px] rounded-full border-[14px] border-gov-blue border-r-transparent border-b-transparent"
                      animate={{ rotate: pct >= 100 ? 360 : Math.max(18, (pct / 100) * 360) }} transition={{ duration: 0.6 }} />
                    <div className="text-center">
                      <motion.p className="text-5xl font-extrabold tracking-tight text-navy-950" key={pct} initial={{ opacity: 0.4, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>{pct}%</motion.p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-gov-blue">{pct >= 100 ? 'Ready' : 'Complete'}</p>
                    </div>
                  </div>
                  <p className="text-center text-lg font-bold text-text-primary">{pct >= 100 ? 'Your document is ready for review' : PROCESS_STAGES[currentStage]}</p>
                  <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-5 text-text-secondary">
                    {doc ? 'Cleaning the scan, reading the text in its own script, and checking it against the village master and state records.' : 'Uploading and fingerprinting the original.'}
                  </p>
                  <div className="mt-6 h-2 overflow-hidden rounded-full bg-surface-tertiary">
                    <motion.div className="h-full rounded-full bg-gov-blue" animate={{ width: `${Math.max(8, pct)}%` }} transition={{ duration: 0.5 }} />
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-gov-blue-50 p-2 text-center"><ShieldCheck className="mx-auto h-4 w-4 text-gov-blue" /><p className="mt-1 text-[10px] font-semibold text-text-secondary">SHA-256 stored</p></div>
                    <div className="rounded-lg bg-surface-secondary p-2 text-center"><Languages className="mx-auto h-4 w-4 text-verified" /><p className="mt-1 text-[10px] font-semibold text-text-secondary">Multiple scripts</p></div>
                    <div className="rounded-lg bg-surface-secondary p-2 text-center"><FileCheck2 className="mx-auto h-4 w-4 text-gov-blue" /><p className="mt-1 text-[10px] font-semibold text-text-secondary">Record check</p></div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* STEP 3: REVIEW RESULTS */}
        {step === 'review' && doc && (
          <motion.div key="review" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Thumbnail & Integrity Check */}
            <div className="lg:col-span-4 space-y-4">
              <div className="card p-4">
                <div className="h-48 rounded-lg overflow-hidden bg-surface-secondary border border-border-default mb-4 flex items-center justify-center relative">
                  {filePreview ? <img src={filePreview} alt="Preview" className="w-full h-full object-cover" /> : <FileText className="w-12 h-12 text-text-tertiary" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-3">
                    <span className="text-white text-xs font-medium bg-black/40 backdrop-blur-md px-2 py-1 rounded truncate">{doc.filename}</span>
                  </div>
                </div>

                {doc.status === 'DUPLICATE' ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <Copy className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div><p className="text-sm font-bold text-amber-700">Same file already uploaded</p>
                      <p className="text-xs text-amber-700/80 mt-1">Identical SHA-256 to document {doc.duplicate_of?.slice(0, 8)}, so it was not read again.</p></div>
                  </div>
                ) : doc.duplicates.length > 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div><p className="text-sm font-bold text-amber-700">Possible duplicate or conflict</p>
                      {doc.duplicates.slice(0, 2).map(x => <p key={x.id} className="text-xs text-amber-700/80 mt-1">{x.detail}</p>)}</div>
                  </div>
                ) : (
                  <div className="p-3 bg-verified-bg border border-verified-border rounded-lg flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-verified mt-0.5 flex-shrink-0" />
                    <div><p className="text-sm font-bold text-verified">Integrity Check Passed</p>
                      <p className="text-xs text-verified/80 mt-1">Original stored unchanged (SHA-256 {doc.sha256.slice(0, 12)}). No earlier scan of this page was found.</p></div>
                  </div>
                )}
              </div>

              {/* Outcome + actions */}
              <div className={`card p-4 border-l-4 ${published ? 'border-l-verified' : doc.status === 'FAILED' ? 'border-l-error' : 'border-l-pending'}`}>
                <p className="text-sm font-bold text-text-primary">
                  {published ? 'Auto-validated and published' : reviewable ? (doc.status === 'SUPERVISOR' ? 'Needs supervisor approval' : 'Needs human verification') : doc.status === 'FAILED' ? 'Processing failed' : doc.status === 'DUPLICATE' ? 'Duplicate upload, nothing to do' : BACKEND_STATUS_LABEL[doc.status]}
                </p>
                {reasons(doc.route_reason || doc.error).slice(0, 4).map(r => <p key={r} className="text-xs text-text-secondary mt-1">• {r}</p>)}
              </div>

              <div className="flex flex-col gap-3">
                {published && <Button onClick={openRecord} size="lg" className="w-full justify-center shadow-lg">View Published Record</Button>}
                {reviewable && can('review') && <Button onClick={() => navigate(`/verification/${doc.id}`)} size="lg" className="w-full justify-center shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all bg-gradient-to-r from-gov-blue to-[#2d6ad6]">
                  Review & Verify Record <ArrowRight className="w-4 h-4" /></Button>}
                {reviewable && !can('review') && <Button onClick={() => { toast('Waiting in the review queue', { body: 'A reviewer in this district will check the flagged fields. You will see the status change in Recent uploads.', kind: 'info' }); reset(); }} size="lg" className="w-full justify-center">
                  Done, Upload Next</Button>}
                <Button variant="outline" onClick={() => navigate(`/processing/${doc.id}`)} className="w-full justify-center">Open Processing Workspace</Button>
                <Button variant="ghost" onClick={reset} className="w-full justify-center">Process Another Document</Button>
              </div>
            </div>

            {/* Right: Extracted Form */}
            <div className="lg:col-span-8">
              {doc.status === 'DUPLICATE' ? (
                <div className="card p-8 text-center">
                  <Copy className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-text-primary">This exact file was uploaded before</h3>
                  <p className="text-sm text-text-secondary mt-2 max-w-md mx-auto">Its SHA-256 fingerprint matches an earlier upload, so it was not read a second time. Nothing else needs doing.</p>
                  {doc.duplicate_of && <Button className="mt-5" variant="outline" onClick={() => navigate(`/processing/${doc.duplicate_of}`)}>Open the earlier upload</Button>}
                </div>
              ) : doc.status === 'FAILED' ? (
                <div className="card p-8 text-center">
                  <XCircle className="w-10 h-10 text-error mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-text-primary">The file could not be processed</h3>
                  <p className="text-sm text-text-secondary mt-2 max-w-md mx-auto">It was retried {doc.attempts} times. An admin can retry it or send it for manual entry from Settings.</p>
                  {doc.error && <p className="mt-3 font-mono text-xs text-error">{doc.error}</p>}
                </div>
              ) : (
              <div className="card">
                <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-surface-secondary/30">
                  <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-gov-blue" /> Extracted Record Details</h3>
                  <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-ai-purple-50 text-ai-purple border border-ai-purple/20">AI Confidence: {conf}%</div>
                </div>
                <div className="px-6 pt-4 text-xs text-text-tertiary">{DOCUMENT_TYPE_LABELS[toDocType(doc.doc_type)]} · {docLanguage(doc)} · {doc.fields.length} fields</div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {doc.fields.length === 0 && <p className="text-sm text-text-tertiary">No fields were read from this file.</p>}
                  {doc.fields.map(f => (
                    <FieldRow key={f.id} label={f.label} value={fieldValue(f) || 'Not found'} confidence={Math.round(f.confidence)} isAmber={f.confidence < f.threshold || f.flags.length > 0} />
                  ))}
                </div>
              </div>
              )}
            </div>
          </motion.div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 'success' && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="card p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
            <CheckCircle2 className="w-12 h-12 text-verified mb-6" />
            <h2 className="text-3xl font-bold text-text-primary mb-3">Record Verified & Digitized</h2>
            <div className="flex gap-4"><Button onClick={reset} variant="secondary">Process Another Document</Button><Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button></div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

// --- Helper Component for Form Fields ---
const FieldRow: React.FC<{ label: string; value: string; confidence: number; isAmber?: boolean }> = ({ label, value, confidence, isAmber }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs font-medium text-text-secondary truncate">{label}</label>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 flex-shrink-0 ${isAmber ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
        {isAmber ? <AlertTriangle className="w-3 h-3" /> : <Check className="w-3 h-3" />}
        {confidence}%
      </span>
    </div>
    <div className={`p-3 border rounded-lg font-semibold text-text-primary ${isAmber ? 'bg-amber-50/50 border-amber-200' : 'bg-surface-secondary border-border-default'}`}>{value}</div>
  </div>
);

export default DocumentUpload;
