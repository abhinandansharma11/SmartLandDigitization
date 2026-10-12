// ==========================================
// BhumiSetu - Backend types and adapters
// Shapes returned by the Bhu-Digitize FastAPI backend, and functions that turn them
// into the view models the BhumiSetu pages were designed around.
// ==========================================

import type { LandRecord, DocumentType, VerificationStatus } from '../types/land-records';
import type { GeoJSONFeatureCollection } from '../types/gis';
import type { AuditLogEntry } from '../types/audit';
import { User, UserRole } from '../types/auth';

// ---------- raw backend shapes ----------
export type BUser = { id: number; username: string; full_name: string; role: string; state: string | null;
  district: string | null; tehsil: string | null; active?: boolean; permissions: string[] };

export type BDocSummary = {
  id: string; filename: string; status: string; doc_type: string | null; district: string; tehsil: string | null;
  village_id: number | null; village: string | null; channel: string; quality_score: number | null; low_quality: boolean;
  qa_sample: boolean; min_confidence: number | null; route_reason: string | null; text_source: string | null;
  in_dlq: boolean; error: string | null; duplicate_of: string | null; uploaded_at: string; updated_at: string;
  lease_by: number | null; locked?: boolean; leased_by_me?: boolean;
};
export type BField = { id: number; field_name: string; label: string; raw_value: string | null; value: string | null;
  final_value: string | null; confidence: number; threshold: number; bbox: number[] | null; page_no: number;
  source: string; model_version: string; flags: string[]; edited: boolean };
export type BValidation = { rule_code: string; field_name: string | null; passed: boolean; severity: string; message: string };
export type BDuplicate = { id: number; kind: string; candidate_document_id: string | null; candidate_record_id: number | null;
  score: number; detail: string; resolution: string };
export type BEvent = { from: string | null; to: string; actor: string; note: string | null; ts: string };
export type BLine = { text: string; conf: number; bbox: number[]; script?: string; engine?: string; handwriting?: boolean; tesseract_text?: string | null };
export type BPage = { page_no: number; quality_score: number | null; skew_deg: number | null; width: number | null; height: number | null;
  lines: BLine[] | null; map: any | null };
export type BDocDetail = BDocSummary & { sha256: string; year: string | null; register_ref: string | null; error_full: string | null;
  failed_stage: string | null; attempts: number; pages: BPage[]; fields: BField[]; validations: BValidation[];
  duplicates: BDuplicate[]; events: BEvent[] };

export type BOwner = { name: string; relation: string | null; relative_name: string | null; share: string | null; residence: string | null };
export type BPlot = { khasra_no: string; area_ha: number | null; area_raw: string | null; ulpin: string | null; map_area_ha: number | null; parcel_id: number | null };
export type BRecord = { id: number; village: string; village_en: string; village_lgd: string; tehsil: string; district: string; state: string;
  doc_type: string | null; confidence: number | null; khata_no: string; category: string | null; fasli_year: string | null;
  total_area_ha: number | null; version: number; is_current: boolean; owners: BOwner[]; plots: BPlot[]; published_at: string;
  published_by?: string; document_id?: string; score?: number;
  mutations?: { case_no: string; order_date: string; description: string }[];
  registrations?: { deed_no: string; office: string; date: string }[];
  record_hash?: string; signature?: string;
  history?: { id: number; version: number; published_at: string; published_by: string; owners: string[]; document_id: string }[] };

export type BVillage = { id: number; lgd_code: string; name: string; name_en: string; tehsil: string; district: string; state: string;
  bbox: number[]; in_jurisdiction: boolean };

export type BSummary = {
  kpis: { documents: number; published: number; auto_approved: number; pending_review: number; pending_supervisor: number;
    failed: number; duplicates: number; rejected: number; in_pipeline: number; extraction_accuracy: number | null;
    verified_fields: number; qa_accuracy: number | null; qa_samples: number; median_backlog_hours: number | null; oldest_backlog_hours: number | null };
  status: Record<string, number>; accuracy_by_field: { field: string; accuracy: number; verified: number }[];
  confidence_histogram: { bucket: string; count: number }[]; errors: { rule: string; count: number }[];
  failed_stages: Record<string, number>; progress: Record<string, { name: string; total: number; published: number; pending: number; failed: number; pct: number }[]>;
  daily: { date: string; uploaded: number; published: number }[]; doc_types: Record<string, number>; channels: Record<string, number>;
};

export type BAudit = { id: number; ts: string; username: string; action: string; entity_type: string; entity_id: string | null;
  detail: any; ip: string | null; row_hash: string };

