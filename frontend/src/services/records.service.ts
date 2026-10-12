// ==========================================
// BhumiSetu - Records Service (real backend)
// ==========================================

import { apiClient } from './api-client';
import { BRecord, toLandRecord } from './backend';
import type { LandRecord } from '../types/land-records';
import type { FilterParams, PaginatedResponse } from '../types/common';

export const recordsService = {
  async getRecords(filters: FilterParams = {}): Promise<PaginatedResponse<LandRecord>> {
    const rows = await apiClient.get<BRecord[]>('/records', { q: filters.search, district: filters.district });
    const data = rows.map(toLandRecord);
    return { data, total: data.length, page: 1, pageSize: data.length, totalPages: 1 };
  },
  async getRecord(id: string): Promise<LandRecord | null> {
    try { return toLandRecord(await apiClient.get<BRecord>(`/records/${id}`)); } catch { return null; }
  },
  async searchRecords(query: string, j?: { district?: string }): Promise<LandRecord[]> {
    return (await apiClient.get<BRecord[]>('/records', { q: query, district: j?.district })).map(toLandRecord);
  },
};
