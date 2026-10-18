import React, { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { useMatchday } from '../context/MatchdayContext';
import { LogIn, LogOut, User as UserIcon, AlertCircle } from 'lucide-react';
import { AuthModal } from './auth/AuthModal';

export interface AuthButtonProps {
  onUserChange?: (user: User | null) => void;
  onSignInSuccess?: (user: User) => void;
  variant?: 'navbar' | 'hero' | 'card';
  className?: string;
  label?: string;
}

export const AuthButton: React.FC<AuthButtonProps> = ({
  onUserChange,
  onSignInSuccess,
  variant = 'navbar',
  className = '',
  label,
}) => {
  const { signOutUser } = useMatchday();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (onUserChange) {
        onUserChange(currentUser);
      }
    });

    return () => unsubscribe();
  }, [onUserChange]);

  const handleSignOut = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      await signOutUser();
    } catch (err: unknown) {
      console.error('Sign-out failed:', err);
      setAuthError('Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (signedInUser: User) => {
    setAuthModalOpen(false);
    if (onSignInSuccess) {
      onSignInSuccess(signedInUser);
    }
  };

  if (loading) {
    if (variant === 'hero' || variant === 'card') {
      return (
        <div className={`min-h-[48px] px-6 py-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-center gap-2.5 animate-pulse ${className}`}>
          <div className="w-4 h-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin shrink-0" />
          <span>Checking account...</span>
        </div>
      );
    }

    return (
      <div className="h-9 flex items-center gap-2 px-3 text-xs text-slate-400 bg-slate-900/60 border border-slate-800 rounded-xl animate-pulse whitespace-nowrap shrink-0">
        <div className="w-3.5 h-3.5 rounded-full border-2 border-sky-400 border-t-transparent animate-spin shrink-0" />
        <span>Checking auth...</span>
      </div>
    );
  }

  return (
    <>
      <div className={`relative flex items-center shrink-0 ${variant === 'card' ? 'w-full' : ''}`}>
        {user ? (
          <div className="h-9 flex items-center gap-1.5 sm:gap-2 bg-slate-900/80 border border-slate-800 rounded-xl px-2.5 shadow-md backdrop-blur-md shrink-0">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User Avatar'}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg object-cover ring-1 ring-sky-500/30 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[10px] ring-1 ring-sky-500/30 shrink-0">
                <UserIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
            )}

            <div className="flex flex-col text-left">
              <span className="text-[11px] font-semibold text-slate-200 leading-tight truncate max-w-[80px] sm:max-w-[120px]">
                {user.displayName || 'Coach'}
              </span>
            </div>

            <button
              onClick={handleSignOut}
              className="ml-1 flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0"
              title="Sign out of Firebase"
            >
              <LogOut className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        ) : variant === 'hero' ? (
          <button
            onClick={() => setAuthModalOpen(true)}
            className={`w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border-2 border-slate-700/80 hover:border-emerald-500/60 text-slate-100 font-extrabold text-sm shadow-xl shadow-slate-950/40 flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5 cursor-pointer group ${className}`}
            title="Sign in with Email, Google, or Facebook"
          >
            <LogIn className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
            <span>{label || 'Sign In'}</span>
          </button>
        ) : variant === 'card' ? (
          <button
            onClick={() => setAuthModalOpen(true)}
            className={`w-full min-h-[46px] py-3 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition cursor-pointer group ${className}`}
            title="Sign in with Email, Google, or Facebook"
          >
            <LogIn className="w-4 h-4 text-slate-950 group-hover:scale-110 transition-transform shrink-0" />
            <span>{label || 'Sign In to Cloud Sync'}</span>
          </button>
        ) : (
          <button
            onClick={() => setAuthModalOpen(true)}
            className={`group relative h-9 flex items-center justify-center gap-1.5 px-3 text-xs font-bold text-slate-100 bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 hover:border-emerald-500/50 rounded-xl shadow-md hover:shadow-emerald-500/10 transition-all cursor-pointer overflow-hidden whitespace-nowrap shrink-0 ${className}`}
            title="Sign in with Email, Google, or Facebook"
          >
            <LogIn className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
            <span>{label || 'Sign In'}</span>
          </button>
        )}

        {authError && (
          <div className="absolute top-full right-0 mt-2 z-50 flex items-center gap-1.5 text-xs text-amber-400 bg-slate-900 border border-amber-500/30 px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{authError}</span>
          </div>
        )}
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
};
