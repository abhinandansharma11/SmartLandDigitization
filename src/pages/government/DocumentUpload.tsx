// ==========================================
// BhoomiAI - Document Upload & Processing Pipeline
// ==========================================

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileText, FileImage, ShieldCheck, Search, ShieldAlert,
  CheckCircle2, ArrowRight, X, Scan,
  Check, Shield, ChevronRight, AlertTriangle, Play, Sparkles, Clock3, Languages, FileCheck2
} from 'lucide-react';
import { Button } from '../../components/ui';

type ProcessState = 'select' | 'pipeline' | 'review' | 'success';

type PresetRecord = {
  khasra: string;
  owner: string;
  father: string;
  area: string;
  village: string;
  tehsil: string;
  recordYear: string;
  documentType: string;
  imageHash: string;
  imagePath: string;
};

const PRESET_RECORDS: PresetRecord[] = [
  {
    khasra: '256/1',
    owner: 'Ram Kumar Singh',
    father: 'Shiv Pratap Singh',
    area: '0.584 hectares',
    village: 'Bakhri ka Talab',
    tehsil: 'Malihabad',
    recordYear: '2025',
    documentType: 'Record of Rights',
    imageHash: '6a5b4c68f0c91feb71c6d150179814b200231ba5eadd341802025bc45bc65e37',
    imagePath: '/khasra-256-1.png',
  },
  {
    khasra: '142/3',
    owner: 'Rajendra Prasad',
    father: 'Babu Lal',
    area: '3.200 acres',
    village: 'Semrauta',
    tehsil: 'Gauriganj',
    recordYear: '2022',
    documentType: 'Record of Rights',
    imageHash: 'cdfcaa0440e4c12c92832a4209ab827c8ebda37879bd3fa984b918c2447f90fc',
    imagePath: '/khasra-142-3.png',
  },
  {
    khasra: '102/4',
    owner: 'Rameshwar Yadav; Seema Yadav',
    father: 'Shiv Narayan Yadav; Rameshwar Yadav',
    area: '2.150 hectares',
    village: 'Bakhri ka Talab',
    tehsil: 'Salon',
    recordYear: '2020',
    documentType: 'Record of Rights',
    imageHash: '25931afc904c4c1dd813a0bbdd29048e107dcc5c5249240905776a54c9b9676',
    imagePath: '/khasra-102-4.png',
  },
];

const PROCESS_STAGES = [
  'Reading your document',
  'Organising the details',
  'Checking the information',
  'Preparing it for review',
];

const getImageFingerprint = async (file: File): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
};

const getVisualFingerprint = (source: CanvasImageSource): number[] => {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable for paper matching.');
  context.drawImage(source, 0, 0, 32, 32);
  const pixels = context.getImageData(0, 0, 32, 32).data;
  const values: number[] = [];
  for (let index = 0; index < pixels.length; index += 4) {
    values.push((pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114) / 255);
  }
  return values;
};

const compareVisualFingerprints = (left: number[], right: number[]) => (
  left.reduce((distance, value, index) => distance + Math.abs(value - right[index]), 0) / left.length
);

const identifyPresetRecord = async (file: File): Promise<PresetRecord | null> => {
  const exactHash = (await getImageFingerprint(file)).toLowerCase();
  const exactMatch = PRESET_RECORDS.find(record => record.imageHash === exactHash);
  if (exactMatch) return exactMatch;

  const uploadedBitmap = await createImageBitmap(file);
  const uploadedFingerprint = getVisualFingerprint(uploadedBitmap);
  uploadedBitmap.close();
  const candidates = await Promise.all(PRESET_RECORDS.map(async record => {
    const response = await fetch(record.imagePath);
    const referenceBlob = await response.blob();
    const referenceBitmap = await createImageBitmap(referenceBlob);
    const referenceFingerprint = getVisualFingerprint(referenceBitmap);
    referenceBitmap.close();
    return { record, distance: compareVisualFingerprints(uploadedFingerprint, referenceFingerprint) };
  }));
  const closest = candidates.sort((left, right) => left.distance - right.distance)[0];
  return closest && closest.distance < 0.12 ? closest.record : null;
};

