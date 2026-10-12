// ==========================================
// BhumiSetu - Verification Service (real backend human-in-the-loop API)
// ==========================================

import { apiClient } from './api-client';
import type { BDocSummary } from './backend';

export const verificationService = {
  /** Reviewer queue, plus the supervisor queue when the user can supervise. Lowest confidence first. */
  async queue(canSupervise: boolean): Promise<BDocSummary[]> {
    const [a, b] = await Promise.all([
      apiClient.get<BDocSummary[]>('/review/queue'),
      canSupervise ? apiClient.get<BDocSummary[]>('/review/queue', { kind: 'supervisor' }) : Promise.resolve([]),
    ]);
    const seen = new Set<string>();
    return [...b, ...a].filter(d => (seen.has(d.id) ? false : (seen.add(d.id), true)));
  },
  claim: (id: string) => apiClient.post(`/review/${id}/claim`),
  release: (id: string) => apiClient.post(`/review/${id}/release`),
  reasonCodes: () => apiClient.get<Record<string, string>>('/review/reason-codes'),
  editField: (docId: string, fieldId: number, value: string, reason_code: string) =>
    apiClient.patch(`/review/${docId}/fields/${fieldId}`, { value, reason_code }),
  approve: (docId: string, comment = '') => apiClient.post<{ status: string }>(`/review/${docId}/approve`, { comment }),
  reject: (docId: string, reason: string) => apiClient.post(`/review/${docId}/reject`, { reason }),
  sendBack: (docId: string, comment = '') => apiClient.post(`/review/${docId}/send-back`, { comment }),
  manualEntry: (docId: string) => apiClient.post(`/review/${docId}/manual-entry`),
  addField: (docId: string, field_name: string, label: string, value: string) =>
    apiClient.post<{ id: number }>(`/review/${docId}/fields`, { field_name, label, value }),
  fieldAudit: (docId: string) => apiClient.get<any[]>(`/field-audit/${docId}`),
};
