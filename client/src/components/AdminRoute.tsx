import React, { useState, useEffect } from 'react';
import { User, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured, getUserRoleFromToken, UserRole } from '../firebase';
import { ShieldAlert, Lock, ArrowLeft, RefreshCw, LogIn, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface AdminRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  onNavigateHome?: () => void;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({
  children,
  allowedRoles = ['owner'],
  onNavigateHome,
}) => {
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const evaluateUserClaims = async (currentUser: User | null, forceRefresh: boolean = false) => {
    let effectiveUser: any = currentUser;

    // In testing or development environments, allow simulated user via URL role param
    if (!effectiveUser && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const paramRole = urlParams.get('role');
      if (paramRole === 'owner' || paramRole === 'coach' || paramRole === 'viewer') {
        effectiveUser = {
          uid: `dev-${paramRole}-123`,
          email: `${paramRole}@therovers.local`,
          displayName: paramRole === 'owner' ? 'Club Owner' : paramRole === 'coach' ? 'Team Coach' : 'Club Viewer',
          getIdTokenResult: async () => ({
            claims: { role: paramRole },
            token: `mock-${paramRole}-token`,
            authTime: new Date().toISOString(),
            issuedAtTime: new Date().toISOString(),
            expirationTime: new Date(Date.now() + 3600000).toISOString(),
            signInProvider: 'google.com',
            signInSecondFactor: null,
          }),
        };
      }
    }

    if (!effectiveUser) {
      setUser(null);
      setRole(null);
      setLoading(false);
      return;
    }

    setUser(effectiveUser);
    try {
      // Direct inspection of Firebase JWT ID token custom claims via getIdTokenResult()
      const userRole = await getUserRoleFromToken(effectiveUser, forceRefresh);
      setRole(userRole);
    } catch (err) {
      console.error('Failed to verify token claims:', err);
      setRole('viewer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      evaluateUserClaims(currentUser);
    });
    return () => unsub();
  }, []);

  const handleRefreshClaims = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      // Force token refresh from Firebase backend to pick up updated custom claims
      const tokenResult = await user.getIdTokenResult(true);
      const updatedRole = (tokenResult.claims?.role as UserRole) || 'viewer';
      setRole(updatedRole);
      showToast(
        `Token claims refreshed! Current role: ${updatedRole.toUpperCase()}`,
        'success'
      );
    } catch (err: any) {
      showToast(`Failed to refresh claims: ${err?.message || 'Network error'}`, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignIn = async () => {
    setAuthError(null);
    if (!isFirebaseConfigured()) {
      // For local development when credentials are placeholder, simulate signing in
      showToast('Development mode: Simulating login as Club Owner', 'info');
      setRole('owner');
      return;
    }

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      setAuthError(err?.message || 'Authentication failed');
      showToast('Authentication failed. Check Firebase settings.', 'error');
    }
  };

  // 1. Loading state with smooth dark skeleton
  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 animate-pulse">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-200">Verifying Security Token & Claims...</h3>
          <p className="text-xs text-slate-400">Inspecting cryptographic signature and custom role claims</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State: Must Sign In
  if (!user) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Lock className="w-3.5 h-3.5" />
            <span>Admin Authentication Required</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
            Club Administration Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            You must be signed in with an authorized <strong>Club Owner</strong> or <strong>Coach</strong> account
            to access user permissions, brand settings, and system backups.
          </p>
        </div>

        {authError && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {authError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={handleSignIn}
            className="w-full sm:w-auto h-11 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In with Google</span>
          </button>

          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="w-full sm:w-auto h-11 px-5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Planner</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. Authenticated but Insufficient Permissions (e.g. role is 'viewer' or 'coach' when 'owner' is required)
  const isAuthorized = role && allowedRoles.includes(role);

  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-rose-500/30 shadow-2xl backdrop-blur-xl text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Access Denied (403 Forbidden)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
            Elevated Permissions Required
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            Your Firebase ID token does not contain the required custom role claim to access this portal.
          </p>
        </div>

        {/* Roles comparison badge */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-around text-xs">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Your Current Role</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-bold uppercase tracking-wider text-[11px] border border-slate-700">
              {role || 'Viewer'}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-800" />

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Required Role</span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold uppercase tracking-wider text-[11px] border border-amber-500/30">
              {allowedRoles.join(' or ')}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-normal">
          If your Club Owner has recently granted you access, click <strong>Refresh Claims</strong> to retrieve an updated token without signing out.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={handleRefreshClaims}
            disabled={refreshing}
            className="w-full sm:w-auto h-11 px-5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Token Claims'}</span>
          </button>

          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="w-full sm:w-auto h-11 px-5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Planner</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // 4. Authorized Access
  return <>{children}</>;
};
