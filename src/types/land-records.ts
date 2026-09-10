// ==========================================
// BhoomiAI - Land Record Types
// ==========================================

export interface LandRecord {
  id: string;
  recordId: string;
  surveyNumber: string;
  khasraNumber: string;
  khataNumber: string;
  plotNumber?: string;
  owner: OwnerInfo;
  area: AreaInfo;
  village: string;
  tehsil: string;
  district: string;
  state: string;
  landClassification: LandClassification;
  ownershipType: OwnershipType;
  verificationStatus: VerificationStatus;
  documentType: DocumentType;
  confidenceScore: number;
  mutationHistory: MutationEntry[];
  registrationHistory: RegistrationEntry[];
  gisLinked: boolean;
  sourceDocumentId?: string;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface OwnerInfo {
  name: string;
  fatherOrHusbandName: string;
  address?: string;
  aadhaarLast4?: string;
  mobile?: string;
}

export interface AreaInfo {
  value: number;
  unit: 'acres' | 'hectares' | 'bigha' | 'sq_meters';
  displayValue: string;
}

export type LandClassification =
  | 'agricultural'
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'forest'
  | 'barren'
  | 'grazing'
  | 'government'
  | 'waterbody';

export const LAND_CLASSIFICATION_LABELS: Record<LandClassification, string> = {
  agricultural: 'Agricultural',
  residential: 'Residential',
  commercial: 'Commercial',
  industrial: 'Industrial',
  forest: 'Forest',
  barren: 'Barren / Wasteland',
  grazing: 'Grazing Land',
  government: 'Government Land',
  waterbody: 'Water Body',
};

export type OwnershipType =
  | 'individual'
  | 'joint'
  | 'government'
  | 'trust'
  | 'cooperative'
  | 'institutional';

export type VerificationStatus =
  | 'draft'
  | 'uploaded'
  | 'processing'
  | 'extracted'
  | 'validated'
  | 'pending_verification'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'correction_needed';

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  draft: 'Draft',
  uploaded: 'Uploaded',
  processing: 'Processing',
  extracted: 'Extracted',
  validated: 'Validated',
  pending_verification: 'Pending Verification',
  under_review: 'Under Review',
  verified: 'Verified',
  rejected: 'Rejected',
  correction_needed: 'Correction Needed',
};

export type DocumentType =
  | 'ror'
  | 'khasra'
  | 'khatauni'
  | '7_12_record'
  | 'mutation_record'
  | 'registration_document'
  | 'cadastral_map'
  | 'legacy_record'
  | 'other';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  ror: 'Record of Rights (RoR)',
  khasra: 'Khasra',
  khatauni: 'Khatauni',
  '7_12_record': '7/12 Record',
  mutation_record: 'Mutation Record',
  registration_document: 'Registration Document',
  cadastral_map: 'Cadastral Map',
  legacy_record: 'Legacy Record',
  other: 'Other',
};

export interface MutationEntry {
  id: string;
  mutationType: string;
  date: string;
  previousOwner: string;
  newOwner: string;
  reason: string;
  orderNumber: string;
  status: 'completed' | 'pending' | 'rejected';
}

export interface RegistrationEntry {
  id: string;
  registrationNumber: string;
  date: string;
  registrarOffice: string;
  documentType: string;
  parties: string[];
  stampDuty: string;
}
