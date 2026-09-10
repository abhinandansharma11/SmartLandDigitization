// ==========================================
// BhoomiAI - Analytics Types
// ==========================================

export interface DashboardStats {
  totalDocuments: number;
  documentsProcessed: number;
  digitalRecords: number;
  verifiedRecords: number;
  pendingVerification: number;
  lowConfidenceRecords: number;
  validationConflicts: number;
  duplicateRecords: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
  category?: string;
}

export interface AnalyticsFilter {
  period: 'today' | '7days' | '30days' | 'custom';
  dateFrom?: string;
  dateTo?: string;
  district?: string;
  tehsil?: string;
}

export interface RecentActivity {
  id: string;
  type: 'upload' | 'extraction' | 'validation' | 'verification' | 'approval' | 'rejection';
  title: string;
  description: string;
  timestamp: string;
  user: string;
  entityId?: string;
}
