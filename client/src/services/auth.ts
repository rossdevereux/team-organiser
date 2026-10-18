import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  User,
  UserCredential,
  AuthError,
} from 'firebase/auth';
import { auth, googleProvider, facebookProvider, isFirebaseConfigured, getUserRoleFromToken, UserRole } from '../firebase';

export interface AuthSuccessResult {
  user: User;
  role: UserRole;
}

export interface AuthErrorInfo {
  code: string;
  message: string;
  email?: string;
  isCollision?: boolean;
}

/**
 * Transforms Firebase auth errors into clear, coach-friendly error messages.
 */
export const formatAuthError = (err: unknown): AuthErrorInfo => {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const authErr = err as AuthError & { customData?: { email?: string } };
    const code = authErr.code || 'auth/unknown';
    const email = authErr.customData?.email;

    switch (code) {
      case 'auth/account-exists-with-different-credential':
        return {
          code,
          email,
          isCollision: true,
          message: email
            ? `An account already exists for ${email} with another sign-in method (e.g. Google). Please sign in with that method.`
            : 'An account already exists with this email under a different sign-in provider. Please sign in with your original provider.',
        };
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return { code, message: 'Invalid email or password. Please verify your credentials and try again.' };
      case 'auth/email-already-in-use':
        return { code, message: 'An account with this email already exists. Try signing in instead.' };
      case 'auth/weak-password':
        return { code, message: 'Password is too weak. Please use at least 6 characters.' };
      case 'auth/invalid-email':
        return { code, message: 'Please enter a valid email address.' };
      case 'auth/popup-closed-by-user':
        return { code, message: 'Sign-in window was closed before finishing authentication.' };
      case 'auth/too-many-requests':
        return { code, message: 'Access temporarily disabled due to multiple failed attempts. Please reset your password or try again later.' };
      case 'auth/network-request-failed':
        return { code, message: 'Network error. Please check your internet connection and try again.' };
      case 'auth/user-disabled':
        return { code, message: 'This account has been disabled by an administrator.' };
      default:
        return { code, message: authErr.message || 'Authentication failed. Please try again.' };
    }
  }

  return {
    code: 'auth/unknown',
    message: err instanceof Error ? err.message : 'An unexpected error occurred during authentication.',
  };
};

/**
 * Resolves user token claims after successful authentication
 */
const resolveAuthResult = async (credential: UserCredential): Promise<AuthSuccessResult> => {
  const role = await getUserRoleFromToken(credential.user, true);
  return {
    user: credential.user,
    role,
  };
};

/**
 * Sign in via Google OAuth popup
 */
export const signInWithGoogle = async (): Promise<AuthSuccessResult> => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase credentials not configured. Please add your VITE_FIREBASE_* environment keys.');
  }
  const credential = await signInWithPopup(auth, googleProvider);
  return resolveAuthResult(credential);
};

/**
 * Sign in via Facebook OAuth popup
 */
export const signInWithFacebook = async (): Promise<AuthSuccessResult> => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase credentials not configured. Please add your VITE_FIREBASE_* environment keys.');
  }
  const credential = await signInWithPopup(auth, facebookProvider);
  return resolveAuthResult(credential);
};

/**
 * Sign in with Email and Password
 */
export const signInWithEmail = async (email: string, password: string): Promise<AuthSuccessResult> => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase credentials not configured. Please add your VITE_FIREBASE_* environment keys.');
  }
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return resolveAuthResult(credential);
};

/**
 * Register a new user account with Email, Password, and Display Name
 */
export const registerWithEmail = async (
  email: string,
  password: string,
  displayName?: string
): Promise<AuthSuccessResult> => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase credentials not configured. Please add your VITE_FIREBASE_* environment keys.');
  }
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName && displayName.trim()) {
    try {
      await updateProfile(credential.user, { displayName: displayName.trim() });
    } catch (err) {
      console.warn('Could not update profile display name:', err);
    }
  }
  return resolveAuthResult(credential);
};

/**
 * Send password reset email
 */
export const sendPasswordReset = async (email: string): Promise<void> => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase credentials not configured. Please add your VITE_FIREBASE_* environment keys.');
  }
  await sendPasswordResetEmail(auth, email.trim());
};
