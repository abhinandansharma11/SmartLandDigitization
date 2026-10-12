// ==========================================
// BhumiSetu - All uploaded documents and where each one is in the workflow
// ==========================================

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileStack } from 'lucide-react';
import { documentsService } from '../../services/documents.service';
import { BDocSummary, BACKEND_STATUS_LABEL, REVIEWABLE, fmtAgo, toDocType, toVerificationStatus } from '../../services/backend';
import { DOCUMENT_TYPE_LABELS } from '../../types/land-records';
import { useAuthStore } from '../../store/auth.store';
import { useLiveInterval } from '../../hooks/useLiveUpdates';
import { Button, DataTable, SearchInput, StatusBadge } from '../../components/ui';
import { DocStatusBadge, reasons } from './shared';

const FILTERS: [string, string][] = [
  ['', 'All'], ['RECEIVED,PREPROCESSING,CLASSIFIED,EXTRACTING,VALIDATING', 'Being read'], ['IN_REVIEW', 'Needs review'],
  ['SUPERVISOR,MANUAL_ENTRY', 'With supervisor'], ['PUBLISHED', 'Published'], ['FAILED', 'Failed'], ['DUPLICATE,REJECTED', 'Duplicate or rejected'],
];

const Documents: React.FC = () => {
  const navigate = useNavigate();
  const { can } = useAuthStore();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [data, setData] = useState<{ total: number; items: BDocSummary[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => documentsService.list({ status, q, limit: 200 }).then(r => { setData(r); setError(null); }).catch(e => setError(e.message)), [status, q]);
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);
  useLiveInterval(load, 4000);

  const open = (d: BDocSummary) => navigate(REVIEWABLE.includes(d.status) && can('review') ? `/verification/${d.id}` : `/processing/${d.id}`);

  const columns = [
    { key: 'filename', header: 'File', render: (d: BDocSummary) => <div className="max-w-[260px]"><p className="text-sm font-medium truncate" title={d.filename}>{d.filename}</p><p className="font-mono text-xs text-text-tertiary">{d.id.slice(0, 8)}{d.channel !== 'upload' ? ` · ${d.channel}` : ''}</p></div> },
    { key: 'status', header: 'Status', render: (d: BDocSummary) => <div><DocStatusBadge status={d.status} />{d.qa_sample && <p className="text-[11px] text-text-tertiary mt-1">Random QA check</p>}</div> },
    { key: 'doc_type', header: 'Record Type', render: (d: BDocSummary) => <span className="text-sm">{d.doc_type ? DOCUMENT_TYPE_LABELS[toDocType(d.doc_type)] : <span className="text-text-tertiary">Not known yet</span>}</span> },
    { key: 'village', header: 'Location', render: (d: BDocSummary) => <span className="text-xs">{d.village ? `${d.village}, ` : ''}{d.district}{d.tehsil ? `, ${d.tehsil}` : ''}</span> },
    { key: 'min_confidence', header: 'Lowest Confidence', render: (d: BDocSummary) => d.min_confidence != null ? <span className={`text-sm font-semibold ${d.min_confidence < 70 ? 'text-error' : d.min_confidence < 90 ? 'text-pending' : 'text-verified'}`}>{Math.round(d.min_confidence)}%</span> : <span className="text-text-tertiary">-</span> },
    { key: 'reason', header: 'Why', render: (d: BDocSummary) => <p className="max-w-[320px] text-xs text-text-secondary line-clamp-2" title={d.error || d.route_reason || ''}>{d.error || reasons(d.route_reason)[0] || (d.duplicate_of ? `Same file as ${d.duplicate_of.slice(0, 8)}` : '')}</p> },
    { key: 'uploaded_at', header: 'Uploaded', render: (d: BDocSummary) => <span className="text-xs text-text-tertiary whitespace-nowrap">{fmtAgo(d.uploaded_at)}</span> },
  ];

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2"><FileStack className="w-6 h-6 text-gov-blue" /> Documents</h1>
          <p className="text-sm text-text-secondary mt-1">Every scan uploaded in your jurisdiction and where it is now. Updates by itself.</p>
        </div>
        {can('upload') && <Button icon={<UploadCloud className="w-4 h-4" />} onClick={() => navigate('/upload')}>Upload Document</Button>}
      </div>
      <div className="card">
        <div className="p-4 border-b border-border-default flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map(([v, l]) => (
              <button key={l} onClick={() => setStatus(v)} aria-pressed={status === v}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${status === v ? 'bg-gov-blue text-white' : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary'}`}>{l}</button>
            ))}
          </div>
          <SearchInput value={q} onChange={setQ} placeholder="Find by file name or ID" className="ml-auto w-64" />
        </div>
        {error && <p className="px-4 py-3 text-sm text-error">{error}</p>}
        <DataTable columns={columns} data={data?.items || []} loading={!data && !error} onRowClick={open}
          emptyMessage={status || q ? 'No documents match this filter.' : 'No documents yet. Upload a scan to get started.'} />
        {data && data.total > 0 && <p className="px-4 py-3 text-xs text-text-tertiary border-t border-border-default">{data.total} document{data.total === 1 ? '' : 's'}</p>}
      </div>
    </div>
  );
};

export default Documents;
