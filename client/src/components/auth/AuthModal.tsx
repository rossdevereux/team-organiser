import React, { useState, useEffect } from 'react';
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
    }
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="relative w-full max-w-md my-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-slate-100 font-sans">
        {/* Subtle Ambient Background Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Bar */}
        <div className="relative p-6 pb-4 flex items-start justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <img
              src="/logo-icon.png"
              alt="SubShuffle Logo"
              className="w-10 h-10 object-contain drop-shadow-[0_4px_12px_rgba(16,185,129,0.3)] shrink-0"
            />
            <div>
              <h2 id="auth-modal-title" className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                <span>
                  {tab === 'forgot'
                    ? 'Reset Password'
                    : tab === 'register'
                    ? 'Create Coach Account'
                    : 'Sign In to SubShuffle'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {tab === 'forgot'
                  ? 'We will send a password reset link to your email.'
                  : tab === 'register'
                  ? 'Get started free with cloud squad backup & sharing.'
                  : 'Sync youth lineups and match rotations across devices.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Error Banner */}
          {errorInfo && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <p className="font-semibold leading-relaxed">{errorInfo.message}</p>
                {errorInfo.isCollision && (
                  <button
                    type="button"
                    onClick={() => handleSocialSignIn('google')}
                    className="mt-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-rose-500/40 text-white font-bold text-[11px] flex items-center gap-1.5 hover:bg-slate-800 transition cursor-pointer"
                  >
                    <span>Sign in with Google instead</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Password Reset Confirmation Banner */}
          {resetSent && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Password reset email dispatched!</p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Check your inbox for instructions to set a new password.
                </p>
              </div>
            </div>
          )}

          {tab !== 'forgot' && (
            <>
              {/* Social Login Buttons */}
              <div className="space-y-2.5">
                {/* Google Sign In */}
                <button
                  type="button"
                  onClick={() => handleSocialSignIn('google')}
                  disabled={loading}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-700/80 hover:border-slate-600 text-xs font-bold text-white shadow-sm flex items-center justify-center gap-3 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                  <span>Continue with Google</span>
                </button>

                {/* Facebook Sign In */}
                <button
                  type="button"
                  onClick={() => handleSocialSignIn('facebook')}
                  disabled={loading}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/40 text-xs font-bold text-[#4c9eff] hover:text-white shadow-sm flex items-center justify-center gap-3 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <svg className="w-4 h-4 fill-current shrink-0 text-[#1877F2]" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Continue with Facebook</span>
                </button>
              </div>

              {/* Or Divider */}
              <div className="relative flex items-center justify-center my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative px-3 bg-slate-900 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  or with email
                </div>
              </div>

              {/* Sign In vs Register Tabs */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setTab('signin');
                    setErrorInfo(null);
                  }}
                  className={`py-2 px-3 rounded-xl font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    tab === 'signin'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('register');
                    setErrorInfo(null);
                  }}
                  className={`py-2 px-3 rounded-xl font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    tab === 'register'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </button>
              </div>
            </>
          )}

          {/* Email Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3.5">
            {tab === 'register' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Coach / Team Name <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Coach David"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="coach@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs text-white placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>

            {tab !== 'forgot' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  {tab === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setTab('forgot');
                        setErrorInfo(null);
                        setResetSent(false);
                      }}
                      className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                </div>
              </div>
            )}

            {tab === 'register' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : tab === 'forgot' ? (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Send Reset Email</span>
                </>
              ) : tab === 'register' ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
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
                className="text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
