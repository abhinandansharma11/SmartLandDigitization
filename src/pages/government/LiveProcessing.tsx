import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity } from 'lucide-react';
import { CommandCenter } from './Dashboard';

const LiveProcessing: React.FC = () => {
  const navigate = useNavigate();

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
      <CommandCenter />
    </div>
  );
};

export default LiveProcessing;
