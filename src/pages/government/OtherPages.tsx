// ==========================================
// BhoomiAI - Reports, Audit Logs, User Management, Settings
// ==========================================

import React, { useEffect, useState } from 'react';
import { analyticsService, auditService, usersService } from '../../services';
import { AuditLogEntry, AUDIT_ACTION_LABELS } from '../../types/audit';
import { User, UserRole, ROLE_LABELS, GOVERNMENT_ROLES } from '../../types/auth';
import { DashboardStats, ChartDataPoint, TimeSeriesPoint } from '../../types/analytics';
import { DataTable, SearchInput, Select, StatusBadge, RoleBadge, Badge, Button, Modal, Tabs, Input, LoadingState, EmptyState } from '../../components/ui';
import { Textarea } from '../../components/ui';
import { getStates, getDistricts, getTehsils, getVillages } from '../../data/mock-jurisdictions';
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

  useEffect(() => {
    (async () => {
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
          <p className="text-sm text-text-secondary mt-1">System-wide performance and processing analytics</p>
        </div>
        <div className="flex gap-2">
          <Select options={[
            { value: 'today', label: 'Today' },
            { value: '7days', label: 'Last 7 Days' },
            { value: '30days', label: 'Last 30 Days' },
          ]} value={period} onChange={e => setPeriod(e.target.value)} className="w-36" />
          <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-xs text-text-tertiary">Digitization Progress</p><p className="text-2xl font-bold">{stats ? Math.round((stats.documentsProcessed / stats.totalDocuments) * 100) : 0}%</p></div>
        <div className="card p-4"><p className="text-xs text-text-tertiary">AI Accuracy (Avg)</p><p className="text-2xl font-bold">87.2%</p></div>
        <div className="card p-4"><p className="text-xs text-text-tertiary">Avg Processing Time</p><p className="text-2xl font-bold">10.5s</p></div>
        <div className="card p-4"><p className="text-xs text-text-tertiary">Verification Rate</p><p className="text-2xl font-bold">{stats ? Math.round((stats.verifiedRecords / stats.digitalRecords) * 100) : 0}%</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card"><div className="px-5 py-3 border-b border-border-default"><h3 className="text-sm font-semibold">Processing Volume</h3></div>
          <div className="p-5"><ResponsiveContainer width="100%" height={250}><AreaChart data={processing}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={d => d.split('-').slice(1).join('/')} /><YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} /><Tooltip /><Area type="monotone" dataKey="value" stroke="#1e40af" fill="#1e40af" fillOpacity={0.1} /></AreaChart></ResponsiveContainer></div>
        </div>
        <div className="card"><div className="px-5 py-3 border-b border-border-default"><h3 className="text-sm font-semibold">Verification Status</h3></div>
          <div className="p-5 flex items-center"><ResponsiveContainer width="50%" height={200}><PieChart><Pie data={verification} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>{verification.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
            <div className="space-y-2">{verification.map(v => <div key={v.label} className="flex items-center gap-2 text-xs"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.color }} /><span>{v.label}</span><span className="font-semibold ml-auto">{v.value}</span></div>)}</div>
          </div>
        </div>
        <div className="card"><div className="px-5 py-3 border-b border-border-default"><h3 className="text-sm font-semibold">Confidence Distribution</h3></div>
          <div className="p-5"><ResponsiveContainer width="100%" height={200}><BarChart data={confidence}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" radius={[4,4,0,0]}>{confidence.map((e, i) => <Cell key={i} fill={e.color} />)}</Bar></BarChart></ResponsiveContainer></div>
        </div>
        <div className="card"><div className="px-5 py-3 border-b border-border-default"><h3 className="text-sm font-semibold">Records by District</h3></div>
          <div className="p-5"><ResponsiveContainer width="100%" height={200}><BarChart data={districts} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#1e40af" radius={[0,4,4,0]} /></BarChart></ResponsiveContainer></div>
        </div>
      </div>
    </div>
  );
};

