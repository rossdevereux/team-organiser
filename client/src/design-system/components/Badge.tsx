import React from 'react';
import { getPositionToken, resolveBroadPosition } from '../tokens';
import { ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';

export type BadgeVariant =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'kit'
  | 'tactical';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-slate-800/80 text-slate-300 border-slate-700',
  primary: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  danger: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  kit: 'bg-[var(--kit-primary)] text-[var(--kit-primary-contrast)] border-white/20',
  tactical: 'bg-emerald-950 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  dot = false,
  icon,
  className = '',
  children,
  ...props
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border tracking-wide uppercase font-mono ${
        variantStyles[variant]
      } ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            variant === 'success'
              ? 'bg-emerald-400'
              : variant === 'warning'
              ? 'bg-amber-400'
              : variant === 'danger'
              ? 'bg-rose-400'
              : variant === 'kit'
              ? 'bg-[var(--kit-secondary)]'
              : 'bg-slate-400'
          }`}
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

export interface PositionBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  position: string;
  size?: 'sm' | 'md' | 'lg';
  showCategory?: boolean;
}

export const PositionBadge: React.FC<PositionBadgeProps> = ({
  position,
  size = 'md',
  showCategory = false,
  className = '',
  ...props
}) => {
  const token = getPositionToken(position);
  const category = resolveBroadPosition(position);

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-lg border font-mono tracking-wider ring-1 ring-black/20 backdrop-blur-sm shadow-xs ${
        token.badgeBg
      } ${token.badgeBorder} ${token.badgeText} ${
        size === 'sm'
          ? 'px-1.5 py-0.5 text-[10px]'
          : size === 'lg'
          ? 'px-3 py-1.5 text-sm'
          : 'px-2 py-0.5 text-xs'
      } ${className}`}
      title={`${position} (${category})`}
      {...props}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: token.accent }} />
      <span>{position}</span>
      {showCategory && <span className="text-[10px] opacity-75 font-normal ml-0.5">({category})</span>}
    </span>
  );
};

export interface FairPlayBadgeProps {
  percentage: number;
  targetPercentage?: number;
  className?: string;
}

export const FairPlayBadge: React.FC<FairPlayBadgeProps> = ({
  percentage,
  targetPercentage = 50,
  className = '',
}) => {
  const isMet = percentage >= targetPercentage;
  const isWarning = percentage >= targetPercentage - 10 && percentage < targetPercentage;

  if (isMet) {
    return (
      <Badge variant="success" size="sm" icon={<ShieldCheck className="w-3 h-3" />} className={className}>
        {Math.round(percentage)}% Target Met
      </Badge>
    );
  }

  if (isWarning) {
    return (
      <Badge variant="warning" size="sm" icon={<AlertCircle className="w-3 h-3" />} className={className}>
        {Math.round(percentage)}% (Target {targetPercentage}%)
      </Badge>
    );
  }

  return (
    <Badge variant="danger" size="sm" icon={<AlertCircle className="w-3 h-3" />} className={className}>
      {Math.round(percentage)}% Under Target
    </Badge>
  );
};
