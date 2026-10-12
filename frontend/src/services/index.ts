// ==========================================
// BhumiSetu - Analytics, Audit, GIS, Users, Citizen services (real backend)
// ==========================================

import { apiClient, ApiError } from './api-client';
import type { DashboardStats, ChartDataPoint, TimeSeriesPoint } from '../types/analytics';
import type { AuditLogEntry } from '../types/audit';
import type { User } from '../types/auth';
import type { GeoJSONFeatureCollection } from '../types/gis';
import type { LandRecord } from '../types/land-records';
import { BAudit, BDocSummary, BRecord, BSummary, BUser, toAudit, toLandRecord, toParcels, toUser } from './backend';
import { MOCK_CITIZEN_APPLICATIONS, CitizenApplication } from '../data/mock-analytics';

export { authService } from './auth.service';
export { documentsService } from './documents.service';
export { recordsService } from './records.service';
export { verificationService } from './verification.service';

// ---- analytics ----
// One call to /dashboard/summary feeds every chart; cache it briefly so a page's parallel calls share it.
let cache: { at: number; p: Promise<BSummary> } | null = null;
export function getSummary(force = false): Promise<BSummary> {
  if (!force && cache && Date.now() - cache.at < 3000) return cache.p;
  const p = apiClient.get<BSummary>('/dashboard/summary');
  cache = { at: Date.now(), p };
  p.catch(() => { cache = null; });
  return p;
}

/** Operators can't see the dashboard endpoint; derive the basics from their own documents instead. */
async function summaryOrDocs(): Promise<BSummary> {
  try { return await getSummary(); } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 403) throw e;
    const { items } = await apiClient.get<{ total: number; items: BDocSummary[] }>('/documents', { limit: 500 });
    const status: Record<string, number> = {};
    items.forEach(d => { status[d.status] = (status[d.status] || 0) + 1; });
    const n = (k: string) => status[k] || 0;
    const byDay: Record<string, { uploaded: number; published: number }> = {};
    for (let i = 13; i >= 0; i--) byDay[new Date(Date.now() - i * 864e5).toISOString().slice(0, 10)] = { uploaded: 0, published: 0 };
    items.forEach(d => { const k = d.uploaded_at.slice(0, 10); if (byDay[k]) byDay[k].uploaded++; });
    return {
      kpis: { documents: items.length, published: n('PUBLISHED'), auto_approved: 0, pending_review: n('IN_REVIEW'), pending_supervisor: n('SUPERVISOR'),
        failed: n('FAILED'), duplicates: n('DUPLICATE'), rejected: n('REJECTED'), in_pipeline: items.filter(d => ['RECEIVED', 'PREPROCESSING', 'CLASSIFIED', 'EXTRACTING', 'VALIDATING'].includes(d.status)).length,
        extraction_accuracy: null, verified_fields: 0, qa_accuracy: null, qa_samples: 0, median_backlog_hours: null, oldest_backlog_hours: null },
      status, accuracy_by_field: [], errors: [], failed_stages: {}, progress: {}, doc_types: {}, channels: {},
      confidence_histogram: [],
      daily: Object.entries(byDay).map(([date, v]) => ({ date, ...v })),
    };
  }
}

