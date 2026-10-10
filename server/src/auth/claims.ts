import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth, UserRecord } from 'firebase-admin/auth';
import { UserRole, AdminUser } from '../types.js';
import { storage } from '../db/storage.js';

// Ensure Firebase Admin SDK is initialized singleton
export function initFirebaseAdmin(): void {
  if (getApps().length === 0) {
    try {
      initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'team-organiser-prod',
      });
      console.log('🛡️ Firebase Admin SDK initialized for project:', process.env.FIREBASE_PROJECT_ID || 'team-organiser-prod');
    } catch (err) {
      console.warn('⚠️ Firebase Admin SDK initialization note:', err);
    }
  }
}

// Ensure init on import
initFirebaseAdmin();

/**
 * Assigns Firebase Custom User Claims { role: 'owner' | 'coach' | 'viewer' }
 * This claim is encoded directly into the user's JWT ID token.
 */
export async function setCustomUserRole(uid: string, role: UserRole): Promise<void> {
  initFirebaseAdmin();
  const auth = getAuth();

  try {
    // 1. Set custom claims in Firebase Auth
    await auth.setCustomUserClaims(uid, { role });
    console.log(`✅ Set Firebase custom user claim { role: '${role}' } for UID: ${uid}`);
  } catch (err: any) {
    console.warn(`⚠️ Warning setting Firebase claim directly on auth (${err?.message}). Syncing with local registry.`);
  }

  // 2. Synchronize with local store user registry for zero-latency queries & backups
  await storage.upsertAdminUser({
    uid,
    role,
  });
}

/**
 * Retrieves the current role from Firebase Custom Claims with zero database dependency
 */
export async function getUserRole(uid: string): Promise<UserRole> {
  initFirebaseAdmin();
  try {
    const user = await getAuth().getUser(uid);
    return (user.customClaims?.role as UserRole) || 'viewer';
  } catch (err) {
    // Check local storage registry fallback
    const localUser = await storage.getAdminUserByUid(uid);
    return localUser?.role || 'viewer';
  }
}

/**
 * Initial Admin Bootstrapping:
 * Automatically grants 'owner' claim when user's email matches INITIAL_ADMIN_EMAIL in .env
 */
export async function checkAndBootstrapInitialAdmin(
  uid: string,
  email?: string,
  currentRole?: UserRole
): Promise<UserRole> {
  const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();

  if (!email || !initialAdminEmail) {
    return currentRole || 'viewer';
  }

  if (email.trim().toLowerCase() === initialAdminEmail && currentRole !== 'owner') {
    console.log(`👑 Bootstrapping initial owner claim for project creator: ${email} (UID: ${uid})`);
    try {
      await setCustomUserRole(uid, 'owner');
      return 'owner';
    } catch (err) {
      console.error('Failed to set initial owner custom claims:', err);
      return 'owner'; // Grant in-memory for immediate session
    }
  }

  return currentRole || 'viewer';
}

/**
 * Seed Admin CLI helper: Looks up or registers user by email and assigns { role: 'owner' }
 */
export async function seedAdminByEmail(email: string): Promise<AdminUser> {
  initFirebaseAdmin();
  const auth = getAuth();
  const normalizedEmail = email.trim().toLowerCase();

  let userRecord: UserRecord;

  try {
    userRecord = await auth.getUserByEmail(normalizedEmail);
    console.log(`Found existing Firebase Auth account for ${normalizedEmail} (UID: ${userRecord.uid})`);
  } catch (err: any) {
    if (err?.code === 'auth/user-not-found') {
      console.log(`User not found in Firebase Auth. Creating new user account for ${normalizedEmail}...`);
      userRecord = await auth.createUser({
        email: normalizedEmail,
        displayName: 'Club Owner',
        emailVerified: true,
      });
      console.log(`Created new Firebase user with UID: ${userRecord.uid}`);
    } else {
      console.warn(`Could not reach Firebase Auth directly (${err?.message}). Creating local seeded admin.`);
      // Mock / fallback record for offline/development environments
      userRecord = {
        uid: `owner-${Date.now()}`,
        email: normalizedEmail,
        displayName: 'Club Owner (Dev)',
        disabled: false,
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString(),
          toJSON: () => ({}),
        },
        providerData: [],
        toJSON: () => ({}),
      } as unknown as UserRecord;
    }
  }

  // Set the custom claim
  await setCustomUserRole(userRecord.uid, 'owner');

  const adminUser: AdminUser = {
    uid: userRecord.uid,
    email: normalizedEmail,
    displayName: userRecord.displayName || 'Club Owner',
    photoURL: userRecord.photoURL || undefined,
    role: 'owner',
    disabled: userRecord.disabled || false,
    creationTime: userRecord.metadata.creationTime,
    lastSignInTime: userRecord.metadata.lastSignInTime,
  };

  await storage.upsertAdminUser(adminUser);
  return adminUser;
}

/**
 * Lists all registered users and their current claims
 */
export async function listAllUsersWithClaims(): Promise<AdminUser[]> {
  initFirebaseAdmin();
  const auth = getAuth();
  const usersMap = new Map<string, AdminUser>();

  // 1. Fetch any users registered in local storage
  const storedUsers = await storage.getAdminUsers();
  for (const u of storedUsers) {
    usersMap.set(u.uid, u);
  }

  // 2. Fetch from Firebase Auth if online and credentials available
  try {
    const listResult = await auth.listUsers(100);
    for (const record of listResult.users) {
      const role = (record.customClaims?.role as UserRole) || 'viewer';
      usersMap.set(record.uid, {
        uid: record.uid,
        email: record.email || 'no-email@therovers.local',
        displayName: record.displayName || undefined,
        photoURL: record.photoURL || undefined,
        role,
        disabled: record.disabled,
        creationTime: record.metadata.creationTime,
        lastSignInTime: record.metadata.lastSignInTime,
      });
    }
  } catch (err: any) {
    console.warn(`Note: Using stored users registry (Firebase listUsers notice: ${err?.message})`);
  }

  // 3. Ensure dev users exist if empty
  if (usersMap.size === 0) {
    const defaultOwner: AdminUser = {
      uid: 'dev-owner-1',
      email: process.env.INITIAL_ADMIN_EMAIL || 'admin@therovers.local',
      displayName: 'Head Coach & Club Owner',
      role: 'owner',
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    };
    const defaultCoach: AdminUser = {
      uid: 'dev-coach-1',
      email: 'coach.dave@therovers.local',
      displayName: 'Dave Miller (U10 Assistant)',
      role: 'coach',
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    };
    const defaultViewer: AdminUser = {
      uid: 'dev-viewer-1',
      email: 'parent.sarah@therovers.local',
      displayName: 'Sarah Jenkins (Parent Rep)',
      role: 'viewer',
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    };
    usersMap.set(defaultOwner.uid, defaultOwner);
    usersMap.set(defaultCoach.uid, defaultCoach);
    usersMap.set(defaultViewer.uid, defaultViewer);
    await storage.upsertAdminUser(defaultOwner);
    await storage.upsertAdminUser(defaultCoach);
    await storage.upsertAdminUser(defaultViewer);
  }

  return Array.from(usersMap.values());
}