// ---------- vocabularies ----------
export const PROCESSING_STATUSES = ['RECEIVED', 'PREPROCESSING', 'CLASSIFIED', 'EXTRACTING', 'VALIDATING'];
export const REVIEWABLE = ['IN_REVIEW', 'SUPERVISOR', 'MANUAL_ENTRY'];

export const BACKEND_STATUS_LABEL: Record<string, string> = {
  RECEIVED: 'Queued', PREPROCESSING: 'Cleaning scan', CLASSIFIED: 'Identifying record type', EXTRACTING: 'Reading text',
  VALIDATING: 'Running checks', IN_REVIEW: 'Needs review', SUPERVISOR: 'With supervisor', MANUAL_ENTRY: 'Manual entry',
  AUTO_APPROVED: 'Auto-approved', PUBLISHED: 'Published', FAILED: 'Failed', DUPLICATE: 'Duplicate', REJECTED: 'Rejected',
};

export function toVerificationStatus(s: string): VerificationStatus {
  if (PROCESSING_STATUSES.includes(s)) return 'processing';
  switch (s) {
    case 'IN_REVIEW': return 'pending_verification';
    case 'SUPERVISOR': return 'under_review';
    case 'MANUAL_ENTRY': return 'correction_needed';
    case 'AUTO_APPROVED': case 'PUBLISHED': return 'verified';
    case 'REJECTED': case 'DUPLICATE': return 'rejected';
    case 'FAILED': return 'rejected';
    default: return 'uploaded';
  }
}

export function toDocType(t: string | null | undefined): DocumentType {
  switch (t) {
    case 'khatauni': return 'khatauni';
    case 'satbara': return '7_12_record';
    case 'khatian': return 'khatian';
    case 'patta': return 'patta';
    case 'jamabandi': return 'jamabandi';
    case 'map': return 'cadastral_map';
    case 'khasra': return 'khasra';
    case 'mutation': return 'mutation_record';
    case 'registration': return 'registration_document';
    default: return 'other';
  }
}

export const DOC_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'khatauni', label: 'Khatauni (Uttar Pradesh)' }, { value: 'satbara', label: '7/12 extract (Maharashtra)' },
  { value: 'khatian', label: 'Khatian (West Bengal)' }, { value: 'patta', label: 'Patta (Tamil Nadu)' },
  { value: 'jamabandi', label: 'Jamabandi (Punjab)' }, { value: 'map', label: 'Cadastral map sheet' },
];

// Backend role -> BhumiSetu role (drives the sidebar and badges). Fine-grained checks use `permissions`.
export function toUserRole(role: string): UserRole {
  switch (role) {
    case 'super_admin': return UserRole.SUPER_ADMIN;
    case 'district_admin': case 'state_admin': return UserRole.DISTRICT_ADMIN;
    case 'reviewer': case 'supervisor': return UserRole.REVENUE_OFFICER;
    case 'gis_reviewer': return UserRole.GIS_OFFICER;
    case 'auditor': return UserRole.AUDITOR;
    default: return UserRole.DIGITIZATION_OPERATOR;
  }
}
export const BACKEND_ROLE_LABEL: Record<string, string> = {
  operator: 'Data-entry Operator', reviewer: 'Reviewer', supervisor: 'Supervisor (Tehsildar)', gis_reviewer: 'GIS Reviewer',
  district_admin: 'District Admin', state_admin: 'State Admin', super_admin: 'Super Admin', auditor: 'Auditor', integration: 'Integration',
};

export function toUser(u: BUser): User {
  return {
    id: String(u.id), name: u.full_name, email: `${u.username}@bhu-digitize.local`, username: u.username,
    role: toUserRole(u.role), backendRole: u.role, permissions: u.permissions,
    jurisdiction: { state: u.state || '', district: u.district || undefined, tehsil: u.tehsil || undefined },
    employeeId: u.username, designation: BACKEND_ROLE_LABEL[u.role] || u.role,
    status: u.active === false ? 'inactive' : 'active', createdAt: new Date().toISOString(), mfaEnabled: false,
  };
}

export const recordCode = (r: Pick<BRecord, 'village_lgd' | 'khata_no'>) => `LR-${r.village_lgd}-${r.khata_no}`;

