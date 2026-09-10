// ==========================================
// BhoomiAI - Government Login Page
// ==========================================

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { Button, Input } from '../../components/ui';
import { Shield, Mail, Lock, Key, Eye, EyeOff } from 'lucide-react';

const GovernmentLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await login(email, password);
    if (success) {
      const { mfaPending } = useAuthStore.getState();
      navigate(mfaPending ? '/mfa' : '/dashboard');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-5 h-5 text-gov-blue" />
        <h2 className="text-xl font-bold text-text-primary">Government Employee Login</h2>
      </div>
      <p className="text-sm text-text-secondary mb-6">
        Access the BhoomiAI internal portal. Government employees only.
      </p>

      {error && (
        <div className="bg-error-bg border border-red-200 rounded-md p-3 mb-4">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Official Email / Employee ID"
          placeholder="e.g. priya.mishra@amethi.gov.in or AMT-RO-001"
          value={email}
          onChange={e => setEmail(e.target.value)}
          icon={<Mail className="w-4 h-4" />}
          required
        />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4" />}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[38px] text-text-tertiary hover:text-text-secondary"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="rounded border-border-default" />
            Remember me
          </label>
          <a href="#" className="text-sm text-gov-blue hover:underline">Forgot password?</a>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={isLoading}>
          Sign In
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-border-default">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border-default rounded-md text-sm font-medium text-text-secondary hover:bg-surface-tertiary transition-colors">
          <Key className="w-4 h-4" />
          Sign in with Government SSO
        </button>
      </div>

      <div className="mt-6 text-center">
        <Link to="/citizen/login" className="text-sm text-gov-blue hover:underline">
          Looking for the Citizen Portal? →
        </Link>
      </div>

      {/* Demo credentials */}
      <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-md">
        <p className="text-xs font-semibold text-amber-800 mb-2">🎯 Demo Credentials (SIH Prototype)</p>
        <div className="text-xs text-amber-700 space-y-1">
          <p><span className="font-medium">Super Admin:</span> anita.sharma@gov.in / admin123</p>
          <p><span className="font-medium">Revenue Officer:</span> priya.mishra@amethi.gov.in / admin123</p>
          <p><span className="font-medium">Digitization Op:</span> suresh.yadav@amethi.gov.in / admin123</p>
        </div>
      </div>
    </div>
  );
};

export default GovernmentLogin;
