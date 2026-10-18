import React, { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { useMatchday } from '../context/MatchdayContext';
import { LogIn, LogOut, User as UserIcon, AlertCircle } from 'lucide-react';
import { AuthModal } from './auth/AuthModal';

interface AuthButtonProps {
  onUserChange?: (user: User | null) => void;
  onSignInSuccess?: (user: User) => void;
}

export const AuthButton: React.FC<AuthButtonProps> = ({ onUserChange, onSignInSuccess }) => {
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
    return (
      <div className="h-9 flex items-center gap-2 px-3 text-xs text-slate-400 bg-slate-900/60 border border-slate-800 rounded-xl animate-pulse whitespace-nowrap shrink-0">
        <div className="w-3.5 h-3.5 rounded-full border-2 border-sky-400 border-t-transparent animate-spin shrink-0" />
        <span>Checking auth...</span>
      </div>
    );
  }

  return (
    <>
      <div className="relative flex items-center shrink-0">
        {user ? (
          <div className="h-9 flex items-center gap-1.5 sm:gap-2 bg-slate-900/80 border border-slate-800 rounded-xl px-2 sm:px-2.5 shadow-md backdrop-blur-md shrink-0">
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

            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[11px] font-semibold text-slate-200 leading-tight truncate max-w-[65px] sm:max-w-[110px]">
                {user.displayName || 'Coach'}
              </span>
            </div>

            <button
              onClick={handleSignOut}
              className="ml-0.5 sm:ml-1 flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-[10px] font-medium text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0"
              title="Sign out of Firebase"
            >
              <LogOut className="w-3 h-3 shrink-0" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAuthModalOpen(true)}
            className="group relative h-9 flex items-center justify-center gap-1.5 sm:gap-2 w-9 sm:w-auto px-0 sm:px-3 text-xs font-semibold text-slate-100 bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 hover:border-emerald-500/50 rounded-xl shadow-md hover:shadow-emerald-500/10 transition-all cursor-pointer overflow-hidden whitespace-nowrap shrink-0"
            title="Sign in with Email, Google, or Facebook"
          >
            <LogIn className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="hidden sm:inline">Sign In</span>
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

