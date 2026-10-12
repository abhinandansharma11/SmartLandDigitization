// ==========================================
// BhumiSetu - Reports, Audit Logs, User Management, Settings
// ==========================================

import React, { useEffect, useState } from 'react';
import { analyticsService, auditService, usersService } from '../../services';
import { AuditLogEntry, AUDIT_ACTION_LABELS } from '../../types/audit';
import { User, UserRole, ROLE_LABELS, GOVERNMENT_ROLES } from '../../types/auth';
import { DashboardStats, ChartDataPoint, TimeSeriesPoint } from '../../types/analytics';
import { DataTable, SearchInput, Select, StatusBadge, RoleBadge, Badge, Button, Modal, Tabs, Input, LoadingState, EmptyState } from '../../components/ui';
import { Textarea } from '../../components/ui';
import { documentsService } from '../../services/documents.service';
import { apiClient } from '../../services/api-client';
import { BACKEND_ROLE_LABEL, BSummary, BVillage, parseTs } from '../../services/backend';
import { useAuthStore } from '../../store/auth.store';
import { toast } from '../../store/ui.store';
import { useLiveInterval } from '../../hooks/useLiveUpdates';
import { RULE_LABEL } from './shared';

const RAW_ACTION_LABEL: Record<string, string> = { login: 'Signed in', login_failed: 'Failed sign-in', upload: 'Uploaded', view: 'Viewed record',
  claim: 'Opened for review', edit_field: 'Corrected field', add_field: 'Added field', approve: 'Approved', supervisor_approve: 'Supervisor approved',
  escalate: 'Sent to supervisor', reject: 'Rejected', send_back: 'Sent back', api_read: 'API read', download_original: 'Downloaded original',
  update_thresholds: 'Changed thresholds', redrive: 'Retried job', create_user: 'Created user', update_user: 'Updated user' };
import {
  BarChart3, Download, Calendar, Filter, Plus, UserPlus, Shield, Pause,
  Play, Key, ScrollText, Settings, Users, ArrowRight, Check, ChevronRight,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line } from 'recharts';

