// ==========================================
// BhumiSetu - Base UI Components
// ==========================================

import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, ChevronLeft, ChevronRight, Search, Upload, FileText, AlertCircle, Inbox, Loader2, RefreshCw, Check, Info, AlertTriangle, XCircle } from 'lucide-react';

// ---- Button ----
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, ...props
}) => {
  const base = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed interactive-control';
  const variants: Record<string, string> = {
    primary: 'bg-gov-blue text-white hover:bg-gov-blue-dark focus:ring-gov-blue',
    secondary: 'bg-white text-text-primary border border-border-default hover:bg-surface-tertiary focus:ring-gray-300',
    danger: 'bg-error text-white hover:bg-red-700 focus:ring-error',
    ghost: 'text-text-secondary hover:bg-surface-tertiary focus:ring-gray-300',
    outline: 'border border-gov-blue text-gov-blue hover:bg-blue-50 focus:ring-gov-blue',
  };
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-2.5 text-base gap-2',
  };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
};

// ---- Input ----
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className = '', ...props }) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-text-secondary">{label}</label>}
    <div className="relative">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">{icon}</div>}
      <input
        className={`input-base ${icon ? 'pl-10' : ''} ${error ? 'border-error focus:border-error focus:ring-error/10' : ''} ${className}`}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-error flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
  </div>
);

// ---- Select ----
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({ label, error, options, placeholder, className = '', ...props }) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-text-secondary">{label}</label>}
    <select className={`input-base ${className}`} {...props}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    {error && <p className="text-xs text-error">{error}</p>}
  </div>
);

// ---- Textarea ----
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, className = '', ...props }) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-text-secondary">{label}</label>}
    <textarea className={`input-base min-h-[80px] ${className}`} {...props} />
    {error && <p className="text-xs text-error">{error}</p>}
  </div>
);

// ---- Modal ----
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, size = 'md', footer }) => {
  if (!open) return null;
  const sizes: Record<string, string> = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-lg shadow-modal w-full ${sizes[size]} animate-fade-in max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-tertiary text-text-tertiary"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-6 py-3 border-t border-border-default flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
};

