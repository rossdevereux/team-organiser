import React from 'react';
import { LucideIcon, Plus } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  variant?: 'roster' | 'fixtures' | 'bench' | 'custom';
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  variant = 'custom',
  title,
  description,
  action,
  secondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/80 via-slate-950/90 to-slate-950 p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-5 shadow-2xl backdrop-blur-md ${className}`}
    >
      {/* Background Subtle Tactical Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-5 pointer-events-none" />

      {/* Hero Illustration */}
      <div className="relative">
        <div className="absolute -inset-4 bg-gradient-to-r from-sky-500/20 via-emerald-500/20 to-indigo-500/20 rounded-full blur-xl opacity-60" />

        {variant === 'roster' && (
          <div className="relative w-20 h-20 rounded-3xl bg-slate-900 border-2 border-indigo-500/40 flex items-center justify-center shadow-xl shadow-indigo-500/20">
            <svg
              className="w-10 h-10 text-indigo-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center border-2 border-slate-900">
              0
            </span>
          </div>
        )}

        {variant === 'fixtures' && (
          <div className="relative w-20 h-20 rounded-3xl bg-slate-900 border-2 border-sky-500/40 flex items-center justify-center shadow-xl shadow-sky-500/20">
            <svg
              className="w-10 h-10 text-sky-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <circle cx="12" cy="16" r="2" />
            </svg>
            <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center border-2 border-slate-900">
              !
            </span>
          </div>
        )}

        {variant === 'bench' && (
          <div className="relative w-20 h-20 rounded-3xl bg-slate-900 border-2 border-emerald-500/40 flex items-center justify-center shadow-xl shadow-emerald-500/20">
            <svg
              className="w-10 h-10 text-emerald-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="3" width="20" height="18" rx="2" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 font-bold text-[10px] border border-emerald-500/40">
              100%
            </span>
          </div>
        )}

        {variant === 'custom' && Icon && (
          <div className="relative w-20 h-20 rounded-3xl bg-slate-900 border-2 border-slate-700 flex items-center justify-center shadow-xl">
            <Icon className="w-10 h-10 text-slate-300" />
          </div>
        )}
      </div>

      {/* Typography */}
      <div className="max-w-md space-y-2">
        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">{title}</h3>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{description}</p>
      </div>

      {/* Action Buttons */}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-600/25 transition cursor-pointer flex items-center gap-2"
            >
              {action.icon ? (
                <action.icon className="w-4 h-4 shrink-0" />
              ) : (
                <Plus className="w-4 h-4 shrink-0" />
              )}
              <span>{action.label}</span>
            </button>
          )}

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 font-semibold text-xs sm:text-sm transition cursor-pointer flex items-center gap-2"
            >
              {secondaryAction.icon && <secondaryAction.icon className="w-4 h-4 shrink-0" />}
              <span>{secondaryAction.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
