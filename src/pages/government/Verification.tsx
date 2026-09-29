// ==========================================
// BhoomiAI - Human-in-the-Loop Verification Workspace
// ==========================================

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, AlertTriangle, FileText, Search, ZoomIn, ZoomOut,
  Maximize, ShieldAlert, Cpu, Check, GitMerge, RotateCcw, Clock, Flag, Shield, ArrowRight, User
} from 'lucide-react';

// --- Review queue data ---
const INITIAL_QUEUE = [
  { id: 'LR-2026-892', owner: 'Rajendra Prasad', confidence: 68, status: 'Integrity Flagged', flag: 'low-conf', priority: 'High', date: '10 min ago' },
  { id: 'LR-2026-893', owner: 'Sunita Devi', confidence: 91, status: 'Pending Review', flag: 'normal', priority: 'Low', date: '15 min ago' },
  { id: 'LR-2026-894', owner: 'Vikram Singh', confidence: 75, status: 'Low Confidence', flag: 'low-conf', priority: 'Medium', date: '22 min ago' },
  { id: 'LR-2026-895', owner: 'Anita Kumari', confidence: 94, status: 'Pending Review', flag: 'normal', priority: 'Low', date: '1 hour ago' },
  { id: 'LR-2026-896', owner: 'Ramesh Patel', confidence: 82, status: 'Pending Review', flag: 'low-conf', priority: 'Medium', date: '2 hours ago' },
];

const MOCK_EXTRACTED_DATA = {
  'LR-2026-892': {
    khasra: { value: '142/3', conf: 96 },
    khata: { value: '88', conf: 92 },
    owner: { value: 'Rajendro Prsad', conf: 45, original: 'Rajendro Prsad' }, // Low conf
    area: { value: '3.2', conf: 98 },
    village: { value: 'Semrauta', conf: 89 },
    year: { value: '2021', conf: 95 }
  },
  'LR-2026-894': {
    khasra: { value: '11/1', conf: 62, original: '11/1' }, // Low conf
    khata: { value: '12', conf: 95 },
    owner: { value: 'Vikram Singh', conf: 91 },
    area: { value: '1.5', conf: 94 },
    village: { value: 'Amethi', conf: 96 },
    year: { value: '2023', conf: 98 }
  }
};

const DEFAULT_DATA = {
  khasra: { value: '100/1', conf: 95 },
  khata: { value: '45', conf: 92 },
  owner: { value: 'Sample Owner', conf: 90 },
  area: { value: '1.0', conf: 95 },
  village: { value: 'Sample Village', conf: 94 },
  year: { value: '2020', conf: 91 }
};

