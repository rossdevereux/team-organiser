import React from 'react';
import { ArrowDown, ArrowUp, ArrowRight, Clock } from 'lucide-react';
import { SingleSubChange } from '../../types';
import { PositionBadge } from './Badge';

export interface SubPillProps {
  change: SingleSubChange;
  minute?: number;
  period?: number;
  className?: string;
}

export const SubPill: React.FC<SubPillProps> = ({
  change,
  minute,
  period,
  className = '',
}) => {
  return (
    <div
      className={`p-3 rounded-2xl bg-[var(--surface-base)] border border-[var(--surface-border)] flex items-center justify-between gap-3 text-xs shadow-sm transition-all hover:border-slate-700 ${className}`}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {/* Minute timestamp */}
        {minute !== undefined && (
          <span className="flex items-center gap-1 font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg shrink-0">
            <Clock className="w-3 h-3" />
            <span>{minute}'</span>
          </span>
        )}

        {/* Player Off */}
        <div className="flex items-center gap-1.5 truncate">
          <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0">
            <ArrowDown className="w-3 h-3" />
          </span>
          <span className="font-semibold text-slate-300 truncate max-w-[100px] sm:max-w-[130px]">
            {change.offPlayerName}
          </span>
        </div>

        {/* Swap Arrow */}
        <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />

        {/* Player On */}
        <div className="flex items-center gap-1.5 truncate">
          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <ArrowUp className="w-3 h-3" />
          </span>
          <span className="font-semibold text-white truncate max-w-[100px] sm:max-w-[130px]">
            {change.onPlayerName}
          </span>
        </div>
      </div>

      {/* Target Position */}
      <div className="shrink-0">
        <PositionBadge position={change.position} size="sm" />
      </div>
    </div>
  );
};