// ---- Drawer ----
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({ open, onClose, title, children, width = 'w-[420px]' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className={`relative bg-white ${width} h-full shadow-modal animate-slide-in overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-tertiary text-text-tertiary"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
};

// ---- Badge ----
interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', children, className = '' }) => {
  const variants: Record<string, string> = {
    default: 'bg-gray-100 text-gray-700 border border-gray-200',
    success: 'badge-verified',
    warning: 'badge-pending',
    danger: 'badge-error',
    info: 'bg-blue-50 text-blue-700 border border-blue-200',
    purple: 'badge-ai',
  };
  return <span className={`badge ${variants[variant]} ${className}`}>{children}</span>;
};

// ---- StatusBadge ----
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    verified: { variant: 'success', label: 'Verified' },
    validated: { variant: 'success', label: 'Validated' },
    pending_verification: { variant: 'warning', label: 'Pending Verification' },
    under_review: { variant: 'info', label: 'Under Review' },
    extracted: { variant: 'purple', label: 'Extracted' },
    processing: { variant: 'purple', label: 'Processing' },
    uploaded: { variant: 'default', label: 'Uploaded' },
    rejected: { variant: 'danger', label: 'Rejected' },
    correction_needed: { variant: 'warning', label: 'Correction Needed' },
    draft: { variant: 'default', label: 'Draft' },
    queued: { variant: 'default', label: 'Queued' },
    completed: { variant: 'success', label: 'Completed' },
    failed: { variant: 'danger', label: 'Failed' },
    active: { variant: 'success', label: 'Active' },
    suspended: { variant: 'danger', label: 'Suspended' },
    inactive: { variant: 'default', label: 'Inactive' },
  };
  const c = config[status] || { variant: 'default' as const, label: status };
  return <Badge variant={c.variant}>{c.label}</Badge>;
};

// ---- ConfidenceBadge ----
export const ConfidenceBadge: React.FC<{ score: number; showLabel?: boolean }> = ({ score, showLabel = true }) => {
  let color = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  let label = 'High';
  if (score < 70) { color = 'text-red-700 bg-red-50 border-red-200'; label = 'Low'; }
  else if (score < 90) { color = 'text-amber-700 bg-amber-50 border-amber-200'; label = 'Medium'; }
  return (
    <span className={`badge border ${color}`}>
      {score}%{showLabel && ` · ${label}`}
    </span>
  );
};

// ---- RoleBadge ----
export const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const labels: Record<string, string> = {
    super_admin: 'Super Admin',
    district_admin: 'District Admin',
    revenue_officer: 'Revenue Officer',
    digitization_operator: 'Digitization Operator',
    gis_officer: 'GIS Officer',
    auditor: 'Auditor',
    citizen: 'Citizen',
  };
  return <Badge variant="info">{labels[role] || role}</Badge>;
};

// ---- Tabs ----
interface TabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode; count?: number }[];
  activeTab: string;
  onChange: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => (
  <div className="flex border-b border-border-default">
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
          activeTab === tab.id
            ? 'border-gov-blue text-gov-blue'
            : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'
        }`}
      >
        {tab.icon}
        {tab.label}
        {tab.count !== undefined && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
            {tab.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

// ---- ProgressBar ----
export const ProgressBar: React.FC<{ value: number; max?: number; color?: string; size?: 'sm' | 'md' }> = ({ value, max = 100, color, size = 'md' }) => {
  const pct = Math.min((value / max) * 100, 100);
  const h = size === 'sm' ? 'h-1.5' : 'h-2.5';
  const bg = color || (pct >= 90 ? 'bg-verified' : pct >= 70 ? 'bg-pending' : 'bg-error');
  return (
    <div className={`w-full bg-gray-200 rounded-full ${h}`}>
      <div className={`${bg} ${h} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
};

// ---- Timeline ----
interface TimelineItem {
  label: string;
  status: 'completed' | 'current' | 'pending';
  date?: string;
  description?: string;
}

export const Timeline: React.FC<{ items: TimelineItem[] }> = ({ items }) => (
  <div className="space-y-0">
    {items.map((item, i) => (
      <div key={i} className="flex gap-3">
        <div className="flex flex-col items-center">
          <div className={`w-3 h-3 rounded-full border-2 mt-1.5 ${
            item.status === 'completed' ? 'bg-verified border-verified' :
            item.status === 'current' ? 'bg-gov-blue border-gov-blue animate-pulse-dot' :
            'bg-white border-gray-300'
          }`} />
          {i < items.length - 1 && <div className={`w-0.5 flex-1 min-h-[32px] ${
            item.status === 'completed' ? 'bg-verified' : 'bg-gray-200'
          }`} />}
        </div>
        <div className="pb-6">
          <p className={`text-sm font-medium ${item.status === 'pending' ? 'text-text-tertiary' : 'text-text-primary'}`}>{item.label}</p>
          {item.date && <p className="text-xs text-text-tertiary mt-0.5">{item.date}</p>}
          {item.description && <p className="text-xs text-text-secondary mt-1">{item.description}</p>}
        </div>
      </div>
    ))}
  </div>
);

// ---- StatCard ----
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  color?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, color = 'text-gov-blue', onClick }) => (
  <div className={`card p-5 card-hover ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-text-secondary font-medium">{title}</p>
        <p className="text-2xl font-bold text-text-primary mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        {trend && (
          <p className={`text-xs mt-1 ${trend.positive ? 'text-verified' : 'text-error'}`}>
            {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}% from last week
          </p>
        )}
      </div>
      <div className={`p-2.5 rounded-lg bg-opacity-10 ${color}`} style={{ backgroundColor: 'currentColor', opacity: 0.1, position: 'relative' }}>
        <div className={`${color}`} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
      </div>
    </div>
  </div>
);

// ---- DataTable ----
interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export function DataTable<T extends Record<string, any>>({ columns, data, onRowClick, emptyMessage, loading }: DataTableProps<T>) {
  if (loading) return <LoadingState message="Loading data..." />;
  if (data.length === 0) return <EmptyState message={emptyMessage || 'No data found'} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>{columns.map(col => <th key={col.key} className="table-header" style={col.width ? { width: col.width } : {}}>{col.header}</th>)}</tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr key={i} onClick={() => onRowClick?.(item)} className={`${onRowClick ? 'cursor-pointer hover:bg-surface-secondary' : ''} transition-colors`}>
              {columns.map(col => (
                <td key={col.key} className="table-cell">
                  {col.render ? col.render(item) : item[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- Pagination ----
interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total?: number;
}

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onPageChange, total }) => (
  <div className="flex items-center justify-between px-4 py-3">
    {total !== undefined && <p className="text-sm text-text-secondary">{total} total records</p>}
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-sm text-text-secondary">Page {page} of {totalPages}</span>
      <Button variant="ghost" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  </div>
);

// ---- SearchInput ----
export const SearchInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string; className?: string }> = ({ value, onChange, placeholder, className }) => (
  <div className={`relative ${className || ''}`}>
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || 'Search...'}
      className="input-base pl-10"
    />
  </div>
);

// ---- FileUploader ----
interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesSelected, accept = '.pdf,.jpg,.jpeg,.png,.tiff', multiple = true, maxSize = 50 }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter(f => f.size <= maxSize * 1024 * 1024);
    if (valid.length > 0) onFilesSelected(valid);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={e => { e.preventDefault(); setIsDragOver(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragOver ? 'border-gov-blue bg-blue-50' : 'border-border-default hover:border-gov-blue-light hover:bg-surface-secondary'
      }`}
    >
      <Upload className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
      <p className="text-sm font-medium text-text-primary">Drag & drop files here or click to browse</p>
      <p className="text-xs text-text-tertiary mt-1">Supports PDF, JPG, PNG, TIFF (max {maxSize}MB)</p>
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} onChange={e => handleFiles(e.target.files)} className="hidden" />
    </div>
  );
};

// ---- LoadingState ----
export const LoadingState: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
    <Loader2 className="w-8 h-8 animate-spin text-gov-blue mb-3" />
    <p className="text-sm">{message || 'Loading...'}</p>
  </div>
);

// ---- EmptyState ----
export const EmptyState: React.FC<{ message?: string; icon?: React.ReactNode; action?: React.ReactNode }> = ({ message, icon, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
    {icon || <Inbox className="w-12 h-12 mb-3" />}
    <p className="text-sm font-medium mt-2">{message || 'No data available'}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

// ---- ErrorState ----
export const ErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-16 text-error">
    <AlertCircle className="w-12 h-12 mb-3" />
    <p className="text-sm font-medium">{message || 'Something went wrong'}</p>
    {onRetry && <Button variant="outline" size="sm" onClick={onRetry} className="mt-4" icon={<RefreshCw className="w-4 h-4" />}>Retry</Button>}
  </div>
);

// ---- ValidationCard ----
export const ValidationCard: React.FC<{ status: string; message: string; severity?: string; details?: string; recommendation?: string }> = ({
  status, message, severity, details, recommendation
}) => {
  const icons: Record<string, React.ReactNode> = {
    pass: <Check className="w-4 h-4 text-verified" />,
    warning: <AlertTriangle className="w-4 h-4 text-pending" />,
    fail: <XCircle className="w-4 h-4 text-error" />,
    info: <Info className="w-4 h-4 text-gov-blue" />,
  };
  const borders: Record<string, string> = {
    pass: 'border-l-verified',
    warning: 'border-l-pending',
    fail: 'border-l-error',
    info: 'border-l-gov-blue',
  };
  return (
    <div className={`border-l-4 ${borders[status] || 'border-l-gray-300'} bg-white rounded-r-md p-3 shadow-sm`}>
      <div className="flex items-start gap-2">
        {icons[status]}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">{message}</p>
          {details && <p className="text-xs text-text-secondary mt-1">{details}</p>}
          {recommendation && <p className="text-xs text-gov-blue mt-1">→ {recommendation}</p>}
        </div>
      </div>
    </div>
  );
};

// ---- ChartCard ----
export const ChartCard: React.FC<{ title: string; children: React.ReactNode; action?: React.ReactNode }> = ({ title, children, action }) => (
  <div className="card">
    <div className="flex items-center justify-between px-5 py-3 border-b border-border-default">
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);