// --- Sub-components ---
const EditableField: React.FC<{
  label: string;
  fieldData: { value: string; conf: number; original?: string };
  onEdit: (val: string) => void;
  shouldFocus: boolean;
}> = ({ label, fieldData, onEdit, shouldFocus }) => {
  const isLowConf = fieldData.conf < 80;
  const isEdited = fieldData.original !== undefined && fieldData.value !== fieldData.original;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (shouldFocus && isLowConf && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [shouldFocus, isLowConf]);

  return (
    <div className={`p-4 rounded-xl border-2 transition-colors ${
      isLowConf && !isEdited ? 'border-red-400/50 bg-red-50' : 'border-border-default bg-white'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
          {label}
          {isLowConf && !isEdited && (
             <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
               <AlertTriangle className="w-3 h-3" /> AI Flag
             </span>
          )}
        </label>
        
        {/* Confidence Bar */}
        <div className="flex items-center gap-2">
           <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
             <div 
               className={`h-full ${fieldData.conf >= 90 ? 'bg-emerald-500' : fieldData.conf >= 80 ? 'bg-amber-500' : 'bg-red-500'}`} 
               style={{ width: `${fieldData.conf}%` }}
             />
           </div>
           <span className={`text-xs font-bold ${fieldData.conf >= 90 ? 'text-emerald-600' : fieldData.conf >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
             {fieldData.conf}%
           </span>
        </div>
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={fieldData.value}
          onChange={(e) => onEdit(e.target.value)}
          className={`w-full p-2.5 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 ${
            isLowConf && !isEdited ? 'border-red-300 focus:ring-red-200 text-red-900 bg-white' : 'border-gray-200 focus:ring-gov-blue/20 bg-gray-50'
          }`}
        />
      </div>

      {/* Audit Trail: Original vs Edited */}
      <AnimatePresence>
        {isEdited && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
            className="flex items-center gap-2 text-xs"
          >
            <span className="text-text-tertiary line-through decoration-red-400 decoration-2">
              {fieldData.original}
            </span>
            <ArrowRight className="w-3 h-3 text-text-tertiary" />
            <span className="text-gov-blue font-semibold flex items-center gap-1">
              <User className="w-3 h-3" /> Officer Correction
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


// --- Main Workspace Component ---
export const VerificationWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [queue, setQueue] = useState(INITIAL_QUEUE);
  const [zoom, setZoom] = useState(1);
  const [formData, setFormData] = useState<any>(null);
  
  const activeRecordId = id || (queue.length > 0 ? queue[0].id : null);
  const activeRecord = queue.find(q => q.id === activeRecordId);

  // Initialize form data when record changes
  useEffect(() => {
    if (activeRecordId) {
      const data = MOCK_EXTRACTED_DATA[activeRecordId as keyof typeof MOCK_EXTRACTED_DATA] || JSON.parse(JSON.stringify(DEFAULT_DATA));
      setFormData(data);
      setZoom(1);
    }
  }, [activeRecordId]);

  const handleEdit = (field: string, val: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: { ...prev[field], value: val }
    }));
  };

  const handleApprove = () => {
    if (!activeRecordId) return;
    
    // Animate removal from queue
    setQueue(prev => prev.filter(q => q.id !== activeRecordId));
    
    // Auto-select next
    const currentIndex = queue.findIndex(q => q.id === activeRecordId);
    const nextRecord = queue[currentIndex + 1] || queue[0];
    
    if (nextRecord && nextRecord.id !== activeRecordId) {
      setTimeout(() => navigate(`/verification/${nextRecord.id}`), 300);
    } else {
      setTimeout(() => navigate(`/verification`), 300);
    }
  };

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] animate-fade-in">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
        <h2 className="text-2xl font-bold text-text-primary">Queue Cleared!</h2>
        <p className="text-text-secondary mt-2">All pending records have been verified.</p>
        <button onClick={() => navigate('/dashboard')} className="mt-6 px-6 py-2 bg-gov-blue text-white rounded-lg font-semibold hover:bg-gov-blue-light transition-colors">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)] -m-6 bg-surface-secondary overflow-hidden animate-fade-in">
      
      {/* LEFT SIDEBAR: Queue List */}
      <div className="w-80 bg-white border-r border-border-default flex flex-col flex-shrink-0 z-10">
        <div className="p-4 border-b border-border-default bg-surface-secondary/50 flex items-center justify-between">
          <h2 className="font-bold text-text-primary flex items-center gap-2">
            <Clock className="w-5 h-5 text-gov-blue" />
            Review Queue
          </h2>
          <span className="bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full text-xs">
            {queue.length} Pending
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <AnimatePresence>
            {queue.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100, height: 0, margin: 0, padding: 0 }}
                onClick={() => navigate(`/verification/${item.id}`)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  activeRecordId === item.id 
                    ? 'border-gov-blue bg-gov-blue-50/50 shadow-sm' 
                    : 'border-transparent hover:bg-gray-50 hover:border-border-default'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`font-mono text-xs font-bold ${activeRecordId === item.id ? 'text-gov-blue' : 'text-text-primary'}`}>
                    {item.id}
                  </span>
                  <span className="text-[10px] text-text-tertiary">{item.date}</span>
                </div>
                <p className="text-sm font-semibold mb-2 truncate">{item.owner}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                    item.flag === 'low-conf' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {item.confidence}% Conf
                  </span>
                  {item.flag === 'low-conf' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold flex items-center gap-1">
                      <Flag className="w-3 h-3" /> Flagged
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <div className="h-14 border-b border-border-default bg-white flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-lg text-text-primary">{activeRecordId}</h2>
            <div className="h-4 w-px bg-border-strong" />
            <span className="text-sm text-text-secondary font-medium">Human-in-the-Loop Review</span>
          </div>
          
          {/* Decision Routing Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-secondary">Routing Category:</span>
            {activeRecord?.flag === 'low-conf' ? (
               <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-200 rounded-full shadow-sm text-red-700">
                 <ShieldAlert className="w-4 h-4" />
                 <span className="text-xs font-bold">Integrity / Low Confidence</span>
               </motion.div>
            ) : (
               <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700">
                 <Cpu className="w-4 h-4" />
                 <span className="text-xs font-bold">Standard Review</span>
               </div>
            )}
          </div>
        </div>

        {/* Split Pane */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* PAN 1: Document Viewer */}
          <div className="w-1/2 border-r border-border-default bg-gray-100 flex flex-col">
            <div className="p-2 border-b border-border-default bg-white flex justify-end gap-2 shadow-sm z-10">
              <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))} className="p-1.5 bg-gray-100 rounded hover:bg-gray-200 text-text-secondary"><ZoomIn className="w-4 h-4" /></button>
              <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} className="p-1.5 bg-gray-100 rounded hover:bg-gray-200 text-text-secondary"><ZoomOut className="w-4 h-4" /></button>
              <button onClick={() => setZoom(1)} className="p-1.5 bg-gray-100 rounded hover:bg-gray-200 text-text-secondary"><Maximize className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAACVJREFUKFNjZCASMDKgAhjR5f7//89AlowsRiUjSjWjzBgYGBgAC8wHAZ2n+r4AAAAASUVORK5CYII=')]">
               {/* Mock Document Image */}
               <motion.div 
                 drag dragConstraints={{ left: -300, right: 300, top: -300, bottom: 300 }}
                 animate={{ scale: zoom }}
                 className="bg-white shadow-2xl p-8 w-[400px] h-[550px] cursor-grab active:cursor-grabbing origin-center border border-gray-200 flex flex-col font-serif"
               >
                 <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
                   <h1 className="text-xl font-bold mb-1">GOVERNMENT OF UTTAR PRADESH</h1>
                   <h2 className="text-lg font-bold">RECORD OF RIGHTS (KHATAUNI)</h2>
                 </div>
                 
                 <div className="space-y-6 text-sm">
                   <div className="flex justify-between">
                     <span className="font-bold">Village:</span>
                     <span className="border-b border-dashed border-gray-400 flex-1 ml-2 text-center bg-yellow-100/30">Semrauta</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="font-bold">Tehsil:</span>
                     <span className="border-b border-dashed border-gray-400 flex-1 ml-2 text-center">Amethi</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="font-bold">Khasra Number:</span>
                     <span className="border-b border-dashed border-gray-400 flex-1 ml-2 text-center bg-yellow-100/30">{activeRecordId === 'LR-2026-894' ? '11/1' : '142/3'}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="font-bold">Owner Name:</span>
                     {/* Intentionally mispelled or blurry looking text to justify low confidence */}
                     <span className="border-b border-dashed border-gray-400 flex-1 ml-2 text-center italic opacity-80 bg-red-100/40">
                       {activeRecordId === 'LR-2026-892' ? 'Rajendro Prsad' : 'Vikram Singh'}
                     </span>
                   </div>
                   <div className="flex justify-between">
                     <span className="font-bold">Total Area (Ha):</span>
                     <span className="border-b border-dashed border-gray-400 flex-1 ml-2 text-center">3.2</span>
                   </div>
                 </div>
                 
                 <div className="mt-auto pt-8 border-t border-gray-400 text-center opacity-50">
                    <p>Digitally Scanned Copy</p>
                    <p className="font-mono text-xs mt-1">ID: {activeRecordId}</p>
                 </div>
               </motion.div>
            </div>
          </div>

          {/* PAN 2: Extracted Fields Form */}
          <div className="w-1/2 bg-white flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="mb-6 flex items-center justify-between p-4 rounded-lg bg-navy-50 border border-navy-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-ai-purple-50 flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-ai-purple" />
                  </div>
                  <div>
                    <h3 className="font-bold text-navy-900 text-sm">AI Extraction Complete</h3>
                    <p className="text-xs text-navy-600">Please verify flagged fields below.</p>
                  </div>
                </div>
              </div>

              {formData && (
                <div className="space-y-4 pb-20">
                  <EditableField label="Owner Name" fieldData={formData.owner} onEdit={(v) => handleEdit('owner', v)} shouldFocus={true} />
                  <EditableField label="Khasra Number" fieldData={formData.khasra} onEdit={(v) => handleEdit('khasra', v)} shouldFocus={false} />
                  <div className="grid grid-cols-2 gap-4">
                    <EditableField label="Khata Number" fieldData={formData.khata} onEdit={(v) => handleEdit('khata', v)} shouldFocus={false} />
                    <EditableField label="Total Area" fieldData={formData.area} onEdit={(v) => handleEdit('area', v)} shouldFocus={false} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <EditableField label="Village" fieldData={formData.village} onEdit={(v) => handleEdit('village', v)} shouldFocus={false} />
                    <EditableField label="Record Year" fieldData={formData.year} onEdit={(v) => handleEdit('year', v)} shouldFocus={false} />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-border-default bg-surface-primary shadow-[0_-10px_20px_rgba(0,0,0,0.03)] flex items-center justify-between">
              <button className="px-4 py-2 text-sm font-semibold text-error hover:bg-error-bg rounded-lg transition-colors flex items-center gap-2">
                <XCircle className="w-4 h-4" /> Reject Document
              </button>
              
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 text-sm font-semibold text-text-secondary border border-border-strong hover:bg-surface-secondary rounded-lg transition-colors flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Request Re-scan
                </button>
                <button 
                  onClick={handleApprove}
                  className="px-6 py-2 text-sm font-bold text-white bg-gov-blue hover:bg-gov-blue-light shadow-lg hover:shadow-xl rounded-lg transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve & Route
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// Replace exports to unified Verification Workspace
export const VerificationQueue = VerificationWorkspace;
export const VerificationDetail = VerificationWorkspace;
