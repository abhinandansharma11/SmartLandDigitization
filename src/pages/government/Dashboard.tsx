// ==========================================
// BhoomiAI - Government Dashboard
// ==========================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { LoadingState } from '../../components/ui';
import { ROLE_LABELS, UserRole } from '../../types/auth';
import { DashboardStats, ChartDataPoint, TimeSeriesPoint } from '../../types/analytics';
import { analyticsService } from '../../services';
import {
  FileText, CheckCircle2, Clock, AlertTriangle, Copy, Brain,
  FileCheck, Activity, ShieldCheck, ScanLine, Server,
  Database, LockKeyhole, CircleDot, UserCheck, Fingerprint,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line } from 'recharts';
import { motion, AnimatePresence, animate } from 'framer-motion';
import './dashboard.css';

// --- Helper for StatCard Color/Sparkline mapping ---
const getColorData = (colorClass: string) => {
  if (colorClass.includes('verified')) return { border: 'border-l-[#10b981]', shadow: 'from-[#10b981]/10 to-transparent', stroke: '#10b981' };
  if (colorClass.includes('pending')) return { border: 'border-l-[#f59e0b]', shadow: 'from-[#f59e0b]/10 to-transparent', stroke: '#f59e0b' };
  if (colorClass.includes('error')) return { border: 'border-l-[#ef4444]', shadow: 'from-[#ef4444]/10 to-transparent', stroke: '#ef4444' };
  if (colorClass.includes('purple')) return { border: 'border-l-[#8b5cf6]', shadow: 'from-[#8b5cf6]/10 to-transparent', stroke: '#8b5cf6' };
  return { border: 'border-l-[#3b82f6]', shadow: 'from-[#3b82f6]/10 to-transparent', stroke: '#3b82f6' };
};

