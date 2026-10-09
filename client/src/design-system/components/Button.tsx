import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'kit'
  | 'kit-secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'tactical';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'touchline';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-[0.98]',
  secondary:
    'bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700/80 active:scale-[0.98]',
  kit: 'bg-[var(--kit-primary)] text-[var(--kit-primary-contrast)] hover:opacity-95 shadow-lg active:scale-[0.98] ring-1 ring-white/10',
  'kit-secondary':
    'bg-[var(--kit-secondary)] text-[var(--kit-secondary-contrast)] hover:opacity-95 shadow-md active:scale-[0.98]',
  outline:
    'bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white border border-[var(--surface-border)] active:scale-[0.98]',
  ghost:
    'bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-white active:scale-[0.98]',
  danger:
    'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 active:scale-[0.98]',
  tactical:
    'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 border border-emerald-400/30 active:scale-[0.98]',
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-[11px] rounded-lg gap-1.5',
  sm: 'h-8 px-3 text-xs rounded-xl gap-2',
  md: 'h-9 px-4 text-xs font-semibold rounded-xl gap-2',
  lg: 'h-11 px-5 text-sm font-bold rounded-2xl gap-2.5',
  touchline: 'min-h-[52px] h-[52px] px-6 text-base font-bold rounded-2xl gap-3 shadow-lg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center font-sans tracking-tight transition-all duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
          variantStyles[variant]
        } ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${
          isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
        } ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
