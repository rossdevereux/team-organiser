import React from 'react';

export type CardVariant = 'default' | 'subtle' | 'elevated' | 'tactical' | 'kit' | 'glass';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  interactive?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default:
    'bg-[var(--surface-card)] text-[var(--text-main)] border border-[var(--surface-border)] shadow-md',
  subtle:
    'bg-[var(--surface-card-subtle)] text-[var(--text-main)] border border-[var(--surface-border-subtle)]',
  elevated:
    'bg-[var(--surface-card)] text-[var(--text-main)] border border-[var(--surface-border)] shadow-xl',
  tactical:
    'bg-emerald-950/70 text-emerald-100 border border-emerald-500/30 shadow-lg shadow-emerald-950/40 backdrop-blur-md',
  kit: 'bg-slate-900/90 text-white border-2 border-[var(--kit-primary)] shadow-lg shadow-[var(--kit-primary)]/15',
  glass:
    'bg-slate-900/60 backdrop-blur-xl text-slate-100 border border-slate-800/80 shadow-2xl',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', interactive = false, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-2xl transition-all duration-200 overflow-hidden ${
          variantStyles[variant]
        } ${
          interactive
            ? 'hover:border-indigo-500/50 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
            : ''
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div
    className={`p-4 sm:p-5 border-b border-[var(--surface-border)] flex items-center justify-between gap-3 ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <h3 className={`text-base font-bold text-[var(--text-main)] tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <p className={`text-xs text-[var(--text-muted)] mt-0.5 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`p-4 sm:p-5 space-y-3 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div
    className={`p-4 sm:p-5 border-t border-[var(--surface-border)] flex items-center justify-between gap-3 bg-black/10 ${className}`}
    {...props}
  >
    {children}
  </div>
);
