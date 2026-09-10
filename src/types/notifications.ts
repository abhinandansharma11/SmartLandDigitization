// ==========================================
// BhoomiAI - Notification Types
// ==========================================

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  entityId?: string;
  priority: 'low' | 'medium' | 'high';
}

export type NotificationType =
  | 'verification_assigned'
  | 'validation_conflict'
  | 'duplicate_detected'
  | 'record_approved'
  | 'record_rejected'
  | 'document_uploaded'
  | 'processing_complete'
  | 'processing_failed'
  | 'application_received'
  | 'application_approved'
  | 'document_available'
  | 'system_alert';
