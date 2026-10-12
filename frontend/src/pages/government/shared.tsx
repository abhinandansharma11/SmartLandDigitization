// ==========================================
// BhumiSetu - pieces shared by the processing, verification and upload screens
// ==========================================

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { pageImageUrl } from '../../services/api-client';
import { BACKEND_STATUS_LABEL } from '../../services/backend';
import type { BDocDetail, BField, BValidation } from '../../services/backend';
import { Badge } from '../../components/ui';
import type { ProcessingPipelineStep } from '../../types/documents';

// ---------------------------------------------------------------- document viewer
export type Box = { id: number; bbox: number[]; low?: boolean };

/**
 * The processed scan with a box drawn over every field that was read. Scroll to zoom, drag to move.
 * When `active` changes, the viewer zooms to that field so the officer can compare it with the typed value.
 */
export const DocImage: React.FC<{
  doc: BDocDetail; page?: number; kind?: 'processed' | 'original'; boxes?: Box[]; active?: number | null;
  onBoxClick?: (id: number) => void; className?: string; dark?: boolean;
}> = ({ doc, page = 1, kind = 'processed', boxes = [], active = null, onBoxClick, className = '', dark = false }) => {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const p = doc.pages.find(pp => pp.page_no === page) || doc.pages[0];
  // page size from the backend, or from the image itself once it loads (older digital-PDF uploads)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const W = p?.width || natural?.w || 1000, H = p?.height || natural?.h || 1400;

  useLayoutEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // fit the whole page inside the frame
  const fit = Math.min(size.w / W, size.h / H) || 0;
  const iw = W * fit, ih = H * fit;
  const fitView = () => setView({ s: 1, x: (size.w - iw) / 2, y: (size.h - ih) / 2 });
  useEffect(() => { if (size.w) fitView(); }, [size.w, size.h, doc.id, page]); // eslint-disable-line react-hooks/exhaustive-deps

  // zoom to the active field
  useEffect(() => {
    if (active == null || !size.w) return;
    const b = boxes.find(x => x.id === active); if (!b) return;
    const [bx, by, bw, bh] = b.bbox;
    const s = Math.max(1, Math.min(4, (size.w * 0.55) / (bw * fit)));
    const cx = (bx + bw / 2) * fit, cy = (by + bh / 2) * fit;
    setView({ s, x: size.w / 2 - cx * s, y: size.h / 2 - cy * s });
  }, [active, size.w, size.h]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoomAt = (factor: number, ox = size.w / 2, oy = size.h / 2) => setView(v => {
    const s = Math.max(0.5, Math.min(6, v.s * factor));
    return { s, x: ox - ((ox - v.x) * s) / v.s, y: oy - ((oy - v.y) * s) / v.s };
  });

  return (
    <div ref={wrap} className={`relative overflow-hidden select-none ${dark ? 'bg-[#2a2d30]' : 'bg-gray-100'} ${dragging ? 'cursor-grabbing' : 'cursor-grab'} ${className}`}
      onWheel={e => { const r = wrap.current!.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); }}
      onPointerDown={e => { drag.current = { px: e.clientX, py: e.clientY, x: view.x, y: view.y }; setDragging(true); (e.target as Element).setPointerCapture?.(e.pointerId); }}
      onPointerMove={e => { const d = drag.current; if (d) setView(v => ({ ...v, x: d.x + e.clientX - d.px, y: d.y + e.clientY - d.py })); }}
      onPointerUp={() => { drag.current = null; setDragging(false); }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: iw, height: ih, transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`, transition: dragging ? 'none' : 'transform .3s cubic-bezier(.16,1,.3,1)' }}>
        <img src={pageImageUrl(doc.id, p?.page_no || 1, kind)} alt={`Page ${p?.page_no || 1} of ${doc.filename}`} draggable={false}
          onLoad={e => { const im = e.currentTarget; if (!p?.width && kind === 'processed') setNatural({ w: im.naturalWidth, h: im.naturalHeight }); }} className="block h-full w-full shadow-lg bg-white" />
        {kind === 'processed' && boxes.map(b => {
          const [x, y, w, h] = b.bbox;
          const on = active === b.id;
          return <div key={b.id} onClick={e => { e.stopPropagation(); onBoxClick?.(b.id); }}
            className={`absolute rounded-[3px] border-2 ${on ? 'border-amber-400 bg-amber-300/25 shadow-[0_0_0_4000px_rgba(0,0,0,0.28)]' : b.low ? 'border-red-400/80 bg-red-300/10' : 'border-emerald-500/40'} ${onBoxClick ? 'cursor-pointer' : 'pointer-events-none'}`}
            style={{ left: x * fit, top: y * fit, width: w * fit, height: h * fit }} />;
        })}
      </div>
      <div className="absolute right-2 top-2 z-10 flex gap-1.5" onPointerDown={e => e.stopPropagation()}>
        <button aria-label="Zoom in" onClick={() => zoomAt(1.25)} className="rounded bg-white/95 p-1.5 text-text-secondary shadow-sm hover:bg-white"><ZoomIn className="h-4 w-4" /></button>
        <button aria-label="Zoom out" onClick={() => zoomAt(0.8)} className="rounded bg-white/95 p-1.5 text-text-secondary shadow-sm hover:bg-white"><ZoomOut className="h-4 w-4" /></button>
        <button aria-label="Fit page" onClick={fitView} className="rounded bg-white/95 p-1.5 text-text-secondary shadow-sm hover:bg-white"><Maximize className="h-4 w-4" /></button>
      </div>
      <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/45 px-2 py-0.5 text-[11px] text-white/90">Scroll to zoom · drag to move</span>
    </div>
  );
};

export const fieldBoxes = (doc: BDocDetail, page = 1): Box[] =>
  doc.fields.filter(f => f.bbox && f.page_no === page).map(f => ({ id: f.id, bbox: f.bbox!, low: f.confidence < f.threshold }));

// ---------------------------------------------------------------- pipeline
const ORDER = ['RECEIVED', 'PREPROCESSING', 'CLASSIFIED', 'EXTRACTING', 'VALIDATING'];
export const PIPELINE: { key: string; label: string; stage: number; detail: string }[] = [
  { key: 'received', label: 'Checksum & store', stage: 0, detail: 'SHA-256 fingerprint, original kept unchanged' },
  { key: 'quality_check', label: 'Quality Check', stage: 1, detail: 'Deskew, denoise, blur and contrast score' },
  { key: 'language_detection', label: 'Record type & script', stage: 2, detail: 'Which state format and which script' },
  { key: 'ocr_htr', label: 'OCR/HTR', stage: 3, detail: 'Indic OCR cross-checked with Tesseract' },
  { key: 'information_extraction', label: 'Field Extraction', stage: 3, detail: 'State template maps text to fields' },
  { key: 'validation', label: 'Validation', stage: 4, detail: 'Format, master data and arithmetic rules' },
  { key: 'duplicate_detection', label: 'Duplicate Detection', stage: 4, detail: 'Image hash and holding match' },
  { key: 'confidence_scoring', label: 'Confidence Routing', stage: 4, detail: 'Auto-approve or send to a person' },
];

export function pipelineSteps(doc: BDocDetail): ProcessingPipelineStep[] {
  const failedAt = doc.status === 'FAILED' ? ORDER.indexOf(doc.failed_stage || '') : -1;
  const at = ORDER.includes(doc.status) ? ORDER.indexOf(doc.status) : doc.status === 'FAILED' ? failedAt : 5;
  return PIPELINE.map(p => ({
    stage: p.key as ProcessingPipelineStep['stage'],
    status: failedAt >= 0 && p.stage === failedAt ? 'failed' : p.stage < at ? 'completed' : p.stage === at ? 'running' : 'pending',
    details: p.detail,
  }));
}

/** 0-100, for progress rings. */
export const pipelinePercent = (doc: { status: string }) => {
  const i = ORDER.indexOf(doc.status);
  return i < 0 ? 100 : Math.round(((i + 0.5) / ORDER.length) * 100);
};

// ---------------------------------------------------------------- fields, checks
export const fieldValue = (f: BField) => f.final_value ?? f.value ?? '';

export const RULE_LABEL: Record<string, string> = {
  V01_MANDATORY: 'Mandatory field missing', V02_VILLAGE_MASTER: 'Village not in LGD master', V03_JURISDICTION: 'District or tehsil differs from upload',
  V04_KHATA_FORMAT: 'Khata number format', V05_CATEGORY: 'Land category unknown', V06_KHASRA_FORMAT: 'Khasra number format',
  V07_AREA_RANGE: 'Plot area out of range', V08_TOTAL_AREA: 'Plot areas do not add up to total', V09_SHARES_SUM: 'Owner shares do not add up to 1',
  V09_SHARE_FORMAT: 'Share unreadable', V10_RELATION: 'Relation term unknown', V11_LRMS: 'Owners differ from state LRMS',
  V11_LRMS_PLOTS: 'Plots differ from state LRMS', V12_PARCEL_LINK: 'No map parcel for this khasra', V13_MAP_AREA: 'Record area differs from map',
  V15_DATE: 'Invalid date', V16_FASLI_RANGE: 'Year out of range',
};

export function validationCards(vs: BValidation[]) {
  const order = { hard: 0, soft: 1, info: 2 } as Record<string, number>;
  return [...vs].sort((a, b) => Number(a.passed) - Number(b.passed) || (order[a.severity] ?? 3) - (order[b.severity] ?? 3)).map((v, i) => ({
    id: `${v.rule_code}-${i}`,
    status: v.passed ? 'pass' : v.severity === 'hard' ? 'fail' : v.severity === 'soft' ? 'warning' : 'info',
    severity: v.severity === 'hard' ? 'error' : v.severity === 'soft' ? 'warning' : 'info',
    message: v.message,
    details: `${RULE_LABEL[v.rule_code] || v.rule_code} · ${v.rule_code}`,
    recommendation: v.passed ? undefined : v.severity === 'hard' ? 'Correct the field, or a supervisor must justify the override' : v.severity === 'soft' ? 'Check against the scan; add a comment to approve anyway' : undefined,
  }));
}

export function overallConfidence(doc: BDocDetail) {
  if (!doc.fields.length) return 0;
  return Math.round(doc.fields.reduce((a, f) => a + f.confidence, 0) / doc.fields.length);
}

export function docLanguage(doc: BDocDetail) {
  const scripts = new Set<string>();
  doc.pages.forEach(p => (p.lines || []).forEach(l => l.script && scripts.add(l.script)));
  const names: Record<string, string> = { Devanagari: 'Hindi/Marathi (Devanagari)', Bengali: 'Bengali', Tamil: 'Tamil', Gurmukhi: 'Punjabi (Gurmukhi)', Latin: 'English' };
  const list = [...scripts].filter(s => s && s !== 'Unknown').map(s => names[s] || s);
  return list.length ? list.join(' + ') : ({ khatauni: 'Hindi', satbara: 'Marathi', khatian: 'Bengali', patta: 'Tamil', jamabandi: 'Punjabi', map: 'Map labels' } as Record<string, string>)[doc.doc_type || ''] || 'Script not detected';
}

export const rawText = (doc: BDocDetail) => doc.pages.map(p => (p.lines || []).map(l => l.text).join('\n')).join('\n\n');

export function processingSeconds(doc: BDocDetail) {
  if (doc.events.length < 2) return null;
  const start = new Date(doc.events[0].ts).getTime();
  const done = doc.events.find(e => e.from === 'VALIDATING') || doc.events[doc.events.length - 1];
  return Math.max(0, (new Date(done.ts).getTime() - start) / 1000);
}

/** Split the backend's "a | b; c" route reason into readable sentences. */
export const reasons = (r: string | null) => (r || '').split(/\s\|\s|;\s/).map(s => s.trim()).filter(Boolean);

// ---------------------------------------------------------------- status badge in the backend's own words
const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'default'> = {
  RECEIVED: 'purple', PREPROCESSING: 'purple', CLASSIFIED: 'purple', EXTRACTING: 'purple', VALIDATING: 'purple',
  IN_REVIEW: 'warning', SUPERVISOR: 'info', MANUAL_ENTRY: 'warning', AUTO_APPROVED: 'success', PUBLISHED: 'success',
  FAILED: 'danger', REJECTED: 'danger', DUPLICATE: 'default',
};
export const DocStatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <Badge variant={STATUS_VARIANT[status] || 'default'}>{BACKEND_STATUS_LABEL[status] || status}</Badge>
);
