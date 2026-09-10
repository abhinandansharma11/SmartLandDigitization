// ==========================================
// BhoomiAI - Verification Service (Mock)
// ==========================================

import { delay } from './api-client';
import { LandRecord } from '../types/land-records';
import { ValidationResult } from '../types/validation';
import { MOCK_LAND_RECORDS } from '../data/mock-records';
import { MOCK_VALIDATION_RESULT } from '../data/mock-analytics';

export const verificationService = {
  async getVerificationQueue(filters?: Record<string, string>): Promise<LandRecord[]> {
    await delay(500);
    let records = MOCK_LAND_RECORDS.filter(r =>
      ['pending_verification', 'under_review', 'correction_needed', 'extracted'].includes(r.verificationStatus)
    );
    if (filters?.district) records = records.filter(r => r.district === filters.district);
    if (filters?.tehsil) records = records.filter(r => r.tehsil === filters.tehsil);
    if (filters?.status) records = records.filter(r => r.verificationStatus === filters.status);
    return records;
  },

  async getValidationResult(recordId: string): Promise<ValidationResult> {
    await delay(400);
    return { ...MOCK_VALIDATION_RESULT, recordId };
  },

  async approveRecord(recordId: string, comments: string): Promise<LandRecord> {
    await delay(800);
    const record = MOCK_LAND_RECORDS.find(r => r.id === recordId);
    if (!record) throw new Error('Record not found');
    return {
      ...record,
      verificationStatus: 'verified',
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'current-user',
      updatedAt: new Date().toISOString(),
    };
  },

  async rejectRecord(recordId: string, reason: string): Promise<LandRecord> {
    await delay(800);
    const record = MOCK_LAND_RECORDS.find(r => r.id === recordId);
    if (!record) throw new Error('Record not found');
    return {
      ...record,
      verificationStatus: 'rejected',
      updatedAt: new Date().toISOString(),
    };
  },

  async sendForCorrection(recordId: string, comments: string): Promise<LandRecord> {
    await delay(600);
    const record = MOCK_LAND_RECORDS.find(r => r.id === recordId);
    if (!record) throw new Error('Record not found');
    return {
      ...record,
      verificationStatus: 'correction_needed',
      updatedAt: new Date().toISOString(),
    };
  },

  async assignOfficer(recordId: string, officerId: string): Promise<void> {
    await delay(400);
  },
};
