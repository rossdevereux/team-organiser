import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  isTouchline?: boolean;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  isTouchline = false,
  className = '',
}) => {
  return (
    <label
      className={`inline-flex items-center justify-between gap-3 select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
    >
      {(label || description) && (
        <div className="flex-1">
          {label && (
            <span className="block text-xs font-semibold text-[var(--text-main)]">
              {label}
            </span>
          )}
          {description && (
            <span className="block text-[11px] text-[var(--text-muted)]">
              {description}
            </span>
          )}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex shrink-0 transition-colors duration-200 ease-in-out rounded-full border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
          isTouchline ? 'w-14 h-8 p-0.5' : 'w-11 h-6 p-0.5'
        } ${checked ? 'bg-[var(--kit-primary)]' : 'bg-slate-700'}`}
      >
        <span
          className={`pointer-events-none inline-block rounded-full bg-white shadow-lg transform transition duration-200 ease-in-out ${
            isTouchline ? 'w-6 h-6' : 'w-4 h-4'
          } ${
            checked
              ? isTouchline
                ? 'translate-x-6'
                : 'translate-x-5'
              : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
};