// ============ REPORTS ============
export const Reports: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [processing, setProcessing] = useState<TimeSeriesPoint[]>([]);
  const [verification, setVerification] = useState<ChartDataPoint[]>([]);
  const [confidence, setConfidence] = useState<ChartDataPoint[]>([]);
  const [districts, setDistricts] = useState<ChartDataPoint[]>([]);
  const [period, setPeriod] = useState('30days');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<BSummary | null>(null);

  useEffect(() => {
    (async () => {
      setSummary(await analyticsService.summary());
      const [s, p, v, c, d] = await Promise.all([
        analyticsService.getDashboardStats(),
        analyticsService.getProcessingTimeSeries(),
        analyticsService.getVerificationChart(),
        analyticsService.getConfidenceDistribution(),
        analyticsService.getDistrictRecords(),
      ]);
      setStats(s); setProcessing(p); setVerification(v); setConfidence(c); setDistricts(d);
      setLoading(false);
    })();
  }, [period]);

  if (loading) return <LoadingState />;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Reports & Analytics</h1>
          <p className="text-sm text-text-secondary mt-1">How much has been digitised, how accurate the reading is, and why records were held. Covers your jurisdiction.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={() => summary && downloadCsv('progress-by-district.csv', [['Area', 'Received', 'Published', 'Waiting', 'Failed', 'Published %'], ...(summary.progress.district || []).map(p => [p.name, p.total, p.published, p.pending, p.failed, p.pct])])}>Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-xs text-text-tertiary">Published Share</p><p className="text-2xl font-bold">{stats && stats.totalDocuments ? Math.round((stats.verifiedRecords / stats.totalDocuments) * 100) : 0}%</p><p className="text-[11px] text-text-tertiary">{stats?.verifiedRecords} of {stats?.totalDocuments} documents</p></div>
        <div className="card p-4"><p className="text-xs text-text-tertiary">Field Accuracy</p><p className="text-2xl font-bold">{summary?.kpis.extraction_accuracy != null ? `${summary.kpis.extraction_accuracy}%` : <span className="text-base text-text-tertiary">Not measured yet</span>}</p><p className="text-[11px] text-text-tertiary">{summary?.kpis.verified_fields ? `left unchanged by reviewers, ${summary.kpis.verified_fields} fields` : 'Appears after a reviewer approves a document'}</p></div>
        <div className="card p-4"><p className="text-xs text-text-tertiary">Auto-approval Accuracy</p><p className="text-2xl font-bold">{summary?.kpis.qa_accuracy != null ? `${summary.kpis.qa_accuracy}%` : <span className="text-base text-text-tertiary">Not measured yet</span>}</p><p className="text-[11px] text-text-tertiary">{summary?.kpis.qa_samples ? `${summary.kpis.qa_samples} random spot checks` : 'Appears after a random spot check of an auto-published record'}</p></div>
        <div className="card p-4"><p className="text-xs text-text-tertiary">Review Backlog (median)</p><p className="text-2xl font-bold">{summary?.kpis.median_backlog_hours != null ? `${summary.kpis.median_backlog_hours} h` : '0 h'}</p><p className="text-[11px] text-text-tertiary">{stats?.pendingVerification || 0} waiting now</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card"><div className="px-5 py-3 border-b border-border-default"><h3 className="text-sm font-semibold">Uploads per Day</h3></div>
          <div className="p-5"><ResponsiveContainer width="100%" height={250}><AreaChart data={processing}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={d => d.split('-').slice(1).join('/')} /><YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} /><Tooltip /><Area type="monotone" dataKey="value" stroke="#1e40af" fill="#1e40af" fillOpacity={0.1} /></AreaChart></ResponsiveContainer></div>
        </div>
        <div className="card"><div className="px-5 py-3 border-b border-border-default"><h3 className="text-sm font-semibold">Verification Status</h3></div>
          <div className="p-5 flex items-center">{verification.length === 0 ? <p className="w-full py-16 text-center text-sm text-text-tertiary">No documents yet.</p> : <><ResponsiveContainer width="50%" height={200}><PieChart><Pie data={verification} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>{verification.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
            <div className="space-y-2">{verification.map(v => <div key={v.label} className="flex items-center gap-2 text-xs"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.color }} /><span>{v.label}</span><span className="font-semibold ml-auto">{v.value}</span></div>)}</div></>}
          </div>
        </div>
        <div className="card"><div className="px-5 py-3 border-b border-border-default"><h3 className="text-sm font-semibold">Confidence Distribution</h3></div>
          <div className="p-5"><ResponsiveContainer width="100%" height={200}><BarChart data={confidence}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" radius={[4,4,0,0]}>{confidence.map((e, i) => <Cell key={i} fill={e.color} />)}</Bar></BarChart></ResponsiveContainer></div>
        </div>
        <div className="card"><div className="px-5 py-3 border-b border-border-default"><h3 className="text-sm font-semibold">Documents by District</h3></div>
          <div className="p-5"><ResponsiveContainer width="100%" height={200}><BarChart data={districts} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#1e40af" radius={[0,4,4,0]} /></BarChart></ResponsiveContainer></div>
        </div>
      </div>

      {summary && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card"><div className="px-5 py-3 border-b border-border-default"><h3 className="text-sm font-semibold">Why records were held for review</h3></div>
          <div className="p-5 space-y-3">{summary.errors.length === 0 ? <p className="text-sm text-text-tertiary">No checks have failed yet.</p> : summary.errors.map(e => {
            const max = Math.max(...summary.errors.map(x => x.count));
            return <div key={e.rule}><div className="flex justify-between text-sm"><span>{RULE_LABEL[e.rule] || e.rule}</span><span className="font-semibold">{e.count}</span></div>
              <div className="mt-1 h-1.5 rounded-full bg-surface-tertiary"><div className="h-full rounded-full bg-amber-500" style={{ width: `${(e.count / max) * 100}%` }} /></div></div>; })}</div></div>
        <div className="card"><div className="px-5 py-3 border-b border-border-default"><h3 className="text-sm font-semibold">Accuracy by field (reviewer-confirmed)</h3></div>
          <div className="p-5 space-y-3">{summary.accuracy_by_field.length === 0 ? <p className="text-sm text-text-tertiary">Appears once reviewers confirm or correct fields.</p> : summary.accuracy_by_field.map(f =>
            <div key={f.field}><div className="flex justify-between text-sm"><span className="font-mono text-xs">{f.field}</span><span className="font-semibold">{f.accuracy}% <span className="text-text-tertiary font-normal">n={f.verified}</span></span></div>
              <div className="mt-1 h-1.5 rounded-full bg-surface-tertiary"><div className={`h-full rounded-full ${f.accuracy >= 95 ? 'bg-emerald-500' : f.accuracy >= 85 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${f.accuracy}%` }} /></div></div>)}</div></div>
      </div>}
    </div>
  );
};

