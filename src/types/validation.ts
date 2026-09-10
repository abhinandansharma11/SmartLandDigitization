// ==========================================
// BhoomiAI - Validation Types
// ==========================================

export interface ValidationResult {
  recordId: string;
  overallStatus: ValidationOverallStatus;
  validations: ValidationItem[];
  validatedAt: string;
  autoValidated: boolean;
}

export type ValidationOverallStatus =
  | 'valid'
  | 'warnings'
  | 'conflicts'
  | 'failed'
  | 'pending';

export interface ValidationItem {
  id: string;
  category: ValidationCategory;
  field?: string;
  status: ValidationItemStatus;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  details?: string;
  recommendation?: string;
  previousValue?: string;
  currentValue?: string;
}

export type ValidationCategory =
  | 'field_validation'
  | 'cross_field'
  | 'business_rule'
  | 'duplicate_detection'
  | 'database_verification'
  | 'gis_spatial';

export const VALIDATION_CATEGORY_LABELS: Record<ValidationCategory, string> = {
  field_validation: 'Field Validation',
  cross_field: 'Cross-Field Validation',
  business_rule: 'Business Rule Validation',
  duplicate_detection: 'Duplicate Detection',
  database_verification: 'Database Verification',
  gis_spatial: 'GIS / Spatial Validation',
};

export type ValidationItemStatus = 'pass' | 'warning' | 'fail' | 'info';