// --- Custom Animated StatCard ---
const AnimatedStatCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  colorClass?: string;
  onClick?: () => void;
}> = ({ title, value, icon, colorClass = 'text-gov-blue', onClick }) => {
  const [count, setCount] = useState(0);
  const { border, shadow, stroke } = getColorData(colorClass);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate: (v) => setCount(Math.round(v))
    });
    return controls.stop;
  }, [value]);

  // Generate a fake sparkline based on the final value to make it look "real"
  const sparklineData = Array.from({ length: 7 }).map((_, i) => ({
    name: `Day ${i + 1}`,
    value: Math.max(0, value * (0.78 + ((i * 13) % 7) / 100)),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(value / 100000, 0.35) }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={`dashboard-stat-card bg-white rounded-xl p-5 border-y border-r border-border-default ${border} relative overflow-hidden group cursor-pointer hover:shadow-card-hover transition-shadow`}
    >
      <div className={`absolute inset-0 bg-gradient-to-r ${shadow} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
      <div className="dashboard-stat-sheen" aria-hidden="true" />
      
      <div className="flex justify-between items-start mb-1 relative z-10">
        <div>
          <p className="text-sm font-medium text-text-secondary mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
            {count.toLocaleString()}
          </h3>
        </div>
        <div className={`dashboard-stat-icon p-2 rounded-lg bg-gray-50 ${colorClass}`}>
          <motion.span
            animate={{ y: [0, -3, 0], rotate: [0, 4, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            className="block"
          >
            {icon}
          </motion.span>
        </div>
      </div>
      
      <div className="h-10 mt-3 relative z-10 -mx-1 dashboard-stat-sparkline opacity-60 group-hover:opacity-100 transition-opacity">
         <ResponsiveContainer width="100%" height="100%">
           <LineChart data={sparklineData}>
             <Line type="monotone" dataKey="value" stroke={stroke} strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={1500} />
           </LineChart>
         </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

// --- Live Activity Feed Component ---
const LiveActivityFeed = () => {
  const [feed, setFeed] = useState([
    { id: 1, text: "Record KH-2026-0451 auto-verified", time: "2 min ago", type: "verified" },
    { id: 2, text: "Low confidence flag on Mutation Order MU-118", time: "5 min ago", type: "error" },
    { id: 3, text: "New document batch uploaded by Operator 4", time: "12 min ago", type: "info" },
    { id: 4, text: "Validation conflict resolved for Khasra 992", time: "18 min ago", type: "pending" },
    { id: 5, text: "Audit log exported by District Admin", time: "1 hour ago", type: "info" },
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setFeed(prev => {
        const events = [
          { text: `Record KH-2026-${Math.floor(Math.random() * 1000 + 1000)} auto-verified`, type: 'verified' },
          { text: `Low confidence flag on Sale Deed SD-${Math.floor(Math.random() * 900 + 100)}`, type: 'error' },
          { text: `Validation conflict detected for Khasra ${Math.floor(Math.random() * 500 + 10)}`, type: 'pending' },
          { text: `Operator ${Math.floor(Math.random() * 5 + 1)} uploaded new batch`, type: 'info' }
        ];
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        const newEvent = {
          id: Date.now(),
          text: randomEvent.text,
          time: "Just now",
          type: randomEvent.type
        };
        return [newEvent, ...prev].slice(0, 5);
      });
    }, 12000); // New event every 12 seconds
    return () => clearInterval(timer);
  }, []);

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
        <AnimatePresence>
          {feed.map(item => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, scale: 0.9, height: 0 }}
              transition={{ duration: 0.4 }}
              className="px-4 py-3 border-b border-border-default/50 last:border-0 flex items-center justify-between group hover:bg-surface-secondary rounded-lg"
            >
               <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 shadow-sm ${item.type === 'verified' ? 'bg-emerald-500 shadow-emerald-500/40' : item.type === 'error' ? 'bg-red-500 shadow-red-500/40' : item.type === 'pending' ? 'bg-amber-500 shadow-amber-500/40' : 'bg-blue-500 shadow-blue-500/40'}`} />
                  <span className="text-sm text-text-primary font-medium group-hover:text-gov-blue transition-colors">{item.text}</span>
               </div>
               <span className="text-xs text-text-tertiary flex-shrink-0 ml-4">{item.time}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const PIPELINE_STAGES = [
  { label: 'Ingest', detail: 'OCR + checksum', icon: FileText, tone: 'cyan' },
  { label: 'Extract', detail: '12 fields mapped', icon: Brain, tone: 'violet' },
  { label: 'Validate', detail: 'Rules + duplicates', icon: ShieldCheck, tone: 'amber' },
  { label: 'Human review', detail: 'HITL exceptions', icon: UserCheck, tone: 'emerald' },
  { label: 'Publish', detail: 'Ledger committed', icon: Database, tone: 'blue' },
] as const;

const INITIAL_QUEUE = [
  { id: 'KH-2026-0451', type: 'Record of Rights', stage: 'Field validation', confidence: 96, age: '00:42', tone: 'emerald' },
  { id: 'MU-2026-0118', type: 'Mutation order', stage: 'Human review', confidence: 74, age: '02:18', tone: 'amber' },
  { id: 'SD-2026-0842', type: 'Sale deed', stage: 'Forensic scan', confidence: 88, age: '04:07', tone: 'cyan' },
  { id: 'LR-2026-3907', type: 'Legacy register', stage: 'Queued', confidence: 63, age: '06:31', tone: 'red' },
];

const AUDIT_EVENTS = [
  { time: '23:18:42', actor: 'AI Validation Service', action: 'flagged a low-confidence mutation field', entity: 'MU-2026-0118', tone: 'amber' },
  { time: '23:17:09', actor: 'Priya Mishra · Revenue Officer', action: 'approved parcel boundary correction', entity: 'LR-10003', tone: 'emerald' },
  { time: '23:15:55', actor: 'Forensic Scanner', action: 'completed provenance check', entity: 'SD-2026-0842', tone: 'cyan' },
  { time: '23:12:31', actor: 'Suresh Yadav · Operator', action: 'uploaded a document batch', entity: 'BATCH-0910-04', tone: 'blue' },
];

const toneClasses: Record<string, string> = {
  cyan: 'text-cyan-300 border-cyan-400/30 bg-cyan-400/10',
  violet: 'text-violet-300 border-violet-400/30 bg-violet-400/10',
  amber: 'text-amber-300 border-amber-400/30 bg-amber-400/10',
  emerald: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10',
  blue: 'text-blue-300 border-blue-400/30 bg-blue-400/10',
  red: 'text-red-300 border-red-400/30 bg-red-400/10',
};

const CommandCenter: React.FC = () => {
  const [queue, setQueue] = useState(INITIAL_QUEUE);
  const [scanProgress, setScanProgress] = useState(68);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setQueue(current => current.map((item, index) => ({
        ...item,
        age: `00:${String((42 + index * 37 + Math.floor(Date.now() / 1000) % 60) % 60).padStart(2, '0')}`,
      })));
      setScanProgress(current => current >= 96 ? 61 : current + 7);
    }, 9000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="officer-command-center rounded-2xl border border-slate-700/70 p-5 md:p-6 shadow-2xl">
      <div className="officer-grid absolute inset-0 rounded-2xl opacity-40" aria-hidden="true" />
      <div className="relative space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300/80">Officer command center</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Land record intelligence pipeline</h2>
            <p className="mt-1 text-xs text-slate-400">Bounded live telemetry · Last sync 23:18:42 IST</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
            <span className="officer-pulse h-2 w-2 rounded-full bg-emerald-300" /> All systems nominal
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          {PIPELINE_STAGES.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <div key={stage.label} className="relative rounded-xl border border-slate-700/80 bg-slate-950/45 p-3">
                {index < PIPELINE_STAGES.length - 1 && <span className="officer-connector hidden md:block" aria-hidden="true" />}
                <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg border ${toneClasses[stage.tone]}`}><Icon className="h-4 w-4" /></div>
                <p className="text-xs font-semibold text-slate-100">{stage.label}</p>
                <p className="mt-1 text-[10px] text-slate-400">{stage.detail}</p>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-800"><div className={`officer-progress officer-progress-${stage.tone}`} /></div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/50">
            <div className="flex items-center justify-between border-b border-slate-700/70 px-4 py-3">
              <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-cyan-300" /><h3 className="text-sm font-semibold text-white">Processing queue</h3></div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{queue.length} active jobs</span>
            </div>
            <div className="divide-y divide-slate-800/80">
              <AnimatePresence initial={false}>
                {queue.map(item => (
                  <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className={`h-2 w-2 rounded-full ${item.tone === 'red' ? 'bg-red-400' : item.tone === 'amber' ? 'bg-amber-300' : 'bg-cyan-300'}`} />
                    <div className="min-w-[130px] flex-1"><p className="text-xs font-semibold text-slate-100">{item.id}</p><p className="text-[10px] text-slate-400">{item.type}</p></div>
                    <span className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-300">{item.stage}</span>
                    <span className={`text-xs font-bold ${item.confidence < 70 ? 'text-red-300' : item.confidence < 80 ? 'text-amber-300' : 'text-emerald-300'}`}>{item.confidence}%</span>
                    <span className="font-mono text-[10px] text-slate-500">{item.age}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 p-4">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><ScanLine className="h-4 w-4 text-violet-300" /><h3 className="text-sm font-semibold text-white">Forensic scan activity</h3></div><Fingerprint className="h-4 w-4 text-slate-500" /></div>
            <div className="officer-scan-panel relative mt-4 overflow-hidden rounded-lg border border-violet-400/20 p-4">
              <div className="officer-scan-line" aria-hidden="true" />
              <div className="relative flex items-end justify-between"><div><p className="text-2xl font-bold text-white">{scanProgress}%</p><p className="text-[10px] uppercase tracking-wider text-slate-400">Signature comparison</p></div><span className="text-xs text-violet-200">SD-2026-0842</span></div>
              <div className="mt-4 h-1.5 rounded-full bg-slate-800"><div className="h-full rounded-full bg-violet-400 transition-all duration-700" style={{ width: `${scanProgress}%` }} /></div>
              <p className="mt-3 flex items-center gap-2 text-[10px] text-slate-400"><LockKeyhole className="h-3 w-3 text-emerald-300" /> Chain of custody intact · hash verified</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 p-4">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><CircleDot className="h-4 w-4 text-emerald-300" /><h3 className="text-sm font-semibold text-white">System health</h3></div><span className="text-[10px] text-emerald-300">99.98% uptime</span></div>
            <div className="mt-4 grid grid-cols-3 gap-2">{[['OCR', '42ms'], ['Rules', '18ms'], ['Ledger', '61ms']].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-700 bg-slate-900/60 p-3"><Server className="h-3.5 w-3.5 text-cyan-300" /><p className="mt-2 text-[10px] text-slate-400">{label}</p><p className="text-sm font-semibold text-white">{value}</p></div>)}</div>
          </div>
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 p-4">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-amber-300" /><h3 className="text-sm font-semibold text-white">Audit timeline</h3></div><span className="text-[10px] text-slate-500">Immutable event stream</span></div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">{AUDIT_EVENTS.map(event => <div key={event.time} className="flex gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-2.5"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${event.tone === 'amber' ? 'bg-amber-300' : event.tone === 'emerald' ? 'bg-emerald-300' : event.tone === 'cyan' ? 'bg-cyan-300' : 'bg-blue-300'}`} /><div className="min-w-0"><p className="text-[10px] text-slate-500">{event.time} · {event.actor}</p><p className="text-xs text-slate-200">{event.action}</p><p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">{event.entity}</p></div></div>)}</div>
          </div>
        </div>
      </div>
    </section>
  );
};