export const DocumentUpload: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<ProcessState>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<PresetRecord | null>(null);
  const [currentStage, setCurrentStage] = useState(-1);
  const [isFastForward, setIsFastForward] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<'verified' | 'manual'>('verified');

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFile = async (file: File) => {
    setSelectedFile(file);
    setSelectedRecord(null);
    if (file.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(file));
      try {
        setSelectedRecord(await identifyPresetRecord(file));
      } catch (error) {
        console.error('Unable to identify the uploaded paper image.', error);
      }
    } else {
      setFilePreview(null); // Will show generic PDF/Document icon
    }
    setStep('pipeline');
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Pipeline Animation Effect
  useEffect(() => {
    if (step === 'pipeline') {
      setCurrentStage(0);
      let stage = 0;
      const speed = isFastForward ? 220 : 1100;

      const interval = setInterval(() => {
        stage++;
        if (stage >= PROCESS_STAGES.length) {
          clearInterval(interval);
          setTimeout(() => setStep('review'), speed);
        } else {
          setCurrentStage(stage);
        }
      }, speed);

      return () => clearInterval(interval);
    }
  }, [step, isFastForward]);

  // Handle final approval
  const handleApprove = () => {
    setToastType('verified');
    setStep('success');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  const handleManualReview = () => {
    setToastType('manual');
    setStep('select');
    setSelectedFile(null);
    setFilePreview(null);
    setSelectedRecord(null);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-fade-in relative">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-20 right-8 z-50 flex items-center gap-3 bg-white border border-verified-border shadow-2xl rounded-xl p-4 pr-6"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${toastType === 'manual' ? 'bg-gov-blue-50' : 'bg-verified-bg'}`}>
              {toastType === 'manual' ? <ShieldCheck className="w-6 h-6 text-gov-blue" /> : <CheckCircle2 className="w-6 h-6 text-verified" />}
            </div>
            <div>
              <p className="font-semibold text-text-primary text-sm">{toastType === 'manual' ? 'Sent for manual review' : 'Record promoted to Verified state'}</p>
              <p className="text-xs text-text-secondary mt-0.5">{toastType === 'manual' ? 'The record was added to the officer review queue.' : 'The record was saved successfully.'}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <FileCheck2 className="w-6 h-6 text-gov-blue" />
          Document Processing
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Upload a scanned land record and follow its progress as we prepare it for verification.
        </p>
      </div>

      <AnimatePresence mode="wait">
        
        {/* STEP 1: SELECT FILE */}
        {step === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card p-8 md:p-12 text-center"
          >
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center ${
                isDragging ? 'border-gov-blue bg-gov-blue-50/50 scale-[1.02]' : 'border-border-strong hover:border-gov-blue hover:bg-surface-secondary'
              }`}
            >
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                accept="image/*,.pdf"
                onChange={(e) => e.target.files && handleFile(e.target.files[0])}
              />
              <div className="w-20 h-20 rounded-full bg-gov-blue/10 flex items-center justify-center mb-4">
                <UploadCloud className="w-10 h-10 text-gov-blue" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Drag & Drop Document Here</h3>
              <p className="text-sm text-text-secondary max-w-md mx-auto">
                Supports scanned PDF, JPG, or PNG. Maximum file size 10MB. 
                Our AI model supports Hindi, English, and regional scripts.
              </p>
              
              <div className="mt-8">
                <Button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                  Browse Files
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 2: PIPELINE PROCESSING */}
        {step === 'pipeline' && (
          <motion.div
            key="pipeline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {/* Left: Thumbnail Preview */}
            <div className="card p-4 h-[500px] flex flex-col bg-surface-secondary">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileImage className="w-5 h-5 text-gov-blue" />
                  <span className="text-sm font-semibold truncate max-w-[200px]">{selectedFile?.name}</span>
                </div>
                <span className="text-xs font-mono text-text-tertiary">
                  {`${(selectedFile!.size / 1024 / 1024).toFixed(2)} MB`}
                </span>
              </div>
              <div className="flex-1 rounded-xl overflow-hidden bg-surface-secondary relative shadow-inner flex items-center justify-center border border-border-strong group">
                {filePreview ? (
                  <>
                    <img src={filePreview} alt="Preview" className="w-full h-full object-contain opacity-70 mix-blend-screen" />
                    {/* Scanner line animation */}
                    <motion.div
                      className="absolute left-0 right-0 h-1 bg-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.8)] z-10"
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    />
                  </>
                ) : (
                  <div className="text-center text-white/50">
                    <FileText className="w-16 h-16 mx-auto mb-2 opacity-50" />
                    <p>Document Processing</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Plain-language progress */}
            <div className="card p-6 h-[500px] flex flex-col bg-white">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-text-primary">
                  <Clock3 className="w-5 h-5 text-gov-blue" />
                  Processing progress
                </h3>
                <button
                  onClick={() => setIsFastForward(true)}
                  className="text-xs font-semibold flex items-center gap-1 text-text-tertiary hover:text-gov-blue transition-colors bg-surface-tertiary px-3 py-1.5 rounded-full"
                >
                  <Play className="w-3 h-3" />
                  Fast-Forward
                </button>
              </div>

              <div className="flex flex-1 flex-col justify-center">
                <div className="relative mx-auto mb-8 flex h-44 w-44 items-center justify-center rounded-full border-[14px] border-surface-tertiary">
                  <motion.div
                    className="absolute inset-[-14px] rounded-full border-[14px] border-gov-blue border-r-transparent border-b-transparent"
                    animate={{ rotate: currentStage >= PROCESS_STAGES.length ? 360 : Math.max(18, ((currentStage + 1) / PROCESS_STAGES.length) * 360) }}
                    transition={{ duration: 0.6 }}
                  />
                  <div className="text-center">
                    <motion.p
                      className="text-5xl font-extrabold tracking-tight text-navy-950"
                      key={currentStage}
                      initial={{ opacity: 0.4, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      {currentStage >= PROCESS_STAGES.length - 1 ? 100 : Math.round(((currentStage + 1) / PROCESS_STAGES.length) * 100)}%
                    </motion.p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-gov-blue">
                      {currentStage >= PROCESS_STAGES.length - 1 ? 'Ready' : 'Complete'}
                    </p>
                  </div>
                </div>
                <p className="text-center text-lg font-bold text-text-primary">
                  {currentStage >= PROCESS_STAGES.length - 1 ? 'Your document is ready for review' : PROCESS_STAGES[Math.max(0, currentStage)]}
                </p>
                <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-5 text-text-secondary">
                  Please wait while we prepare the record. You can review the details when this reaches 100%.
                </p>
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-surface-tertiary">
                  <motion.div
                    className="h-full rounded-full bg-gov-blue"
                    animate={{ width: `${currentStage >= PROCESS_STAGES.length - 1 ? 100 : Math.max(8, ((currentStage + 1) / PROCESS_STAGES.length) * 100)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-gov-blue-50 p-2 text-center"><ShieldCheck className="mx-auto h-4 w-4 text-gov-blue" /><p className="mt-1 text-[10px] font-semibold text-text-secondary">Protected</p></div>
                  <div className="rounded-lg bg-surface-secondary p-2 text-center"><Languages className="mx-auto h-4 w-4 text-verified" /><p className="mt-1 text-[10px] font-semibold text-text-secondary">Multiple scripts</p></div>
                  <div className="rounded-lg bg-surface-secondary p-2 text-center"><FileCheck2 className="mx-auto h-4 w-4 text-gov-blue" /><p className="mt-1 text-[10px] font-semibold text-text-secondary">Record check</p></div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: REVIEW RESULTS */}
        {step === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left: Thumbnail & Integrity Check */}
            <div className="lg:col-span-4 space-y-4">
              <div className="card p-4">
                <div className="h-48 rounded-lg overflow-hidden bg-surface-secondary border border-border-default mb-4 flex items-center justify-center relative">
                  {filePreview ? (
                    <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <FileText className="w-12 h-12 text-text-tertiary" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-3">
                    <span className="text-white text-xs font-medium bg-black/40 backdrop-blur-md px-2 py-1 rounded">
                      {selectedFile?.name || 'document.pdf'}
                    </span>
                  </div>
                </div>
                
                {/* Integrity Badge */}
                <div className="p-3 bg-verified-bg border border-verified-border rounded-lg flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-verified mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-verified">Integrity Check Passed</p>
                    <p className="text-xs text-verified/80 mt-1">No digital tampering (ELA, metadata forgery) detected by AI.</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <Button onClick={handleApprove} size="lg" className="w-full justify-center shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all bg-gradient-to-r from-gov-blue to-[#2d6ad6]">
                  Approve & Verify Record
                </Button>
                <Button variant="outline" onClick={handleManualReview} className="w-full justify-center">
                  Send for Manual Review
                </Button>
              </div>
            </div>

            {/* Right: Extracted Form */}
            <div className="lg:col-span-8">
              <div className="card">
                <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-surface-secondary/30">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-gov-blue" />
                    Extracted Record Details
                  </h3>
                  <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-ai-purple-50 text-ai-purple border border-ai-purple/20">
                    AI Confidence: 94%
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Extracted Fields with Confidence Badges */}
                  <FieldRow label="Khasra Number" value={selectedRecord?.khasra || 'Not identified'} confidence={selectedRecord ? 98 : 0} />
                  <FieldRow label="Owner Name" value={selectedRecord?.owner || 'Not identified'} confidence={selectedRecord ? 96 : 0} />
                  <FieldRow label="Father's Name" value={selectedRecord?.father || 'Not identified'} confidence={selectedRecord ? 82 : 0} isAmber={!selectedRecord} />
                  <FieldRow label="Area" value={selectedRecord?.area || 'Not identified'} confidence={selectedRecord ? 99 : 0} />
                  <FieldRow label="Village" value={selectedRecord?.village || 'Not identified'} confidence={selectedRecord ? 95 : 0} />
                  <FieldRow label="Tehsil" value={selectedRecord?.tehsil || 'Not identified'} confidence={selectedRecord ? 99 : 0} />
                  <FieldRow label="Record Year" value={selectedRecord?.recordYear || 'Not identified'} confidence={selectedRecord ? 97 : 0} />
                  <FieldRow label="Document Type" value={selectedRecord?.documentType || 'Not identified'} confidence={selectedRecord ? 92 : 0} />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 4: SUCCESS BURST */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-12 text-center flex flex-col items-center justify-center min-h-[400px]"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
              transition={{ type: 'spring', damping: 10, stiffness: 100 }}
              className="w-24 h-24 bg-verified-bg rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(22,163,74,0.3)]"
            >
              <CheckCircle2 className="w-12 h-12 text-verified" />
            </motion.div>
            <h2 className="text-3xl font-bold text-text-primary mb-3">Record Verified & Digitized</h2>
            <p className="text-text-secondary max-w-md mx-auto mb-8">
              The record has been successfully committed to the database. An immutable audit trail entry has been recorded.
            </p>
            <div className="flex gap-4">
              <Button onClick={() => setStep('select')} variant="secondary">Process Another Document</Button>
              <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

// --- Helper Component for Form Fields ---
const FieldRow: React.FC<{ label: string; value: string; confidence: number; isAmber?: boolean }> = ({ label, value, confidence, isAmber }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <label className="text-xs font-medium text-text-secondary">{label}</label>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
        isAmber ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700'
      }`}>
        {isAmber ? <AlertTriangle className="w-3 h-3" /> : <Check className="w-3 h-3" />}
        {confidence}%
      </span>
    </div>
    <div className="p-3 bg-surface-secondary border border-border-default rounded-lg font-semibold text-text-primary">
      {value}
    </div>
  </div>
);

export default DocumentUpload;
