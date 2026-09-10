// ==========================================
// BhoomiAI - Land Records List + Detail Pages
// ==========================================

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { recordsService } from '../../services/records.service';
import { LandRecord, VERIFICATION_STATUS_LABELS, DOCUMENT_TYPE_LABELS, LAND_CLASSIFICATION_LABELS } from '../../types/land-records';
import { DataTable, SearchInput, Select, StatusBadge, ConfidenceBadge, Badge, Button, Tabs, Timeline, LoadingState, EmptyState, Pagination } from '../../components/ui';
import { FileText, MapPin, User, Ruler, Calendar, Shield, Download, Printer, Eye, Map, ScrollText, CheckCircle2, History, ExternalLink } from 'lucide-react';

// ---- List Page ----
export const LandRecordsList: React.FC = () => {
  const [records, setRecords] = useState<LandRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const result = await recordsService.getRecords({ search, status: statusFilter, district: districtFilter });
      setRecords(result.data);
      setLoading(false);
    })();
  }, [search, statusFilter, districtFilter]);

  const columns = [
    { key: 'recordId', header: 'Record ID', render: (r: LandRecord) => <span className="font-mono text-xs font-semibold text-gov-blue">{r.recordId}</span> },
    { key: 'owner', header: 'Owner', render: (r: LandRecord) => (
      <div><p className="font-medium text-sm">{r.owner.name}</p><p className="text-xs text-text-tertiary">S/o {r.owner.fatherOrHusbandName}</p></div>
    )},
    { key: 'khasraNumber', header: 'Khasra No.' },
    { key: 'village', header: 'Location', render: (r: LandRecord) => <span className="text-xs">{r.village}, {r.tehsil}</span> },
    { key: 'area', header: 'Area', render: (r: LandRecord) => r.area.displayValue },
    { key: 'documentType', header: 'Doc Type', render: (r: LandRecord) => <Badge>{DOCUMENT_TYPE_LABELS[r.documentType]}</Badge> },
    { key: 'confidenceScore', header: 'Confidence', render: (r: LandRecord) => r.confidenceScore > 0 ? <ConfidenceBadge score={r.confidenceScore} /> : <span className="text-xs text-text-tertiary">N/A</span> },
    { key: 'verificationStatus', header: 'Status', render: (r: LandRecord) => <StatusBadge status={r.verificationStatus} /> },
  ];

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Land Records</h1>
          <p className="text-sm text-text-secondary mt-1">Browse and manage digitized land records</p>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-border-default flex flex-wrap gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by owner, Khasra, village..." className="flex-1 min-w-[200px]" />
          <Select options={[
            { value: 'verified', label: 'Verified' },
            { value: 'pending_verification', label: 'Pending' },
            { value: 'under_review', label: 'Under Review' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'extracted', label: 'Extracted' },
            { value: 'processing', label: 'Processing' },
          ]} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} placeholder="All Status" className="w-44" />
          <Select options={[
            { value: 'Amethi', label: 'Amethi' },
            { value: 'Lucknow', label: 'Lucknow' },
            { value: 'Varanasi', label: 'Varanasi' },
          ]} value={districtFilter} onChange={e => setDistrictFilter(e.target.value)} placeholder="All Districts" className="w-40" />
        </div>
        <DataTable columns={columns} data={records} onRowClick={r => navigate(`/records/${r.id}`)} loading={loading} emptyMessage="No records match your filters" />
        <Pagination page={1} totalPages={1} onPageChange={() => {}} total={records.length} />
      </div>
    </div>
  );
};