export function toLandRecord(r: BRecord): LandRecord {
  const owners = r.owners || [];
  const plots = r.plots || [];
  const khasras = plots.map(p => p.khasra_no).join(', ');
  return {
    id: String(r.id),
    recordId: recordCode(r),
    surveyNumber: khasras,
    khasraNumber: khasras,
    khataNumber: r.khata_no,
    plotNumber: plots.length ? `${plots.length} plot${plots.length > 1 ? 's' : ''}` : undefined,
    owner: {
      name: owners.map(o => o.name).join(', ') || 'Not recorded',
      fatherOrHusbandName: owners[0]?.relative_name || 'Not recorded',
      address: owners[0]?.residence || undefined,
    },
    area: { value: r.total_area_ha || 0, unit: 'hectares', displayValue: r.total_area_ha != null ? `${r.total_area_ha.toFixed(4)} ha` : 'Not recorded' },
    village: r.village_en,
    villageNative: r.village,
    tehsil: r.tehsil,
    district: r.district,
    state: r.state || '',
    landClassification: 'agricultural',
    ownershipType: owners.length > 1 ? 'joint' : 'individual',
    verificationStatus: r.is_current ? 'verified' : 'validated',
    documentType: toDocType(r.doc_type),
    confidenceScore: r.confidence || 0,
    mutationHistory: (r.mutations || []).map((m, i) => ({ id: `m${i}`, mutationType: 'Mutation', date: m.order_date, previousOwner: '',
      newOwner: '', reason: m.description, orderNumber: m.case_no, status: 'completed' as const })),
    registrationHistory: (r.registrations || []).map((g, i) => ({ id: `g${i}`, registrationNumber: g.deed_no, date: g.date,
      registrarOffice: g.office, documentType: 'Sale deed', parties: [], stampDuty: '' })),
    gisLinked: plots.some(p => p.parcel_id),
    sourceDocumentId: r.document_id,
    createdAt: r.published_at,
    updatedAt: r.published_at,
    verifiedAt: r.published_at,
    verifiedBy: r.published_by,
    backend: r,
  };
}

const PARCEL_STATUS: Record<string, string> = { linked: 'Verified', unlinked: 'Pending Verification', area_mismatch: 'Conflict' };

export function toParcels(fc: any): GeoJSONFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: (fc?.features || []).map((f: any) => {
      const p = f.properties;
      return {
        type: 'Feature', geometry: f.geometry,
        properties: {
          id: String(p.id), khasraNumber: p.khasra_no, surveyNumber: p.ulpin || p.khasra_no,
          area: `${Number(p.area_ha).toFixed(4)} ha${p.record_area_ha != null ? ` (record: ${Number(p.record_area_ha).toFixed(4)} ha)` : ''}`,
          owner: (p.owners || []).join(', ') || 'No published record yet', village: `${p.village_en} (${p.village})`,
          tehsil: p.tehsil || '', district: p.district || '', landType: p.ulpin ? `ULPIN ${p.ulpin}` : 'Agricultural',
          verificationStatus: PARCEL_STATUS[p.status] || 'Pending Verification', recordId: p.record_id ? String(p.record_id) : undefined,
          khataNumber: p.khata_no, sourceDocumentId: p.source_document_id,
        } as any,
      };
    }),
  };
}

const AUDIT_ACTION_MAP: Record<string, AuditLogEntry['action']> = {
  login: 'login', login_failed: 'login', upload: 'upload_document', view: 'view_record', claim: 'assign_verification',
  edit_field: 'edit_field', add_field: 'edit_field', approve: 'approve_record', supervisor_approve: 'approve_record',
  escalate: 'assign_verification', reject: 'reject_record', send_back: 'assign_verification', api_read: 'view_record',
  download_original: 'export_data', update_thresholds: 'update_role', redrive: 'process_document', create_user: 'create_user',
  update_user: 'update_role',
};

export function toAudit(a: BAudit): AuditLogEntry {
  const d = a.detail || {};
  return {
    id: String(a.id), timestamp: a.ts, userId: a.username, userName: a.username, userRole: a.ip || '',
    action: AUDIT_ACTION_MAP[a.action] || 'process_document',
    entityType: (['record', 'document', 'user'].includes(a.entity_type) ? a.entity_type : 'system') as AuditLogEntry['entityType'],
    entityId: a.entity_id || '', entityLabel: a.action,
    previousValue: d.old ?? undefined, newValue: d.new ?? undefined,
    details: typeof a.detail === 'object' && a.detail ? Object.entries(a.detail).filter(([k]) => k !== 'old' && k !== 'new').map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ') : '',
    ipAddress: a.ip || undefined, status: a.action === 'login_failed' ? 'failure' : 'success',
  };
}

export const fmtAgo = (iso: string) => {
  const s = (Date.now() - parseTs(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
};

/** Backend timestamps are naive UTC; make them real Dates. */
export const parseTs = (iso: string) => new Date(iso + (/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? '' : 'Z'));
export const fmtDateTime = (iso: string) => parseTs(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
