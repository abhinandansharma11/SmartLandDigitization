// ==========================================
// BhumiSetu - Human-in-the-Loop Verification Workspace
// Real queue, real scan, real corrections. Every edit is saved with a reason code and
// becomes a training label; approvals of ownership changes go to a supervisor.
// ==========================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, AlertTriangle, ShieldAlert, Cpu, RotateCcw, Clock, Flag, ArrowRight, User,
  Lock, Undo2, Check, Keyboard, ChevronDown, ChevronUp, History, FileSearch, PenLine, Dice5,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { toast } from '../../store/ui.store';
import { useLiveInterval } from '../../hooks/useLiveUpdates';
import { verificationService } from '../../services/verification.service';
import { documentsService } from '../../services/documents.service';
import { BDocDetail, BDocSummary, BField, BACKEND_STATUS_LABEL, REVIEWABLE, fmtAgo, fmtDateTime, toDocType } from '../../services/backend';
import { DOCUMENT_TYPE_LABELS } from '../../types/land-records';
import { ValidationCard } from '../../components/ui';
import { DocImage, RULE_LABEL, fieldBoxes, fieldValue, reasons, validationCards } from './shared';

const needs = (f: BField) => (f.confidence < f.threshold || f.flags.length > 0) && f.confidence < 100;

const GROUPS: [string, (f: BField) => boolean][] = [
  ['Holding & location', f => !f.field_name.includes('.')],
  ['Owners', f => f.field_name.startsWith('owners.')],
  ['Plots', f => f.field_name.startsWith('plots.')],
  ['Map parcels', f => f.field_name.startsWith('parcels.')],
  ['Mutation & registration', f => f.field_name.startsWith('mutation.') || f.field_name.startsWith('registration.')],
];

