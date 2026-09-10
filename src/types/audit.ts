// ==========================================
// BhoomiAI - Audit Types
// ==========================================

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: AuditAction;
  entityType: 'record' | 'document' | 'user' | 'system';
  entityId: string;
  entityLabel?: string;
  previousValue?: string;
  newValue?: string;
  details?: string;
  ipAddress?: string;
  status: 'success' | 'failure';
}

export type AuditAction =
  | 'login'
  | 'logout'
  | 'upload_document'
  | 'process_document'
  | 'extract_data'
  | 'validate_record'
  | 'assign_verification'
  | 'approve_record'
  | 'reject_record'
  | 'edit_field'
  | 'create_user'
  | 'suspend_user'
  | 'reactivate_user'
  | 'update_role'
  | 'export_data'
  | 'view_record'
  | 'download_certificate';

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  login: 'User Login',
  logout: 'User Logout',
  upload_document: 'Document Uploaded',
  process_document: 'Document Processed',
  extract_data: 'Data Extracted',
  validate_record: 'Record Validated',
  assign_verification: 'Verification Assigned',
  approve_record: 'Record Approved',
  reject_record: 'Record Rejected',
  edit_field: 'Field Edited',
  create_user: 'User Created',
  suspend_user: 'User Suspended',
  reactivate_user: 'User Reactivated',
  update_role: 'Role Updated',
  export_data: 'Data Exported',
  view_record: 'Record Viewed',
  download_certificate: 'Certificate Downloaded',
};
