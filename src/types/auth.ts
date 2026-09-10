// ==========================================
// BhoomiAI - Authentication & Authorization Types
// ==========================================

import type { Jurisdiction } from './common';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  DISTRICT_ADMIN = 'district_admin',
  REVENUE_OFFICER = 'revenue_officer',
  DIGITIZATION_OPERATOR = 'digitization_operator',
  GIS_OFFICER = 'gis_officer',
  AUDITOR = 'auditor',
  CITIZEN = 'citizen',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.DISTRICT_ADMIN]: 'District Administrator',
  [UserRole.REVENUE_OFFICER]: 'Revenue Officer',
  [UserRole.DIGITIZATION_OPERATOR]: 'Digitization Operator',
  [UserRole.GIS_OFFICER]: 'GIS / Survey Officer',
  [UserRole.AUDITOR]: 'Auditor',
  [UserRole.CITIZEN]: 'Citizen',
};

export const GOVERNMENT_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.DISTRICT_ADMIN,
  UserRole.REVENUE_OFFICER,
  UserRole.DIGITIZATION_OPERATOR,
  UserRole.GIS_OFFICER,
  UserRole.AUDITOR,
];

export enum Permission {
  // System
  MANAGE_SYSTEM = 'manage_system',
  MANAGE_USERS = 'manage_users',
  MANAGE_ROLES = 'manage_roles',
  MANAGE_MASTER_DATA = 'manage_master_data',
  CONFIGURE_VALIDATION = 'configure_validation',
  CONFIGURE_AI = 'configure_ai',

  // Records
  VIEW_RECORDS = 'view_records',
  CREATE_RECORDS = 'create_records',
  EDIT_RECORDS = 'edit_records',
  APPROVE_RECORDS = 'approve_records',
  DELETE_RECORDS = 'delete_records',

  // Documents
  UPLOAD_DOCUMENTS = 'upload_documents',
  VIEW_DOCUMENTS = 'view_documents',
  PROCESS_DOCUMENTS = 'process_documents',

  // Verification
  VIEW_VERIFICATION_QUEUE = 'view_verification_queue',
  VERIFY_RECORDS = 'verify_records',
  RESOLVE_CONFLICTS = 'resolve_conflicts',

  // GIS
  VIEW_GIS = 'view_gis',
  EDIT_GIS = 'edit_gis',
  MANAGE_LAYERS = 'manage_layers',

  // Analytics & Audit
  VIEW_ANALYTICS = 'view_analytics',
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  EXPORT_DATA = 'export_data',

  // Citizen
  CITIZEN_SEARCH = 'citizen_search',
  CITIZEN_VIEW_RECORDS = 'citizen_view_records',
  CITIZEN_DOWNLOAD = 'citizen_download',
  CITIZEN_TRACK_APPLICATION = 'citizen_track_application',
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),
  [UserRole.DISTRICT_ADMIN]: [
    Permission.VIEW_RECORDS,
    Permission.CREATE_RECORDS,
    Permission.EDIT_RECORDS,
    Permission.VIEW_DOCUMENTS,
    Permission.UPLOAD_DOCUMENTS,
    Permission.VIEW_VERIFICATION_QUEUE,
    Permission.VIEW_GIS,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_AUDIT_LOGS,
    Permission.EXPORT_DATA,
    Permission.MANAGE_USERS,
  ],
  [UserRole.REVENUE_OFFICER]: [
    Permission.VIEW_RECORDS,
    Permission.EDIT_RECORDS,
    Permission.APPROVE_RECORDS,
    Permission.VIEW_DOCUMENTS,
    Permission.VIEW_VERIFICATION_QUEUE,
    Permission.VERIFY_RECORDS,
    Permission.RESOLVE_CONFLICTS,
    Permission.VIEW_GIS,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_AUDIT_LOGS,
  ],
  [UserRole.DIGITIZATION_OPERATOR]: [
    Permission.VIEW_RECORDS,
    Permission.CREATE_RECORDS,
    Permission.UPLOAD_DOCUMENTS,
    Permission.VIEW_DOCUMENTS,
    Permission.PROCESS_DOCUMENTS,
    Permission.VIEW_GIS,
  ],
  [UserRole.GIS_OFFICER]: [
    Permission.VIEW_RECORDS,
    Permission.VIEW_DOCUMENTS,
    Permission.VIEW_GIS,
    Permission.EDIT_GIS,
    Permission.MANAGE_LAYERS,
    Permission.VIEW_ANALYTICS,
  ],
  [UserRole.AUDITOR]: [
    Permission.VIEW_RECORDS,
    Permission.VIEW_DOCUMENTS,
    Permission.VIEW_VERIFICATION_QUEUE,
    Permission.VIEW_GIS,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_AUDIT_LOGS,
    Permission.EXPORT_DATA,
  ],
  [UserRole.CITIZEN]: [
    Permission.CITIZEN_SEARCH,
    Permission.CITIZEN_VIEW_RECORDS,
    Permission.CITIZEN_DOWNLOAD,
    Permission.CITIZEN_TRACK_APPLICATION,
  ],
};

export interface User {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: UserRole;
  jurisdiction: Jurisdiction;
  employeeId?: string;
  department?: string;
  designation?: string;
  avatar?: string;
  status: 'active' | 'suspended' | 'inactive';
  lastLogin?: string;
  createdAt: string;
  createdBy?: string;
  mfaEnabled: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  token: string;
  requiresMFA: boolean;
  sessionId: string;
}

export interface MFARequest {
  sessionId: string;
  otp: string;
}

export interface CitizenRegisterRequest {
  name: string;
  mobile: string;
  email?: string;
  password: string;
  state: string;
  district: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  mfaPending: boolean;
  sessionId: string | null;
}
