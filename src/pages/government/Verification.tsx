// ==========================================
// BhoomiAI - Verification Queue + Detail
// ==========================================

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { verificationService } from '../../services/verification.service';
import { LandRecord } from '../../types/land-records';
import { ValidationResult } from '../../types/validation';
import { DataTable, SearchInput, Select, StatusBadge, ConfidenceBadge, Badge, Button, Modal, Tabs, Timeline, ValidationCard, LoadingState, EmptyState } from '../../components/ui';
import { Textarea } from '../../components/ui';
import {
  CheckSquare, CheckCircle2, XCircle, RotateCcw, ArrowRight, MessageSquare,
  User, MapPin, FileText, Shield, AlertTriangle, Clock, Eye, Brain,
} from 'lucide-react';
import { MOCK_EXTRACTION_RESULT } from '../../data/mock-documents';

// ---- Queue Page ----
export const VerificationQueue: React.FC = () => {
  const [records, setRecords] = useState<LandRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const data = await verificationService.getVerificationQueue();
      setRecords(data);
      setLoading(false);
    })();
  }, []);

  const filtered = records.filter(r =>
    !search || r.owner.name.toLowerCase().includes(search.toLowerCase()) || r.recordId.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: 'recordId', header: 'Record ID', render: (r: LandRecord) => <span className="font-mono text-xs font-semibold text-gov-blue">{r.recordId}</span> },
    { key: 'owner', header: 'Owner', render: (r: LandRecord) => <span className="text-sm font-medium">{r.owner.name}</span> },
    { key: 'village', header: 'Village', render: (r: LandRecord) => <span className="text-xs">{r.village}, {r.tehsil}</span> },
    { key: 'documentType', header: 'Doc Type', render: (r: LandRecord) => <Badge>{r.documentType}</Badge> },
    { key: 'confidenceScore', header: 'Confidence', render: (r: LandRecord) => r.confidenceScore > 0 ? <ConfidenceBadge score={r.confidenceScore} /> : <span className="text-xs text-text-tertiary">N/A</span> },
    { key: 'verificationStatus', header: 'Status', render: (r: LandRecord) => <StatusBadge status={r.verificationStatus} /> },
    { key: 'priority', header: 'Priority', render: (r: LandRecord) => r.confidenceScore < 70 ? <Badge variant="danger">High</Badge> : r.confidenceScore < 90 ? <Badge variant="warning">Medium</Badge> : <Badge>Low</Badge> },
    { key: 'actions', header: 'Actions', render: (r: LandRecord) => <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`/verification/${r.id}`); }}>Review</Button> },
  ];

  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Verification Queue</h1>
        <p className="text-sm text-text-secondary mt-1">Records requiring human verification</p>
      </div>
      <div className="card">
        <div className="p-4 border-b border-border-default flex gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search records..." className="flex-1" />
        </div>
        <DataTable columns={columns} data={filtered} onRowClick={r => navigate(`/verification/${r.id}`)} loading={loading} emptyMessage="No records pending verification" />
      </div>
    </div>
  );
};