// ---- Detail Page ----
export const LandRecordDetail: React.FC = () => {
  const { id } = useParams();
  const [record, setRecord] = useState<LandRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const r = await recordsService.getRecord(id || '');
      setRecord(r);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <LoadingState />;
  if (!record) return <EmptyState message="Record not found" />;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FileText className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', icon: <Eye className="w-4 h-4" /> },
    { id: 'ownership', label: 'Ownership', icon: <User className="w-4 h-4" /> },
    { id: 'mutation', label: 'Mutation', icon: <History className="w-4 h-4" />, count: record.mutationHistory.length },
    { id: 'gis', label: 'GIS Map', icon: <Map className="w-4 h-4" /> },
    { id: 'validation', label: 'Validation', icon: <Shield className="w-4 h-4" /> },
    { id: 'audit', label: 'Audit History', icon: <ScrollText className="w-4 h-4" /> },
  ];

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-text-primary">{record.recordId}</h1>
            <StatusBadge status={record.verificationStatus} />
            {record.verificationStatus === 'verified' && (
              <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" />Verified Digital Record</Badge>
            )}
          </div>
          <p className="text-sm text-text-secondary">{record.owner.name} · {record.village}, {record.tehsil}, {record.district}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Download</Button>
          <Button variant="secondary" size="sm" icon={<Printer className="w-4 h-4" />}>Print</Button>
          {record.gisLinked && <Button variant="outline" size="sm" icon={<Map className="w-4 h-4" />} onClick={() => navigate('/gis')}>View on Map</Button>}
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="card p-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoField label="Owner Name" value={record.owner.name} />
            <InfoField label="Father/Husband Name" value={record.owner.fatherOrHusbandName} />
            <InfoField label="Survey Number" value={record.surveyNumber} />
            <InfoField label="Khasra Number" value={record.khasraNumber} />
            <InfoField label="Khata Number" value={record.khataNumber} />
            <InfoField label="Plot Number" value={record.plotNumber || 'N/A'} />
            <InfoField label="Area" value={record.area.displayValue} />
            <InfoField label="Village" value={record.village} />
            <InfoField label="Tehsil" value={record.tehsil} />
            <InfoField label="District" value={record.district} />
            <InfoField label="State" value={record.state} />
            <InfoField label="Land Classification" value={LAND_CLASSIFICATION_LABELS[record.landClassification]} />
            <InfoField label="Ownership Type" value={record.ownershipType} />
            <InfoField label="Document Type" value={DOCUMENT_TYPE_LABELS[record.documentType]} />
            <InfoField label="Confidence Score" value={record.confidenceScore > 0 ? `${record.confidenceScore}%` : 'N/A'} />
            <InfoField label="GIS Linked" value={record.gisLinked ? 'Yes' : 'No'} />
            <InfoField label="Created" value={new Date(record.createdAt).toLocaleDateString('en-IN')} />
            {record.verifiedAt && <InfoField label="Verified On" value={new Date(record.verifiedAt).toLocaleDateString('en-IN')} />}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
            <p className="text-sm text-text-secondary">Source document: {record.sourceDocumentId || 'Not available'}</p>
            <Button variant="outline" size="sm" className="mt-3" icon={<Eye className="w-4 h-4" />} onClick={() => record.sourceDocumentId && navigate(`/processing/${record.sourceDocumentId}`)}>
              View in Processing Workspace
            </Button>
          </div>
        )}

        {activeTab === 'ownership' && (
          <div className="max-w-lg">
            <h3 className="font-semibold text-text-primary mb-4">Current Owner</h3>
            <div className="space-y-3">
              <InfoField label="Name" value={record.owner.name} />
              <InfoField label="Father/Husband" value={record.owner.fatherOrHusbandName} />
              <InfoField label="Address" value={record.owner.address || 'N/A'} />
              <InfoField label="Ownership Type" value={record.ownershipType} />
            </div>
          </div>
        )}

        {activeTab === 'mutation' && (
          record.mutationHistory.length > 0 ? (
            <div className="space-y-4">
              {record.mutationHistory.map(m => (
                <div key={m.id} className="border border-border-default rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">{m.mutationType}</h4>
                    <StatusBadge status={m.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <InfoField label="Date" value={m.date} />
                    <InfoField label="Order No." value={m.orderNumber} />
                    <InfoField label="Previous Owner" value={m.previousOwner} />
                    <InfoField label="New Owner" value={m.newOwner} />
                    <InfoField label="Reason" value={m.reason} />
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState message="No mutation history available" />
        )}

        {activeTab === 'gis' && (
          <div className="text-center py-12">
            <Map className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
            <p className="text-sm text-text-secondary">{record.gisLinked ? 'Parcel is linked to GIS data' : 'GIS data not yet linked'}</p>
            <Button variant="outline" size="sm" className="mt-3" icon={<ExternalLink className="w-4 h-4" />} onClick={() => navigate('/gis')}>Open GIS Module</Button>
          </div>
        )}

        {activeTab === 'validation' && (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
            <p className="text-sm text-text-secondary">View validation results in the Processing Workspace</p>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="text-center py-12">
            <ScrollText className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
            <p className="text-sm text-text-secondary">Audit trail available in Audit Logs</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/audit-logs')}>View Audit Logs</Button>
          </div>
        )}
      </div>
    </div>
  );
};

const InfoField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-xs text-text-tertiary font-medium uppercase tracking-wide">{label}</p>
    <p className="text-sm text-text-primary mt-0.5">{value}</p>
  </div>
);