const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [processingData, setProcessingData] = useState<TimeSeriesPoint[]>([]);
  const [verificationChart, setVerificationChart] = useState<ChartDataPoint[]>([]);
  const [confidenceChart, setConfidenceChart] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, p, v, c] = await Promise.all([
        analyticsService.getDashboardStats(),
        analyticsService.getProcessingTimeSeries(),
        analyticsService.getVerificationChart(),
        analyticsService.getConfidenceDistribution(),
      ]);
      setStats(s);
      setProcessingData(p);
      setVerificationChart(v);
      setConfidenceChart(c);
      setLoading(false);
    })();
  }, []);

  if (loading || !stats) return <LoadingState message="Loading dashboard..." />;

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">
          Welcome back, {user?.name} · {ROLE_LABELS[user?.role as UserRole]}
          {user?.jurisdiction.district && ` · ${user.jurisdiction.district}`}
        </p>
      </div>

      <CommandCenter />

      {/* Stat Cards Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedStatCard title="Total Documents" value={stats.totalDocuments} icon={<FileText className="w-5 h-5" />} />
        <AnimatedStatCard title="Documents Processed" value={stats.documentsProcessed} icon={<Brain className="w-5 h-5" />} colorClass="text-purple-500" />
        <AnimatedStatCard title="Verified Records" value={stats.verifiedRecords} icon={<CheckCircle2 className="w-5 h-5" />} colorClass="text-verified" />
        <AnimatedStatCard title="Pending Verification" value={stats.pendingVerification} icon={<Clock className="w-5 h-5" />} colorClass="text-pending" onClick={() => navigate('/verification')} />
      </div>

      {/* Stat Cards Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedStatCard title="Digital Records" value={stats.digitalRecords} icon={<FileCheck className="w-5 h-5" />} />
        <AnimatedStatCard title="Low Confidence" value={stats.lowConfidenceRecords} icon={<AlertTriangle className="w-5 h-5" />} colorClass="text-error" />
        <AnimatedStatCard title="Validation Conflicts" value={stats.validationConflicts} icon={<AlertTriangle className="w-5 h-5" />} colorClass="text-pending" />
        <AnimatedStatCard title="Duplicates Found" value={stats.duplicateRecords} icon={<Copy className="w-5 h-5" />} colorClass="text-error" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Processing Over Time */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.5 }} className="card">
          <div className="px-5 py-4 border-b border-border-default flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Documents Processed (Last 7 Days)</h3>
            <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold border border-purple-100 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
              </span>
              AI Processing
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
                <Area type="monotone" dataKey="value" stroke="#1e40af" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} isAnimationActive={true} animationDuration={2000} />
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
