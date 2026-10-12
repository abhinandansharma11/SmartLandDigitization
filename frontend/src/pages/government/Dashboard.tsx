// ==========================================
// BhumiSetu - Government Dashboard
// ==========================================

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { LoadingState, ErrorState } from '../../components/ui';
import { ROLE_LABELS, UserRole } from '../../types/auth';
import { DashboardStats, ChartDataPoint, TimeSeriesPoint } from '../../types/analytics';
import { analyticsService, auditService } from '../../services';
import { documentsService } from '../../services/documents.service';
import { BAudit, BDocSummary, BSummary, BACKEND_ROLE_LABEL, BACKEND_STATUS_LABEL, REVIEWABLE, fmtAgo, parseTs, toDocType } from '../../services/backend';
import { DOCUMENT_TYPE_LABELS } from '../../types/land-records';
import { useLiveInterval } from '../../hooks/useLiveUpdates';
import {
  FileText, CheckCircle2, Clock, AlertTriangle, Copy, Brain,
  FileCheck, Activity, ShieldCheck, ScanLine, Server,
  Database, LockKeyhole, CircleDot, UserCheck, Fingerprint, UploadCloud, CheckSquare,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line } from 'recharts';
import { motion, AnimatePresence, animate } from 'framer-motion';
import './dashboard.css';

// --- Helper for StatCard Color/Sparkline mapping ---
const getColorData = (colorClass: string) => {
  if (colorClass.includes('verified')) return { border: 'border-l-[#42d94f]', shadow: 'from-[#42d94f]/20 to-transparent', stroke: '#169c38', accent: '#42d94f', soft: '#d9f8d5' };
  if (colorClass.includes('pending')) return { border: 'border-l-[#d8ff32]', shadow: 'from-[#d8ff32]/25 to-transparent', stroke: '#91a900', accent: '#d8ff32', soft: '#f3ffc2' };
  if (colorClass.includes('error')) return { border: 'border-l-[#ff8f76]', shadow: 'from-[#ff8f76]/18 to-transparent', stroke: '#d95645', accent: '#ff8f76', soft: '#ffe1d8' };
  if (colorClass.includes('purple')) return { border: 'border-l-[#b765f2]', shadow: 'from-[#b765f2]/20 to-transparent', stroke: '#8a3dc2', accent: '#b765f2', soft: '#ead5ff' };
  return { border: 'border-l-[#24252a]', shadow: 'from-[#b765f2]/12 to-transparent', stroke: '#24252a', accent: '#24252a', soft: '#e8e5e1' };
};

