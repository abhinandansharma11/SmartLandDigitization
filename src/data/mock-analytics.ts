// ==========================================
// BhoomiAI - Mock Audit, Notification, Analytics Data
// ==========================================

import { AuditLogEntry } from '../types/audit';
import { Notification } from '../types/notifications';
import { DashboardStats, RecentActivity, TimeSeriesPoint, ChartDataPoint } from '../types/analytics';
import { ValidationResult, ValidationItem } from '../types/validation';

export const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-001',
    timestamp: '2026-09-10T04:45:00+05:30',
    userId: 'usr-003',
    userName: 'Priya Mishra',
    userRole: 'Revenue Officer',
    action: 'approve_record',
    entityType: 'record',
    entityId: 'LR-10001',
    entityLabel: 'Ram Kumar - Khasra 125/2',
    details: 'Record approved after verification',
    status: 'success',
  },
  {
    id: 'aud-002',
    timestamp: '2026-09-10T04:30:00+05:30',
    userId: 'usr-003',
    userName: 'Priya Mishra',
    userRole: 'Revenue Officer',
    action: 'edit_field',
    entityType: 'record',
    entityId: 'LR-10003',
    entityLabel: 'Rajendra Prasad - Khasra 142/3',
    previousValue: '2.40 ha',
    newValue: '2.45 ha',
    details: 'Area corrected based on survey report',
    status: 'success',
  },
  {
    id: 'aud-003',
    timestamp: '2026-09-10T04:00:00+05:30',
    userId: 'usr-005',
    userName: 'Suresh Yadav',
    userRole: 'Digitization Operator',
    action: 'upload_document',
    entityType: 'document',
    entityId: 'doc-009',
    entityLabel: 'Legacy_45_1_Mohanganj.png',
    details: 'Legacy record uploaded for processing',
    status: 'success',
  },
  {
    id: 'aud-004',
    timestamp: '2026-09-10T03:45:00+05:30',
    userId: 'usr-005',
    userName: 'Suresh Yadav',
    userRole: 'Digitization Operator',
    action: 'process_document',
    entityType: 'document',
    entityId: 'doc-003',
    entityLabel: 'RoR_142_3_Semrauta.jpg',
    details: 'AI processing initiated',
    status: 'success',
  },
  {
    id: 'aud-005',
    timestamp: '2026-09-09T16:30:00+05:30',
    userId: 'usr-003',
    userName: 'Priya Mishra',
    userRole: 'Revenue Officer',
    action: 'reject_record',
    entityType: 'record',
    entityId: 'LR-10006',
    entityLabel: 'Abdul Rashid - Khasra 201/1',
    details: 'Rejected - Document authenticity could not be verified',
    status: 'success',
  },
  {
    id: 'aud-006',
    timestamp: '2026-09-09T14:00:00+05:30',
    userId: 'usr-002',
    userName: 'Rajesh Kumar Singh',
    userRole: 'District Administrator',
    action: 'assign_verification',
    entityType: 'record',
    entityId: 'LR-10004',
    entityLabel: 'Geeta Singh - Khasra 156/1',
    details: 'Assigned to Revenue Officer Priya Mishra for verification',
    status: 'success',
  },
  {
    id: 'aud-007',
    timestamp: '2026-09-09T12:00:00+05:30',
    userId: 'usr-001',
    userName: 'Dr. Anita Sharma',
    userRole: 'Super Admin',
    action: 'create_user',
    entityType: 'user',
    entityId: 'usr-010',
    entityLabel: 'Ravi Shankar - Digitization Operator',
    details: 'New user created for Jagdishpur tehsil',
    status: 'success',
  },
  {
    id: 'aud-008',
    timestamp: '2026-09-09T10:00:00+05:30',
    userId: 'usr-008',
    userName: 'Kavita Gupta',
    userRole: 'Auditor',
    action: 'export_data',
    entityType: 'system',
    entityId: 'export-001',
    entityLabel: 'Monthly Compliance Report',
    details: 'Audit report exported for August 2026',
    status: 'success',
  },
  {
    id: 'aud-009',
    timestamp: '2026-09-08T15:00:00+05:30',
    userId: 'usr-007',
    userName: 'Arun Pandey',
    userRole: 'GIS / Survey Officer',
    action: 'edit_field',
    entityType: 'record',
    entityId: 'LR-10007',
    entityLabel: 'Lakshmi Narayan - Khasra 78/2',
    details: 'GIS parcel boundary updated after field survey',
    status: 'success',
  },
  {
    id: 'aud-010',
    timestamp: '2026-09-08T11:00:00+05:30',
    userId: 'usr-002',
    userName: 'Rajesh Kumar Singh',
    userRole: 'District Administrator',
    action: 'suspend_user',
    entityType: 'user',
    entityId: 'usr-010',
    entityLabel: 'Ravi Shankar',
    details: 'User suspended pending departmental inquiry',
    status: 'success',
  },
];

