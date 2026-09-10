// ==========================================
// BhoomiAI - Common Types
// ==========================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface FilterParams {
  search?: string;
  state?: string;
  district?: string;
  tehsil?: string;
  village?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface Jurisdiction {
  state: string;
  district?: string;
  tehsil?: string;
  village?: string;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface DateRange {
  from: string;
  to: string;
}
