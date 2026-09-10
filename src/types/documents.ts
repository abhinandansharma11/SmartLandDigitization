// ==========================================
// BhoomiAI - Document & Processing Types
// ==========================================

import { DocumentType } from './land-records';

export type ProcessingStage =
  | 'uploaded'
  | 'queued'
  | 'quality_check'
  | 'language_detection'
  | 'ocr_htr'
  | 'information_extraction'
  | 'entity_detection'
  | 'validation'
  | 'duplicate_detection'
  | 'confidence_scoring'
  | 'completed'
  | 'failed';

export const PROCESSING_STAGE_LABELS: Record<ProcessingStage, string> = {
  uploaded: 'Uploaded',
  queued: 'Queued for Processing',
  quality_check: 'Document Quality Check',
  language_detection: 'Language Detection',
  ocr_htr: 'OCR / Handwriting Recognition',
  information_extraction: 'Information Extraction',
  entity_detection: 'Entity / Field Detection',
  validation: 'Validation',
  duplicate_detection: 'Duplicate Detection',
  confidence_scoring: 'Confidence Scoring',
  completed: 'Processing Complete',
  failed: 'Processing Failed',
};

export interface UploadedDocument {
  id: string;
  fileName: string;
  fileType: 'pdf' | 'jpg' | 'jpeg' | 'png' | 'tiff';
  fileSize: number;
  documentType: DocumentType;
  metadata: DocumentMetadata;
  processingStatus: ProcessingStage;
  processingProgress: number;
  uploadedBy: string;
  uploadedAt: string;
  thumbnailUrl?: string;
}

export interface DocumentMetadata {
  state: string;
  district: string;
  tehsil: string;
  village: string;
  documentType: DocumentType;
  recordYear: string;
  sourceDepartment: string;
  description?: string;
}

export interface ExtractionResult {
  documentId: string;
  fields: ExtractionField[];
  rawText: string;
  language: string;
  pageCount: number;
  qualityScore: number;
  overallConfidence: number;
  processingTime: number;
  extractedAt: string;
}

export interface ExtractionField {
  fieldName: string;
  fieldLabel: string;
  extractedValue: string;
  editedValue?: string;
  confidence: number;
  sourcePage: number;
  boundingBox?: BoundingBox;
  validationStatus: FieldValidationStatus;
  suggestions?: string[];
}

export type FieldValidationStatus = 'valid' | 'warning' | 'error' | 'unvalidated';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 90) return 'high';
  if (score >= 70) return 'medium';
  return 'low';
}

export function getConfidenceColor(score: number): string {
  if (score >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  if (score >= 70) return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-red-600 bg-red-50 border-red-200';
}

export interface ProcessingPipelineStep {
  stage: ProcessingStage;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  details?: string;
  error?: string;
}
