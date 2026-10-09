import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isTouchline?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      isTouchline = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-[var(--text-muted)] tracking-wide"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 pointer-events-none text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full bg-[var(--surface-base)] text-[var(--text-main)] border rounded-xl font-medium transition placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
              leftIcon ? 'pl-9' : 'pl-3'
            } ${rightIcon ? 'pr-9' : 'pr-3'} ${
              isTouchline ? 'h-[52px] text-base py-3' : 'h-10 text-xs py-2'
            } ${
              error
                ? 'border-rose-500 focus:border-rose-500'
                : 'border-[var(--surface-border)] focus:border-indigo-500'
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 pointer-events-none text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-[11px] text-rose-400 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-[var(--text-subtle)]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  isTouchline?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, helperText, error, isTouchline = false, className = '', id, children, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-[var(--text-muted)] tracking-wide"
          >
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`w-full bg-[var(--surface-base)] text-[var(--text-main)] border rounded-xl font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500/50 px-3 cursor-pointer ${
            isTouchline ? 'h-[52px] text-base py-3' : 'h-10 text-xs py-2'
          } ${
            error
              ? 'border-rose-500 focus:border-rose-500'
              : 'border-[var(--surface-border)] focus:border-indigo-500'
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        {error ? (
          <p className="text-[11px] text-rose-400 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-[var(--text-subtle)]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Select.displayName = 'Select';