// ============ AUDIT LOGS ============
export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [chain, setChain] = useState<{ ok: boolean; checked: number; broken_at?: number } | null>(null);

  const load = async () => {
    try { setLogs(await auditService.getAuditLogs()); setError(null); } catch (e: any) { setError(e.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useLiveInterval(load, 8000);
  const verify = async () => {
    try { const r = await auditService.verifyChain(); setChain(r); toast(r.ok ? 'Hash chain intact' : 'Hash chain broken', { body: r.ok ? `${r.checked} entries verified. Nothing was changed or deleted.` : `First bad entry: ${r.broken_at}`, kind: r.ok ? 'success' : 'error' }); }
    catch (e: any) { toast('Could not verify', { body: e.message, kind: 'error' }); }
  };

  const filtered = logs.filter(l =>
    !search || [l.userName, l.entityId, l.details, RAW_ACTION_LABEL[l.entityLabel || ''], AUDIT_ACTION_LABELS[l.action]].some(x => x?.toLowerCase().includes(search.toLowerCase()))
  );

  const columns = [
    { key: 'timestamp', header: 'Timestamp', render: (l: AuditLogEntry) => <span className="text-xs font-mono">{parseTs(l.timestamp).toLocaleString('en-IN')}</span> },
    { key: 'userName', header: 'User', render: (l: AuditLogEntry) => <div><p className="text-sm font-medium">{l.userName}</p><p className="text-xs text-text-tertiary font-mono">{l.ipAddress}</p></div> },
    { key: 'action', header: 'Action', render: (l: AuditLogEntry) => <Badge variant={l.status === 'failure' ? 'danger' : l.entityLabel?.includes('approve') ? 'success' : 'info'}>{RAW_ACTION_LABEL[l.entityLabel || ''] || AUDIT_ACTION_LABELS[l.action]}</Badge> },
    { key: 'entityId', header: 'Entity', render: (l: AuditLogEntry) => <span className="text-xs"><span className="text-text-tertiary">{l.entityType}</span> <span className="font-mono">{l.entityId.slice(0, 10)}</span></span> },
    { key: 'details', header: 'Details', render: (l: AuditLogEntry) => (
      <div className="max-w-xs">
        <p className="text-xs text-text-secondary truncate" title={l.details}>{l.details}</p>
        {l.previousValue && <p className="text-xs mt-0.5"><span className="text-error line-through">{l.previousValue}</span> → <span className="text-verified">{l.newValue}</span></p>}
      </div>
    )},
    { key: 'status', header: 'Result', render: (l: AuditLogEntry) => <Badge variant={l.status === 'success' ? 'success' : 'danger'}>{l.status === 'success' ? 'OK' : 'Failed'}</Badge> },
  ];

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-text-primary">Audit Logs</h1><p className="text-sm text-text-secondary mt-1">Every sign-in, upload, view, edit and approval. Append-only: each entry carries the hash of the previous one.</p></div>
        <div className="flex gap-2">
          <Button variant={chain && !chain.ok ? 'danger' : 'outline'} size="sm" icon={<Shield className="w-4 h-4" />} onClick={verify}>{chain ? (chain.ok ? `Chain intact (${chain.checked})` : 'Chain broken') : 'Verify Hash Chain'}</Button>
          <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={() => downloadCsv('audit-log.csv', [['Time (UTC)', 'User', 'Action', 'Entity', 'ID', 'Details', 'IP'], ...logs.map(l => [l.timestamp, l.userName, l.entityLabel || l.action, l.entityType, l.entityId, l.details || '', l.ipAddress || ''])])}>Export</Button>
        </div>
      </div>
      <div className="card">
        <div className="p-4 border-b border-border-default"><SearchInput value={search} onChange={setSearch} placeholder="Search by user, action, record..." className="max-w-md" /></div>
        {error && <p className="px-4 py-3 text-sm text-error">{error}</p>}
        <DataTable columns={columns} data={filtered} loading={loading} />
      </div>
    </div>
  );
};

// ============ USER MANAGEMENT ============
export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [newUser, setNewUser] = useState({ name: '', employeeId: '', email: '', mobile: '', department: '', designation: '', role: '', state: 'Uttar Pradesh', district: '', tehsil: '', village: '', password: '' });
  const [villages, setVillages] = useState<BVillage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { user: me } = useAuthStore();

  const load = async () => { try { setUsers(await usersService.getUsers()); setError(null); } catch (e: any) { setError(e.message); } setLoading(false); };
  useEffect(() => { load(); documentsService.villages().then(setVillages).catch(() => {}); }, []);
  const states = [...new Set(villages.map(v => v.state))];
  const districtsOf = (st: string) => [...new Set(villages.filter(v => v.state === st).map(v => v.district))];
  const tehsilsOf = (d: string) => [...new Set(villages.filter(v => v.district === d).map(v => v.tehsil))];
  const create = async () => {
    try {
      await usersService.createUser({ username: newUser.employeeId.trim(), full_name: newUser.name.trim(), role: newUser.role,
        state: newUser.state || undefined, district: newUser.district || undefined, tehsil: newUser.tehsil || undefined, password: newUser.password });
      toast('User created', { body: `${newUser.name} can now sign in as "${newUser.employeeId}".` });
      setShowCreateModal(false); load();
    } catch (e: any) { toast('User not created', { body: e.message, kind: 'error' }); }
  };
  const toggle = async (u: User) => {
    try { await usersService.setActive(u.id, u.status !== 'active'); load(); } catch (e: any) { toast('Not changed', { body: e.message, kind: 'error' }); }
  };

  const columns = [
    { key: 'name', header: 'Name', render: (u: User) => <div><p className="text-sm font-medium">{u.name}</p><p className="text-xs text-text-tertiary">{u.designation}</p></div> },
    { key: 'employeeId', header: 'Sign-in Name', render: (u: User) => <span className="font-mono text-xs">{u.employeeId}</span> },
    { key: 'role', header: 'Role', render: (u: User) => <Badge variant="info">{BACKEND_ROLE_LABEL[u.backendRole || ''] || u.backendRole}</Badge> },
    { key: 'jurisdiction', header: 'Jurisdiction', render: (u: User) => <span className="text-xs">{[u.jurisdiction.state, u.jurisdiction.district, u.jurisdiction.tehsil].filter(Boolean).join(' / ') || 'All India'}</span> },
    { key: 'status', header: 'Status', render: (u: User) => <StatusBadge status={u.status} /> },
    { key: 'actions', header: '', render: (u: User) => u.id !== me?.id ? <Button size="sm" variant="ghost" icon={u.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />} onClick={() => toggle(u)}>{u.status === 'active' ? 'Deactivate' : 'Activate'}</Button> : <span className="text-xs text-text-tertiary">You</span> },
  ];

  const roleOptions = ['operator', 'reviewer', 'supervisor', 'gis_reviewer', 'district_admin', 'state_admin', 'auditor'].map(r => ({ value: r, label: BACKEND_ROLE_LABEL[r] }));

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-text-primary">User Management</h1><p className="text-sm text-text-secondary mt-1">Who can sign in, what they can do, and which district or tehsil they can see.</p></div>
        <Button size="sm" icon={<UserPlus className="w-4 h-4" />} onClick={() => { setShowCreateModal(true); setWizardStep(1); setNewUser(n => ({ ...n, name: '', employeeId: '', password: '', role: '', district: me?.jurisdiction.district || '', state: me?.jurisdiction.state || n.state })); }}>Create Government User</Button>
      </div>
      <div className="card">
        {error && <p className="px-4 py-3 text-sm text-error">{error}</p>}
        <DataTable columns={columns} data={users} loading={loading} />
      </div>

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Government User" size="lg" footer={
        <div className="flex gap-2">
          {wizardStep > 1 && <Button variant="secondary" onClick={() => setWizardStep(wizardStep - 1)}>Back</Button>}
          {wizardStep < 4 ? (
            <Button onClick={() => setWizardStep(wizardStep + 1)}>Next <ChevronRight className="w-4 h-4" /></Button>
          ) : (
            <Button icon={<Check className="w-4 h-4" />} disabled={!newUser.employeeId || !newUser.name || !newUser.role || newUser.password.length < 6} onClick={create}>Create User</Button>
          )}
        </div>
      }>
        <div className="mb-4 flex gap-2">
          {['Employee', 'Role', 'Jurisdiction', 'Review'].map((s, i) => (
            <div key={s} className={`flex items-center gap-1.5 text-xs ${wizardStep > i + 1 ? 'text-verified' : wizardStep === i + 1 ? 'text-gov-blue font-semibold' : 'text-text-tertiary'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${wizardStep > i + 1 ? 'bg-verified text-white' : wizardStep === i + 1 ? 'bg-gov-blue text-white' : 'bg-gray-200'}`}>{wizardStep > i + 1 ? <Check className="w-3 h-3" /> : i + 1}</div>
              {s}
              {i < 3 && <ArrowRight className="w-3 h-3 text-text-tertiary mx-1" />}
            </div>
          ))}
        </div>

        {wizardStep === 1 && (
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required />
            <Input label="Employee ID (sign-in name)" value={newUser.employeeId} onChange={e => setNewUser({ ...newUser, employeeId: e.target.value })} required />
            <Input label="Initial Password (6+ characters)" type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />

          </div>
        )}
        {wizardStep === 2 && (
          <div><Select label="Select Role" options={roleOptions} value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} placeholder="Choose a role" />
            {newUser.role && <div className="mt-3 p-3 bg-blue-50 rounded-md"><p className="text-xs text-gov-blue font-medium">Role + Jurisdiction = Access</p><p className="text-xs text-text-secondary mt-1">The selected role determines what this user can do. Jurisdiction determines which records they can see.</p></div>}
          </div>
        )}
        {wizardStep === 3 && (
          <div className="grid grid-cols-2 gap-4">
            <Select label="State" options={states.map(s => ({ value: s, label: s }))} value={newUser.state} onChange={e => setNewUser({ ...newUser, state: e.target.value, district: '', tehsil: '' })} />
            <Select label="District" options={districtsOf(newUser.state).map(d => ({ value: d, label: d }))} value={newUser.district} onChange={e => setNewUser({ ...newUser, district: e.target.value, tehsil: '' })} placeholder="Whole state" />
            <Select label="Tehsil" options={tehsilsOf(newUser.district).map(t => ({ value: t, label: t }))} value={newUser.tehsil} onChange={e => setNewUser({ ...newUser, tehsil: e.target.value })} placeholder="Whole district (optional)" />
            <p className="col-span-2 text-xs text-text-tertiary">Users only see documents and records inside this area. District admins can only create users in their own district.</p>
          </div>
        )}
        {wizardStep === 4 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Review & Confirm</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-text-tertiary">Name</p><p>{newUser.name || 'Not given'}</p></div>
              <div><p className="text-xs text-text-tertiary">Employee ID</p><p>{newUser.employeeId || 'Not given'}</p></div>
              <div><p className="text-xs text-text-tertiary">Role</p><p>{BACKEND_ROLE_LABEL[newUser.role] || 'Not chosen'}</p></div>
              <div><p className="text-xs text-text-tertiary">Jurisdiction</p><p>{[newUser.state, newUser.district, newUser.tehsil, newUser.village].filter(Boolean).join(' / ')}</p></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ============ SETTINGS ============
const FIELD_NAME: Record<string, string> = { khata_no: 'Khata number', village: 'Village', category: 'Land category', fasli_year: 'Record year',
  'owner.name': 'Owner name', 'owner.relative_name': 'Father / husband name', 'owner.share': 'Owner share',
  'plot.khasra_no': 'Khasra number', 'plot.area_ha': 'Plot area', total_area_ha: 'Total area',
  mutation: 'Mutation details', registration: 'Registration details', 'map.khasra_no': 'Khasra label on map sheet' };

export const SettingsPage: React.FC = () => {
  const { can } = useAuthStore();
  const [health, setHealth] = useState<any>(null);
  const [th, setTh] = useState<Record<string, number> | null>(null);
  const [edit, setEdit] = useState<Record<string, number>>({});
  const [events, setEvents] = useState<any[]>([]);
  const [dlq, setDlq] = useState<any[]>([]);
  const load = () => {
    analyticsService.health().then(setHealth).catch(() => {});
    analyticsService.thresholds().then(setTh).catch(() => {});
    if (can('admin')) {
      apiClient.get<any[]>('/admin/integration-events').then(setEvents).catch(() => {});
      apiClient.get<any[]>('/admin/dlq').then(setDlq).catch(() => {});
    }
  };
  useEffect(load, []);
  const save = async () => {
    try { await apiClient.put('/admin/thresholds', edit); setEdit({}); load(); toast('Thresholds saved', { body: 'Applies to documents checked from now on.' }); }
    catch (e: any) { toast('Not saved', { body: e.message, kind: 'error' }); }
  };
  const retry = async (id: string, how: 'redrive' | 'manual') => {
    try { await apiClient.post(`/admin/dlq/${id}/${how}`); toast(how === 'redrive' ? 'Retrying' : 'Moved to manual entry'); load(); }
    catch (e: any) { toast('Failed', { body: e.message, kind: 'error' }); }
  };
  const delivered = events.filter(e => e.status === 'delivered').length;

  return (
  <div className="animate-fade-in space-y-4 max-w-4xl">
    <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
    <div className="card p-6 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">System Configuration</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border-default">
            <div><p className="text-sm font-medium">AI Processing Engine</p><p className="text-xs text-text-tertiary">OCR engine and installed script packs (set OCR_ENGINE in backend/.env)</p></div>
            <div className="text-right"><Badge variant="purple">{health ? (health.indic?.engine === 'tesseract' ? health.ocr_engine : `IndicOCR · ${health.indic?.engine}`) : 'checking'}</Badge>
              {health && <p className="mt-1 text-[11px] text-text-tertiary">{health.ocr_languages.filter((l: string) => l !== 'osd').join(', ')}</p>}</div>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border-default">
            <div><p className="text-sm font-medium">Backend API</p><p className="text-xs text-text-tertiary">FastAPI service this portal talks to</p></div>
            <Badge variant={health?.ok ? 'success' : 'warning'}>{health?.ok ? 'Connected' : 'Unreachable'}</Badge>
          </div>
          <div className="flex items-center justify-between py-2">
            <div><p className="text-sm font-medium">LRMS / DILRMP / Bhu-Naksha Integration</p><p className="text-xs text-text-tertiary">Published records are pushed through an outbox. Stand-in adapters until the real URLs are set.</p></div>
            <Badge variant={events.length ? 'success' : 'default'}>{events.length ? `${delivered}/${events.length} delivered` : 'No events yet'}</Badge>
          </div>
        </div>
      </div>
    </div>

    {th && <div className="card p-6">
      <h3 className="text-sm font-semibold text-text-primary">Auto-Validation Thresholds</h3>
      <p className="text-xs text-text-tertiary mt-1 mb-4">A field read with less confidence than its number goes to a reviewer. Owner names and shares are set high on purpose.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
        {Object.entries(th).map(([k, v]) => <div key={k} className="flex items-center justify-between py-1.5 border-b border-border-default/60">
          <span className="text-sm">{FIELD_NAME[k] || k}</span>
          <input type="number" min={0} max={100} disabled={!can('system_admin')} value={edit[k] ?? v} onChange={e => setEdit({ ...edit, [k]: Number(e.target.value) })}
            className="w-20 rounded-md border border-gray-200 px-2 py-1 text-right text-sm font-semibold disabled:bg-transparent disabled:border-transparent" aria-label={`Threshold for ${k}`} /></div>)}
      </div>
      {can('system_admin') ? <Button className="mt-4" size="sm" disabled={!Object.keys(edit).length} onClick={save}>Save Thresholds</Button> : <p className="mt-3 text-xs text-text-tertiary">Only the super admin can change these.</p>}
    </div>}

    {can('admin') && <div className="card p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-3">Failed Jobs (Dead-Letter Queue)</h3>
      {dlq.length === 0 ? <p className="text-sm text-text-tertiary">Nothing failed. Every job ran through.</p> : <div className="space-y-2">{dlq.map(d => (
        <div key={d.id} className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50/40 p-3">
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate">{d.filename}</p><p className="text-xs text-error truncate">{d.failed_stage}: {d.error}</p></div>
          <Button size="sm" onClick={() => retry(d.id, 'redrive')}>Retry</Button><Button size="sm" variant="secondary" onClick={() => retry(d.id, 'manual')}>Manual Entry</Button>
        </div>))}</div>}
    </div>}
  </div>
  );
};

/** Tiny CSV download helper for Export buttons. */
function downloadCsv(name: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: unknown) => { const t = v == null ? '' : String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const blob = new Blob(['\ufeff' + rows.map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
