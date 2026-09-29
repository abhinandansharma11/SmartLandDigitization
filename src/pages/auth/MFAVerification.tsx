// ==========================================
// BhoomiAI - MFA Verification Page
// ==========================================

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../../components/ui';
import { ShieldCheck, RotateCcw } from 'lucide-react';

const MFAVerification: React.FC = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(120);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { verifyMFA, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    inputRefs.current[0]?.focus();
    const interval = setInterval(() => setTimer(t => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const otpStr = otp.join('');
    if (otpStr.length !== 6) return;
    const success = await verifyMFA(otpStr);
    if (success) navigate('/dashboard');
  };

  const mins = Math.floor(timer / 60);
  const secs = timer % 60;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck className="w-5 h-5 text-gov-blue" />
        <h2 className="text-xl font-bold text-text-primary">Two-Factor Authentication</h2>
      </div>
      <p className="text-sm text-text-secondary mb-6">
        Enter the 6-digit verification code sent to your registered device.
      </p>

      {error && (
        <div className="bg-error-bg border border-red-200 rounded-md p-3 mb-4">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex gap-3 justify-center">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className="w-12 h-14 text-center text-xl font-bold border border-border-default rounded-lg focus:outline-none focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/10"
            />
          ))}
        </div>

        <div className="text-center">
          <p className="text-sm text-text-tertiary">
            {timer > 0 ? `Code expires in ${mins}:${secs.toString().padStart(2, '0')}` : 'Code expired'}
          </p>
          {timer === 0 && (
            <button type="button" onClick={() => setTimer(120)} className="text-sm text-gov-blue hover:underline flex items-center gap-1 mx-auto mt-1">
              <RotateCcw className="w-3 h-3" /> Resend Code
            </button>
          )}
        </div>

        <Button type="submit" className="w-full" size="lg" loading={isLoading} disabled={otp.join('').length !== 6}>
          Verify & Continue
        </Button>
      </form>

    </div>
  );
};

export default MFAVerification;
