import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useUIStore } from '../store/ui.store';

export const Toaster: React.FC = () => {
  const { toasts, dismissToast } = useUIStore();
  return (
    <div className="fixed top-20 right-8 z-[60] flex flex-col gap-2" role="status" aria-live="polite">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id} layout initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`flex max-w-sm items-start gap-3 rounded-xl border bg-white p-4 pr-3 shadow-2xl ${t.kind === 'error' ? 'border-red-200' : t.kind === 'info' ? 'border-blue-200' : 'border-verified-border'}`}>
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${t.kind === 'error' ? 'bg-red-50' : t.kind === 'info' ? 'bg-gov-blue-50' : 'bg-verified-bg'}`}>
              {t.kind === 'error' ? <AlertTriangle className="h-5 w-5 text-error" /> : t.kind === 'info' ? <Info className="h-5 w-5 text-gov-blue" /> : <CheckCircle2 className="h-6 w-6 text-verified" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">{t.title}</p>
              {t.body && <p className="mt-0.5 text-xs text-text-secondary">{t.body}</p>}
            </div>
            <button aria-label="Dismiss" onClick={() => dismissToast(t.id)} className="p-1 text-text-tertiary hover:text-text-primary"><X className="h-4 w-4" /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