// ---- Detail Page ----
export const VerificationDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [comments, setComments] = useState('');
  const [activeTab, setActiveTab] = useState('fields');

  useEffect(() => {
    (async () => {
      const val = await verificationService.getValidationResult(id || '');
      setValidation(val);
      setLoading(false);
    })();
  }, [id]);

  const handleApprove = async () => {
    await verificationService.approveRecord(id || '', comments);
    setShowApproveModal(false);
    navigate('/verification');
  };

  const handleReject = async () => {
    await verificationService.rejectRecord(id || '', comments);
    setShowRejectModal(false);
    navigate('/verification');
  };

  if (loading) return <LoadingState />;

  const extraction = MOCK_EXTRACTION_RESULT;

  const auditTimeline = [
    { label: 'Document Uploaded', status: 'completed' as const, date: '2026-08-01' },
    { label: 'AI Processing Complete', status: 'completed' as const, date: '2026-09-05', description: `Confidence: ${extraction.overallConfidence}%` },
    { label: 'Validation Complete', status: 'completed' as const, date: '2026-09-05', description: `Status: ${validation?.overallStatus}` },
    { label: 'Assigned for Review', status: 'completed' as const, date: '2026-09-08' },
    { label: 'Under Review', status: 'current' as const, description: 'Revenue Officer reviewing...' },
    { label: 'Approved / Rejected', status: 'pending' as const },
  ];

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Verification Review</h1>
          <p className="text-sm text-text-secondary mt-1">Review and verify extracted land record data</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<RotateCcw className="w-4 h-4" />}>Send for Correction</Button>
          <Button variant="danger" size="sm" icon={<XCircle className="w-4 h-4" />} onClick={() => setShowRejectModal(true)}>Reject</Button>
          <Button variant="primary" size="sm" icon={<CheckCircle2 className="w-4 h-4" />} onClick={() => setShowApproveModal(true)}>Approve</Button>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'fields', label: 'Extracted Data', icon: <Brain className="w-4 h-4" /> },
          { id: 'validation', label: 'Validation', icon: <Shield className="w-4 h-4" />, count: validation?.validations.filter(v => v.status !== 'pass').length },
          { id: 'timeline', label: 'Audit Timeline', icon: <Clock className="w-4 h-4" /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'fields' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Document */}
          <div className="card">
            <div className="px-4 py-3 border-b border-border-default flex items-center gap-2">
              <Eye className="w-4 h-4 text-text-tertiary" />
              <h3 className="text-sm font-semibold">Original Document</h3>
            </div>
            <div className="bg-gray-100 p-4 min-h-[300px] flex items-center justify-center">
              <div className="bg-white shadow-lg rounded p-6 w-full max-w-[280px] transform -rotate-1 font-mono text-xs space-y-1">
                <p className="text-center font-bold text-sm mb-3">रिकार्ड ऑफ राइट्स</p>
                <p>खसरा : 142/3</p>
                <p>खातेदार : राजेन्द्र प्रसाद</p>
                <p>क्षेत्रफल : 3.2 एकड़</p>
                <p>ग्राम : सेमरौता</p>
              </div>
            </div>
          </div>

          {/* Extracted Fields */}
          <div className="card">
            <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-ai-purple" />
                <h3 className="text-sm font-semibold">Extracted Fields</h3>
              </div>
              <ConfidenceBadge score={extraction.overallConfidence} />
            </div>
            <div className="divide-y divide-border-default max-h-[400px] overflow-y-auto">
              {extraction.fields.map(f => (
                <div key={f.fieldName} className={`px-4 py-3 ${f.confidence < 70 ? 'bg-red-50/40' : f.confidence < 90 ? 'bg-amber-50/40' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-tertiary uppercase tracking-wide">{f.fieldLabel}</span>
                    <ConfidenceBadge score={f.confidence} showLabel={false} />
                  </div>
                  <p className="text-sm font-medium">{f.extractedValue}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'validation' && validation && (
        <div className="card p-4 space-y-2">
          {validation.validations.map(v => (
            <ValidationCard key={v.id} status={v.status} message={v.message} severity={v.severity} details={v.details} recommendation={v.recommendation} />
          ))}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="card p-6 max-w-lg">
          <Timeline items={auditTimeline} />
        </div>
      )}

      {/* Approve Modal */}
      <Modal open={showApproveModal} onClose={() => setShowApproveModal(false)} title="Approve Record" footer={
        <>
          <Button variant="secondary" onClick={() => setShowApproveModal(false)}>Cancel</Button>
          <Button variant="primary" icon={<CheckCircle2 className="w-4 h-4" />} onClick={handleApprove}>Confirm Approval</Button>
        </>
      }>
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-sm text-green-800 font-medium">You are approving this record as verified.</p>
            <p className="text-xs text-green-700 mt-1">This action will mark the record as an official verified digital land record.</p>
          </div>
          <Textarea label="Verification Comments (Optional)" value={comments} onChange={e => setComments(e.target.value)} placeholder="Add any verification notes..." />
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal open={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Record" footer={
        <>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>Cancel</Button>
          <Button variant="danger" icon={<XCircle className="w-4 h-4" />} onClick={handleReject}>Confirm Rejection</Button>
        </>
      }>
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800 font-medium">You are rejecting this record.</p>
            <p className="text-xs text-red-700 mt-1">Please provide a reason for rejection.</p>
          </div>
          <Textarea label="Rejection Reason (Required)" value={comments} onChange={e => setComments(e.target.value)} placeholder="Specify the reason for rejection..." required />
        </div>
      </Modal>
    </div>
  );
};
