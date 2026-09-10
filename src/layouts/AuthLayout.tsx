// ==========================================
// BhoomiAI - Auth Layout
// ==========================================

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Cpu, Shield } from 'lucide-react';

export const AuthLayout: React.FC = () => (
  <div className="min-h-screen bg-surface-secondary flex">
    {/* Left panel - Branding */}
    <div className="hidden lg:flex lg:w-[480px] gov-gradient flex-col justify-between p-10">
      <div>
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">BhoomiAI</h1>
            <p className="text-white/50 text-xs">भूमि AI</p>
          </div>
        </div>
        <h2 className="text-3xl font-bold text-white leading-snug">
          Intelligent Land Record<br />
          Digitization & Validation
        </h2>
        <p className="text-white/70 mt-4 text-sm leading-relaxed">
          AI-powered system for digitizing, validating, and managing land records
          across India. Ensuring transparency, accuracy, and accessibility.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 text-white/60 text-xs">
          <Shield className="w-4 h-4" />
          <span>Secure Government Portal · Smart India Hackathon · PS 26018</span>
        </div>
        <div className="flex gap-3">
          {['OCR/HTR', 'AI Validation', 'GIS Integration', 'RBAC'].map(tag => (
            <span key={tag} className="text-xs text-white/40 bg-white/10 px-2 py-1 rounded">{tag}</span>
          ))}
        </div>
      </div>
    </div>

    {/* Right panel - Auth form */}
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-lg bg-navy-800 flex items-center justify-center">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy-900">BhoomiAI</h1>
            <p className="text-text-tertiary text-xs">Land Record System</p>
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  </div>
);
