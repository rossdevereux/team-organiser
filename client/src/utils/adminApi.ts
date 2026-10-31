import { getAuthToken, UserRole } from '../firebase';
import { AdminUser, ClubSettings, BackupData, SubscriptionStatus, SubscriptionTier, UserSubscription, PaymentRecord } from '../types';

export async function getAdminHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : 'Bearer mock-owner-token',
  };
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const headers = await getAdminHeaders();
  const res = await fetch('/api/admin/users', { headers });
  if (!res.ok) throw new Error('Failed to fetch admin users');
  const data = await res.json();
  return data.users || [];
}

export async function inviteAdminUser(payload: { email: string; displayName?: string; role: UserRole }): Promise<AdminUser> {
  const headers = await getAdminHeaders();
  const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to send invite');
  }
  const data = await res.json();
  return data.user;
}

export async function updateAdminUserRole(uid: string, role: UserRole): Promise<void> {
  const headers = await getAdminHeaders();
  const res = await fetch(`/api/admin/users/${uid}/role`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update user role');
  }
}

export async function updateAdminUserSubscription(
  uid: string,
  payload: { status: SubscriptionStatus; tier?: SubscriptionTier }
): Promise<{ subscription: UserSubscription; user: AdminUser }> {
  const headers = await getAdminHeaders();
  const res = await fetch(`/api/admin/users/${uid}/subscription`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update user subscription');
  }
  return res.json();
}

export async function deleteAdminUser(uid: string): Promise<void> {
  const headers = await getAdminHeaders();
  const res = await fetch(`/api/admin/users/${uid}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to remove user');
  }
}

export async function fetchClubSettings(): Promise<ClubSettings> {
  const headers = await getAdminHeaders();
  const res = await fetch('/api/admin/club-settings', { headers });
  if (!res.ok) throw new Error('Failed to fetch club settings');
  return res.json();
}

export async function saveClubSettings(settings: ClubSettings): Promise<void> {
  const headers = await getAdminHeaders();
  const res = await fetch('/api/admin/club-settings', {
    method: 'POST',
    headers,
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to save club settings');
  }
}

export async function fetchBackupStats(): Promise<any> {
  const headers = await getAdminHeaders();
  const res = await fetch('/api/admin/backup/stats', { headers });
  if (!res.ok) throw new Error('Failed to fetch backup stats');
  return res.json();
}

export async function exportBackupData(): Promise<BackupData> {
  const headers = await getAdminHeaders();
  const res = await fetch('/api/admin/backup/export', { headers });
  if (!res.ok) throw new Error('Failed to export backup data');
  return res.json();
}

export async function restoreBackupData(backupData: BackupData): Promise<any> {
  const headers = await getAdminHeaders();
  const res = await fetch('/api/admin/backup/restore', {
    method: 'POST',
    headers,
    body: JSON.stringify(backupData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Restore failed');
  }
  return res.json();
}

export async function fetchBillingHistory(): Promise<PaymentRecord[]> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : 'Bearer mock-dev-token',
  };
  const res = await fetch('/api/billing/history', { headers });
  if (!res.ok) {
    throw new Error('Failed to fetch billing history');
  }
  const data = await res.json();
  return data.payments || [];
}
