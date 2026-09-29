import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { Activity, ArrowRight, Building2, Check, CircleDot, FileScan, Fingerprint, Loader2, LockKeyhole, Map, Network, ShieldCheck } from 'lucide-react';
import { MOCK_USERS } from '../../data/mock-users';
import { ROLE_LABELS, UserRole } from '../../types/auth';

const SSO_STEPS = [
  ['Connecting to Government Identity Provider', 'OIDC discovery · secure redirect'],
  ['Verifying institutional identity', 'X.509 certificate + department claim'],
  ['Establishing officer session', 'JWT exchange · jurisdiction policy loaded'],
  ['Access granted', 'Revenue Department workspace ready'],
];

const GOVERNMENT_PROFILES = MOCK_USERS.filter(user => user.role !== UserRole.CITIZEN);

const GovernmentLogin: React.FC = () => {
  const [authenticating, setAuthenticating] = useState(false);
  const [step, setStep] = useState(-1);
  const [selectedUserId, setSelectedUserId] = useState('usr-003');
  const navigate = useNavigate();
  const { switchRole } = useAuthStore();

  const runSSO = useCallback(async (userId = 'usr-003') => {
    setAuthenticating(true);
    for (let index = 0; index < SSO_STEPS.length; index += 1) {
      setStep(index);
      await new Promise(resolve => setTimeout(resolve, index === 0 ? 650 : 520));
    }
    switchRole(userId);
    await new Promise(resolve => setTimeout(resolve, 500));
    navigate('/dashboard');
  }, [navigate, switchRole]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !authenticating) runSSO();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [authenticating, runSSO]);

  return (
    <div className="auth-reference relative animate-fade-in-up">
      <div className="mb-8 flex items-center gap-4">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-gov-blue/25 bg-gov-blue text-white shadow-[0_10px_24px_rgba(37,131,238,0.22)]"><Network className="h-7 w-7" /><span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-saffron-500 shadow-[0_0_10px_#ffe20a]" /></div>
        <div><p className="text-2xl font-bold tracking-tight text-navy-950">BhoomiAI</p><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-navy-700/70">Revenue Infrastructure</p></div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-navy-950/10 bg-white/95 shadow-[0_28px_70px_-25px_rgba(36,43,47,0.38)] backdrop-blur-2xl">
        <div className="border-b border-navy-950/10 px-9 pb-8 pt-9">
          <div className="mb-6 flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gov-blue"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gov-blue" /> Secure officer access</div><div className="flex items-center gap-1.5 text-[10px] text-navy-700/60"><LockKeyhole className="h-3 w-3" /> OIDC / SSO</div></div>
          <h1 className="max-w-sm text-[29px] font-semibold leading-[1.1] tracking-[-0.03em] text-navy-950">Intelligent land records, made verifiable.</h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-text-secondary">Secure access for authorized Revenue Department officials managing digitization, validation and GIS-linked records.</p>
        </div>

        {!authenticating ? <div className="space-y-4 px-9 py-9">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-navy-700/70">Choose officer profile</span>
            <select
              value={selectedUserId}
              onChange={event => setSelectedUserId(event.target.value)}
              className="w-full rounded-xl border border-navy-950/15 bg-white px-4 py-3 text-sm font-semibold text-navy-950 shadow-sm outline-none transition focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/15"
            >
              {GOVERNMENT_PROFILES.map(profile => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} · {ROLE_LABELS[profile.role]}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-[11px] text-navy-700/55">The selected department profile determines the dashboard permissions.</span>
          </label>
          <button onClick={() => runSSO(selectedUserId)} className="group relative flex w-full items-center justify-between overflow-hidden rounded-xl bg-gov-blue px-5 py-4 text-sm font-bold text-white shadow-[0_12px_30px_rgba(37,131,238,0.25)] transition hover:-translate-y-0.5 hover:bg-gov-blue-dark hover:shadow-[0_16px_36px_rgba(37,131,238,0.32)]"><span className="absolute inset-0 -translate-x-full bg-white/15 transition-transform duration-700 group-hover:translate-x-full" /><span className="relative flex items-center gap-2"><Building2 className="h-4 w-4" /> Continue with Government SSO</span><ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-1" /></button>
          <div className="flex items-center border-t border-navy-950/10 pt-4 text-[10px] text-navy-700/70"><span className="flex items-center gap-1.5 font-bold text-navy-950"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Institutional identity only</span></div>
        </div> : <div className="px-9 py-9">
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-gov-blue/15 bg-gov-blue/5 p-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gov-blue/10 text-gov-blue"><Fingerprint className="h-4 w-4" /></div><div><p className="text-sm font-medium text-navy-950">Government Identity Provider</p><p className="text-[11px] text-navy-700/55">Revenue Department · encrypted session</p></div></div>
          <div className="space-y-0">{SSO_STEPS.map(([label, detail], index) => { const complete = step > index; const active = step === index; return <div key={label} className="flex gap-3"><div className="flex flex-col items-center"><div className={`flex h-7 w-7 items-center justify-center rounded-full border ${complete || active ? 'border-gov-blue/60 bg-gov-blue/10' : 'border-navy-950/10'}`}>{complete ? <Check className="h-3.5 w-3.5 text-gov-blue" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin text-gov-blue" /> : <CircleDot className="h-3 w-3 text-navy-700/25" />}</div>{index < SSO_STEPS.length - 1 && <div className={`min-h-7 w-px ${complete ? 'bg-gov-blue/30' : 'bg-navy-950/10'}`} />}</div><div className="pb-4"><p className={`text-sm ${complete || active ? 'text-navy-950' : 'text-navy-700/35'}`}>{label}</p><p className={`mt-0.5 text-[10px] font-mono ${complete || active ? 'text-navy-700/55' : 'text-navy-700/25'}`}>{detail}</p></div></div>; })}</div>
          <div className="h-1 overflow-hidden rounded-full bg-navy-950/10"><div className="h-full rounded-full bg-gov-blue transition-all duration-500" style={{ width: `${Math.max(8, ((step + 1) / SSO_STEPS.length) * 100)}%` }} /></div>
        </div>}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[10px] font-semibold text-navy-950/80"><span className="flex flex-col items-center gap-1.5"><FileScan className="h-4 w-4 text-gov-blue" /> AI extraction</span><span className="flex flex-col items-center gap-1.5"><Map className="h-4 w-4 text-navy-950" /> GIS linked</span><span className="flex flex-col items-center gap-1.5"><Activity className="h-4 w-4 text-emerald-600" /> Audit ready</span></div>

    </div>
  );
};

export default GovernmentLogin;
