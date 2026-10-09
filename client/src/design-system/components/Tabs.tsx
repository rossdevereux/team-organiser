import React from 'react';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  size?: 'sm' | 'md' | 'touchline';
  className?: string;
}

export function Tabs<T extends string = string>({
  items,
  activeId,
  onChange,
  size = 'md',
  className = '',
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={`inline-flex items-center p-1 bg-[var(--surface-base)] border border-[var(--surface-border)] rounded-2xl gap-1 ${className}`}
    >
      {items.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 rounded-xl font-semibold transition-all cursor-pointer select-none ${
              size === 'touchline'
                ? 'min-h-[46px] px-5 text-sm'
                : size === 'sm'
                ? 'h-7 px-2.5 text-[11px]'
                : 'h-8 px-3.5 text-xs'
            } ${
              isActive
                ? 'bg-[var(--surface-card)] text-[var(--text-main)] shadow-sm border border-[var(--surface-border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-slate-800/40'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && <span className="ml-1">{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

export interface PeriodSelectorProps {
  periodCount: number;
  activePeriod: number;
  onChangePeriod: (period: number) => void;
  className?: string;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  periodCount,
  activePeriod,
  onChangePeriod,
  className = '',
}) => {
  const periods = Array.from({ length: periodCount }, (_, i) => i + 1);

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {periods.map((p) => {
        const isActive = p === activePeriod;
        const label =
          periodCount === 2
            ? p === 1
              ? '1st Half'
              : '2nd Half'
            : `Period ${p}`;

        return (
          <button
            key={p}
            onClick={() => onChangePeriod(p)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
              isActive
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20 ring-1 ring-white/20 scale-105'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};