// --- Custom Animated StatCard ---
const AnimatedStatCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  colorClass?: string;
  onClick?: () => void;
  spark?: number[];
}> = ({ title, value, icon, colorClass = 'text-gov-blue', onClick, spark }) => {
  const [count, setCount] = useState(0);
  const { border, shadow, stroke, accent, soft } = getColorData(colorClass);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate: (v) => setCount(Math.round(v))
    });
    return controls.stop;
  }, [value]);

  // last 14 days from the backend (cumulative, so the line shows growth)
  let run = 0;
  const sparklineData = (spark || []).map((v, i) => ({ name: `d${i}`, value: (run += v) }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(value / 100000, 0.35) }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      style={{ background: `linear-gradient(135deg, ${soft} 0%, #fffdf9 72%, #ffffff 100%)` }}
      className={`dashboard-stat-card rounded-xl p-5 border-y border-r border-border-default ${border} relative overflow-hidden group cursor-pointer hover:shadow-card-hover transition-shadow`}
    >
      <div className={`absolute inset-0 bg-gradient-to-r ${shadow} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
      <div className="dashboard-stat-grid" aria-hidden="true" />
      <div className="dashboard-stat-orb" style={{ background: accent }} aria-hidden="true" />
      <div className="dashboard-stat-sheen" aria-hidden="true" />
      
      <div className="flex justify-between items-start mb-1 relative z-10">
        <div>
          <p className="text-sm font-medium text-text-secondary mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
            {count.toLocaleString()}
          </h3>
        </div>
        <div className={`dashboard-stat-icon p-2 rounded-lg ${colorClass}`} style={{ backgroundColor: `${soft}` }}>
          <motion.span
            animate={{ y: [0, -3, 0], rotate: [0, 4, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            className="block"
          >
            {icon}
          </motion.span>
        </div>
      </div>
      
      {sparklineData.length > 0 && <div className="h-10 mt-3 relative z-10 -mx-1 dashboard-stat-sparkline opacity-60 group-hover:opacity-100 transition-opacity">
         <ResponsiveContainer width="100%" height="100%">
           <LineChart data={sparklineData}>
             <Line type="monotone" dataKey="value" stroke={stroke} strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={1500} />
           </LineChart>
         </ResponsiveContainer>
      </div>}
      <span className="dashboard-stat-live" style={{ backgroundColor: accent }} aria-label="Live data" />
    </motion.div>
  );
};

// --- Live Activity Feed Component (latest document state changes) ---
const FEED_TONE: Record<string, string> = { PUBLISHED: 'verified', AUTO_APPROVED: 'verified', IN_REVIEW: 'pending', SUPERVISOR: 'pending',
  MANUAL_ENTRY: 'pending', FAILED: 'error', REJECTED: 'error', DUPLICATE: 'error' };
const LiveActivityFeed = () => {
  const navigate = useNavigate();
  const [feed, setFeed] = useState<{ id: string; text: string; time: string; type: string }[]>([]);
  const load = useCallback(() => documentsService.list({ limit: 6 }).then(r => setFeed(r.items.map(d => ({
    id: `${d.id}-${d.status}`, docId: d.id,
    text: `${d.filename}: ${BACKEND_STATUS_LABEL[d.status] || d.status}`,
    time: fmtAgo(d.updated_at), type: FEED_TONE[d.status] || 'info',
  })))).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  useLiveInterval(load, 5000);

  return (
    <div className="card h-full flex flex-col">
      <div className="px-5 py-4 border-b border-border-default flex items-center justify-between bg-surface-secondary/50">
         <h3 className="text-sm font-semibold text-text-primary">Live Activity Feed</h3>
         <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">Live</span>
         </div>
      </div>
      <div className="flex-1 overflow-hidden p-2">
        {feed.length === 0 && <p className="px-4 py-6 text-sm text-text-tertiary">No uploads yet.</p>}
        <AnimatePresence>
          {feed.map(item => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, scale: 0.9, height: 0 }}
              transition={{ duration: 0.4 }}
              onClick={() => navigate(`/processing/${(item as any).docId}`)}
              className="px-4 py-3 border-b border-border-default/50 last:border-0 flex items-center justify-between group hover:bg-surface-secondary rounded-lg cursor-pointer"
            >
               <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 shadow-sm ${item.type === 'verified' ? 'bg-emerald-500 shadow-emerald-500/40' : item.type === 'error' ? 'bg-red-500 shadow-red-500/40' : item.type === 'pending' ? 'bg-amber-500 shadow-amber-500/40' : 'bg-blue-500 shadow-blue-500/40'}`} />
                  <span className="text-sm text-text-primary font-medium group-hover:text-gov-blue transition-colors truncate">{item.text}</span>
               </div>
               <span className="text-xs text-text-tertiary flex-shrink-0 ml-4">{item.time}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const toneClasses: Record<string, string> = {
  cyan: 'text-cyan-300 border-cyan-400/30 bg-cyan-400/10',
  violet: 'text-violet-300 border-violet-400/30 bg-violet-400/10',
  amber: 'text-amber-300 border-amber-400/30 bg-amber-400/10',
  emerald: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10',
  blue: 'text-blue-300 border-blue-400/30 bg-blue-400/10',
  red: 'text-red-300 border-red-400/30 bg-red-400/10',
};
const AUDIT_WORDS: Record<string, string> = { login: 'signed in', upload: 'uploaded a document', view: 'viewed a record', claim: 'opened a record for review',
  edit_field: 'corrected a field', add_field: 'added a missing field', approve: 'approved a record', supervisor_approve: 'approved as supervisor',
  escalate: 'sent a record to the supervisor', reject: 'rejected a record', send_back: 'sent a record back', api_read: 'read a record through the API',
  download_original: 'downloaded an original scan', update_thresholds: 'changed confidence thresholds', redrive: 'retried a failed job', create_user: 'created a user' };

export const CommandCenter: React.FC<{ summary: BSummary }> = ({ summary }) => {
  const navigate = useNavigate();
  const { can } = useAuthStore();
  const [queue, setQueue] = useState<BDocSummary[]>([]);
  const [health, setHealth] = useState<{ ocr_engine: string; ocr_languages: string[]; indic: { engine: string; ready: boolean } } | null>(null);
  const [chain, setChain] = useState<{ ok: boolean; checked: number } | null>(null);
  const [events, setEvents] = useState<BAudit[]>([]);
  const [syncedAt, setSyncedAt] = useState(new Date());

  const load = useCallback(() => {
    documentsService.list({ limit: 5 }).then(r => { setQueue(r.items); setSyncedAt(new Date()); }).catch(() => {});
    if (can('audit')) auditService.raw().then(a => setEvents(a.slice(0, 4))).catch(() => {});
  }, [can]);
  useEffect(() => {
    load();
    analyticsService.health().then(setHealth).catch(() => {});
    if (can('audit')) auditService.verifyChain().then(setChain).catch(() => {});
  }, [load, can]);
  useLiveInterval(load, 5000);

  const k = summary.kpis;
  const checksFailed = summary.errors.reduce((a, e) => a + e.count, 0);
  const waiting = k.pending_review + k.pending_supervisor;
  const pct = (n: number) => `${k.documents ? Math.max(4, Math.round((n / k.documents) * 100)) : 0}%`;
  const STAGES = [
    { label: 'Ingest', detail: `${k.documents} received · SHA-256`, icon: FileText, tone: 'cyan', w: pct(k.documents) },
    { label: 'Extract', detail: k.in_pipeline ? `${k.in_pipeline} being read now` : 'OCR + field mapping', icon: Brain, tone: 'violet', w: pct(k.documents - k.in_pipeline) },
    { label: 'Validate', detail: `${checksFailed} check${checksFailed === 1 ? '' : 's'} raised`, icon: ShieldCheck, tone: 'amber', w: pct(k.documents - k.in_pipeline - k.failed) },
    { label: 'Human review', detail: `${waiting} waiting`, icon: UserCheck, tone: 'emerald', w: pct(waiting) },
    { label: 'Publish', detail: `${k.published} published · ${k.auto_approved} auto`, icon: Database, tone: 'blue', w: pct(k.published) },
  ];
  const tone = (d: BDocSummary) => d.status === 'FAILED' || (d.min_confidence ?? 100) < 70 ? 'red' : REVIEWABLE.includes(d.status) ? 'amber' : d.status === 'PUBLISHED' ? 'emerald' : 'cyan';
  const allOk = k.failed === 0 && (health?.indic?.ready ?? true) && (chain?.ok ?? true);

  return (
    <section className="officer-command-center rounded-2xl border border-slate-700/70 p-5 md:p-6 shadow-2xl">
      <div className="officer-grid absolute inset-0 rounded-2xl opacity-40" aria-hidden="true" />
      <div className="relative space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300/80">Officer command center</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Land record intelligence pipeline</h2>
            <p className="mt-1 text-xs text-slate-400">Live from the pipeline · Last sync {syncedAt.toLocaleTimeString('en-IN')} IST</p>
          </div>
          <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${allOk ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/30 bg-amber-400/10 text-amber-300'}`}>
            <span className={`officer-pulse h-2 w-2 rounded-full ${allOk ? 'bg-emerald-300' : 'bg-amber-300'}`} /> {allOk ? 'All systems nominal' : k.failed ? `${k.failed} job${k.failed > 1 ? 's' : ''} failed` : chain && !chain.ok ? 'Audit chain broken' : 'Indic OCR engine offline'}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          {STAGES.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <div key={stage.label} className="relative rounded-xl border border-slate-700/80 bg-slate-950/45 p-3">
                {index < STAGES.length - 1 && <span className="officer-connector hidden md:block" aria-hidden="true" />}
                <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg border ${toneClasses[stage.tone]}`}><Icon className="h-4 w-4" /></div>
                <p className="text-xs font-semibold text-slate-100">{stage.label}</p>
                <p className="mt-1 text-[10px] text-slate-400">{stage.detail}</p>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full transition-all duration-700 officer-bar-${stage.tone}`} style={{ width: stage.w }} /></div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/50">
            <div className="flex items-center justify-between border-b border-slate-700/70 px-4 py-3">
              <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-cyan-300" /><h3 className="text-sm font-semibold text-white">Processing queue</h3></div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{k.in_pipeline} active jobs · latest uploads</span>
            </div>
            <div className="divide-y divide-slate-800/80">
              {queue.length === 0 && <p className="px-4 py-4 text-xs text-slate-400">No documents yet. Upload one to see it move through the pipeline.</p>}
              <AnimatePresence initial={false}>
                {queue.map(item => (
                  <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => navigate(`/processing/${item.id}`)} className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-900/60">
                    <div className={`h-2 w-2 rounded-full ${tone(item) === 'red' ? 'bg-red-400' : tone(item) === 'amber' ? 'bg-amber-300' : tone(item) === 'emerald' ? 'bg-emerald-300' : 'bg-cyan-300'}`} />
                    <div className="min-w-[130px] flex-1"><p className="truncate text-xs font-semibold text-slate-100">{item.filename}</p><p className="text-[10px] text-slate-400">{DOCUMENT_TYPE_LABELS[toDocType(item.doc_type)]} · {item.village || item.district}</p></div>
                    <span className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-300">{BACKEND_STATUS_LABEL[item.status] || item.status}</span>
                    {item.min_confidence != null && <span className={`text-xs font-bold ${item.min_confidence < 70 ? 'text-red-300' : item.min_confidence < 80 ? 'text-amber-300' : 'text-emerald-300'}`}>{Math.round(item.min_confidence)}%</span>}
                    <span className="font-mono text-[10px] text-slate-500">{fmtAgo(item.updated_at)}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 p-4">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><ScanLine className="h-4 w-4 text-violet-300" /><h3 className="text-sm font-semibold text-white">Integrity guard</h3></div><Fingerprint className="h-4 w-4 text-slate-500" /></div>
            <div className="officer-scan-panel relative mt-4 overflow-hidden rounded-lg border border-violet-400/20 p-4">
              <div className="officer-scan-line" aria-hidden="true" />
              <div className="relative flex items-end justify-between"><div><p className="text-2xl font-bold text-white">{k.duplicates}</p><p className="text-[10px] uppercase tracking-wider text-slate-400">Duplicate uploads stopped</p></div>
                <span className="text-right text-xs text-violet-200">{summary.errors.find(e => e.rule.startsWith('V11'))?.count || 0} LRMS<br />conflicts</span></div>
              <div className="mt-4 h-1.5 rounded-full bg-slate-800"><div className="h-full rounded-full bg-violet-400 transition-all duration-700" style={{ width: `${k.qa_accuracy ?? 0}%` }} /></div>
              <p className="mt-1 text-[10px] text-slate-400">{k.qa_accuracy != null ? `Spot-check accuracy ${k.qa_accuracy}% on ${k.qa_samples} random samples` : 'Spot-check accuracy appears after random QA samples are reviewed'}</p>
              <p className="mt-3 flex items-center gap-2 text-[10px] text-slate-400"><LockKeyhole className={`h-3 w-3 ${chain && !chain.ok ? 'text-red-300' : 'text-emerald-300'}`} />
                {chain ? (chain.ok ? `Audit hash chain intact · ${chain.checked} entries verified` : 'Audit hash chain BROKEN') : 'Every original stored with its SHA-256 fingerprint'}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 p-4">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><CircleDot className="h-4 w-4 text-emerald-300" /><h3 className="text-sm font-semibold text-white">System health</h3></div>
              <span className={`text-[10px] ${health?.indic?.ready === false ? 'text-amber-300' : 'text-emerald-300'}`}>{health ? (health.indic?.ready === false ? 'Indic OCR offline' : 'OCR ready') : 'checking'}</span></div>
            <div className="mt-4 grid grid-cols-3 gap-2">{[
              ['OCR engine', health ? (health.indic?.engine === 'tesseract' ? 'Tesseract' : `IndicOCR (${health.indic?.engine})`) : '...'],
              ['Scripts', health ? String(health.ocr_languages.filter(l => l !== 'osd').length) : '...'],
              ['Backlog', k.median_backlog_hours != null ? `${k.median_backlog_hours < 1 ? Math.round(k.median_backlog_hours * 60) + 'm' : Math.round(k.median_backlog_hours) + 'h'}` : '0'],
            ].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-700 bg-slate-900/60 p-3"><Server className="h-3.5 w-3.5 text-cyan-300" /><p className="mt-2 text-[10px] text-slate-400">{label}</p><p className="truncate text-sm font-semibold text-white" title={value}>{value}</p></div>)}</div>
          </div>
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 p-4">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-amber-300" /><h3 className="text-sm font-semibold text-white">Audit timeline</h3></div><span className="text-[10px] text-slate-500">Append-only, hash-chained</span></div>
            {events.length === 0 ? <p className="mt-3 text-xs text-slate-400">{can('audit') ? 'No activity yet.' : 'Your role cannot read the audit log. Auditors and admins see every action here.'}</p> :
            <div className="mt-3 grid gap-2 md:grid-cols-2">{events.map(event => { const t = event.action.includes('approve') ? 'emerald' : ['reject', 'login_failed', 'escalate'].includes(event.action) ? 'amber' : event.action === 'upload' ? 'blue' : 'cyan';
              return <div key={event.id} className="flex gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-2.5"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${t === 'amber' ? 'bg-amber-300' : t === 'emerald' ? 'bg-emerald-300' : t === 'cyan' ? 'bg-cyan-300' : 'bg-blue-300'}`} />
                <div className="min-w-0"><p className="text-[10px] text-slate-500">{parseTs(event.ts).toLocaleTimeString('en-IN')} · {event.username}</p><p className="text-xs text-slate-200">{AUDIT_WORDS[event.action] || event.action}</p><p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">{event.entity_type} {(event.entity_id || '').slice(0, 12)}</p></div></div>; })}</div>}
          </div>
        </div>
      </div>
    </section>
  );
};


const Dashboard: React.FC = () => {
  const { user, can } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [processingData, setProcessingData] = useState<TimeSeriesPoint[]>([]);
  const [verificationChart, setVerificationChart] = useState<ChartDataPoint[]>([]);
  const [confidenceChart, setConfidenceChart] = useState<ChartDataPoint[]>([]);
  const [summary, setSummary] = useState<BSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const sum = await analyticsService.summary();
      const [s, p, v, c] = await Promise.all([
        analyticsService.getDashboardStats(),
        analyticsService.getProcessingTimeSeries(),
        analyticsService.getVerificationChart(),
        analyticsService.getConfidenceDistribution(),
      ]);
      setSummary(sum);
      setStats(s);
      setProcessingData(p);
      setVerificationChart(v);
      setConfidenceChart(c);
      setLoading(false);
    } catch (e: any) { setError(e.message); setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useLiveInterval(load, 8000);

  if (error && !stats) return <ErrorState message={error} onRetry={load} />;
  if (loading || !stats || !summary) return <LoadingState message="Loading dashboard..." />;
  const up = summary.daily.map(d => d.uploaded), pub = summary.daily.map(d => d.published);

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">
            Welcome back, {user?.name?.split(' (')[0]} · {BACKEND_ROLE_LABEL[user?.backendRole || ''] || ROLE_LABELS[user?.role as UserRole]}
            {user?.jurisdiction.district && ` · ${user.jurisdiction.district}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
        {can('upload') && <button type="button" onClick={() => navigate('/upload')}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-gov-blue px-4 text-sm font-bold text-white shadow-sm transition hover:bg-gov-blue-dark">
          <UploadCloud className="h-4 w-4" /> Upload Document</button>}
        {can('review') && <button type="button" onClick={() => navigate('/verification')}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-default bg-white px-4 text-sm font-semibold text-text-primary shadow-sm transition hover:border-gov-blue">
          <CheckSquare className="h-4 w-4 text-gov-blue" /> Review Queue{stats.pendingVerification ? ` (${stats.pendingVerification})` : ''}</button>}
        <div className="group relative">
          <button
            type="button"
            onClick={() => navigate('/live-processing')}
            aria-label="Open Stats for nerds"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border-default bg-white text-gov-blue shadow-sm transition hover:border-gov-blue hover:bg-gov-blue-50"
          >
            <Activity className="h-5 w-5" />
          </button>
          <span
            role="tooltip"
            className="pointer-events-none absolute right-0 top-full z-20 mt-2 whitespace-nowrap rounded-md bg-navy-950 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          >
            Stats for nerds
          </span>
        </div>
        </div>
      </div>

      {/* Stat Cards Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedStatCard title="Total Documents" value={stats.totalDocuments} icon={<FileText className="w-5 h-5" />} spark={up} onClick={() => navigate('/upload')} />
        <AnimatedStatCard title="Read by the Pipeline" value={stats.documentsProcessed} icon={<Brain className="w-5 h-5" />} colorClass="text-purple-500" />
        <AnimatedStatCard title="Published Documents" value={stats.verifiedRecords} icon={<CheckCircle2 className="w-5 h-5" />} colorClass="text-verified" spark={pub} onClick={() => navigate('/records')} />
        <AnimatedStatCard title="Waiting for Review" value={stats.pendingVerification} icon={<Clock className="w-5 h-5" />} colorClass="text-pending" onClick={() => navigate('/verification')} />
      </div>

      {/* Stat Cards Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedStatCard title="Fields Checked by People" value={summary.kpis.verified_fields} icon={<FileCheck className="w-5 h-5" />} />
        <AnimatedStatCard title="Low-Confidence Fields" value={stats.lowConfidenceRecords} icon={<AlertTriangle className="w-5 h-5" />} colorClass="text-error" />
        <AnimatedStatCard title="Checks Raised" value={stats.validationConflicts} icon={<AlertTriangle className="w-5 h-5" />} colorClass="text-pending" />
        <AnimatedStatCard title="Duplicate Uploads" value={stats.duplicateRecords} icon={<Copy className="w-5 h-5" />} colorClass="text-error" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Processing Over Time */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.5 }} className="card">
          <div className="px-5 py-4 border-b border-border-default flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Documents Uploaded (Last 14 Days)</h3>
            <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold border border-purple-100 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
              </span>
              Live
            </div>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={processingData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e40af" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#1e40af" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={d => d.split('-').slice(1).join('/')} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="value" name="Uploaded" stroke="#1e40af" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} isAnimationActive={true} animationDuration={2000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Verification Status */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.5 }} className="card">
          <div className="px-5 py-4 border-b border-border-default">
            <h3 className="text-sm font-semibold text-text-primary">Verification Status Distribution</h3>
          </div>
          <div className="p-5 flex flex-col sm:flex-row items-center gap-6">
            {verificationChart.length === 0 ? <p className="w-full py-24 text-center text-sm text-text-tertiary">No documents yet. Upload a scan to see how records move through review.</p> : <>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={verificationChart} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={4} isAnimationActive={true} animationDuration={2000}>
                  {verificationChart.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-4 w-full sm:w-1/2">
              {verificationChart.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-center gap-3 text-sm bg-surface-secondary p-3 rounded-lg border border-border-default"
                >
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-text-secondary font-medium">{item.label}</span>
                  <span className="font-bold text-text-primary ml-auto">{item.value}</span>
                </motion.div>
              ))}
            </div>
            </>}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confidence Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card">
          <div className="px-5 py-4 border-b border-border-default">
            <h3 className="text-sm font-semibold text-text-primary">AI Confidence Distribution</h3>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={confidenceChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1500} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Live Activity Feed */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <LiveActivityFeed />
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
