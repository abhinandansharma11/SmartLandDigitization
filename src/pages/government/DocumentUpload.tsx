// ==========================================
// BhoomiAI - Document Upload Page
// ==========================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select, FileUploader, Badge, ProgressBar, StatusBadge } from '../../components/ui';
import { DOCUMENT_TYPE_LABELS } from '../../types/land-records';
import { getStates, getDistricts, getTehsils, getVillages } from '../../data/mock-jurisdictions';
import { Upload, FileText, X, Check, ArrowRight, Cpu } from 'lucide-react';

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
}

const DocumentUpload: React.FC = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [metadata, setMetadata] = useState({
    state: 'Uttar Pradesh', district: 'Amethi', tehsil: '', village: '',
    documentType: '', recordYear: '', sourceDepartment: '', description: '',
  });
  const [step, setStep] = useState<'upload' | 'metadata' | 'processing'>('upload');

  const handleFilesSelected = (newFiles: File[]) => {
    const uploads: UploadFile[] = newFiles.map(f => ({
      file: f, id: `file-${Date.now()}-${Math.random()}`, progress: 0, status: 'pending' as const,
    }));
    setFiles(prev => [...prev, ...uploads]);
  };

  const removeFile = (id: string) => setFiles(files.filter(f => f.id !== id));

  const startUpload = () => {
    setStep('processing');
    // Simulate upload + processing
    files.forEach((f, i) => {
      setTimeout(() => {
        setFiles(prev => prev.map(p =>
          p.id === f.id ? { ...p, status: 'uploading', progress: 30 } : p
        ));
      }, i * 500);
      setTimeout(() => {
        setFiles(prev => prev.map(p =>
          p.id === f.id ? { ...p, status: 'processing', progress: 70 } : p
        ));
      }, i * 500 + 1500);
      setTimeout(() => {
        setFiles(prev => prev.map(p =>
          p.id === f.id ? { ...p, status: 'complete', progress: 100 } : p
        ));
      }, i * 500 + 3000);
    });
  };

  const docTypeOptions = Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }));
  const tehsils = getTehsils(metadata.state, metadata.district);
  const villages = metadata.tehsil ? getVillages(metadata.state, metadata.district, metadata.tehsil) : [];

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Upload Land Records</h1>
        <p className="text-sm text-text-secondary mt-1">Upload scanned land record documents for AI processing</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-4 mb-2">
        {['Upload Files', 'Add Metadata', 'Process'].map((s, i) => {
          const stepKey = ['upload', 'metadata', 'processing'][i];
          const isActive = step === stepKey;
          const isDone = ['upload', 'metadata', 'processing'].indexOf(step) > i;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                isDone ? 'bg-verified text-white' : isActive ? 'bg-gov-blue text-white' : 'bg-gray-200 text-text-tertiary'
              }`}>
                {isDone ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-sm ${isActive ? 'font-semibold text-text-primary' : 'text-text-tertiary'}`}>{s}</span>
              {i < 2 && <ArrowRight className="w-4 h-4 text-text-tertiary mx-2" />}
            </div>
          );
        })}
      </div>

      {step === 'upload' && (
        <div className="card p-6 space-y-4">
          <FileUploader onFilesSelected={handleFilesSelected} />
          {files.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-text-primary">{files.length} file(s) selected</h3>
              {files.map(f => (
                <div key={f.id} className="flex items-center gap-3 px-3 py-2 bg-surface-secondary rounded-md">
                  <FileText className="w-4 h-4 text-gov-blue flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{f.file.name}</p>
                    <p className="text-xs text-text-tertiary">{(f.file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button onClick={() => removeFile(f.id)} className="text-text-tertiary hover:text-error"><X className="w-4 h-4" /></button>
                </div>
              ))}
              <Button onClick={() => setStep('metadata')} className="mt-2" disabled={files.length === 0}>Continue to Metadata <ArrowRight className="w-4 h-4" /></Button>
            </div>
          )}
        </div>
      )}

      {step === 'metadata' && (
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Document Metadata</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="State" options={[{ value: 'Uttar Pradesh', label: 'Uttar Pradesh' }]} value={metadata.state} onChange={e => setMetadata({ ...metadata, state: e.target.value })} />
            <Select label="District" options={getDistricts(metadata.state).map(d => ({ value: d, label: d }))} value={metadata.district} onChange={e => setMetadata({ ...metadata, district: e.target.value, tehsil: '', village: '' })} placeholder="Select District" />
            <Select label="Tehsil" options={tehsils.map(t => ({ value: t, label: t }))} value={metadata.tehsil} onChange={e => setMetadata({ ...metadata, tehsil: e.target.value, village: '' })} placeholder="Select Tehsil" />
            <Select label="Village" options={villages.map(v => ({ value: v, label: v }))} value={metadata.village} onChange={e => setMetadata({ ...metadata, village: e.target.value })} placeholder="Select Village" />
            <Select label="Document Type" options={docTypeOptions} value={metadata.documentType} onChange={e => setMetadata({ ...metadata, documentType: e.target.value })} placeholder="Select Type" />
            <Input label="Record Year" value={metadata.recordYear} onChange={e => setMetadata({ ...metadata, recordYear: e.target.value })} placeholder="e.g. 2020" />
            <Input label="Source Department" value={metadata.sourceDepartment} onChange={e => setMetadata({ ...metadata, sourceDepartment: e.target.value })} placeholder="e.g. Tehsil Revenue Office" />
            <Input label="Description (Optional)" value={metadata.description} onChange={e => setMetadata({ ...metadata, description: e.target.value })} placeholder="Brief description" />
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="secondary" onClick={() => setStep('upload')}>Back</Button>
            <Button onClick={startUpload} icon={<Cpu className="w-4 h-4" />}>Upload & Start AI Processing</Button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Processing Documents</h3>
          {files.map(f => (
            <div key={f.id} className="border border-border-default rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gov-blue" />
                  <span className="text-sm font-medium">{f.file.name}</span>
                </div>
                <StatusBadge status={f.status} />
              </div>
              <ProgressBar value={f.progress} />
              <p className="text-xs text-text-tertiary mt-1">
                {f.status === 'uploading' && 'Uploading document...'}
                {f.status === 'processing' && 'AI processing in progress...'}
                {f.status === 'complete' && 'Processing complete! Ready for review.'}
                {f.status === 'pending' && 'Waiting...'}
              </p>
            </div>
          ))}
          {files.every(f => f.status === 'complete') && (
            <div className="flex gap-3 mt-4">
              <Button onClick={() => navigate('/processing/doc-003')} icon={<ArrowRight className="w-4 h-4" />}>
                View Processing Results
              </Button>
              <Button variant="secondary" onClick={() => { setFiles([]); setStep('upload'); }}>Upload More</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
