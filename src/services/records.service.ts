// ==========================================
// BhoomiAI - Records Service (Mock)
// ==========================================

import { delay } from './api-client';
import { LandRecord } from '../types/land-records';
import { FilterParams, PaginatedResponse } from '../types/common';
import { MOCK_LAND_RECORDS } from '../data/mock-records';

export const recordsService = {
  async getRecords(filters?: FilterParams): Promise<PaginatedResponse<LandRecord>> {
    await delay(500);
    let records = [...MOCK_LAND_RECORDS];

    if (filters?.search) {
      const s = filters.search.toLowerCase();
      records = records.filter(r =>
        r.owner.name.toLowerCase().includes(s) ||
        r.khasraNumber.toLowerCase().includes(s) ||
        r.surveyNumber.toLowerCase().includes(s) ||
        r.village.toLowerCase().includes(s) ||
        r.recordId.toLowerCase().includes(s)
      );
    }
    if (filters?.district) records = records.filter(r => r.district === filters.district);
    if (filters?.tehsil) records = records.filter(r => r.tehsil === filters.tehsil);
    if (filters?.village) records = records.filter(r => r.village === filters.village);
    if (filters?.status) records = records.filter(r => r.verificationStatus === filters.status);

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const start = (page - 1) * pageSize;

    return {
      data: records.slice(start, start + pageSize),
      total: records.length,
      page,
      pageSize,
      totalPages: Math.ceil(records.length / pageSize),
    };
  },

  async getRecord(id: string): Promise<LandRecord | null> {
    await delay(400);
    return MOCK_LAND_RECORDS.find(r => r.id === id) || null;
  },

  async searchRecords(query: string, jurisdiction?: { district?: string; tehsil?: string; village?: string }): Promise<LandRecord[]> {
    await delay(500);
    const s = query.toLowerCase();
    return MOCK_LAND_RECORDS.filter(r => {
      const matchesQuery = r.owner.name.toLowerCase().includes(s) ||
        r.khasraNumber.toLowerCase().includes(s) ||
        r.surveyNumber.toLowerCase().includes(s) ||
        r.khataNumber.toLowerCase().includes(s) ||
        r.village.toLowerCase().includes(s);
      const matchesJurisdiction = (!jurisdiction?.district || r.district === jurisdiction.district) &&
        (!jurisdiction?.tehsil || r.tehsil === jurisdiction.tehsil) &&
        (!jurisdiction?.village || r.village === jurisdiction.village);
      return matchesQuery && matchesJurisdiction;
    });
  },

  async updateRecord(id: string, updates: Partial<LandRecord>): Promise<LandRecord> {
    await delay(600);
    const record = MOCK_LAND_RECORDS.find(r => r.id === id);
    if (!record) throw new Error('Record not found');
    return { ...record, ...updates, updatedAt: new Date().toISOString() };
  },
};
