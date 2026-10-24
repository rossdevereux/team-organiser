import React, { useState, useEffect, useCallback } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import { useToast } from '../context/ToastContext';
import { UserRole } from '../firebase';
import { AdminUser, ClubSettings, BackupData, SubscriptionStatus, SubscriptionTier } from '../types';
import {
  Shield,
  Users,
  Settings,
  Database,
  RefreshCw,
} from 'lucide-react';
import {
  fetchAdminUsers,
  inviteAdminUser,
  updateAdminUserRole,
  updateAdminUserSubscription,
  deleteAdminUser,
  fetchClubSettings,
  saveClubSettings,
  fetchBackupStats,
  exportBackupData,
  restoreBackupData,
} from '../utils/adminApi';
import { AdminUsersTab } from './admin/AdminUsersTab';
import { AdminClubSettingsTab } from './admin/AdminClubSettingsTab';
import { AdminBackupTab } from './admin/AdminBackupTab';

interface AdminPortalProps {
  onNavigateHome?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onNavigateHome }) => {
  const { refreshData } = useMatchday();
  const { showToast } = useToast();

  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'club' | 'backup'>('users');
  const [loading, setLoading] = useState<boolean>(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [clubSettings, setClubSettings] = useState<ClubSettings>({
    clubName: 'The Rovers Football Club',
    clubShortCode: 'RFC',
    badgeInitials: 'RFC',
    badgeUrl: '',
    primaryColor: '#0284c7',
    secondaryColor: '#f59e0b',
    defaultPitchPlayerCount: 7,
    minGameTimePercent: 50,
    contactEmail: 'admin@therovers.local',
    welfareOfficer: 'Club Child Welfare Officer',
    publicGuestView: true,
  });
  const [backupStats, setBackupStats] = useState<any>(null);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedUsers, fetchedSettings, fetchedStats] = await Promise.allSettled([
        fetchAdminUsers(),
        fetchClubSettings(),
        fetchBackupStats(),
      ]);

      if (fetchedUsers.status === 'fulfilled') setUsers(fetchedUsers.value);
      if (fetchedSettings.status === 'fulfilled') setClubSettings(fetchedSettings.value);
      if (fetchedStats.status === 'fulfilled') setBackupStats(fetchedStats.value);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      showToast('Could not load all admin metrics. Showing local cache.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Tab 1: User Handlers
  const handleInviteUser = async (email: string, displayName: string, role: UserRole) => {
    try {
      const newUser = await inviteAdminUser({ email, displayName, role });
      if (newUser) {
        setUsers((prev) => [newUser, ...prev.filter((u) => u.uid !== newUser.uid)]);
      }
      showToast(`Provisioned role '${role}' for ${email}`, 'success');
      await loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to send invite', 'error');
      throw err;
    }
  };

  const handleUpdateRole = async (uid: string, role: UserRole) => {
    try {
      await updateAdminUserRole(uid, role);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role } : u)));
      showToast(`User claim successfully updated to '${role}'`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update user role', 'error');
    }
  };

  const handleUpdateSubscription = async (
    uid: string,
    status: SubscriptionStatus,
    tier?: SubscriptionTier
  ) => {
    try {
      const res = await updateAdminUserSubscription(uid, { status, tier });
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, subscription: res.subscription } : u))
      );
      showToast(
        status === 'lifetime'
          ? 'Granted Free for Life status! User has perpetual active access.'
          : `User subscription updated to '${status}'`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to update user subscription', 'error');
    }
  };

  const handleDeleteUser = async (uid: string) => {
    try {
      await deleteAdminUser(uid);
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      showToast('User account successfully removed from club roster', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove user', 'error');
    }
  };

  // Tab 2: Settings Handlers
  const handleSaveClubSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveClubSettings(clubSettings);
      showToast('Club identity and match parameters saved!', 'success');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save club settings', 'error');
    }
  };

  // Tab 3: Backup Handlers
  const handleDownloadBackup = async () => {
    try {
      const data = await exportBackupData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `subshuffle-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('System snapshot downloaded successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to export backup', 'error');
    }
  };

  const handleRestoreBackup = async (data: BackupData) => {
    try {
      const result = await restoreBackupData(data);
      showToast(`System restored: ${result.imported?.teams || 0} teams imported.`, 'success');
      await refreshData();
      await loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Restore failed', 'error');
      throw err;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-500/10 border border-slate-800 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
              <span>Club Governance & Admin Console</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Owner Mode
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage club members, Firebase JWT claims, branding tokens, and system-wide database snapshots.
            </p>
          </div>
        </div>

        {/* Action Tools */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadAdminData}
            disabled={loading}
            className="h-10 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Sync Data</span>
          </button>

          {onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              Exit to Planner
            </button>
          )}
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-1 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800/80 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveAdminTab('users')}
          className={`h-9 px-4 flex items-center gap-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'users'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users & Custom Claims</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-900/20 font-mono">
            {users.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('club')}
          className={`h-9 px-4 flex items-center gap-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'club'
              ? 'bg-sky-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Club Settings & Kits</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('backup')}
          className={`h-9 px-4 flex items-center gap-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'backup'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Backups & Disaster Recovery</span>
        </button>
      </div>

      {/* Active Tab Views */}
      {activeAdminTab === 'users' && (
        <AdminUsersTab
          users={users}
          onInviteUser={handleInviteUser}
          onUpdateRole={handleUpdateRole}
          onUpdateSubscription={handleUpdateSubscription}
          onDeleteUser={handleDeleteUser}
        />
      )}

      {activeAdminTab === 'club' && (
        <AdminClubSettingsTab
          clubSettings={clubSettings}
          onChangeClubSettings={setClubSettings}
          onSaveClubSettings={handleSaveClubSettings}
        />
      )}

      {activeAdminTab === 'backup' && (
        <AdminBackupTab
          backupStats={backupStats}
          onDownloadBackup={handleDownloadBackup}
          onRestoreBackup={handleRestoreBackup}
        />
      )}
    </div>
  );
};
