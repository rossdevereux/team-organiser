import React, { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';

interface UserMenuProps {
  onOpenSettings: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onOpenSettings }) => {
  const { currentUser, userRole, isOwner, isCoach, signOutUser } = useMatchday();
  const { t, i18n } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);
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

  const handleSignIn = async () => {
    setAuthError(null);
    setLoading(true);

    if (!isFirebaseConfigured()) {
      setAuthError('Firebase credentials not configured yet. Add VITE_FIREBASE_* keys to client/.env');
      setLoading(false);
      return;
    }

    try {
      await signInWithPopup(auth, googleProvider);
      setIsOpen(false);
    } catch (err: unknown) {
      console.error('Google Sign-In failed:', err);
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setAuthError(message);
    } finally {
      setLoading(false);
    }
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

          {/* Action 2: Language Selector */}
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
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-white">Sign In with Google</div>
                  <div className="text-[10px] text-slate-400">Sync rosters & coach permissions</div>
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
    </div>
  );
};
