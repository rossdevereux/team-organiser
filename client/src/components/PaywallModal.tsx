import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  Clock,
  ArrowRight,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { useMatchday } from '../context/MatchdayContext';
import { getAuthToken } from '../firebase';
import { trackPaywallViewed, trackTrialUpgradeClicked } from '../utils/analytics';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ isOpen, onClose }) => {
  const { subscription, trialDaysRemaining, isSubscriptionActive, refreshSubscription } = useMatchday();
  const [selectedPlan, setSelectedPlan] = useState<'coach_monthly' | 'coach_annual'>('coach_annual');
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      trackPaywallViewed({
        source: 'paywall_modal',
        daysRemaining: trialDaysRemaining ?? undefined,
        tier: subscription?.tier,
      });
    }
  }, [isOpen, trialDaysRemaining, subscription?.tier]);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    trackTrialUpgradeClicked({
      plan: selectedPlan === 'coach_annual' ? 'annual' : 'monthly',
      source: 'paywall_modal',
    });
    setLoadingCheckout(true);
    setErrorMessage(null);

    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        // Fallback for demo/dev session
        headers['x-user-id'] = 'dev-user-123';
        headers['x-user-role'] = 'coach';
        headers['Authorization'] = 'Bearer mock-dev-token';
      }

      const res = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          plan: selectedPlan,
          successUrl: `${window.location.origin}/lineup?billing=success`,
          cancelUrl: `${window.location.origin}/lineup?billing=canceled`,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Checkout failed (${res.status})`);
      }

      const data = await res.json();
      if (data.url) {
        if (data.simulated) {
          // In offline/dev simulated mode, activate subscription for smooth pairing experience
          await fetch('/api/billing/mock-activate', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              status: 'active',
              tier: selectedPlan,
            }),
          }).catch(() => {});
          await refreshSubscription();
          onClose();
        } else {
          // Redirect to live Stripe Checkout page
          window.location.href = data.url;
        }
      }
    } catch (err: any) {
      console.error('Stripe checkout trigger failed:', err);
      setErrorMessage(err.message || 'Unable to initialize checkout. Please try again.');
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handleOpenPortal = async () => {
    setLoadingPortal(true);
    setErrorMessage(null);

    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['x-user-id'] = 'dev-user-123';
        headers['Authorization'] = 'Bearer mock-dev-token';
      }

      const res = await fetch('/api/billing/create-portal-session', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/lineup`,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('Customer portal error:', err);
      setErrorMessage('Unable to open billing portal. Please try again.');
    } finally {
      setLoadingPortal(false);
    }
  };

  const isLifetime = subscription?.status === 'lifetime' || subscription?.tier === 'free_for_life';
  const isExpired = !isLifetime && (subscription?.status === 'expired' || (!isSubscriptionActive && subscription?.status !== 'past_due'));
  const isPastDue = !isLifetime && subscription?.status === 'past_due';
  const isActivePro = !isLifetime && subscription?.status === 'active';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      data-testid="paywall-modal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-5 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto no-scrollbar text-white"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          aria-label="Close paywall modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>SubShuffle Grassroots Cost Recovery</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {isLifetime
              ? 'Complimentary Free for Life Access'
              : isExpired
              ? 'Your 30-Day Free Trial Has Ended'
              : isPastDue
              ? 'Update Your Billing Information'
              : 'Support Grassroots Infrastructure'}
          </h2>

          <p className="text-sm text-slate-300 max-w-lg mx-auto">
            {isLifetime
              ? 'Your account has complimentary lifetime access with all features permanently unlocked.'
              : 'Priced strictly to cover our cloud server and hosting costs — £1.50/mo or £15/yr to keep grassroots rotations automated and stress-free.'}
          </p>

          {!isLifetime && !isExpired && !isActivePro && !isPastDue && trialDaysRemaining > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 mt-1">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>
                <strong>{trialDaysRemaining} days</strong> remaining in your free trial.
              </span>
            </div>
          )}
        </div>

        {/* Pricing Plan Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
          {/* Annual Plan (Best Value) */}
          <div
            onClick={() => setSelectedPlan('coach_annual')}
            className={`relative p-5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
              selectedPlan === 'coach_annual'
                ? 'border-emerald-500 bg-gradient-to-b from-emerald-500/15 to-slate-900 shadow-lg shadow-emerald-500/10'
                : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
            }`}
          >
            <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow">
              Best Value (£1.25/mo)
            </div>

            <div className="space-y-1">
              <div className="text-sm font-bold text-slate-200">Coach Annual</div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">£15.00</span>
                <span className="text-xs text-slate-400">/ year</span>
              </div>
              <div className="text-xs font-semibold text-emerald-400 font-mono">
                Only ~£1.25 / month
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-800/80">
              Covers your entire season and hosting costs for all team fixtures, automated fair play & PDF sheets.
            </p>
          </div>

          {/* Monthly Plan */}
          <div
            onClick={() => setSelectedPlan('coach_monthly')}
            className={`relative p-5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
              selectedPlan === 'coach_monthly'
                ? 'border-sky-500 bg-gradient-to-b from-sky-500/15 to-slate-900 shadow-lg shadow-sky-500/10'
                : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
            }`}
          >
            <div className="space-y-1">
              <div className="text-sm font-bold text-slate-200">Coach Monthly</div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">£1.50</span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Flexible cancel anytime
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-800/80">
              Month-to-month access to cover server and database infrastructure costs.
            </p>
          </div>
        </div>

        {/* Feature Checkmarks List */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            Everything You Get with Grassroots Pro:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-slate-200">Instant fair play auto-rotations</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-slate-200">Sideline live stopwatch & interval buzzers</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-slate-200">Dynamic sub rebalancing for injuries</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-slate-200">Official match sheet PDF downloads</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-slate-200">Season-wide equity & development stats</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-slate-200">WhatsApp squad announcement cards</span>
            </div>
          </div>
        </div>

        {/* Error message if checkout fails */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Call to Action Buttons */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={handleCheckout}
            disabled={loadingCheckout || isLifetime}
            className="w-full min-h-[48px] py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm transition cursor-pointer shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 group disabled:opacity-50"
            data-testid="upgrade-checkout-button"
          >
            {isLifetime ? (
              <>
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Complimentary Lifetime Access Active (Free for Life)</span>
              </>
            ) : loadingCheckout ? (
              <span>Connecting to Secure Stripe Checkout...</span>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-slate-950 group-hover:scale-110 transition-transform" />
                <span>
                  {selectedPlan === 'coach_annual'
                    ? 'Upgrade to Coach Annual (£15.00/yr)'
                    : 'Upgrade to Coach Monthly (£1.50/mo)'}
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          {subscription?.stripeCustomerId && (
            <button
              type="button"
              onClick={handleOpenPortal}
              disabled={loadingPortal}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Manage Existing Subscription in Stripe Customer Portal</span>
            </button>
          )}
        </div>

        {/* No Hostage Data Guarantee */}
        <div className="flex items-center justify-center gap-2 text-center text-[11px] text-slate-400 pt-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>No Hostage Data:</strong> You always retain full free access to view past match lineups, export rosters, and download historical match sheets.
          </span>
        </div>
      </div>
    </div>
  );
};
