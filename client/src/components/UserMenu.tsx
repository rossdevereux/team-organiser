import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../firebase';
import { useMatchday } from '../context/MatchdayContext';
import { supportedLanguages, SupportedLanguageCode } from '../i18n';
import {
  User as UserIcon,
  Sliders,
  LogOut,
  LogIn,
  Globe,
  ChevronDown,
  Check,
  Shield,
  AlertCircle,
  CreditCard,
  BookOpen,
  Sparkles,
  LifeBuoy,
} from 'lucide-react';
import { AuthModal } from './auth/AuthModal';
import { useOnboarding } from './onboarding/OnboardingContext';

interface UserMenuProps {
  onOpenSettings: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onOpenSettings }) => {
  const navigate = useNavigate();
  const { currentUser, userRole, isOwner, isCoach, signOutUser, openPaywall, subscription } = useMatchday();
  const { replayOnboarding } = useOnboarding();
  const { t, i18n } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentLang =
    supportedLanguages.find((l) => i18n.language && i18n.language.startsWith(l.code)) ||
    supportedLanguages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSignIn = () => {
    setIsOpen(false);
    setAuthModalOpen(true);
  };

  const handleSignOut = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      await signOutUser();
      setIsOpen(false);
    } catch (err: unknown) {
      console.error('Sign-out failed:', err);
      setAuthError('Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLanguage = (code: SupportedLanguageCode) => {
    i18n.changeLanguage(code);
  };

  const roleLabel = isOwner
    ? 'Club Admin'
    : isCoach
    ? 'Team Coach'
    : currentUser
    ? 'Member'
    : 'Guest Coach';

  return (
    <div ref={menuRef} className="relative inline-block shrink-0">
      {/* Avatar Button Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[44px] min-w-[44px] h-10 px-2 sm:px-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 hover:border-sky-500/50 flex items-center gap-2 transition cursor-pointer shadow-sm group select-none"
        aria-label="User account, language, and settings menu"
        aria-expanded={isOpen}
        data-testid="user-menu-button"
      >
        {currentUser?.photoURL ? (
          <img
            src={currentUser.photoURL}
            alt={currentUser.displayName || 'User Avatar'}
            className="w-7 h-7 rounded-lg object-cover ring-1 ring-sky-500/40 shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs ring-1 ring-sky-500/30 shrink-0">
            {currentUser?.displayName ? (
              currentUser.displayName.charAt(0).toUpperCase()
            ) : (
              <UserIcon className="w-4 h-4" />
            )}
          </div>
        )}

        <div className="hidden lg:flex flex-col text-left">
          <span className="text-xs font-semibold text-slate-200 leading-tight truncate max-w-[110px]">
            {currentUser?.displayName || 'Guest Coach'}
          </span>
          <span className="text-[10px] text-slate-400 leading-tight font-mono">
            {currentLang.flag} {currentLang.code.toUpperCase()}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
          {/* User Profile Header */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 mb-2">
            <div className="flex items-center gap-3">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User Avatar'}
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-sky-500/30 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                  {currentUser?.displayName ? (
                    currentUser.displayName.charAt(0).toUpperCase()
                  ) : (
                    <UserIcon className="w-5 h-5" />
                  )}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">
                  {currentUser?.displayName || 'Guest Coach'}
                </div>
                <div className="text-[11px] text-slate-400 truncate font-mono">
                  {currentUser?.email || 'Local Sandbox Mode'}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5 text-indigo-400" />
                    <span>{roleLabel}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action 1: Team & League Settings */}
          <button
            type="button"
            onClick={() => {
              onOpenSettings();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition cursor-pointer min-h-[44px]"
            title="Team Settings & League Rules"
            data-testid="settings-menu-item"
          >
            <div className="w-7 h-7 rounded-lg bg-slate-800 text-sky-400 flex items-center justify-center shrink-0">
              <Sliders className="w-3.5 h-3.5" />
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-slate-200">Team & League Settings</div>
              <div className="text-[10px] text-slate-400">Rules, match duration & squad caps</div>
            </div>
          </button>

          {/* Action 2: Subscription & Billing */}
          <button
            type="button"
            onClick={() => {
              openPaywall();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition cursor-pointer min-h-[44px]"
            title="Subscription & Billing Management"
            data-testid="subscription-menu-item"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-slate-200 flex items-center justify-between">
                <span>Manage Subscription</span>
                {subscription?.status === 'active' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    PRO
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400">Plans, invoices & trial status</div>
            </div>
          </button>

          {/* Action 3: Coach User Guide */}
          <button
            type="button"
            onClick={() => {
              (navigate as any)({ to: '/guide', search: (prev: any) => prev });
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition cursor-pointer min-h-[44px]"
            title="Coach Handbook & Help Guide"
            data-testid="coach-guide-menu-item"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-slate-200">Coach User Guide</div>
              <div className="text-[10px] text-slate-400">Rules, walkthroughs & FA guidance</div>
            </div>
          </button>

          {/* Action 4: Replay Setup Wizard & Tour */}
          <button
            type="button"
            onClick={() => {
              replayOnboarding();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition cursor-pointer min-h-[44px]"
            title="Replay interactive setup wizard and product tour"
            data-testid="replay-onboarding-menu-item"
          >
            <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-slate-200">Replay Setup Wizard</div>
              <div className="text-[10px] text-slate-400">Step-by-step setup & guided tour</div>
            </div>
          </button>

          {/* Action 5: Help & Feedback (JSM Support Desk) */}
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('subshuffle:open-support'));
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition cursor-pointer min-h-[44px]"
            title="Report a bug, suggest a feature, or ask a question"
            data-testid="support-menu-item"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <LifeBuoy className="w-3.5 h-3.5" />
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-slate-200">Help &amp; Feedback</div>
              <div className="text-[10px] text-slate-400">Report a bug or suggest a feature</div>
            </div>
          </button>

          {/* Action 4: Language Selector */}
          <div className="px-3 py-2 rounded-xl bg-slate-950/40 border border-slate-800/60 my-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-2">
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>Language / Idioma</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                {currentLang.flag} {currentLang.code}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {supportedLanguages.map((lang) => {
                const isSelected = currentLang.code === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={`min-h-[38px] px-2 py-1 rounded-lg text-xs font-medium flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm">{lang.flag}</span>
                      <span className="truncate">{lang.name}</span>
                    </span>
                    {isSelected && <Check className="w-3 h-3 text-sky-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action 3: Auth (Sign In or Sign Out) */}
          <div className="pt-1 border-t border-slate-800/80 mt-1">
            {currentUser ? (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={loading}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-500/20 border border-rose-500/20 transition cursor-pointer min-h-[44px]"
                title="Sign out of Firebase"
                data-testid="sign-out-button"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                  <LogOut className="w-3.5 h-3.5" />
                </div>
                <div className="text-left flex-1">
                  <div>Sign Out</div>
                  <div className="text-[10px] text-rose-300/70">Disconnect your Google account</div>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={loading}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-sky-500/50 transition cursor-pointer min-h-[44px]"
                title="Sign in with Google"
                data-testid="sign-in-button"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <LogIn className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-white">Sign In</div>
                  <div className="text-[10px] text-slate-400">Email, Google, or Facebook</div>
                </div>
                <LogIn className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
            )}
          </div>

          {authError && (
            <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{authError}</span>
            </div>
          )}
        </div>
      )}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
};