export const analyticsService = {
  summary: summaryOrDocs,
  async getDashboardStats(): Promise<DashboardStats> {
    const s = await summaryOrDocs();
    const k = s.kpis;
    const low = s.confidence_histogram.filter(b => parseInt(b.bucket) < 70).reduce((a, b) => a + b.count, 0);
    return {
      totalDocuments: k.documents,
      documentsProcessed: k.documents - k.in_pipeline,
      digitalRecords: k.published,
      verifiedRecords: k.published,
      pendingVerification: k.pending_review + k.pending_supervisor,
      lowConfidenceRecords: low,
      validationConflicts: s.errors.reduce((a, e) => a + e.count, 0),
      duplicateRecords: k.duplicates,
    };
  },
  async getProcessingTimeSeries(): Promise<TimeSeriesPoint[]> {
    return (await summaryOrDocs()).daily.map(d => ({ date: d.date, value: d.uploaded, category: String(d.published) }));
  },
  async getVerificationChart(): Promise<ChartDataPoint[]> {
    const st = (await summaryOrDocs()).status;
    const n = (...k: string[]) => k.reduce((a, x) => a + (st[x] || 0), 0);
    return [
      { label: 'Published', value: n('PUBLISHED', 'AUTO_APPROVED'), color: '#16a34a' },
      { label: 'Needs review', value: n('IN_REVIEW'), color: '#d97706' },
      { label: 'With supervisor', value: n('SUPERVISOR'), color: '#3b82f6' },
      { label: 'Manual entry', value: n('MANUAL_ENTRY'), color: '#f97316' },
      { label: 'Rejected or duplicate', value: n('REJECTED', 'DUPLICATE', 'FAILED'), color: '#dc2626' },
    ].filter(x => x.value > 0);
  },
  async getConfidenceDistribution(): Promise<ChartDataPoint[]> {
    const h = (await summaryOrDocs()).confidence_histogram;
    const sum = (lo: number, hi: number) => h.filter(b => { const v = parseInt(b.bucket); return v >= lo && v < hi; }).reduce((a, b) => a + b.count, 0);
    return [
      { label: 'High (90-100%)', value: sum(90, 101), color: '#16a34a' },
      { label: 'Medium (70-89%)', value: sum(70, 90), color: '#d97706' },
      { label: 'Low (<70%)', value: sum(0, 70), color: '#dc2626' },
    ];
  },
  async getDistrictRecords(): Promise<ChartDataPoint[]> {
    return ((await summaryOrDocs()).progress.district || []).map(p => ({ label: p.name.split(' / ').pop() || p.name, value: p.total }));
  },
  health: () => apiClient.get<{ ok: boolean; ocr_engine: string; ocr_languages: string[]; indic: { engine: string; ready: boolean } }>('/health', undefined, false),
  thresholds: () => apiClient.get<Record<string, number>>('/admin/thresholds'),
};

// ---- audit ----
export const auditService = {
  async raw(params: { action?: string; username?: string } = {}) { return apiClient.get<BAudit[]>('/audit', params); },
  async getAuditLogs(filters?: Record<string, string>): Promise<AuditLogEntry[]> {
    return (await apiClient.get<BAudit[]>('/audit', filters)).map(toAudit);
  },
  verifyChain: () => apiClient.get<{ ok: boolean; checked: number; broken_at?: number }>('/audit/verify'),
};

// ---- users ----
export const usersService = {
  async getUsers(): Promise<User[]> { return (await apiClient.get<BUser[]>('/users')).map(toUser); },
  async createUser(body: { username: string; full_name: string; role: string; state?: string; district?: string; tehsil?: string; password: string }) {
    return toUser(await apiClient.post<BUser>('/users', body));
  },
  setActive: (id: string, active: boolean) => apiClient.patch(`/users/${id}`, { active }),
};

// ---- GIS ----
export const gisService = {
  async getParcels(villageId?: string): Promise<GeoJSONFeatureCollection> {
    return toParcels(await apiClient.get('/parcels', { village_id: villageId }));
  },
};

// ---- citizen portal (no login; published records only) ----
export const citizenService = {
  async searchRecords(query: string, filters?: Record<string, string>): Promise<LandRecord[]> {
    return (await apiClient.get<BRecord[]>('/public/search', { q: query, district: filters?.district }, false)).map(toLandRecord);
  },
  async getRecord(id: string): Promise<LandRecord | null> {
    try { return toLandRecord(await apiClient.get<BRecord>(`/public/record/${id}`, undefined, false)); } catch { return null; }
  },
  // Mutation/certificate applications are not part of the digitization backend; these stay as demo data.
  async getApplications(_userId: string): Promise<CitizenApplication[]> { return MOCK_CITIZEN_APPLICATIONS; },
  async getApplication(id: string): Promise<CitizenApplication | null> { return MOCK_CITIZEN_APPLICATIONS.find(a => a.id === id) || null; },
};
