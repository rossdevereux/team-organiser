import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  X,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  KeyRound,
  RotateCcw,
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  signInWithGoogle,
  signInWithFacebook,
  signInWithEmail,
  registerWithEmail,
  sendPasswordReset,
  formatAuthError,
  AuthErrorInfo,
} from '../../services/auth';

export type AuthModalTab = 'signin' | 'register' | 'forgot';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: FirebaseUser) => void;
  initialTab?: AuthModalTab;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'signin',
}) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<AuthModalTab>(initialTab);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<AuthErrorInfo | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setErrorInfo(null);
      setResetSent(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSocialSignIn = async (provider: 'google' | 'facebook') => {
    setErrorInfo(null);
    setLoading(true);
    try {
      const result = provider === 'google' ? await signInWithGoogle() : await signInWithFacebook();
      if (onSuccess) {
        onSuccess(result.user);
      }
      onClose();
    } catch (err: unknown) {
      console.error(`${provider} sign-in failed:`, err);
      setErrorInfo(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInfo(null);

    if (!email || !email.includes('@')) {
      setErrorInfo({ code: 'client/invalid-email', message: 'Please enter a valid email address.' });
      return;
    }

    if (tab === 'forgot') {
      setLoading(true);
      try {
        await sendPasswordReset(email);
        setResetSent(true);
      } catch (err: unknown) {
        console.error('Password reset failed:', err);
        setErrorInfo(formatAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password || password.length < 6) {
      setErrorInfo({ code: 'client/weak-password', message: 'Password must be at least 6 characters.' });
      return;
    }

    if (tab === 'register' && password !== confirmPassword) {
      setErrorInfo({ code: 'client/password-mismatch', message: 'Passwords do not match. Please re-enter.' });
      return;
    }

    setLoading(true);
    try {
      const result =
        tab === 'register'
          ? await registerWithEmail(email, password, displayName)
          : await signInWithEmail(email, password);

      if (onSuccess) {
        onSuccess(result.user);
      }
      onClose();
    } catch (err: unknown) {
      console.error('Email authentication failed:', err);
      setErrorInfo(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-6 md:p-8 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-[480px] sm:max-w-lg my-0 sm:my-auto rounded-t-3xl sm:rounded-3xl bg-slate-900/95 border border-slate-700/80 shadow-2xl shadow-black/80 overflow-hidden text-slate-100 font-sans max-h-[92dvh] sm:max-h-[92vh] flex flex-col">
        {/* Subtle Ambient Background Glow */}
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header Bar */}
        <div className="relative p-4 sm:p-6 pb-3 sm:pb-4 flex items-start justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0 pr-2">
            <img
              src="/logo-icon.png"
              alt="SubShuffle Logo"
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-[0_4px_12px_rgba(16,185,129,0.35)] shrink-0"
            />
            <div className="min-w-0">
              <h2 id="auth-modal-title" className="text-lg sm:text-2xl font-black tracking-tight text-white flex items-center gap-2 truncate">
                <span>
                  {tab === 'forgot'
                    ? t('auth.resetPasswordTitle')
                    : tab === 'register'
                    ? t('auth.createAccountTitle')
                    : t('auth.signInTitle')}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 leading-relaxed truncate">
                {tab === 'forgot'
                  ? t('auth.resetPasswordSubtitle')
                  : tab === 'register'
                  ? t('auth.createAccountSubtitle')
                  : t('auth.signInSubtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-750 transition cursor-pointer shrink-0 flex items-center justify-center ml-2"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-7 space-y-5 overflow-y-auto overscroll-contain flex-1 pb-10 sm:pb-7">
          {/* Error Banner */}
          {errorInfo && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs sm:text-sm flex items-start gap-3 shadow-lg shadow-rose-950/20">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p className="font-semibold leading-relaxed">{errorInfo.message}</p>
                {errorInfo.isCollision && (
                  <button
                    type="button"
                    onClick={() => handleSocialSignIn('google')}
                    className="mt-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-rose-500/50 text-white font-bold text-xs flex items-center gap-2 hover:bg-slate-800 transition cursor-pointer"
                  >
                    <span>Sign in with Google instead</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Password Reset Confirmation Banner */}
          {resetSent && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm flex items-start gap-3 shadow-lg shadow-emerald-950/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Password reset email dispatched!</p>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                  Check your inbox for instructions to set a new password. You can now return to the sign in screen.
                </p>
              </div>
            </div>
          )}

          {tab !== 'forgot' && (
            <>
              {/* Social Login Buttons */}
              <div className="space-y-3">
                {/* Google Sign In */}
                <button
                  type="button"
                  onClick={() => handleSocialSignIn('google')}
                  disabled={loading}
                  className="w-full min-h-[50px] px-4 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm sm:text-base shadow-sm flex items-center justify-center gap-3 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                  <span>{t('auth.continueWithGoogle')}</span>
                </button>

                {/* Facebook Sign In */}
                <button
                  type="button"
                  onClick={() => handleSocialSignIn('facebook')}
                  disabled={loading}
                  className="w-full min-h-[50px] px-4 py-3 rounded-2xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-sm sm:text-base shadow-sm flex items-center justify-center gap-3 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <svg className="w-5 h-5 fill-current shrink-0 text-white" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>{t('auth.continueWithFacebook')}</span>
                </button>
              </div>

              {/* Or Divider */}
              <div className="relative flex items-center justify-center my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700/80" />
                </div>
                <div className="relative px-3 bg-slate-900 text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t('auth.orWithEmail')}
                </div>
              </div>

              {/* Sign In vs Register Tabs */}
              <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs sm:text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setTab('signin');
                    setErrorInfo(null);
                  }}
                  className={`py-2.5 px-4 rounded-xl font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
                    tab === 'signin'
                      ? 'bg-slate-800 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t('common.signIn')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('register');
                    setErrorInfo(null);
                  }}
                  className={`py-2.5 px-4 rounded-xl font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
                    tab === 'register'
                      ? 'bg-slate-800 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{t('auth.createAccountTitle')}</span>
                </button>
              </div>
            </>
          )}

          {/* Email Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {tab === 'register' && (
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider">
                  {t('auth.coachName')} <span className="text-slate-400 font-normal normal-case">(optional)</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Coach David"
                    className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 text-sm sm:text-base text-white placeholder-slate-500 outline-none transition"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider">
                {t('auth.emailAddress')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="coach@example.com"
                  className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 text-sm sm:text-base text-white placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>

            {tab !== 'forgot' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider">
                    {t('auth.password')}
                  </label>
                  {tab === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setTab('forgot');
                        setErrorInfo(null);
                        setResetSent(false);
                      }}
                      className="text-xs sm:text-sm font-bold text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 text-sm sm:text-base text-white placeholder-slate-500 outline-none transition"
                  />
                </div>
              </div>
            )}

            {tab === 'register' && (
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider">
                  {t('auth.confirmPassword')}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 text-sm sm:text-base text-white placeholder-slate-500 outline-none transition"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[50px] py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2.5 transition active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : tab === 'forgot' ? (
                <>
                  <Mail className="w-5 h-5" />
                  <span>{t('auth.sendResetEmail')}</span>
                </>
              ) : tab === 'register' ? (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>{t('auth.createAccountTitle')}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>{t('common.signIn')}</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Mode Switcher for Forgot Password */}
          {tab === 'forgot' && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setTab('signin');
                  setErrorInfo(null);
                  setResetSent(false);
                }}
                className="text-sm font-semibold text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center gap-2 mx-auto"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t('auth.returnToSignIn')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
