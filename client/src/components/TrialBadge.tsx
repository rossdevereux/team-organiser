import React from 'react';
import { Clock, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useMatchday } from '../context/MatchdayContext';

interface TrialBadgeProps {
  onOpenPaywall?: () => void;
  className?: string;
}

export const TrialBadge: React.FC<TrialBadgeProps> = ({ onOpenPaywall, className = '' }) => {
  const { subscription, trialDaysRemaining, isSubscriptionActive, openPaywall } = useMatchday();

  // If user is not loaded yet or in pure offline mode without subscription info, don't display
  if (!subscription) {
    return null;
  }

  const handleOpen = () => {
    if (onOpenPaywall) {
      onOpenPaywall();
    } else {
      openPaywall();
    }
  };

  // Active paid subscriber presentation
  if (subscription.status === 'active') {
    const isAnnual = subscription.tier === 'coach_annual';
    return (
      <button
        type="button"
        onClick={handleOpen}
        className={`h-9 whitespace-nowrap shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition cursor-pointer shadow-sm group select-none ${className}`}
        title={`Active SubShuffle ${isAnnual ? 'Annual' : 'Monthly'} Subscription — Manage Plan`}
        data-testid="subscription-badge-active"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
        <span className="hidden md:inline font-mono text-[11px]">
          {isAnnual ? 'Coach Annual' : 'Coach Pro'}
        </span>
        <span className="md:hidden font-mono text-[11px]">Pro</span>
      </button>
    );
  }

  // Past due banner / badge
  if (subscription.status === 'past_due') {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className={`h-9 whitespace-nowrap shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold transition cursor-pointer shadow-sm animate-pulse select-none ${className}`}
        title="Payment failed: Please update your payment method to avoid losing write access"
        data-testid="subscription-badge-past-due"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>Payment Issue</span>
        <span className="hidden sm:inline opacity-80">• Update</span>
      </button>
    );
  }

  // Expired state presentation
  if (subscription.status === 'expired' || !isSubscriptionActive) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className={`h-9 whitespace-nowrap shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-bold transition cursor-pointer shadow-sm select-none group animate-pulse ${className}`}
        title="Trial expired: Upgrade now to continue creating fixtures and generating lineups"
        data-testid="subscription-badge-expired"
      >
        <Clock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <span className="truncate">Trial Expired</span>
        <span className="hidden sm:inline bg-rose-500/30 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider text-rose-200">
          Upgrade
        </span>
      </button>
    );
  }

  // Active Trialing presentation
  // Dynamic color coding based on days remaining:
  // Green: > 5 days left
  // Amber: <= 3 days left
  const isUrgent = trialDaysRemaining <= 3;
  const isWarning = trialDaysRemaining <= 5 && trialDaysRemaining > 3;

  const colorStyles = isUrgent
    ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-300'
    : isWarning
    ? 'bg-yellow-500/15 hover:bg-yellow-500/25 border-yellow-500/35 text-yellow-300'
    : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-300';

  const iconColor = isUrgent
    ? 'text-amber-400'
    : isWarning
    ? 'text-yellow-400'
    : 'text-emerald-400';

  return (
    <button
      type="button"
      onClick={handleOpen}
      className={`h-9 whitespace-nowrap shrink-0 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 rounded-xl border text-xs font-semibold transition cursor-pointer shadow-sm select-none group ${colorStyles} ${className}`}
      title={`${trialDaysRemaining} days remaining in your free trial — Click to upgrade`}
      data-testid="trial-badge"
    >
      <Clock className={`w-3.5 h-3.5 shrink-0 ${iconColor} group-hover:rotate-12 transition-transform`} />
      <span className="font-medium">
        {trialDaysRemaining === 1 ? '1 day left' : `${trialDaysRemaining} days left`}
      </span>
      <span className="hidden sm:inline opacity-60 text-slate-400">•</span>
      <span className="hidden sm:flex items-center gap-1 text-[11px] font-bold underline underline-offset-2 decoration-emerald-500/50 hover:decoration-emerald-400">
        <Sparkles className="w-3 h-3 text-emerald-400" />
        <span>Upgrade</span>
      </span>
    </button>
  );
};
