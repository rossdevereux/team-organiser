import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Users,
  Calendar,
  Printer,
  MessageSquare,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Trophy,
  Play,
  Heart,
  RotateCcw,
  Calculator,
  FileText,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import type { User } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { AuthButton } from './AuthButton';
import { LanguageSelector } from './LanguageSelector';
import { AppVersion } from './AppVersion';
import { ReleaseNotesModal } from './ReleaseNotesModal';

interface LandingHeroProps {
  onStartDemo: () => void;
  onGoToApp?: () => void;
  onOpenPrivacy?: () => void;
  currentUser?: User | null;
  onSignInSuccess?: (user: User) => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onStartDemo,
  onGoToApp,
  onOpenPrivacy,
  currentUser,
  onSignInSuccess,
}) => {
  const { t } = useTranslation();
  const [changelogOpen, setChangelogOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950 font-sans overflow-x-hidden w-full">
      {/* Top Header / Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <div
            className="flex items-center gap-2.5 select-none cursor-pointer min-w-0 pr-2"
            onClick={currentUser && onGoToApp ? onGoToApp : onStartDemo}
          >
            <img
              src="/logo-icon.png"
              alt="SubShuffle Logo"
              className="w-9 h-9 object-contain drop-shadow-[0_4px_12px_rgba(16,185,129,0.35)] shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center font-extrabold text-lg tracking-tight">
                <span className="text-[#00e676] drop-shadow-[0_0_12px_rgba(0,230,118,0.35)]">Sub</span>
                <span className="text-white">Shuffle</span>
              </div>
              <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400 truncate">
                {t('nav.brandSubtitle')}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/calculator"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 transition"
            >
              <Calculator className="w-3.5 h-3.5 text-slate-400" />
              <span>Calculator</span>
            </Link>
            <Link
              to="/features"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              <span>Features</span>
            </Link>
            <Link
              to="/rules"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 transition"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>FA Rules</span>
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <LanguageSelector compact className="shrink-0" />
            {currentUser && onGoToApp ? (
              <button
                onClick={onGoToApp}
                className="hidden sm:flex min-h-[44px] px-3.5 sm:px-4 items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 transition cursor-pointer"
              >
                <span>{t('common.goToLineup')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onStartDemo}
                className="hidden sm:flex min-h-[44px] px-3.5 sm:px-4 items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700/80 hover:border-slate-600 text-xs font-semibold text-slate-200 transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                <span>{t('common.tryLiveDemo')}</span>
              </button>
            )}
            <AuthButton onSignInSuccess={onSignInSuccess} />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-slate-800/60">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-emerald-500/10 via-sky-500/15 to-indigo-600/10 blur-[100px] pointer-events-none rounded-full" />
        <div className="absolute top-1/2 right-10 w-96 h-96 bg-emerald-500/5 blur-[120px] pointer-events-none rounded-full" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-sm shadow-emerald-500/10">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{t('landing.badge')}</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1] max-w-4xl mx-auto">
            {t('landing.heroTitle')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400">
              {t('landing.heroTitleHighlight')}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            {t('landing.heroSubtitle')}
          </p>

          {/* Main Hero Call-to-Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
            {currentUser && onGoToApp ? (
              <button
                onClick={onGoToApp}
                className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{t('common.openLineup')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onStartDemo}
                className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>{t('landing.launchDemoPlanner')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <div className="w-full sm:w-auto">
              <AuthButton onSignInSuccess={onSignInSuccess} variant="hero" />
            </div>
          </div>

          {/* Quick Assurance Strip & Free Tool CTA */}
          <div className="pt-4 flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t('landing.freeForCoaches')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t('landing.worksOffline')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t('landing.noDownload')}</span>
              </div>
            </div>

            <Link
              to="/calculator"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 text-xs font-semibold transition group shadow-sm"
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-400" />
              <span>Free Tool: Calculate Fair Youth Substitutions &amp; Quarter Splits</span>
              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 text-emerald-400" />
            </Link>
          </div>

          {/* Interactive Preview Mockup Card */}
          <div className="pt-8 max-w-4xl mx-auto">
            <div className="relative rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl p-4 sm:p-6 backdrop-blur-xl overflow-hidden text-left">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="font-bold text-slate-300 ml-2">{t('landing.previewTitle')}</span>
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-mono">
                    The Rovers U11 vs Harrogate Town
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    {t('landing.equalTime')}
                  </span>
                  <button
                    onClick={currentUser && onGoToApp ? onGoToApp : onStartDemo}
                    className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{currentUser ? t('common.openLineup') : t('common.openApp')}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Sample Mini-Grid Lineup Teaser */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-slate-400 font-bold text-[11px]">
                    <span>{t('lineup.firstHalf').toUpperCase()}</span>
                    <span className="font-mono text-emerald-400">7 Active • 3 Subs</span>
                  </div>
                  <p className="text-slate-300 text-xs">
                    {t('landing.pillar1Desc')}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">GK Finley</span>
                    <span className="px-2 py-0.5 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-bold">DEF Noah</span>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">MID Jack</span>
                    <span className="px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-bold">ATT Leo</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-slate-400 font-bold text-[11px]">
                    <span>FAIR PLAY AUDIT</span>
                    <span className="font-mono text-sky-400">{t('lineup.targetGameTime', { target: 50 })}</span>
                  </div>
                  <p className="text-slate-300 text-xs">
                    Tracks minutes played across both halves. Highlights substitutes bench players for rotation in the second half.
                  </p>
                  <div className="space-y-1.5 pt-1 font-mono text-[11px]">
                    <div className="flex justify-between text-slate-300">
                      <span>Leo Davies</span>
                      <span className="text-emerald-400 font-bold">50m (100%)</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Jack Owen</span>
                      <span className="text-emerald-400 font-bold">50m (100%)</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Arthur Reed</span>
                      <span className="text-emerald-400 font-bold">50m (100%)</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-slate-400 font-bold text-[11px]">
                      <span>{t('landing.pillar3Title').toUpperCase()}</span>
                      <span className="text-[#25D366] font-bold">WhatsApp & PDF</span>
                    </div>
                    <p className="text-slate-300 text-xs mt-1">
                      {t('landing.pillar3Desc')}
                    </p>
                  </div>
                  <button
                    onClick={currentUser && onGoToApp ? onGoToApp : onStartDemo}
                    className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>{currentUser ? t('common.openLineup') : t('common.tryLiveDemo')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Core Pillars Section */}
      <section className="py-16 sm:py-20 border-b border-slate-800/60 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {t('landing.pillarsTitle')}
            </h2>
            <p className="text-slate-400 text-sm">
              {t('landing.pillarsSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">{t('landing.pillar1Title')}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('landing.pillar1Desc')}
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">{t('landing.pillar2Title')}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('landing.pillar2Desc')}
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">{t('landing.pillar3Title')}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('landing.pillar3Desc')}
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <Printer className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">{t('landing.pillar4Title')}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('landing.pillar4Desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cloud Sync vs Demo Comparison */}
      <section className="py-16 sm:py-20 border-b border-slate-800/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {t('landing.pricingTitle')}
            </h2>
            <p className="text-slate-400 text-sm">
              {t('landing.pricingSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
            {/* Demo / Guest Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-5">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                  Instant Sandbox
                </span>
                <h3 className="text-xl font-bold text-white mt-2">{t('landing.demoCardTitle')}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t('landing.demoCardSubtitle')}
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Full tactical pitch with drag & drop</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Auto-balance rotation algorithm</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>WhatsApp export & print match sheets</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Works 100% offline in browser</span>
                </li>
              </ul>

              <button
                onClick={onStartDemo}
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs border border-slate-700 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{t('landing.launchDemoPlanner')}</span>
              </button>
            </div>

            {/* Cloud Account Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-2 border-emerald-500/40 shadow-2xl shadow-emerald-500/10 space-y-5 relative">
              <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                {t('landing.recommended')}
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Google Cloud Sync
                </span>
                <h3 className="text-xl font-bold text-white mt-2">{t('landing.cloudCardTitle')}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t('landing.cloudCardSubtitle')}
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-200">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Everything in Demo Mode</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Save multiple youth squads & age groups</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Real-time sharing with co-coaches</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Cloud backup across all your devices</span>
                </li>
              </ul>

              <div className="pt-1">
                {currentUser && onGoToApp ? (
                  <button
                    onClick={onGoToApp}
                    className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{t('landing.openCloudWorkspace')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <AuthButton onSignInSuccess={onSignInSuccess} variant="card" />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-slate-950 text-slate-500 text-xs border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-300">SubShuffle</span>
            <span>•</span>
            <span>{t('nav.brandSubtitle')}</span>
            <span>•</span>
            <AppVersion onClick={() => setChangelogOpen(true)} />
          </div>

          <div className="flex items-center gap-4 text-slate-400 flex-wrap">
            <Link to="/calculator" className="hover:text-emerald-400 transition cursor-pointer">
              Calculator
            </Link>
            <Link to="/features" className="hover:text-emerald-400 transition cursor-pointer">
              Features
            </Link>
            <Link to="/rules" className="hover:text-emerald-400 transition cursor-pointer">
              FA Rules
            </Link>
            <button
              onClick={currentUser && onGoToApp ? onGoToApp : onStartDemo}
              className="hover:text-emerald-400 transition cursor-pointer"
            >
              {currentUser ? t('common.openLineup') : t('landing.interactiveDemo')}
            </button>
            {onOpenPrivacy && (
              <button
                onClick={onOpenPrivacy}
                className="hover:text-emerald-400 transition cursor-pointer flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('common.privacy')}</span>
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Changelog & Release Notes Modal */}
      <ReleaseNotesModal
        isOpen={changelogOpen}
        onClose={() => setChangelogOpen(false)}
      />
    </div>
  );
};
