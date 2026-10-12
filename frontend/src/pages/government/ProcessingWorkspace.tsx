// ==========================================
// BhumiSetu - AI Processing Workspace
// ==========================================

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { documentsService } from '../../services/documents.service';
import { originalFileUrl } from '../../services/api-client';
import { BDocDetail, BACKEND_STATUS_LABEL, PROCESSING_STATUSES, REVIEWABLE, toDocType, toVerificationStatus } from '../../services/backend';
import { DOCUMENT_TYPE_LABELS } from '../../types/land-records';
import { useAuthStore } from '../../store/auth.store';
import { useLiveInterval } from '../../hooks/useLiveUpdates';
import { Button, Badge, ConfidenceBadge, StatusBadge, ValidationCard, LoadingState, EmptyState } from '../../components/ui';
import { DocStatusBadge, DocImage, PIPELINE, RULE_LABEL, docLanguage, fieldBoxes, overallConfidence, pipelineSteps, processingSeconds, rawText, reasons, validationCards } from './shared';
import {
  FileText, Brain, CheckCircle2, AlertTriangle, Edit3, RotateCcw, Download, Copy,
  ChevronRight, Eye, Cpu, Shield, ArrowRight, ZapOff, ChevronDown, ChevronUp,
} from 'lucide-react';