export const MOCK_GOV_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-001',
    type: 'verification_assigned',
    title: 'New Verification Task',
    message: 'Record LR-10003 (Rajendra Prasad, Semrauta) has been assigned to you for verification.',
    timestamp: '2026-09-10T04:00:00+05:30',
    read: false,
    actionUrl: '/verification/lr-003',
    entityId: 'lr-003',
    priority: 'high',
  },
  {
    id: 'notif-002',
    type: 'validation_conflict',
    title: 'Validation Conflict Detected',
    message: 'Duplicate survey number detected for Khasra 156/1 in Dharmapur village.',
    timestamp: '2026-09-09T16:00:00+05:30',
    read: false,
    actionUrl: '/records/lr-004',
    entityId: 'lr-004',
    priority: 'high',
  },
  {
    id: 'notif-003',
    type: 'processing_complete',
    title: 'AI Processing Complete',
    message: 'Document RoR_142_3_Semrauta.jpg has been processed. Overall confidence: 78%.',
    timestamp: '2026-09-09T15:30:00+05:30',
    read: true,
    actionUrl: '/processing/doc-003',
    entityId: 'doc-003',
    priority: 'medium',
  },
  {
    id: 'notif-004',
    type: 'record_approved',
    title: 'Record Approved',
    message: 'Record LR-10001 (Ram Kumar, Rampur) has been verified and approved.',
    timestamp: '2026-09-09T14:45:00+05:30',
    read: true,
    actionUrl: '/records/lr-001',
    entityId: 'lr-001',
    priority: 'low',
  },
  {
    id: 'notif-005',
    type: 'duplicate_detected',
    title: 'Potential Duplicate',
    message: 'Possible duplicate entry detected for owner Hari Om Tripathi in Shivgarh.',
    timestamp: '2026-09-09T12:00:00+05:30',
    read: false,
    actionUrl: '/records/lr-005',
    entityId: 'lr-005',
    priority: 'medium',
  },
];

export const MOCK_CITIZEN_NOTIFICATIONS: Notification[] = [
  {
    id: 'cnotif-001',
    type: 'application_received',
    title: 'Application Received',
    message: 'Your mutation application APP-2026-001 has been received and is under review.',
    timestamp: '2026-09-08T10:00:00+05:30',
    read: false,
    actionUrl: '/citizen/applications/app-001',
    priority: 'medium',
  },
  {
    id: 'cnotif-002',
    type: 'document_available',
    title: 'Document Ready',
    message: 'Your Record of Rights certificate is now available for download.',
    timestamp: '2026-09-05T14:00:00+05:30',
    read: true,
    actionUrl: '/citizen/certificates',
    priority: 'low',
  },
];

export const MOCK_DASHBOARD_STATS: DashboardStats = {
  totalDocuments: 1247,
  documentsProcessed: 1089,
  digitalRecords: 982,
  verifiedRecords: 756,
  pendingVerification: 142,
  lowConfidenceRecords: 85,
  validationConflicts: 23,
  duplicateRecords: 12,
};

