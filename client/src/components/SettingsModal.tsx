import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchday } from '../context/MatchdayContext';
import { TeamSettings } from '../types';
import { getFormationsForTeamSize } from '../utils/formations';
import { Sliders, X, Check, Plus, CreditCard, Sparkles, ExternalLink, ShieldCheck, Clock, Zap } from 'lucide-react';
import { LanguageSelector } from './LanguageSelector';
import { getAuthToken } from '../firebase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCustomFormation?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenCustomFormation,
}) => {
  const { t } = useTranslation();
  const { settings, updateSettings, changeFormation, subscription, trialDaysRemaining, isSubscriptionActive, openPaywall } = useMatchday();

  const [activeModalTab, setActiveModalTab] = useState<'rules' | 'billing'>('rules');
  const [formData, setFormData] = useState<TeamSettings>(settings);
  const [loadingPortal, setLoadingPortal] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const availableFormations = getFormationsForTeamSize(
    formData.pitchPlayerCount,
    formData.customFormations || []
  );

  const handlePitchSizeChange = (size: number) => {
    const newFormations = getFormationsForTeamSize(size, formData.customFormations || []);
    const newDefaultFormation = newFormations[0]?.name || '2-3-1';

    let squadCap = formData.matchdaySquadCap;
    if (size === 5 && squadCap > 8) squadCap = 7;
    if (size === 7 && (squadCap < 8 || squadCap > 12)) squadCap = 10;
    if (size === 9 && squadCap < 11) squadCap = 12;
    if (size === 11 && squadCap < 13) squadCap = 14;

    setFormData({
      ...formData,
      pitchPlayerCount: size,
      matchdaySquadCap: squadCap,
      subCount: Math.max(2, squadCap - size),
      defaultFormation: newDefaultFormation,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formData);
    if (formData.defaultFormation !== settings.defaultFormation) {
      await changeFormation(formData.defaultFormation);
    }
    onClose();
  };

  const handleOpenStripePortal = async () => {
    setLoadingPortal(true);
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/billing/create-portal-session', {
        method: 'POST',
        headers,
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Failed to open billing portal:', err);
    } finally {
      setLoadingPortal(false);
    }
  };

  const isPro = subscription?.status === 'active';
  const isTrial = subscription?.status === 'trialing';
  const isExpired = subscription?.status === 'expired' || (!isSubscriptionActive && !isTrial && !isPro);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="SubShuffle" className="w-8 h-8 object-contain drop-shadow-md" />
            <div>
              <h3 className="text-base font-bold text-white">{t('settings.title')}</h3>
              <p className="text-xs text-slate-400">
                {t('nav.brandSubtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveModalTab('rules')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeModalTab === 'rules'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span>Match Rules</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveModalTab('billing')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeModalTab === 'billing'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            data-testid="billing-settings-tab"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            <span>Billing & Plan</span>
            {isPro && (
              <span className="text-[9px] px-1 rounded bg-emerald-500/30 text-emerald-200 font-mono">PRO</span>
            )}
          </button>
        </div>

        {activeModalTab === 'billing' ? (
          /* Billing & Plan Content */
          <div className="space-y-4 text-xs animate-in fade-in duration-150">
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Current Plan</div>
                  <div className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
                    <span>
                      {isPro
                        ? subscription?.tier === 'coach_annual'
                          ? 'Coach Annual Pro'
                          : 'Coach Monthly Pro'
                        : isTrial
                        ? '30-Day Free Trial'
                        : 'Free Trial Expired'}
                    </span>
                    {isPro ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                        ACTIVE
                      </span>
                    ) : isTrial ? (
                      <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-mono font-bold">
                        {trialDaysRemaining} DAYS LEFT
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold">
                        EXPIRED
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>

              {isTrial && subscription?.trialEndsAt && (
                <div className="text-slate-400 text-[11px] flex items-center gap-1.5 pt-1">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>
                    Trial valid until <strong>{new Date(subscription.trialEndsAt).toLocaleDateString()}</strong>.
                  </span>
                </div>
              )}

              {isPro && subscription?.currentPeriodEnd && (
                <div className="text-slate-400 text-[11px] flex items-center gap-1.5 pt-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Renews on <strong>{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</strong>.
                  </span>
                </div>
              )}
            </div>

            {/* Plan Action CTA */}
            <div className="space-y-2 pt-1">
              {!isPro ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openPaywall();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>{isExpired ? 'Upgrade to Continue Using SubShuffle Pro' : 'Upgrade Plan (£29.99/yr or £3.99/mo)'}</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      openPaywall();
                    }}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Change Plan</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenStripePortal}
                    disabled={loadingPortal}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                    <span>Manage in Stripe</span>
                  </button>
                </div>
              )}
            </div>

            {/* Feature Entitlements Summary */}
            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-2 text-[11px]">
              <div className="font-bold text-slate-300">Your Plan Entitlements:</div>
              <div className="space-y-1 text-slate-400">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Check className="w-3 h-3" />
                  <span>Unlimited match fixtures & teams</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Check className="w-3 h-3" />
                  <span>Automatic fair play minutes & rotation generator</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Check className="w-3 h-3" />
                  <span>Live pitchside stopwatch & sideline rotation alerts</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Check className="w-3 h-3" />
                  <span>Printable FA-format match sheet PDFs</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Match Rules & Formations Content */
          <>
            {/* Application Language Selector */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div>
                <label className="block text-slate-200 font-semibold text-xs">
                  {t('settings.languageLabel')}
                </label>
                <span className="text-[10px] text-slate-400">
                  English, Español, Français, Deutsch
                </span>
              </div>
              <LanguageSelector />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                {t('settings.pitchPlayers')}
              </label>
              <select
                value={formData.pitchPlayerCount}
                onChange={(e) => handlePitchSizeChange(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="5">5-a-side</option>
                <option value="7">7-a-side</option>
                <option value="9">9-a-side</option>
                <option value="11">11-a-side</option>
              </select>
              <span className="text-[10px] text-slate-500">Filters formations automatically</span>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                {t('settings.squadCap')}
              </label>
              <input
                type="number"
                min={formData.pitchPlayerCount}
                max={formData.pitchPlayerCount + 8}
                value={formData.matchdaySquadCap}
                onChange={(e) =>
                  setFormData({ ...formData, matchdaySquadCap: parseInt(e.target.value, 10) })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500">e.g. 10 matchday players</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                {t('settings.matchPeriods')}
              </label>
              <select
                value={formData.matchPeriodCount}
                onChange={(e) =>
                  setFormData({ ...formData, matchPeriodCount: parseInt(e.target.value, 10) })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="2">2 Periods (Halves) - Default</option>
                <option value="4">4 Periods (Quarters)</option>
                <option value="3">3 Periods (Thirds)</option>
              </select>
              <span className="text-[10px] text-slate-500">Halves default</span>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                {t('settings.periodDuration')}
              </label>
              <input
                type="number"
                step="0.5"
                min="5"
                max="45"
                value={formData.periodDurationMinutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    periodDurationMinutes: parseFloat(e.target.value),
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500">
                Total match: {formData.matchPeriodCount * formData.periodDurationMinutes} mins
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-semibold">{t('settings.defaultFormation')}</label>
              {onOpenCustomFormation && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCustomFormation();
                  }}
                  className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Custom Formation</span>
                </button>
              )}
            </div>
            <select
              value={formData.defaultFormation}
              onChange={(e) => setFormData({ ...formData, defaultFormation: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-indigo-500"
            >
              {availableFormations.map((f) => (
                <option key={f.id} value={f.name}>
                  {f.name} {f.isCustom ? '(Custom)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              {t('settings.targetGameTime')}
            </label>
            <input
              type="number"
              min="40"
              max="80"
              value={formData.targetGameTimePercent}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  targetGameTimePercent: parseInt(e.target.value, 10),
                })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-indigo-500"
            />
            <span className="text-[10px] text-slate-500">Youth fair play target (50% for 2 halves)</span>
          </div>

          {/* Club Kit Colours */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-slate-300 font-semibold">
                  Club Kit Colours (Design System)
                </label>
                <span className="text-[10px] text-slate-500">
                  Styles jersey icons, pitch tokens and club accents
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-5 h-5 rounded-full border border-white/40 shadow-sm"
                  style={{ backgroundColor: formData.kitPrimaryColor || '#1e3a8a' }}
                  title="Primary Kit"
                />
                <div
                  className="w-5 h-5 rounded-full border border-white/40 shadow-sm"
                  style={{ backgroundColor: formData.kitSecondaryColor || '#f59e0b' }}
                  title="Secondary Trim"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">{t('settings.kitPrimary')}</label>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                  <input
                    type="color"
                    value={formData.kitPrimaryColor || '#1e3a8a'}
                    onChange={(e) =>
                      setFormData({ ...formData, kitPrimaryColor: e.target.value })
                    }
                    className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-slate-300 text-[11px]">
                    {formData.kitPrimaryColor || '#1e3a8a'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">{t('settings.kitSecondary')}</label>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                  <input
                    type="color"
                    value={formData.kitSecondaryColor || '#f59e0b'}
                    onChange={(e) =>
                      setFormData({ ...formData, kitSecondaryColor: e.target.value })
                    }
                    className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-slate-300 text-[11px]">
                    {formData.kitSecondaryColor || '#f59e0b'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Kit Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { name: 'Royal/Gold', p: '#1e3a8a', s: '#f59e0b' },
                { name: 'Crimson/White', p: '#dc2626', s: '#ffffff' },
                { name: 'Sky/Navy', p: '#0284c7', s: '#0f172a' },
                { name: 'Emerald/Gold', p: '#059669', s: '#fbbf24' },
                { name: 'Onyx/Amber', p: '#18181b', s: '#f59e0b' },
              ].map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      kitPrimaryColor: preset.p,
                      kitSecondaryColor: preset.s,
                    })
                  }
                  className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/30"
                    style={{ backgroundColor: preset.p }}
                  />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/20 transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{t('common.save')}</span>
            </button>
          </div>
        </form>
      </>
    )}
      </div>
    </div>
  );
};
