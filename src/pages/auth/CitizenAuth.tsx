// ==========================================
// BhoomiAI - Citizen Login + Register
// ==========================================

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { Button, Input } from '../../components/ui';
import { User, Phone, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export const CitizenLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const { citizenLogin, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await citizenLogin(email, password);
    if (success) navigate('/citizen');
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 animate-fade-in">
      <div className="card p-8">
        <div className="flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-gov-blue" />
          <h2 className="text-xl font-bold text-text-primary">Citizen Login</h2>
        </div>

        {error && (
          <div className="bg-error-bg border border-red-200 rounded-md p-3 mb-4">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Mobile / Email" value={email} onChange={e => setEmail(e.target.value)} icon={<Phone className="w-4 h-4" />} placeholder="Enter mobile or email" required />
          <div className="relative">
            <Input label="Password" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} icon={<Lock className="w-4 h-4" />} placeholder="Enter password" required />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-[38px] text-text-tertiary"><EyeOff className="w-4 h-4" /></button>
          </div>
          <div className="flex justify-between text-sm">
            <a href="#" className="text-gov-blue hover:underline">Login with OTP</a>
            <a href="#" className="text-gov-blue hover:underline">Forgot password?</a>
          </div>
          <Button type="submit" className="w-full" loading={isLoading}>Login</Button>
        </form>

        <p className="text-sm text-text-secondary text-center mt-4">
          Don't have an account? <Link to="/citizen/register" className="text-gov-blue hover:underline">Register here</Link>
        </p>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-xs font-medium text-amber-800">Demo: ram.kumar@email.com / citizen123</p>
        </div>

        <div className="mt-4 text-center">
          <Link to="/login" className="text-xs text-text-tertiary hover:text-gov-blue">Government Employee Login →</Link>
        </div>
      </div>
    </div>
  );
};

export const CitizenRegister: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', mobile: '', email: '', password: '', confirmPassword: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/citizen/login');
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 animate-fade-in">
      <div className="card p-8">
        <h2 className="text-xl font-bold text-text-primary mb-6">Citizen Registration</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} icon={<User className="w-4 h-4" />} required />
          <Input label="Mobile Number" value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} icon={<Phone className="w-4 h-4" />} required />
          <Input label="Email (Optional)" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} icon={<Mail className="w-4 h-4" />} />
          <Input label="Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} icon={<Lock className="w-4 h-4" />} required />
          <Input label="Confirm Password" type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} icon={<Lock className="w-4 h-4" />} required />
          <Button type="submit" className="w-full">Register</Button>
        </form>
        <p className="text-sm text-text-secondary text-center mt-4">
          Already registered? <Link to="/citizen/login" className="text-gov-blue hover:underline">Login here</Link>
        </p>
      </div>
    </div>
  );
};