export const MOCK_RECENT_ACTIVITIES: RecentActivity[] = [
  {
    id: 'act-001',
    type: 'upload',
    title: 'Document Uploaded',
    description: 'Legacy_45_1_Mohanganj.png uploaded for processing',
    timestamp: '2026-09-10T04:00:00+05:30',
    user: 'Suresh Yadav',
    entityId: 'doc-009',
  },
  {
    id: 'act-002',
    type: 'extraction',
    title: 'AI Extraction Complete',
    description: 'RoR_142_3_Semrauta.jpg — 12 fields extracted, 78% overall confidence',
    timestamp: '2026-09-09T15:30:00+05:30',
    user: 'AI System',
    entityId: 'doc-003',
  },
  {
    id: 'act-003',
    type: 'validation',
    title: 'Validation Conflict',
    description: 'Duplicate survey number detected for Khasra 156/1',
    timestamp: '2026-09-09T16:00:00+05:30',
    user: 'System',
    entityId: 'lr-004',
  },
  {
    id: 'act-004',
    type: 'verification',
    title: 'Record Assigned',
    description: 'LR-10004 assigned to Priya Mishra for verification',
    timestamp: '2026-09-09T14:00:00+05:30',
    user: 'Rajesh Kumar Singh',
    entityId: 'lr-004',
  },
  {
    id: 'act-005',
    type: 'approval',
    title: 'Record Approved',
    description: 'LR-10001 (Ram Kumar, Rampur) verified and approved',
    timestamp: '2026-09-09T14:45:00+05:30',
    user: 'Priya Mishra',
    entityId: 'lr-001',
  },
  {
    id: 'act-006',
    type: 'rejection',
    title: 'Record Rejected',
    description: 'LR-10006 (Abdul Rashid, Tiloi) rejected — authenticity issue',
    timestamp: '2026-09-09T16:30:00+05:30',
    user: 'Priya Mishra',
    entityId: 'lr-006',
  },
];

export const MOCK_PROCESSING_TIMESERIES: TimeSeriesPoint[] = [
  { date: '2026-09-04', value: 32 },
  { date: '2026-09-05', value: 45 },
  { date: '2026-09-06', value: 28 },
  { date: '2026-09-07', value: 51 },
  { date: '2026-09-08', value: 67 },
  { date: '2026-09-09', value: 43 },
  { date: '2026-09-10', value: 18 },
];

export const MOCK_VERIFICATION_STATUS_CHART: ChartDataPoint[] = [
  { label: 'Verified', value: 756, color: '#16a34a' },
  { label: 'Pending', value: 142, color: '#d97706' },
  { label: 'Under Review', value: 48, color: '#3b82f6' },
  { label: 'Rejected', value: 24, color: '#dc2626' },
  { label: 'Correction Needed', value: 12, color: '#f97316' },
];

export const MOCK_CONFIDENCE_DISTRIBUTION: ChartDataPoint[] = [
  { label: 'High (90-100%)', value: 623, color: '#16a34a' },
  { label: 'Medium (70-89%)', value: 248, color: '#d97706' },
  { label: 'Low (<70%)', value: 111, color: '#dc2626' },
];

export const MOCK_DISTRICT_RECORDS: ChartDataPoint[] = [
  { label: 'Amethi', value: 456 },
  { label: 'Lucknow', value: 312 },
  { label: 'Varanasi', value: 187 },
  { label: 'Prayagraj', value: 27 },
];

