// ==========================================
// BhoomiAI - Analytics, Audit, GIS, Users, Notifications Services (Mock)
// ==========================================

import { delay } from './api-client';
import { DashboardStats, RecentActivity, ChartDataPoint, TimeSeriesPoint } from '../types/analytics';
import { AuditLogEntry } from '../types/audit';
import { Notification } from '../types/notifications';
import { User } from '../types/auth';
import { GeoJSONFeatureCollection, MapLayer } from '../types/gis';
import {
  MOCK_DASHBOARD_STATS, MOCK_RECENT_ACTIVITIES, MOCK_PROCESSING_TIMESERIES,
  MOCK_VERIFICATION_STATUS_CHART, MOCK_CONFIDENCE_DISTRIBUTION, MOCK_DISTRICT_RECORDS,
  MOCK_AUDIT_LOGS, MOCK_GOV_NOTIFICATIONS, MOCK_CITIZEN_NOTIFICATIONS,
  MOCK_CITIZEN_APPLICATIONS, CitizenApplication,
} from '../data/mock-analytics';
import { MOCK_USERS } from '../data/mock-users';
import { MOCK_PARCELS, MOCK_MAP_LAYERS } from '../data/mock-gis';
import { MOCK_LAND_RECORDS } from '../data/mock-records';
import { LandRecord } from '../types/land-records';

export const analyticsService = {
  async getDashboardStats(): Promise<DashboardStats> {
    await delay(400);
    return MOCK_DASHBOARD_STATS;
  },
  async getRecentActivities(): Promise<RecentActivity[]> {
    await delay(300);
    return MOCK_RECENT_ACTIVITIES;
  },
  async getProcessingTimeSeries(): Promise<TimeSeriesPoint[]> {
    await delay(300);
    return MOCK_PROCESSING_TIMESERIES;
  },
  async getVerificationChart(): Promise<ChartDataPoint[]> {
    await delay(300);
    return MOCK_VERIFICATION_STATUS_CHART;
  },
  async getConfidenceDistribution(): Promise<ChartDataPoint[]> {
    await delay(300);
    return MOCK_CONFIDENCE_DISTRIBUTION;
  },
  async getDistrictRecords(): Promise<ChartDataPoint[]> {
    await delay(300);
    return MOCK_DISTRICT_RECORDS;
  },
};

export const auditService = {
  async getAuditLogs(_filters?: Record<string, string>): Promise<AuditLogEntry[]> {
    await delay(500);
    return MOCK_AUDIT_LOGS;
  },
  async exportAuditLogs(): Promise<void> {
    await delay(1000);
  },
};

export const notificationsService = {
  async getNotifications(userRole: string): Promise<Notification[]> {
    await delay(300);
    return userRole === 'citizen' ? MOCK_CITIZEN_NOTIFICATIONS : MOCK_GOV_NOTIFICATIONS;
  },
  async markRead(id: string): Promise<void> {
    await delay(200);
  },
  async markAllRead(): Promise<void> {
    await delay(300);
  },
};

export const usersService = {
  async getUsers(): Promise<User[]> {
    await delay(500);
    return MOCK_USERS.filter(u => u.role !== 'citizen');
  },
  async getUser(id: string): Promise<User | null> {
    await delay(300);
    return MOCK_USERS.find(u => u.id === id) || null;
  },
  async createUser(data: Partial<User>): Promise<User> {
    await delay(800);
    return {
      id: `usr-${Date.now()}`,
      name: data.name || '',
      email: data.email || '',
      role: data.role || 'digitization_operator' as User['role'],
      jurisdiction: data.jurisdiction || { state: 'Uttar Pradesh' },
      status: 'active',
      createdAt: new Date().toISOString(),
      mfaEnabled: false,
    } as User;
  },
  async updateUser(id: string, data: Partial<User>): Promise<User> {
    await delay(600);
    const user = MOCK_USERS.find(u => u.id === id);
    if (!user) throw new Error('User not found');
    return { ...user, ...data };
  },
  async suspendUser(id: string): Promise<void> {
    await delay(500);
  },
  async reactivateUser(id: string): Promise<void> {
    await delay(500);
  },
};

export const gisService = {
  async getParcels(_jurisdiction?: Record<string, string>): Promise<GeoJSONFeatureCollection> {
    await delay(400);
    return MOCK_PARCELS;
  },
  async getLayers(): Promise<MapLayer[]> {
    await delay(200);
    return MOCK_MAP_LAYERS;
  },
};

export const citizenService = {
  async searchRecords(query: string, filters?: Record<string, string>): Promise<LandRecord[]> {
    await delay(500);
    const s = query.toLowerCase();
    return MOCK_LAND_RECORDS.filter(r => {
      if (!['verified', 'validated'].includes(r.verificationStatus)) return false;
      return r.owner.name.toLowerCase().includes(s) ||
        r.khasraNumber.toLowerCase().includes(s) ||
        r.village.toLowerCase().includes(s) ||
        r.khataNumber.toLowerCase().includes(s);
    });
  },
  async getRecord(id: string): Promise<LandRecord | null> {
    await delay(400);
    const record = MOCK_LAND_RECORDS.find(r => r.id === id);
    if (record && !['verified', 'validated'].includes(record.verificationStatus)) return null;
    return record || null;
  },
  async getApplications(userId: string): Promise<CitizenApplication[]> {
    await delay(400);
    return MOCK_CITIZEN_APPLICATIONS;
  },
  async getApplication(id: string): Promise<CitizenApplication | null> {
    await delay(300);
    return MOCK_CITIZEN_APPLICATIONS.find(a => a.id === id) || null;
  },
};
