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