export const MOCK_VALIDATION_RESULT: ValidationResult = {
  recordId: 'lr-003',
  overallStatus: 'warnings',
  validatedAt: '2026-09-05T15:45:00+05:30',
  autoValidated: false,
  validations: [
    {
      id: 'val-001',
      category: 'field_validation',
      field: 'surveyNumber',
      status: 'pass',
      message: 'Survey number format is valid',
      severity: 'info',
    },
    {
      id: 'val-002',
      category: 'field_validation',
      field: 'village',
      status: 'pass',
      message: 'Village "Semrauta" exists in jurisdiction database',
      severity: 'info',
    },
    {
      id: 'val-003',
      category: 'cross_field',
      field: 'tehsil',
      status: 'pass',
      message: 'Tehsil "Gauriganj" matches district "Amethi"',
      severity: 'info',
    },
    {
      id: 'val-004',
      category: 'field_validation',
      field: 'ownerName',
      status: 'pass',
      message: 'Owner information successfully extracted',
      severity: 'info',
    },
    {
      id: 'val-005',
      category: 'cross_field',
      field: 'area',
      status: 'warning',
      message: 'Area differs from previous record by 0.3 acres',
      severity: 'warning',
      details: 'Previous record shows 2.9 Acres, current extraction shows 3.2 Acres.',
      recommendation: 'Verify area with latest survey report.',
      previousValue: '2.9 Acres',
      currentValue: '3.2 Acres',
    },
    {
      id: 'val-006',
      category: 'business_rule',
      field: 'ownerName',
      status: 'warning',
      message: 'Owner name has medium confidence (78%)',
      severity: 'warning',
      details: 'AI confidence for owner name extraction is below high-confidence threshold.',
      recommendation: 'Manual verification recommended for owner name.',
    },
    {
      id: 'val-007',
      category: 'duplicate_detection',
      status: 'fail',
      message: 'Potential duplicate survey number detected',
      severity: 'error',
      details: 'Survey number 142/3 already exists in Semrauta village with a different owner name.',
      recommendation: 'Verify if this is a new mutation or a duplicate entry.',
    },
    {
      id: 'val-008',
      category: 'gis_spatial',
      field: 'area',
      status: 'warning',
      message: 'GIS parcel not yet linked',
      severity: 'warning',
      details: 'No cadastral boundary data linked to this record.',
      recommendation: 'Link to GIS parcel after verification.',
    },
  ],
};

// Mock citizen application tracking
export interface CitizenApplication {
  id: string;
  applicationId: string;
  type: string;
  status: 'submitted' | 'document_verification' | 'officer_review' | 'field_verification' | 'approved' | 'rejected' | 'record_updated';
  submittedAt: string;
  lastUpdated: string;
  village: string;
  tehsil: string;
  district: string;
  applicantName: string;
  khasraNumber: string;
  department: string;
  timeline: { step: string; status: 'completed' | 'current' | 'pending'; date?: string }[];
}

export const MOCK_CITIZEN_APPLICATIONS: CitizenApplication[] = [
  {
    id: 'app-001',
    applicationId: 'APP-2026-001',
    type: 'Mutation Application',
    status: 'officer_review',
    submittedAt: '2026-09-01T10:00:00+05:30',
    lastUpdated: '2026-09-08T14:00:00+05:30',
    village: 'Rampur',
    tehsil: 'Gauriganj',
    district: 'Amethi',
    applicantName: 'Ram Kumar',
    khasraNumber: '125/2',
    department: 'Tehsil Revenue Office, Gauriganj',
    timeline: [
      { step: 'Application Submitted', status: 'completed', date: '2026-09-01' },
      { step: 'Document Verification', status: 'completed', date: '2026-09-05' },
      { step: 'Revenue Officer Review', status: 'current', date: '2026-09-08' },
      { step: 'Field Verification', status: 'pending' },
      { step: 'Approved / Rejected', status: 'pending' },
      { step: 'Record Updated', status: 'pending' },
    ],
  },
  {
    id: 'app-002',
    applicationId: 'APP-2026-002',
    type: 'RoR Certificate Request',
    status: 'approved',
    submittedAt: '2026-08-20T10:00:00+05:30',
    lastUpdated: '2026-09-05T14:00:00+05:30',
    village: 'Rampur',
    tehsil: 'Gauriganj',
    district: 'Amethi',
    applicantName: 'Ram Kumar',
    khasraNumber: '125/2',
    department: 'Tehsil Revenue Office, Gauriganj',
    timeline: [
      { step: 'Application Submitted', status: 'completed', date: '2026-08-20' },
      { step: 'Document Verification', status: 'completed', date: '2026-08-25' },
      { step: 'Revenue Officer Review', status: 'completed', date: '2026-09-02' },
      { step: 'Field Verification', status: 'completed', date: '2026-09-04' },
      { step: 'Approved', status: 'completed', date: '2026-09-05' },
      { step: 'Record Updated', status: 'completed', date: '2026-09-05' },
    ],
  },
];
