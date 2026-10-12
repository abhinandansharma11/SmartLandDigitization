import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity } from 'lucide-react';
import { CommandCenter } from './Dashboard';
import { analyticsService } from '../../services';
import type { BSummary } from '../../services/backend';
import { useLiveInterval } from '../../hooks/useLiveUpdates';
import { ErrorState, LoadingState } from '../../components/ui';

const LiveProcessing: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<BSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => analyticsService.summary().then(s => { setSummary(s); setError(null); }).catch(e => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);
  useLiveInterval(load, 6000);

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-text-secondary transition hover:text-gov-blue"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </button>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gov-blue text-white shadow-sm">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Live processing details</h1>
              <p className="mt-1 text-sm text-text-secondary">A closer look at current record activity and system status.</p>
            </div>
          </div>
        </div>
      </div>
      {summary ? <CommandCenter summary={summary} /> : error ? <ErrorState message={error} onRetry={load} /> : <LoadingState message="Loading live pipeline..." />}
    </div>
  );
};

export default LiveProcessing;
