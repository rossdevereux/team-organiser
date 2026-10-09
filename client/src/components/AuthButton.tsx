import React, { useState, useEffect } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../firebase';
import { LogIn, LogOut, User as UserIcon, AlertCircle } from 'lucide-react';

interface AuthButtonProps {
  onUserChange?: (user: User | null) => void;
}

export const AuthButton: React.FC<AuthButtonProps> = ({ onUserChange }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
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

  const handleSignIn = async () => {
    setAuthError(null);
    setLoading(true);

    if (!isFirebaseConfigured()) {
      setAuthError('Firebase credentials not configured yet. Add your VITE_FIREBASE_* keys to client/.env');
      setLoading(false);
      return;
    }

    try {
      await signInWithPopup(auth, googleProvider);
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
      await signOut(auth);
    } catch (err: unknown) {
      console.error('Sign-out failed:', err);
      setAuthError('Failed to sign out');
    } finally {
      setLoading(false);
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
          onClick={handleSignIn}
          className="group relative h-9 flex items-center justify-center gap-1.5 sm:gap-2 w-9 sm:w-auto px-0 sm:px-3 text-xs font-semibold text-slate-100 bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 hover:border-sky-500/50 rounded-xl shadow-md hover:shadow-sky-500/10 transition-all cursor-pointer overflow-hidden whitespace-nowrap shrink-0"
          title="Sign in with Google"
        >
          {/* Subtle Google colored icon */}
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
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
          <span className="hidden xl:inline">Sign In with Google</span>
          <span className="hidden lg:inline xl:hidden text-xs">Sign In</span>
          <LogIn className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-400 transition-colors shrink-0 hidden xl:inline" />
        </button>
      )}

      {authError && (
        <div className="absolute top-full right-0 mt-2 z-50 flex items-center gap-1.5 text-xs text-amber-400 bg-slate-900 border border-amber-500/30 px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{authError}</span>
        </div>
      )}
    </div>
  );
};
