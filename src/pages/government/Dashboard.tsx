// ==========================================
// BhoomiAI - Government Dashboard
// ==========================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { StatCard, Badge, LoadingState } from '../../components/ui';
import { ROLE_LABELS, UserRole } from '../../types/auth';
import { DashboardStats, RecentActivity, ChartDataPoint, TimeSeriesPoint } from '../../types/analytics';
import { analyticsService } from '../../services';
import {
  FileText, CheckCircle2, Clock, AlertTriangle, Copy, Brain,
  Upload, FileCheck, BarChart3, TrendingUp, Activity,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [processingData, setProcessingData] = useState<TimeSeriesPoint[]>([]);
  const [verificationChart, setVerificationChart] = useState<ChartDataPoint[]>([]);
  const [confidenceChart, setConfidenceChart] = useState<ChartDataPoint[]>([]);
  const [districtChart, setDistrictChart] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, a, p, v, c, d] = await Promise.all([
        analyticsService.getDashboardStats(),
        analyticsService.getRecentActivities(),
        analyticsService.getProcessingTimeSeries(),
        analyticsService.getVerificationChart(),
        analyticsService.getConfidenceDistribution(),
        analyticsService.getDistrictRecords(),
      ]);
      setStats(s);
      setActivities(a);
      setProcessingData(p);
      setVerificationChart(v);
      setConfidenceChart(c);
      setDistrictChart(d);
      setLoading(false);
    })();
  }, []);

  if (loading || !stats) return <LoadingState message="Loading dashboard..." />;

  const activityIcons: Record<string, React.ReactNode> = {
    upload: <Upload className="w-4 h-4 text-gov-blue" />,
    extraction: <Brain className="w-4 h-4 text-ai-purple" />,
    validation: <AlertTriangle className="w-4 h-4 text-pending" />,
    verification: <FileCheck className="w-4 h-4 text-gov-blue" />,
    approval: <CheckCircle2 className="w-4 h-4 text-verified" />,
    rejection: <AlertTriangle className="w-4 h-4 text-error" />,
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">
          Welcome back, {user?.name} · {ROLE_LABELS[user?.role as UserRole]}
          {user?.jurisdiction.district && ` · ${user.jurisdiction.district}`}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Documents" value={stats.totalDocuments} icon={<FileText className="w-5 h-5" />} trend={{ value: 12, positive: true }} />
        <StatCard title="Documents Processed" value={stats.documentsProcessed} icon={<Brain className="w-5 h-5" />} color="text-ai-purple" trend={{ value: 8, positive: true }} />
        <StatCard title="Verified Records" value={stats.verifiedRecords} icon={<CheckCircle2 className="w-5 h-5" />} color="text-verified" />
        <StatCard title="Pending Verification" value={stats.pendingVerification} icon={<Clock className="w-5 h-5" />} color="text-pending" onClick={() => navigate('/verification')} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Digital Records" value={stats.digitalRecords} icon={<FileCheck className="w-5 h-5" />} />
        <StatCard title="Low Confidence" value={stats.lowConfidenceRecords} icon={<AlertTriangle className="w-5 h-5" />} color="text-error" />
        <StatCard title="Validation Conflicts" value={stats.validationConflicts} icon={<AlertTriangle className="w-5 h-5" />} color="text-pending" />
        <StatCard title="Duplicates Found" value={stats.duplicateRecords} icon={<Copy className="w-5 h-5" />} color="text-error" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Processing Over Time */}
        <div className="card">
          <div className="px-5 py-3 border-b border-border-default flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Documents Processed (Last 7 Days)</h3>
            <Badge variant="purple">AI Processing</Badge>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={processingData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e40af" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1e40af" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={d => d.split('-').slice(1).join('/')} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="value" stroke="#1e40af" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Verification Status */}
        <div className="card">
          <div className="px-5 py-3 border-b border-border-default">
            <h3 className="text-sm font-semibold text-text-primary">Verification Status Distribution</h3>
          </div>
          <div className="p-5 flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={verificationChart} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {verificationChart.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {verificationChart.map(item => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-text-secondary">{item.label}</span>
                  <span className="font-semibold text-text-primary ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confidence Distribution */}
        <div className="card">
          <div className="px-5 py-3 border-b border-border-default">
            <h3 className="text-sm font-semibold text-text-primary">AI Confidence Distribution</h3>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={confidenceChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {confidenceChart.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Records by District */}
        <div className="card">
          <div className="px-5 py-3 border-b border-border-default">
            <h3 className="text-sm font-semibold text-text-primary">Records by District</h3>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={districtChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} width={80} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" fill="#1e40af" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="px-5 py-3 border-b border-border-default flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Recent Activity</h3>
          <Activity className="w-4 h-4 text-text-tertiary" />
        </div>
        <div className="divide-y divide-border-default">
          {activities.map(act => (
            <div key={act.id} className="px-5 py-3 flex items-start gap-3 hover:bg-surface-secondary transition-colors cursor-pointer">
              <div className="mt-0.5">{activityIcons[act.type] || <FileText className="w-4 h-4 text-text-tertiary" />}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{act.title}</p>
                <p className="text-xs text-text-secondary mt-0.5">{act.description}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-text-tertiary">{new Date(act.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                <p className="text-xs text-text-tertiary">{act.user}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
