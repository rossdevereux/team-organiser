import React, { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, Calculator, FileText, Sparkles, Play, ShieldCheck, Menu, X, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMatchday } from '../context/MatchdayContext';
import { useToast } from '../context/ToastContext';
import { AuthButton } from './AuthButton';
import { LanguageSelector } from './LanguageSelector';

interface PublicNavProps {
  activePage?: 'home' | 'calculator' | 'features' | 'rules' | 'guide';
}

export const PublicNav: React.FC<PublicNavProps> = ({ activePage }) => {
  const { t } = useTranslation();
  const { currentUser, enterDemoMode } = useMatchday();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleStartDemo = () => {
    enterDemoMode();
    showToast('Entered Demo Mode with sample squad: The Rovers FC', 'info');
    navigate({ to: '/lineup', search: (prev) => prev });
  };

  const handleGoToApp = () => {
    navigate({ to: '/lineup', search: (prev) => prev });
  };

  const handleSignInSuccess = () => {
    showToast('Signed in successfully! Loading your club dashboard...', 'success');
    navigate({ to: '/lineup', search: (prev) => prev });
  };

  const navLinks = [
    { label: 'Calculator', href: '/calculator', id: 'calculator', icon: Calculator },
    { label: 'Features', href: '/features', id: 'features', icon: Sparkles },
    { label: 'FA Rules', href: '/rules', id: 'rules', icon: FileText },
    { label: 'Coach Guide', href: '/guide', id: 'guide', icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2.5 select-none cursor-pointer group"
        >
          <img
            src="/logo-icon.png"
            alt="SubShuffle Logo"
            className="w-9 h-9 object-contain drop-shadow-[0_4px_12px_rgba(16,185,129,0.35)] transition-transform group-hover:scale-105"
          />
          <div>
            <div className="flex items-center font-extrabold text-lg tracking-tight">
              <span className="text-[#00e676] drop-shadow-[0_0_12px_rgba(0,230,118,0.35)]">Sub</span>
              <span className="text-white">Shuffle</span>
            </div>
            <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400">
              {t('nav.brandSubtitle')}
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <Link
                key={item.id}
                to={item.href}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Action CTAs */}
        <div className="hidden sm:flex items-center gap-2 sm:gap-3">
          <LanguageSelector compact className="shrink-0" />
          {currentUser ? (
            <button
              onClick={handleGoToApp}
              className="min-h-[44px] px-3.5 sm:px-4 flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 transition cursor-pointer"
            >
              <span>{t('common.goToLineup')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleStartDemo}
              className="min-h-[44px] px-3.5 sm:px-4 flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700/80 hover:border-slate-600 text-xs font-semibold text-slate-200 transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
              <span>{t('common.tryLiveDemo')}</span>
            </button>
          )}
          <AuthButton onSignInSuccess={handleSignInSuccess} />
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-800 bg-slate-950/95 px-4 pt-3 pb-5 space-y-3">
          <nav className="flex flex-col gap-1.5">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold ${
                activePage === 'home' ? 'bg-emerald-500/15 text-emerald-400 font-bold' : 'text-slate-300'
              }`}
            >
              Home
            </Link>
            {navLinks.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  activePage === item.id ? 'bg-emerald-500/15 text-emerald-400 font-bold' : 'text-slate-300'
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
            {currentUser ? (
              <button
                onClick={handleGoToApp}
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <span>{t('common.goToLineup')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleStartDemo}
                className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                <span>{t('common.tryLiveDemo')}</span>
              </button>
            )}
            <div className="flex justify-between items-center pt-1">
              <LanguageSelector compact />
              <AuthButton onSignInSuccess={handleSignInSuccess} />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