// --- Sub-components ---
const EditableField: React.FC<{
  field: BField; draft: string | undefined; reason: string; codes: Record<string, string>; active: boolean; editable: boolean;
  onFocus: () => void; onDraft: (v: string) => void; onReason: (c: string) => void; onSave: () => void; onUndo: () => void;
  inputRef: (el: HTMLInputElement | null) => void;
}> = ({ field, draft, reason, codes, active, editable, onFocus, onDraft, onReason, onSave, onUndo, inputRef }) => {
  const current = fieldValue(field);
  const value = draft ?? current;
  const changed = value !== current;
  const flagged = needs(field);
  const conf = Math.round(field.confidence);
  const corrected = field.edited && field.value != null && field.value !== current;

  return (
    <div onClick={onFocus} className={`p-4 rounded-xl border-2 transition-colors ${
      active ? 'border-gov-blue bg-gov-blue-50/40' : flagged && !changed ? 'border-red-400/50 bg-red-50' : 'border-border-default bg-white'
    }`}>
      <div className="flex items-center justify-between mb-2 gap-2">
        <label htmlFor={`f${field.id}`} className="text-sm font-semibold text-text-primary flex items-center gap-2 min-w-0">
          <span className="truncate">{field.label}</span>
          {flagged && !changed && (
            <span className="flex flex-shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
              <AlertTriangle className="w-3 h-3" /> AI Flag
            </span>
          )}
        </label>
        <div className="flex flex-shrink-0 items-center gap-2" title={`Needs ${field.threshold}% to skip review`}>
          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full ${conf >= 90 ? 'bg-emerald-500' : conf >= 80 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${conf}%` }} />
          </div>
          <span className={`text-xs font-bold ${conf >= 90 ? 'text-emerald-600' : conf >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{conf}%</span>
        </div>
      </div>

      <input
        id={`f${field.id}`} ref={inputRef} type="text" value={value} disabled={!editable}
        onFocus={onFocus} onChange={e => onDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSave(); } if (e.key === 'Escape') onUndo(); }}
        className={`w-full p-2.5 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 disabled:opacity-70 ${
          flagged && !changed ? 'border-red-300 focus:ring-red-200 text-red-900 bg-white' : 'border-gray-200 focus:ring-gov-blue/20 bg-gray-50'
        }`}
      />

      {(field.raw_value && field.raw_value !== value) || field.flags.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-text-tertiary">
          {field.raw_value && field.raw_value !== value && <span>Printed as <b className="text-text-secondary">{field.raw_value}</b></span>}
          {field.flags.map(c => <span key={c} className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">{RULE_LABEL[c] || c}</span>)}
        </div>
      ) : null}

      {/* Audit Trail: Original vs Edited */}
      <AnimatePresence>
        {corrected && !changed && (
          <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 8 }} className="flex items-center gap-2 text-xs">
            <span className="text-text-tertiary line-through decoration-red-400 decoration-2">{field.value}</span>
            <ArrowRight className="w-3 h-3 text-text-tertiary" />
            <span className="text-gov-blue font-semibold flex items-center gap-1"><User className="w-3 h-3" /> Officer Correction</span>
          </motion.div>
        )}
      </AnimatePresence>

      {active && editable && (flagged || changed) && (
        <div className="mt-3 flex flex-wrap items-center gap-2" onClick={e => e.stopPropagation()}>
          {changed && (
            <select aria-label="Reason for the change" value={reason} onChange={e => onReason(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-gov-blue/20">
              {Object.entries(codes).filter(([k]) => k !== 'CONFIRMED').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          )}
          <button onClick={onSave} className="flex items-center gap-1 rounded-lg bg-gov-blue px-3 py-1.5 text-xs font-bold text-white hover:bg-gov-blue-light">
            <Check className="h-3.5 w-3.5" /> {changed ? 'Save correction' : 'Confirm as correct'}
          </button>
          {changed && <button onClick={onUndo} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-secondary"><Undo2 className="h-3.5 w-3.5" /> Undo</button>}
        </div>
      )}
    </div>
  );
};


// --- Type in a value the machine could not read (handwritten entries, unknown formats) ---
const FIELD_KINDS: { key: string; label: string; group?: 'owners' | 'plots'; hint: string }[] = [
  { key: 'village', label: 'Village', hint: 'As written, e.g. रामपुर कलां' },
  { key: 'khata_no', label: 'Khata number', hint: 'e.g. 45' },
  { key: 'plots.khasra_no', label: 'Khasra number', group: 'plots', hint: 'e.g. 112 or 113क' },
  { key: 'plots.area_ha', label: 'Plot area (ha)', group: 'plots', hint: 'Hectares, e.g. 0.405' },
  { key: 'owners.name', label: 'Owner name', group: 'owners', hint: 'e.g. राम प्रसाद' },
  { key: 'owners.relation', label: 'Owner relation', group: 'owners', hint: 'पुत्र / पत्नी / पुत्री' },
  { key: 'owners.relative_name', label: 'Owner father / husband', group: 'owners', hint: 'e.g. शिव प्रसाद' },
  { key: 'owners.share', label: 'Owner share', group: 'owners', hint: 'e.g. 1/2' },
  { key: 'total_area_ha', label: 'Total area (ha)', hint: 'Hectares' },
  { key: 'fasli_year', label: 'Record year', hint: 'e.g. 1428-1433 or 2008' },
  { key: 'category', label: 'Land category', hint: 'e.g. 1-क' },
];

const AddFieldPanel: React.FC<{ doc: BDocDetail; onAdded: () => Promise<void> }> = ({ doc, onAdded }) => {
  const [kind, setKind] = useState(FIELD_KINDS[0].key);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const k = FIELD_KINDS.find(x => x.key === kind)!;
  // owners/plots are numbered: add to the next free slot unless that slot still lacks this field
  const slot = (() => {
    if (!k.group) return null;
    const attr = k.key.split('.')[1];
    const idx = new Set(doc.fields.filter(f => f.field_name.startsWith(k.group + '.')).map(f => Number(f.field_name.split('.')[1])));
    for (let i = 0; i <= idx.size; i++) if (!doc.fields.some(f => f.field_name === `${k.group}.${i}.${attr}`)) return i;
    return idx.size;
  })();
  const fieldName = k.group ? `${k.group}.${slot}.${k.key.split('.')[1]}` : k.key;
  const label = k.group ? `${k.group === 'owners' ? 'Owner' : 'Plot'} ${(slot ?? 0) + 1} ${k.label.replace(/^(Owner|Plot) /, '').toLowerCase()}` : k.label;
  const add = async () => {
    if (!value.trim()) return;
    setBusy(true);
    try { await verificationService.addField(doc.id, fieldName, label, value.trim()); setValue(''); await onAdded(); toast('Field added', { body: `${label}: ${value.trim()}` }); }
    catch (e: any) { toast('Not added', { body: e.message, kind: 'error' }); }
    finally { setBusy(false); }
  };
  const few = doc.fields.filter(f => (f.final_value ?? f.value)).length < 3;
  return (
    <div className={`rounded-xl border p-4 ${few ? 'border-gov-blue bg-gov-blue-50/40' : 'border-border-default'}`}>
      <h4 className="flex items-center gap-2 text-sm font-semibold text-text-primary"><PenLine className="w-4 h-4 text-gov-blue" /> {few ? 'Type in the record from the scan' : 'Something missing? Add a field'}</h4>
      <p className="mt-1 mb-3 text-xs text-text-tertiary">{few ? 'The machine could not read this page (handwriting or an unfamiliar format). Read each value off the scan on the left and add it here.' : 'For a value the machine missed, for example a second owner or plot.'}</p>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Field" value={kind} onChange={e => setKind(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm">
          {FIELD_KINDS.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
        </select>
        <input aria-label="Value" value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={k.hint} className="min-w-[180px] flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gov-blue/20" />
        <button disabled={busy || !value.trim()} onClick={add} className="rounded-lg bg-gov-blue px-3 py-2 text-xs font-bold text-white hover:bg-gov-blue-light disabled:opacity-50">Add {k.group ? `as ${label.toLowerCase()}` : ''}</button>
      </div>
    </div>
  );
};


// --- Main Workspace Component ---
export const VerificationWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [params] = useSearchParams();
  const { can } = useAuthStore();
  const isSup = can('supervise');

  const [queue, setQueue] = useState<BDocSummary[] | null>(null);
  const [doc, setDoc] = useState<BDocDetail | null>(null);
  const [lockErr, setLockErr] = useState<string | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [reason, setReason] = useState<Record<number, string>>({});
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [showChecks, setShowChecks] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const inputs = useRef<Record<number, HTMLInputElement | null>>({});

  const loadQueue = useCallback(() => verificationService.queue(isSup).then(setQueue).catch(e => toast('Could not load the queue', { body: e.message, kind: 'error' })), [isSup]);
  useEffect(() => { loadQueue(); verificationService.reasonCodes().then(setCodes).catch(() => {}); }, [loadQueue]);
  useLiveInterval(loadQueue, 6000);

  // open the first item when none is selected
  useEffect(() => { if (!id && queue && queue.length) navigate(`/verification/${queue[0].id}`, { replace: true }); }, [id, queue, navigate]);

  const loadDoc = useCallback(async (docId: string) => {
    const d = await documentsService.get(docId);
    setDoc(d);
    verificationService.fieldAudit(docId).then(setHistory).catch(() => setHistory([]));
    return d;
  }, []);

  // claim a 20-minute lease while the record is open
  useEffect(() => {
    if (!id) { setDoc(null); return; }
    let alive = true;
    setDoc(null); setDraft({}); setComment(''); setLockErr(null); setShowChecks(false);
    verificationService.claim(id).catch(e => alive && setLockErr(e.message));
    loadDoc(id).then(d => {
      if (!alive) return;
      const want = Number(params.get('field'));
      const first = d.fields.find(f => f.id === want) || d.fields.find(needs);
      setActive(first ? first.id : null);
      if (first) setTimeout(() => inputs.current[first.id]?.focus({ preventScroll: false }), 120);
    }).catch(e => toast('Could not open the document', { body: e.message, kind: 'error' }));
    return () => { alive = false; verificationService.release(id).catch(() => {}); };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pending = useMemo(() => doc?.fields.filter(needs) || [], [doc]);
  const editable = !!doc && REVIEWABLE.includes(doc.status) && !lockErr && can('review');
  const activeItem = queue?.find(q => q.id === id);

  const goNext = (after: number) => {
    if (!doc) return;
    const list = doc.fields;
    const i = list.findIndex(f => f.id === after);
    const nxt = [...list.slice(i + 1), ...list.slice(0, i)].find(needs);
    if (nxt) { setActive(nxt.id); setTimeout(() => inputs.current[nxt.id]?.focus(), 60); }
  };

  const save = async (f: BField) => {
    if (!doc) return;
    const current = fieldValue(f);
    const value = draft[f.id] ?? current;
    const code = value === current ? 'CONFIRMED' : reason[f.id] || 'OCR_ERROR';
    try {
      await verificationService.editField(doc.id, f.id, value, code);
      setDraft(x => { const y = { ...x }; delete y[f.id]; return y; });
      const d = await loadDoc(doc.id);
      void d;
      goNext(f.id);
    } catch (e: any) { toast('Not saved', { body: e.message, kind: 'error' }); }
  };

  const afterDecision = () => {
    window.dispatchEvent(new Event('queue-changed'));
    const rest = (queue || []).filter(q => q.id !== id);
    setQueue(rest);
    setTimeout(() => navigate(rest.length ? `/verification/${rest[0].id}` : '/verification'), 250);
  };

  const run = async (label: string, fn: () => Promise<any>) => {
    if (!doc) return;
    setBusy(true);
    try {
      const r = await fn();
      const status = r?.status;
      if (status === 'SUPERVISOR') toast('Sent to a supervisor', { body: r.reason || 'Ownership, share or area changes need a second officer.', kind: 'info' });
      else if (status === 'PUBLISHED') toast('Record published', { body: 'Signed, versioned and pushed to the state systems.' });
      else toast(label, { body: status ? `Status: ${BACKEND_STATUS_LABEL[status] || status}` : undefined });
      if (!status || status !== doc.status) afterDecision();
      else { await loadDoc(doc.id); loadQueue(); }
    } catch (e: any) {
      toast('Action needs attention', { body: e.message, kind: 'error' });
    } finally { setBusy(false); }
  };

  const reject = (why: string) => {
    const text = comment.trim();
    if (!text) { toast('Add a reason first', { body: 'Write why in the comment box, it goes into the audit log.', kind: 'error' }); return; }
    run(why ? 'Re-scan requested' : 'Record rejected', () => verificationService.reject(doc!.id, why ? `${why}: ${text}` : text));
  };

  if (queue && queue.length === 0 && !id) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] animate-fade-in">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
        <h2 className="text-2xl font-bold text-text-primary">Queue Cleared!</h2>
        <p className="text-text-secondary mt-2">Nothing is waiting for {isSup ? 'review or approval' : 'review'} in your jurisdiction.</p>
        <button onClick={() => navigate('/dashboard')} className="mt-6 px-6 py-2 bg-gov-blue text-white rounded-lg font-semibold hover:bg-gov-blue-light transition-colors">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const lowFlag = activeItem ? (activeItem.min_confidence ?? 100) < 80 : pending.length > 0;
  const routing = doc?.status === 'SUPERVISOR' ? { label: 'Supervisor Approval', cls: 'bg-violet-50 border-violet-200 text-violet-700', Icon: ShieldAlert, pulse: false }
    : doc?.status === 'MANUAL_ENTRY' ? { label: 'Manual Entry', cls: 'bg-orange-50 border-orange-200 text-orange-700', Icon: PenLine, pulse: false }
    : doc?.qa_sample ? { label: 'Random QA Sample', cls: 'bg-blue-50 border-blue-200 text-blue-700', Icon: Dice5, pulse: false }
    : lowFlag ? { label: 'Integrity / Low Confidence', cls: 'bg-red-50 border-red-200 text-red-700', Icon: ShieldAlert, pulse: true }
    : { label: 'Standard Review', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700', Icon: Cpu, pulse: false };

  return (
    <div className="flex h-[calc(100vh-56px)] -m-6 bg-surface-secondary overflow-hidden animate-fade-in">

      {/* LEFT SIDEBAR: Queue List */}
      <div className="w-72 bg-white border-r border-border-default flex flex-col flex-shrink-0 z-10">
        <div className="p-4 border-b border-border-default bg-surface-secondary/50 flex items-center justify-between">
          <h2 className="font-bold text-text-primary flex items-center gap-2">
            <Clock className="w-5 h-5 text-gov-blue" />
            Review Queue
          </h2>
          <span className="bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full text-xs">
            {queue ? queue.length : '...'} Pending
          </span>
        </div>
        <p className="px-4 pt-2 text-[11px] text-text-tertiary">{isSup ? 'Supervisor approvals first, then lowest confidence.' : 'Lowest confidence first. Opening one reserves it for you for 20 minutes.'}</p>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <AnimatePresence>
            {(queue || []).map(item => {
              const conf = item.min_confidence != null ? Math.round(item.min_confidence) : null;
              const low = conf != null && conf < 80;
              return (
                <motion.div
                  key={item.id} layout
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100, height: 0, margin: 0, padding: 0 }}
                  onClick={() => navigate(`/verification/${item.id}`)}
                  role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && navigate(`/verification/${item.id}`)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    id === item.id ? 'border-gov-blue bg-gov-blue-50/50 shadow-sm' : 'border-transparent hover:bg-gray-50 hover:border-border-default'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <span className={`font-mono text-xs font-bold truncate ${id === item.id ? 'text-gov-blue' : 'text-text-primary'}`}>
                      {DOCUMENT_TYPE_LABELS[toDocType(item.doc_type)].split(' (')[0]} · {item.id.slice(0, 6).toUpperCase()}
                    </span>
                    <span className="text-[10px] text-text-tertiary whitespace-nowrap">{fmtAgo(item.updated_at)}</span>
                  </div>
                  <p className="text-sm font-semibold mb-0.5 truncate" title={item.filename}>{item.filename}</p>
                  <p className="text-[11px] text-text-tertiary mb-2 truncate">{item.village || item.district}{item.tehsil ? `, ${item.tehsil}` : ''}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {conf != null && <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${low ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{conf}% Conf</span>}
                    {item.status === 'SUPERVISOR' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-bold">Supervisor</span>}
                    {item.status === 'MANUAL_ENTRY' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-bold">Manual</span>}
                    {item.qa_sample && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">QA sample</span>}
                    {low && item.status === 'IN_REVIEW' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold flex items-center gap-1"><Flag className="w-3 h-3" /> Flagged</span>}
                    {item.locked && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-bold flex items-center gap-1" title="Another officer has this open"><Lock className="w-3 h-3" /> In use</span>}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Header */}
        <div className="h-14 border-b border-border-default bg-white flex items-center justify-between px-6 flex-shrink-0 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="font-bold text-lg text-text-primary truncate" title={doc?.filename}>{doc ? doc.filename : 'Loading...'}</h2>
            <div className="h-4 w-px bg-border-strong flex-shrink-0" />
            <span className="text-sm text-text-secondary font-medium whitespace-nowrap">Human-in-the-Loop Review</span>
            {doc && <button onClick={() => navigate(`/processing/${doc.id}`)} className="hidden xl:flex items-center gap-1 text-xs font-semibold text-gov-blue hover:underline whitespace-nowrap"><FileSearch className="w-3.5 h-3.5" /> Full processing view</button>}
          </div>

          {/* Decision Routing Badge */}
          {doc && <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-semibold text-text-secondary hidden lg:inline">Routing Category:</span>
            <motion.div animate={routing.pulse ? { scale: [1, 1.05, 1] } : undefined} transition={{ repeat: Infinity, duration: 2 }}
              className={`flex items-center gap-1.5 px-3 py-1 border rounded-full shadow-sm ${routing.cls}`}>
              <routing.Icon className="w-4 h-4" />
              <span className="text-xs font-bold">{routing.label}</span>
            </motion.div>
          </div>}
        </div>

        {/* Split Pane */}
        <div className="flex-1 flex overflow-hidden">

          {/* PANE 1: Document Viewer */}
          <div className="w-[44%] border-r border-border-default flex flex-col">
            {doc ? <DocImage doc={doc} boxes={fieldBoxes(doc).map(b => ({ ...b, low: needs(doc.fields.find(f => f.id === b.id)!) }))} active={active}
              onBoxClick={fid => { setActive(fid); inputs.current[fid]?.focus(); }} className="flex-1" dark /> :
              <div className="flex-1 bg-gray-100" />}
          </div>

          {/* PANE 2: Extracted Fields Form */}
          <div className="flex-1 min-w-0 bg-white flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {doc && <>
                {lockErr && <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-text-secondary"><Lock className="w-4 h-4 mt-0.5 flex-shrink-0" /> {lockErr}. You can read this record but not edit it.</div>}
                <div className={`p-4 rounded-lg border ${pending.length ? 'bg-amber-50/60 border-amber-200' : 'bg-navy-50 border-navy-100'}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-ai-purple-50 flex items-center justify-center flex-shrink-0">
                      <Cpu className="w-5 h-5 text-ai-purple" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-navy-900 text-sm">
                        {pending.length ? `${pending.length} field${pending.length > 1 ? 's' : ''} need a look` : 'AI Extraction Complete: every field checked'}
                      </h3>
                      <p className="text-xs text-navy-600">{DOCUMENT_TYPE_LABELS[toDocType(doc.doc_type)]} · {doc.district}{doc.tehsil ? `, ${doc.tehsil}` : ''} · uploaded {fmtDateTime(doc.uploaded_at)}</p>
                      {reasons(doc.route_reason).length > 0 && <ul className="mt-2 space-y-0.5">{reasons(doc.route_reason).map(r => <li key={r} className="text-xs text-text-secondary">• {r}</li>)}</ul>}
                      {doc.qa_sample && <p className="mt-2 text-xs text-blue-700">Passed every check and would have been published. Picked at random to measure how often auto-approval is right.</p>}
                    </div>
                  </div>
                  {editable && <p className="mt-3 flex items-center gap-1.5 text-[11px] text-text-tertiary"><Keyboard className="w-3.5 h-3.5" /> The scan follows the field you are on. <kbd className="rounded border border-gray-300 bg-white px-1">Enter</kbd> saves or confirms and jumps to the next flagged field.</p>}
                </div>

                <div className="space-y-4 pb-4">
                  {GROUPS.map(([title, pred]) => {
                    const fs = doc.fields.filter(pred);
                    if (!fs.length) return null;
                    return (
                      <div key={title} className="space-y-3">
                        <h4 className="pt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-text-tertiary">{title}</h4>
                        {fs.map(f => (
                          <EditableField key={f.id} field={f} draft={draft[f.id]} reason={reason[f.id] || 'OCR_ERROR'} codes={codes}
                            active={active === f.id} editable={editable}
                            onFocus={() => setActive(f.id)}
                            onDraft={v => setDraft(x => ({ ...x, [f.id]: v }))}
                            onReason={c => setReason(x => ({ ...x, [f.id]: c }))}
                            onSave={() => save(f)}
                            onUndo={() => setDraft(x => { const y = { ...x }; delete y[f.id]; return y; })}
                            inputRef={el => { inputs.current[f.id] = el; }} />
                        ))}
                      </div>
                    );
                  })}
                </div>

                {editable && <AddFieldPanel doc={doc} onAdded={async () => { await loadDoc(doc.id); }} />}

                {/* Checks */}
                <div className="rounded-xl border border-border-default">
                  <button onClick={() => setShowChecks(!showChecks)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-text-primary">
                    <span className="flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-text-tertiary" /> Validation checks
                      <span className="text-xs font-medium text-text-tertiary">{doc.validations.filter(v => !v.passed && v.severity !== 'info').length} open · {doc.validations.filter(v => v.passed).length} passed</span></span>
                    {showChecks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showChecks && <div className="px-4 pb-4 space-y-2">{validationCards(doc.validations).map(v => <ValidationCard key={v.id} {...v} />)}
                    {doc.duplicates.map(d => <ValidationCard key={`d${d.id}`} status={d.kind.includes('conflict') ? 'fail' : 'warning'} message={d.detail} details={`${Math.round(d.score)}% match`} />)}</div>}
                </div>

                {history.length > 0 && <div className="rounded-xl border border-border-default p-4">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-2"><History className="w-4 h-4 text-text-tertiary" /> Changes on this record</h4>
                  <div className="space-y-1.5">{history.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-text-tertiary w-36 truncate">{h.field}</span>
                      {h.old === h.new ? <span className="text-text-secondary">Confirmed <b>{h.new}</b></span> :
                        <><span className="text-text-tertiary line-through decoration-red-400">{h.old}</span><ArrowRight className="w-3 h-3 text-text-tertiary" /><b className="text-text-primary">{h.new}</b></>}
                      <span className="ml-auto text-text-tertiary whitespace-nowrap">{codes[h.reason] || h.reason} · {h.user}</span>
                    </div>))}</div>
                </div>}
              </>}
            </div>

            {/* Bottom Actions */}
            {doc && editable && (
              <div className="p-4 border-t border-border-default bg-surface-primary shadow-[0_-10px_20px_rgba(0,0,0,0.03)] space-y-3">
                <input value={comment} onChange={e => setComment(e.target.value)} aria-label="Comment"
                  placeholder={doc.status === 'IN_REVIEW' ? 'Comment (needed to approve with open warnings, or to reject)' : 'Justification (needed to override a blocking check)'}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gov-blue/20" />
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <button disabled={busy} onClick={() => reject('')} className="px-2 py-1.5 text-xs font-semibold text-error hover:bg-error-bg rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap">
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                  <div className="flex items-center gap-2 flex-wrap">
                    {doc.status !== 'IN_REVIEW' && isSup && <button disabled={busy} title="Return to the reviewer with your comment" onClick={() => run('Sent back to reviewer', () => verificationService.sendBack(doc.id, comment))} className="px-2.5 py-1.5 text-xs font-semibold text-text-secondary border border-border-strong hover:bg-surface-secondary rounded-lg flex items-center gap-1.5 whitespace-nowrap"><Undo2 className="w-3.5 h-3.5" /> Send Back</button>}
                    {doc.status !== 'MANUAL_ENTRY' && <button disabled={busy} title="Too hard to read: a supervisor will type this record in by hand" onClick={() => run('Marked for manual entry', () => verificationService.manualEntry(doc.id))} className="px-2.5 py-1.5 text-xs font-semibold text-text-secondary border border-border-strong hover:bg-surface-secondary rounded-lg flex items-center gap-1.5 whitespace-nowrap"><PenLine className="w-3.5 h-3.5" /> Type It In</button>}
                    <button disabled={busy} title="Close this upload and ask the office to scan the page again" onClick={() => reject('Re-scan requested')} className="px-2.5 py-1.5 text-xs font-semibold text-text-secondary border border-border-strong hover:bg-surface-secondary rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap">
                      <RotateCcw className="w-3.5 h-3.5" /> Request Re-scan
                    </button>
                    {(doc.status === 'IN_REVIEW' || isSup) && <button disabled={busy} onClick={() => run('Approved', () => verificationService.approve(doc.id, comment))}
                      className="px-4 py-2 text-sm font-bold text-white bg-gov-blue hover:bg-gov-blue-light shadow-lg hover:shadow-xl rounded-lg transition-all flex items-center gap-2 whitespace-nowrap disabled:opacity-60">
                      <CheckCircle2 className="w-4 h-4" /> {doc.status === 'IN_REVIEW' ? 'Approve & Route' : 'Approve & Publish'}
                    </button>}
                  </div>
                </div>
              </div>
            )}
            {doc && !editable && !lockErr && (
              <div className="p-4 border-t border-border-default text-sm text-text-secondary">
                This record is <b>{BACKEND_STATUS_LABEL[doc.status] || doc.status}</b>{can('review') ? '' : ' and your role can only view it'}.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export const VerificationQueue = VerificationWorkspace;
export const VerificationDetail = VerificationWorkspace;
