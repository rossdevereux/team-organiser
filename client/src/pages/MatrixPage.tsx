import React, { lazy, Suspense } from 'react';
import { RefreshCw } from 'lucide-react';

const RotationMatrix = lazy(() =>
  import('../components/RotationMatrix').then((m) => ({ default: m.RotationMatrix }))
);

export const MatrixPage: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="p-12 rounded-3xl bg-slate-900/30 border border-slate-800/80 flex flex-col items-center justify-center space-y-3 min-h-[360px] animate-pulse">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <RefreshCw className="w-5 h-5 animate-spin" />
          </div>
          <p className="text-xs font-semibold text-slate-400 tracking-wide">
            Loading Rotation Matrix...
          </p>
        </div>
      }
    >
      <RotationMatrix />
    </Suspense>
  );
};