const ProcessingWorkspace: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuthStore();
  const [doc, setDoc] = useState<BDocDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordId, setRecordId] = useState<number | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [showPipeline, setShowPipeline] = useState(true);
  const [imgKind, setImgKind] = useState<'processed' | 'original'>('processed');

  const load = async () => {
    try {
      const d = await documentsService.get(id || '');
      setDoc(d);
      if (d.status === 'PUBLISHED') documentsService.recordFor(d.id).then(r => setRecordId(r.record_id)).catch(() => {});
    } catch (e: any) { setError(e.message); }
  };
  useEffect(() => { setDoc(null); load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const processing = !!doc && PROCESSING_STATUSES.includes(doc.status);
  useLiveInterval(load, 2000, processing);

  if (error) return <EmptyState message={error} />;
  if (!doc) return <LoadingState message="Loading AI processing workspace..." />;

  const pipeline = pipelineSteps(doc);
  const extraction = {
    fields: doc.fields.map(f => ({ id: f.id, fieldName: f.field_name, fieldLabel: f.label, extractedValue: f.value ?? '',
      editedValue: f.final_value != null && f.final_value !== f.value ? f.final_value : undefined, raw: f.raw_value,
      confidence: Math.round(f.confidence), threshold: f.threshold, sourcePage: f.page_no, flags: f.flags, edited: f.edited })),
    rawText: rawText(doc), language: docLanguage(doc), pageCount: doc.pages.length,
    qualityScore: Math.round((doc.quality_score ?? doc.pages[0]?.quality_score ?? 0) * 100),
    overallConfidence: overallConfidence(doc), processingTime: processingSeconds(doc),
  };
  const highConf = extraction.fields.filter(f => f.confidence >= 90);
  const medConf = extraction.fields.filter(f => f.confidence >= 70 && f.confidence < 90);
  const lowConf = extraction.fields.filter(f => f.confidence < 70);
  const reviewable = REVIEWABLE.includes(doc.status);
  const isHighConfidence = doc.status === 'PUBLISHED' || doc.status === 'AUTO_APPROVED';
  const validation = { overallStatus: doc.validations.some(v => !v.passed && v.severity === 'hard') ? 'rejected' : doc.validations.some(v => !v.passed && v.severity === 'soft') ? 'pending_verification' : 'verified',
    validations: validationCards(doc.validations) };
  const boxes = fieldBoxes(doc);

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">AI Processing Workspace</h1>
            <Badge variant="purple"><Brain className="w-3 h-3 mr-1" />AI Extraction</Badge>
          </div>
          <p className="text-sm text-text-secondary mt-1">{doc.filename} · {DOCUMENT_TYPE_LABELS[toDocType(doc.doc_type)]} · {extraction.language} · {extraction.pageCount} page(s) · {doc.district}{doc.village ? ` / ${doc.village}` : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>Back</Button>
          <a href={originalFileUrl(doc.id)} target="_blank" rel="noreferrer"><Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Original</Button></a>
          {can('review') && !processing && doc.status !== 'PUBLISHED' && <Button variant="ghost" size="sm" icon={<RotateCcw className="w-4 h-4" />} onClick={async () => { await documentsService.reprocess(doc.id); load(); }}>Re-run pipeline</Button>}
          {recordId ? (
            <Button variant="primary" size="sm" icon={<CheckCircle2 className="w-4 h-4" />} onClick={() => navigate(`/records/${recordId}`)}>Open Published Record</Button>
          ) : reviewable && can('review') ? (
            <Button variant="primary" size="sm" icon={<ArrowRight className="w-4 h-4" />} onClick={() => navigate(`/verification/${doc.id}`)}>Open in Verification</Button>
          ) : null}
        </div>
      </div>

      {/* Processing Pipeline */}
      <div className="card">
        <button onClick={() => setShowPipeline(!showPipeline)} className="w-full px-5 py-3 flex items-center justify-between hover:bg-surface-secondary transition-colors">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-ai-purple" />
            <h3 className="text-sm font-semibold text-text-primary">AI Processing Pipeline</h3>
            <Badge variant="purple">{pipeline.filter(s => s.status === 'completed').length}/{pipeline.length} Complete</Badge>
            <DocStatusBadge status={doc.status} />
          </div>
          {showPipeline ? <ChevronUp className="w-4 h-4 text-text-tertiary" /> : <ChevronDown className="w-4 h-4 text-text-tertiary" />}
        </button>
        {showPipeline && (
          <div className="px-5 pb-4">
            <div className="flex items-center gap-1 overflow-x-auto py-2">
              {pipeline.map((step, i) => (
                <React.Fragment key={step.stage}>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                    step.status === 'completed' ? 'bg-green-50 text-verified border border-green-200' :
                    step.status === 'running' ? 'bg-blue-50 text-gov-blue border border-blue-200 animate-pulse-dot' :
                    step.status === 'failed' ? 'bg-red-50 text-error border border-red-200' :
                    'bg-gray-50 text-text-tertiary border border-gray-200'
                  }`}>
                    {step.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                    {step.status === 'running' && <div className="w-2 h-2 bg-gov-blue rounded-full animate-pulse" />}
                    {step.status === 'failed' && <ZapOff className="w-3 h-3" />}
                    <span title={step.details}>{PIPELINE[i].label}</span>
                  </div>
                  {i < pipeline.length - 1 && <ChevronRight className="w-3 h-3 text-text-tertiary flex-shrink-0" />}
                </React.Fragment>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-text-tertiary">
              <span>Quality: {extraction.qualityScore}%</span>
              {extraction.processingTime != null && <span>Processing Time: {extraction.processingTime.toFixed(1)}s</span>}
              <span>Language: {extraction.language}</span>
              <span className="font-mono">SHA-256 {doc.sha256.slice(0, 16)}</span>
              {doc.fields[0] && <span>Model: {doc.fields[0].model_version}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Confidence Decision */}
      <div className={`card p-4 border-l-4 ${isHighConfidence ? 'border-l-verified bg-green-50/50' : 'border-l-pending bg-amber-50/50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isHighConfidence ? <CheckCircle2 className="w-5 h-5 text-verified" /> : <AlertTriangle className="w-5 h-5 text-pending" />}
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {processing ? `Processing: ${BACKEND_STATUS_LABEL[doc.status]}` : doc.status === 'FAILED' ? `Failed while ${BACKEND_STATUS_LABEL[doc.failed_stage || ''] || doc.failed_stage} (after ${doc.attempts} attempts)` : isHighConfidence ? 'High Confidence: auto-validated and published' : doc.status === 'DUPLICATE' ? 'Duplicate of an earlier upload' : doc.status === 'REJECTED' ? 'Rejected' : 'Requires Human Verification'}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                Overall confidence: {extraction.overallConfidence}% · {highConf.length} high, {medConf.length} medium, {lowConf.length} low confidence fields
              </p>
              {reasons(doc.route_reason || doc.error).map(r => <p key={r} className="text-xs text-text-secondary mt-0.5">• {r}</p>)}
            </div>
          </div>
          <ConfidenceBadge score={extraction.overallConfidence} />
        </div>
      </div>

      {/* Three-Panel Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: '500px' }}>
        {/* LEFT: Document Viewer */}
        <div className="card flex flex-col">
          <div className="px-4 py-3 border-b border-border-default flex items-center gap-2">
            <Eye className="w-4 h-4 text-text-tertiary" />
            <h3 className="text-sm font-semibold text-text-primary">Original Document</h3>
          </div>
          {doc.pages.length > 0 ? <DocImage doc={doc} kind={imgKind} boxes={boxes} active={active} onBoxClick={setActive} className="flex-1 min-h-[460px]" /> :
            <div className="flex-1 bg-gray-100 flex items-center justify-center p-4 text-sm text-text-tertiary">{processing ? 'Preparing the page image...' : 'No page image'}</div>}
          <div className="px-4 py-2 border-t border-border-default flex items-center gap-2 text-xs">
            {(['processed', 'original'] as const).map(k => <button key={k} onClick={() => setImgKind(k)} className={`px-2 py-1 rounded ${imgKind === k ? 'bg-gov-blue text-white' : 'bg-surface-secondary text-text-secondary'}`}>{k === 'processed' ? 'Cleaned scan' : 'Original'}</button>)}
            <span className="ml-auto text-text-tertiary">Page 1 of {extraction.pageCount}{doc.pages[0]?.skew_deg ? ` · straightened ${Math.abs(doc.pages[0].skew_deg)}°` : ''}</span>
          </div>
        </div>

        {/* CENTER: OCR Text */}
        <div className="card flex flex-col">
          <div className="px-4 py-3 border-b border-border-default flex items-center gap-2">
            <FileText className="w-4 h-4 text-text-tertiary" />
            <h3 className="text-sm font-semibold text-text-primary">OCR / HTR Extracted Text</h3>
            <Badge variant="purple">AI</Badge>
          </div>
          <div className="flex-1 p-4 overflow-y-auto bg-surface-secondary">
            <pre className="text-sm leading-relaxed whitespace-pre-wrap font-mono text-text-primary">
              {extraction.rawText}
            </pre>
          </div>
          <div className="px-4 py-2 border-t border-border-default text-xs text-text-tertiary">
            Quality Score: {extraction.qualityScore}% · Language: {extraction.language}
          </div>
        </div>

        {/* RIGHT: Structured Fields */}
        <div className="card flex flex-col">
          <div className="px-4 py-3 border-b border-border-default">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-ai-purple" />
                <h3 className="text-sm font-semibold text-text-primary">Extracted Fields</h3>
              </div>
              <Badge variant="purple">{extraction.fields.length} fields</Badge>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border-default max-h-[560px]">
            {extraction.fields.length === 0 && <p className="p-4 text-sm text-text-tertiary">{processing ? 'Fields appear once the text has been read.' : 'No fields were read.'}</p>}
            {extraction.fields.map(field => (
              <div key={field.id} onClick={() => setActive(field.id)} className={`px-4 py-3 cursor-pointer ${active === field.id ? 'bg-blue-50/70' : field.confidence < 70 ? 'bg-red-50/30' : field.confidence < 90 ? 'bg-amber-50/30' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">{field.fieldLabel}</span>
                  <ConfidenceBadge score={field.confidence} showLabel={false} />
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{field.editedValue || field.extractedValue || <span className="text-text-tertiary">not found</span>}</p>
                    {field.editedValue && <p className="text-xs text-text-tertiary line-through">{field.extractedValue}</p>}
                    {field.raw && field.raw !== (field.editedValue || field.extractedValue) && <p className="text-xs text-text-tertiary mt-0.5">Printed as: {field.raw}</p>}
                    <p className="text-xs text-text-tertiary mt-0.5">Page {field.sourcePage}{field.edited ? ' · corrected by officer' : ''}</p>
                    {field.flags?.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{field.flags.map(c => <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">{RULE_LABEL[c] || c}</span>)}</div>}
                  </div>
                  {reviewable && can('review') && <button title="Correct in verification" onClick={e => { e.stopPropagation(); navigate(`/verification/${doc.id}?field=${field.id}`); }} className="p-1 text-text-tertiary hover:text-gov-blue">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Validation Results */}
      {doc.duplicates.length > 0 && (
        <div className="card">
          <div className="px-5 py-3 border-b border-border-default flex items-center gap-2"><Copy className="w-4 h-4 text-text-tertiary" /><h3 className="text-sm font-semibold text-text-primary">Duplicates & Conflicts</h3></div>
          <div className="p-4 space-y-2">{doc.duplicates.map(d => (
            <ValidationCard key={d.id} status={d.kind.includes('conflict') ? 'fail' : 'warning'} message={d.detail}
              details={`${({ image: 'Looks like a rescan', record: 'Holding already exists', conflict: 'Conflicts with a published record', lrms_conflict: 'Differs from state LRMS' } as Record<string, string>)[d.kind] || d.kind} · ${Math.round(d.score)}% match`} />))}</div>
        </div>
      )}

      {validation.validations.length > 0 && (
        <div className="card">
          <div className="px-5 py-3 border-b border-border-default flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-text-tertiary" />
              <h3 className="text-sm font-semibold text-text-primary">Validation Results</h3>
            </div>
            <Badge variant={validation.overallStatus === 'rejected' ? 'danger' : validation.overallStatus === 'pending_verification' ? 'warning' : 'success'}>
              {validation.overallStatus === 'rejected' ? 'Blocking issue' : validation.overallStatus === 'pending_verification' ? 'Warnings to check' : 'All checks passed'}</Badge>
          </div>
          <div className="p-4 space-y-2">
            {validation.validations.map(v => (
              <ValidationCard
                key={v.id}
                status={v.status}
                message={v.message}
                severity={v.severity}
                details={v.details}
                recommendation={v.recommendation}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessingWorkspace;