// ============ AUDIT LOGS ============
export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => { const data = await auditService.getAuditLogs(); setLogs(data); setLoading(false); })();
  }, []);

  const filtered = logs.filter(l =>
    !search || l.userName.toLowerCase().includes(search.toLowerCase()) || l.entityId?.toLowerCase().includes(search.toLowerCase()) || AUDIT_ACTION_LABELS[l.action]?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: 'timestamp', header: 'Timestamp', render: (l: AuditLogEntry) => <span className="text-xs font-mono">{new Date(l.timestamp).toLocaleString('en-IN')}</span> },
    { key: 'userName', header: 'User', render: (l: AuditLogEntry) => <div><p className="text-sm font-medium">{l.userName}</p><p className="text-xs text-text-tertiary">{l.userRole}</p></div> },
    { key: 'action', header: 'Action', render: (l: AuditLogEntry) => <Badge variant="info">{AUDIT_ACTION_LABELS[l.action]}</Badge> },
    { key: 'entityId', header: 'Record', render: (l: AuditLogEntry) => <span className="font-mono text-xs">{l.entityId}</span> },
    { key: 'details', header: 'Details', render: (l: AuditLogEntry) => (
      <div className="max-w-xs">
        <p className="text-xs text-text-secondary truncate">{l.details}</p>
        {l.previousValue && <p className="text-xs mt-0.5"><span className="text-error line-through">{l.previousValue}</span> → <span className="text-verified">{l.newValue}</span></p>}
      </div>
    )},
    { key: 'status', header: 'Status', render: (l: AuditLogEntry) => <StatusBadge status={l.status === 'success' ? 'verified' : 'rejected'} /> },
  ];

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-text-primary">Audit Logs</h1><p className="text-sm text-text-secondary mt-1">Complete audit trail of system activities</p></div>
        <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Export</Button>
      </div>
      <div className="card">
        <div className="p-4 border-b border-border-default"><SearchInput value={search} onChange={setSearch} placeholder="Search by user, action, record..." className="max-w-md" /></div>
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
  const [newUser, setNewUser] = useState({ name: '', employeeId: '', email: '', mobile: '', department: '', designation: '', role: '', state: 'Uttar Pradesh', district: '', tehsil: '', village: '' });

  useEffect(() => { (async () => { const data = await usersService.getUsers(); setUsers(data); setLoading(false); })(); }, []);

  const columns = [
    { key: 'name', header: 'Name', render: (u: User) => <div><p className="text-sm font-medium">{u.name}</p><p className="text-xs text-text-tertiary">{u.email}</p></div> },
    { key: 'employeeId', header: 'Employee ID', render: (u: User) => <span className="font-mono text-xs">{u.employeeId}</span> },
    { key: 'role', header: 'Role', render: (u: User) => <RoleBadge role={u.role} /> },
    { key: 'jurisdiction', header: 'Jurisdiction', render: (u: User) => <span className="text-xs">{[u.jurisdiction.state, u.jurisdiction.district, u.jurisdiction.tehsil].filter(Boolean).join(' / ')}</span> },
    { key: 'status', header: 'Status', render: (u: User) => <StatusBadge status={u.status} /> },
    { key: 'lastLogin', header: 'Last Login', render: (u: User) => <span className="text-xs">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-IN') : 'Never'}</span> },
  ];

  const roleOptions = GOVERNMENT_ROLES.map(r => ({ value: r, label: ROLE_LABELS[r] }));

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-text-primary">User Management</h1><p className="text-sm text-text-secondary mt-1">Manage government portal users and access</p></div>
        <Button size="sm" icon={<UserPlus className="w-4 h-4" />} onClick={() => { setShowCreateModal(true); setWizardStep(1); }}>Create Government User</Button>
      </div>
      <div className="card">
        <DataTable columns={columns} data={users} loading={loading} />
      </div>

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Government User" size="lg" footer={
        <div className="flex gap-2">
          {wizardStep > 1 && <Button variant="secondary" onClick={() => setWizardStep(wizardStep - 1)}>Back</Button>}
          {wizardStep < 4 ? (
            <Button onClick={() => setWizardStep(wizardStep + 1)}>Next <ChevronRight className="w-4 h-4" /></Button>
          ) : (
            <Button icon={<Check className="w-4 h-4" />} onClick={() => setShowCreateModal(false)}>Create User</Button>
          )}
        </div>
      }>
        <div className="mb-4 flex gap-2">
          {['Employee Info', 'Role', 'Jurisdiction', 'Review'].map((s, i) => (
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
            <Input label="Employee ID" value={newUser.employeeId} onChange={e => setNewUser({ ...newUser, employeeId: e.target.value })} required />
            <Input label="Official Email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
            <Input label="Mobile" value={newUser.mobile} onChange={e => setNewUser({ ...newUser, mobile: e.target.value })} />
            <Input label="Department" value={newUser.department} onChange={e => setNewUser({ ...newUser, department: e.target.value })} />
            <Input label="Designation" value={newUser.designation} onChange={e => setNewUser({ ...newUser, designation: e.target.value })} />
          </div>
        )}
        {wizardStep === 2 && (
          <div><Select label="Select Role" options={roleOptions} value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} placeholder="Choose a role" />
            {newUser.role && <div className="mt-3 p-3 bg-blue-50 rounded-md"><p className="text-xs text-gov-blue font-medium">Role + Jurisdiction = Access</p><p className="text-xs text-text-secondary mt-1">The selected role determines what this user can do. Jurisdiction determines which records they can see.</p></div>}
          </div>
        )}
        {wizardStep === 3 && (
          <div className="grid grid-cols-2 gap-4">
            <Select label="State" options={getStates().map(s => ({ value: s, label: s }))} value={newUser.state} onChange={e => setNewUser({ ...newUser, state: e.target.value })} />
            <Select label="District" options={getDistricts(newUser.state).map(d => ({ value: d, label: d }))} value={newUser.district} onChange={e => setNewUser({ ...newUser, district: e.target.value })} placeholder="Select" />
            <Select label="Tehsil" options={getTehsils(newUser.state, newUser.district).map(t => ({ value: t, label: t }))} value={newUser.tehsil} onChange={e => setNewUser({ ...newUser, tehsil: e.target.value })} placeholder="Select (optional)" />
            <Select label="Village" options={getVillages(newUser.state, newUser.district, newUser.tehsil).map(v => ({ value: v, label: v }))} value={newUser.village} onChange={e => setNewUser({ ...newUser, village: e.target.value })} placeholder="Select (optional)" />
          </div>
        )}
        {wizardStep === 4 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Review & Confirm</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-text-tertiary">Name</p><p>{newUser.name || '—'}</p></div>
              <div><p className="text-xs text-text-tertiary">Employee ID</p><p>{newUser.employeeId || '—'}</p></div>
              <div><p className="text-xs text-text-tertiary">Email</p><p>{newUser.email || '—'}</p></div>
              <div><p className="text-xs text-text-tertiary">Role</p><p>{ROLE_LABELS[newUser.role as UserRole] || '—'}</p></div>
              <div><p className="text-xs text-text-tertiary">Jurisdiction</p><p>{[newUser.state, newUser.district, newUser.tehsil, newUser.village].filter(Boolean).join(' / ')}</p></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ============ SETTINGS ============
export const SettingsPage: React.FC = () => (
  <div className="animate-fade-in space-y-4 max-w-3xl">
    <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
    <div className="card p-6 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">System Configuration</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border-default">
            <div><p className="text-sm font-medium">AI Processing Engine</p><p className="text-xs text-text-tertiary">OCR/HTR model configuration</p></div>
            <Badge variant="purple">BhoomiAI v2.1</Badge>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border-default">
            <div><p className="text-sm font-medium">Auto-Validation Threshold</p><p className="text-xs text-text-tertiary">Minimum confidence for auto-validation</p></div>
            <span className="text-sm font-semibold">90%</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border-default">
            <div><p className="text-sm font-medium">Backend API</p><p className="text-xs text-text-tertiary">API connection status</p></div>
            <Badge variant="warning">Integration Ready</Badge>
          </div>
          <div className="flex items-center justify-between py-2">
            <div><p className="text-sm font-medium">LRMS / DILRMP Integration</p><p className="text-xs text-text-tertiary">Government database connection</p></div>
            <Badge variant="success">Connected</Badge>
          </div>
        </div>
      </div>
    </div>
  </div>
);
