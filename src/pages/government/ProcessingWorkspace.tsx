// ==========================================
// BhoomiAI - AI Processing Workspace
// ==========================================

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { documentsService } from '../../services/documents.service';
import { verificationService } from '../../services/verification.service';
import { ExtractionResult, ExtractionField, ProcessingPipelineStep, getConfidenceLevel } from '../../types/documents';
import { ValidationResult } from '../../types/validation';
import { Button, Badge, ConfidenceBadge, StatusBadge, ProgressBar, ValidationCard, Tabs, LoadingState } from '../../components/ui';
import {
  FileText, Brain, CheckCircle2, AlertTriangle, Edit3, Save, RotateCcw,
  ChevronRight, Eye, Cpu, Shield, ArrowRight, ZapOff, ChevronDown, ChevronUp,
} from 'lucide-react';

const ProcessingWorkspace: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [pipeline, setPipeline] = useState<ProcessingPipelineStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [activePanel, setActivePanel] = useState<'extraction' | 'validation' | 'pipeline'>('extraction');
  const [showPipeline, setShowPipeline] = useState(true);

  useEffect(() => {
    (async () => {
      const [ext, proc, val] = await Promise.all([
        documentsService.getExtractionResult(id || 'doc-003'),
        documentsService.getProcessingStatus(id || 'doc-003'),
        verificationService.getValidationResult(id || 'lr-003'),
      ]);
      setExtraction(ext);
      setPipeline(proc.pipeline);
      setValidation(val);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <LoadingState message="Loading AI processing workspace..." />;
  if (!extraction) return <div>No extraction data</div>;

  const highConf = extraction.fields.filter(f => f.confidence >= 90);
  const medConf = extraction.fields.filter(f => f.confidence >= 70 && f.confidence < 90);
  const lowConf = extraction.fields.filter(f => f.confidence < 70);

  const isHighConfidence = extraction.overallConfidence >= 90;

  const saveEdit = (fieldName: string) => {
    setExtraction(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: prev.fields.map(f =>
          f.fieldName === fieldName ? { ...f, editedValue: editValues[fieldName] || f.extractedValue } : f
        ),
      };
    });
    setEditingField(null);
  };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">AI Processing Workspace</h1>
            <Badge variant="purple"><Brain className="w-3 h-3 mr-1" />AI Extraction</Badge>
          </div>
          <p className="text-sm text-text-secondary mt-1">Document: {id} · {extraction.language} · {extraction.pageCount} page(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate('/records')}>Back to Records</Button>
          {isHighConfidence ? (
            <Button variant="primary" size="sm" icon={<CheckCircle2 className="w-4 h-4" />} onClick={() => navigate('/records/lr-001')}>Auto-Validate & Continue</Button>
          ) : (
            <Button variant="primary" size="sm" icon={<ArrowRight className="w-4 h-4" />} onClick={() => navigate('/verification/lr-003')}>Send to Verification</Button>
          )}
        </div>
      </div>

      {/* Processing Pipeline */}
      <div className="card">
        <button onClick={() => setShowPipeline(!showPipeline)} className="w-full px-5 py-3 flex items-center justify-between hover:bg-surface-secondary transition-colors">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-ai-purple" />
            <h3 className="text-sm font-semibold text-text-primary">AI Processing Pipeline</h3>
            <Badge variant="purple">{pipeline.filter(s => s.status === 'completed').length}/{pipeline.length} Complete</Badge>
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
                    {step.stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace('Ocr Htr', 'OCR/HTR')}
                  </div>
                  {i < pipeline.length - 1 && <ChevronRight className="w-3 h-3 text-text-tertiary flex-shrink-0" />}
                </React.Fragment>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-text-tertiary">
              <span>Quality: {extraction.qualityScore}%</span>
              <span>Processing Time: {extraction.processingTime}s</span>
              <span>Language: {extraction.language}</span>
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
                {isHighConfidence ? 'High Confidence — Auto-Validation Eligible' : 'Requires Human Verification'}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                Overall confidence: {extraction.overallConfidence}% · {highConf.length} high, {medConf.length} medium, {lowConf.length} low confidence fields
              </p>
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
          <div className="flex-1 bg-gray-100 flex items-center justify-center p-4 relative">
            {/* Simulated scanned document */}
            <div className="bg-white shadow-lg rounded p-6 w-full max-w-[300px] transform -rotate-1">
              <div className="space-y-2 font-mono text-xs text-gray-700">
                <p className="text-center font-bold text-sm mb-4">रिकार्ड ऑफ राइट्स</p>
                <p className="text-center text-xs text-gray-500 mb-3">Record of Rights</p>
                <div className="border-t border-gray-300 pt-2">
                  <p>खसरा सं॰ : 142/3</p>
                  <p>ग्राम : सेमरौता</p>
                  <p>तहसील : गौरीगंज</p>
                  <p>जिला : अमेठी</p>
                </div>
                <div className="border-t border-gray-300 pt-2 mt-2">
                  <p>खातेदार : राजेन्द्र प्रसाद</p>
                  <p>पिता : बाबू लाल</p>
                  <p>क्षेत्रफल : 3.2 एकड़</p>
                  <p>भूमि प्रकार : कृषि</p>
                </div>
                <div className="border-t border-gray-300 pt-2 mt-2 text-gray-400">
                  <p>दिनांक : 10/11/2022</p>
                  <p>हस्ताक्षर : ___________</p>
                </div>
              </div>
            </div>
            <div className="absolute bottom-3 right-3">
              <Badge variant="info">Page 1 of {extraction.pageCount}</Badge>
            </div>
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
          <div className="flex-1 overflow-y-auto divide-y divide-border-default">
            {extraction.fields.map(field => (
              <div key={field.fieldName} className={`px-4 py-3 ${field.confidence < 70 ? 'bg-red-50/30' : field.confidence < 90 ? 'bg-amber-50/30' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">{field.fieldLabel}</span>
                  <ConfidenceBadge score={field.confidence} showLabel={false} />
                </div>
                {editingField === field.fieldName ? (
                  <div className="flex gap-2 mt-1">
                    <input
                      className="input-base flex-1 text-sm"
                      value={editValues[field.fieldName] ?? field.extractedValue}
                      onChange={e => setEditValues({ ...editValues, [field.fieldName]: e.target.value })}
                      autoFocus
                    />
                    <Button size="sm" variant="primary" onClick={() => saveEdit(field.fieldName)}><Save className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}><RotateCcw className="w-3 h-3" /></Button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{field.editedValue || field.extractedValue}</p>
                      {field.editedValue && <p className="text-xs text-text-tertiary line-through">{field.extractedValue}</p>}
                      <p className="text-xs text-text-tertiary mt-0.5">Page {field.sourcePage}</p>
                    </div>
                    <button onClick={() => { setEditingField(field.fieldName); setEditValues({ ...editValues, [field.fieldName]: field.editedValue || field.extractedValue }); }} className="p-1 text-text-tertiary hover:text-gov-blue">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {field.suggestions && field.suggestions.length > 0 && !editingField && (
                  <div className="flex gap-1 mt-1">
                    {field.suggestions.map(s => (
                      <button key={s} className="text-xs px-1.5 py-0.5 bg-blue-50 text-gov-blue rounded hover:bg-blue-100" onClick={() => {
                        setExtraction(prev => prev ? { ...prev, fields: prev.fields.map(f => f.fieldName === field.fieldName ? { ...f, editedValue: s } : f) } : prev);
                      }}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Validation Results */}
      {validation && (
        <div className="card">
          <div className="px-5 py-3 border-b border-border-default flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-text-tertiary" />
              <h3 className="text-sm font-semibold text-text-primary">Validation Results</h3>
            </div>
            <StatusBadge status={validation.overallStatus} />
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
