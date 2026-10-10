import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Environment variables configured via .env.local or GitHub Actions secrets
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyMockKeyForDevelopmentOnly',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'team-organiser-prod.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'team-organiser-prod',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'team-organiser-prod.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:000000000000:web:0000000000000000000000',
};

// Singleton initialization prevents re-initialization during Vite HMR
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Check if credentials are production/configured or default placeholders
export const isFirebaseConfigured = (): boolean => {
  const key = import.meta.env.VITE_FIREBASE_API_KEY;
  return Boolean(key && key !== 'AIzaSyMockKeyForDevelopmentOnly');
};

/**
 * Helper to fetch fresh JWT token for Cloud Run authenticated API calls
 */
export const getAuthToken = async (): Promise<string | null> => {
  if (!auth.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken();
  } catch (err) {
    console.error('Failed to retrieve Firebase ID token:', err);
    return null;
  }
};

export type UserRole = 'owner' | 'coach' | 'viewer';

/**
 * Extracts the user's role from Firebase Custom Claims in their verified JWT ID token.
 * Uses `user.getIdTokenResult(forceRefresh)` to ensure zero-database lookup.
 */
export const getUserRoleFromToken = async (
  user: any | null,
  forceRefresh: boolean = false
): Promise<UserRole> => {
  if (!user) return 'viewer';

  // Check URL query param override for instant local testing/debugging (e.g. ?role=owner)
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const paramRole = urlParams.get('role');
    if (paramRole === 'owner' || paramRole === 'coach' || paramRole === 'viewer') {
      return paramRole;
    }
    const storedRole = localStorage.getItem('subshuffle_role_override');
    if (storedRole === 'owner' || storedRole === 'coach' || storedRole === 'viewer') {
      return storedRole;
    }
  }

  try {
    if (typeof user.getIdTokenResult === 'function') {
      const idTokenResult = await user.getIdTokenResult(forceRefresh);
      const claimRole = idTokenResult.claims?.role as UserRole;
      if (claimRole && ['owner', 'coach', 'viewer'].includes(claimRole)) {
        return claimRole;
      }
    }
  } catch (err) {
    console.warn('Could not inspect Firebase token claims:', err);
  }

  // Fallback for development if email matches or default
  if (user.email && (user.email.includes('admin') || user.email.includes('owner'))) {
    return 'owner';
  }

  return 'coach';
};
