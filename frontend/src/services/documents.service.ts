// ==========================================
// BhumiSetu - Documents Service (real backend)
// ==========================================

import { apiClient } from './api-client';
import type { BDocDetail, BDocSummary, BVillage } from './backend';

export type UploadMeta = { district: string; tehsil?: string; village_id?: string; doc_type_hint?: string; year?: string; register_ref?: string };

export const documentsService = {
  async list(params: { status?: string; q?: string; limit?: number } = {}) {
    return apiClient.get<{ total: number; items: BDocSummary[] }>('/documents', { status: params.status, q: params.q, limit: params.limit });
  },
  async get(id: string) { return apiClient.get<BDocDetail>(`/documents/${id}`); },
  async upload(file: File, meta: UploadMeta): Promise<BDocSummary> {
    const fd = new FormData();
    fd.append('files', file);
    for (const [k, v] of Object.entries(meta)) if (v) fd.append(k, v);
    const r = await apiClient.upload<BDocSummary[]>('/documents', fd);
    return r[0];
  },
  /** Several files in one request (the backend fingerprints and queues each one). */
  async uploadMany(files: File[], meta: UploadMeta): Promise<BDocSummary[]> {
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    for (const [k, v] of Object.entries(meta)) if (v) fd.append(k, v);
    return apiClient.upload<BDocSummary[]>('/documents', fd);
  },
  async villages() { return apiClient.get<BVillage[]>('/villages'); },
  async recordFor(docId: string) { return apiClient.get<{ record_id: number | null }>(`/documents/${docId}/record`); },
  async reprocess(docId: string) { return apiClient.post(`/review/${docId}/reprocess`); },
};
