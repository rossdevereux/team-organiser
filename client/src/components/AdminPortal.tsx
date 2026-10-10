import React, { useState, useEffect } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import { useToast } from '../context/ToastContext';
import { getAuthToken, UserRole } from '../firebase';
import { AdminUser, ClubSettings, BackupData } from '../types';
import {
  Shield,
  Users,
  Settings,
  Database,
  Crown,
  UserCheck,
  Eye,
  Plus,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Lock,
  ChevronDown,
  Palette,
  Mail,
  Building,
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

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

  // Backup stats
  const [backupStats, setBackupStats] = useState<any>(null);

  // Invite User Modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('coach');
  const [inviting, setInviting] = useState(false);

  // Delete User Confirmation state
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

  // Restore Confirmation state
  const [pendingRestoreData, setPendingRestoreData] = useState<BackupData | null>(null);
  const [restoring, setRestoring] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['Authorization'] = 'Bearer mock-owner-token';
      }

      // 1. Fetch Users
      const usersRes = await fetch('/api/admin/users', { headers });
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }

      // 2. Fetch Club Settings
      const settingsRes = await fetch('/api/admin/club-settings', { headers });
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setClubSettings(data);
      }

      // 3. Fetch Backup Stats
      const statsRes = await fetch('/api/admin/backup/stats', { headers });
      if (statsRes.ok) {
        const data = await statsRes.json();
        setBackupStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load admin portal data:', err);
      showToast('Could not reach admin service. Using local registry.', 'info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Update a user's role via Firebase Custom Claims
  const handleUpdateRole = async (targetUid: string, newRole: UserRole) => {
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      headers['Authorization'] = token ? `Bearer ${token}` : 'Bearer mock-owner-token';

      const res = await fetch(`/api/admin/users/${targetUid}/role`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user role');
      }

      setUsers((prev) =>
        prev.map((u) => (u.uid === targetUid ? { ...u, role: newRole } : u))
      );
      showToast(`User claim updated to "${newRole.toUpperCase()}". Updated in JWT token!`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update role', 'error');
    }
  };

  // Invite / Provision User
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    setInviting(true);
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      headers['Authorization'] = token ? `Bearer ${token}` : 'Bearer mock-owner-token';

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: inviteEmail,
          displayName: inviteName || undefined,
          role: inviteRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to invite user');
      }

      setUsers((prev) => [...prev, data.user]);
      setInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
      showToast(`Invited ${inviteEmail} as ${inviteRole.toUpperCase()}!`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to invite user', 'error');
    } finally {
      setInviting(false);
    }
  };

  // Delete User
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      headers['Authorization'] = token ? `Bearer ${token}` : 'Bearer mock-owner-token';

      const res = await fetch(`/api/admin/users/${userToDelete.uid}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }

      setUsers((prev) => prev.filter((u) => u.uid !== userToDelete.uid));
      showToast(`Removed user ${userToDelete.email}`, 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to remove user', 'error');
    } finally {
      setUserToDelete(null);
    }
  };

  // Save Club Settings
  const handleSaveClubSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      headers['Authorization'] = token ? `Bearer ${token}` : 'Bearer mock-owner-token';

      const res = await fetch('/api/admin/club-settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify(clubSettings),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update club settings');
      }

      // Update document root CSS variables to immediately reflect kit colours
      document.documentElement.style.setProperty('--kit-primary', clubSettings.primaryColor);
      document.documentElement.style.setProperty('--kit-secondary', clubSettings.secondaryColor);

      showToast('Club settings and theme colors updated successfully!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save club settings', 'error');
    }
  };

  // Download Backup JSON
  const handleDownloadBackup = async () => {
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {};
      headers['Authorization'] = token ? `Bearer ${token}` : 'Bearer mock-owner-token';

      const res = await fetch('/api/admin/backup/export', { headers });
      if (!res.ok) throw new Error('Backup export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subshuffle-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showToast('Full system backup downloaded successfully!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to download backup', 'error');
    }
  };

  // Handle File Upload for Restore
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.teams || !parsed.players || !parsed.fixtures) {
          showToast('Invalid backup file. Missing teams, players, or fixtures.', 'error');
          return;
        }
        setPendingRestoreData(parsed);
      } catch (err) {
        showToast('Invalid JSON file format', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Confirm Restore
  const handleConfirmRestore = async () => {
    if (!pendingRestoreData) return;
    setRestoring(true);
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      headers['Authorization'] = token ? `Bearer ${token}` : 'Bearer mock-owner-token';

      const res = await fetch('/api/admin/backup/restore', {
        method: 'POST',
        headers,
        body: JSON.stringify(pendingRestoreData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Restore failed');

      await refreshData();
      await fetchAdminData();
      showToast('System state restored successfully from backup!', 'success');
      setPendingRestoreData(null);
    } catch (err: any) {
      showToast(err?.message || 'Restore failed', 'error');
    } finally {
      setRestoring(false);
    }
  };

  const ownersCount = users.filter((u) => u.role === 'owner').length;
  const coachesCount = users.filter((u) => u.role === 'coach').length;
  const viewersCount = users.filter((u) => u.role === 'viewer').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header Lockup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Crown className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
              Club Administration Portal
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Role-Based Access Control (RBAC), Firebase Custom Claims, Club Branding & Disaster Recovery.
          </p>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="h-10 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Sync Data</span>
          </button>

          {onNavigateHome && (
            <button
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

      {/* ================= TAB 1: USERS & RBAC ================= */}
      {activeAdminTab === 'users' && (
        <div className="space-y-6">
          {/* KPI Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">Total Registered</span>
              <p className="text-2xl font-black text-slate-100">{users.length}</p>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Firebase Auth Accounts
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-400/80">Club Owners</span>
              <p className="text-2xl font-black text-amber-300">{ownersCount}</p>
              <span className="text-[11px] text-amber-400/70 flex items-center gap-1">
                <Crown className="w-3 h-3" />
                Full Governance
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-indigo-400/80">Team Coaches</span>
              <p className="text-2xl font-black text-indigo-300">{coachesCount}</p>
              <span className="text-[11px] text-indigo-400/70 flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                Matchday Lineups & Subs
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Viewers / Parents</span>
              <p className="text-2xl font-black text-slate-300">{viewersCount}</p>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Eye className="w-3 h-3" />
                Read-Only Pitch Access
              </span>
            </div>
          </div>

          {/* User Management Card */}
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-100">User Access & Token Claims</h3>
                <p className="text-xs text-slate-400">
                  Manage roles embedded directly into the Firebase JWT ID token with zero database lookups.
                </p>
              </div>

              <button
                onClick={() => setInviteModalOpen(true)}
                className="h-10 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/10 transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Invite / Add User</span>
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Firebase UID</th>
                    <th className="py-3 px-4">JWT Custom Claim</th>
                    <th className="py-3 px-4">Role Action</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-850/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300 shrink-0">
                            {u.displayName?.[0] || u.email[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-200 truncate">
                              {u.displayName || 'Club Member'}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        <span className="truncate max-w-[130px] block" title={u.uid}>
                          {u.uid}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            u.role === 'owner'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : u.role === 'coach'
                              ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {u.role === 'owner' && <Crown className="w-3 h-3 text-amber-400" />}
                          {u.role === 'coach' && <UserCheck className="w-3 h-3 text-indigo-400" />}
                          {u.role === 'viewer' && <Eye className="w-3 h-3 text-slate-400" />}
                          <span>{u.role}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateRole(u.uid, e.target.value as UserRole)}
                          className="h-8 px-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
                        >
                          <option value="owner">Owner (Full Governance)</option>
                          <option value="coach">Coach (Tactical & Subs)</option>
                          <option value="viewer">Viewer (Read Only)</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setUserToDelete(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Remove user from club"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RBAC Rules Explainer Card */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Zero-Database Lookup Architecture</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-400">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5" /> Owner
                </span>
                <p className="text-[11px] leading-relaxed">
                  Full system permissions. Manage users, assign token claims, configure club brand identity, export/restore full database snapshots.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="font-bold text-indigo-300 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" /> Coach
                </span>
                <p className="text-[11px] leading-relaxed">
                  Manage team squads, drag-and-drop tactical lineups, auto-balance rotation matrices, WhatsApp match alerts, and pitchside live sub timers.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="font-bold text-slate-300 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Viewer
                </span>
                <p className="text-[11px] leading-relaxed">
                  Read-only view for parents and club supporters. Can inspect fair play stats, scheduled fixtures, and pitch lineups without editing capabilities.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: CLUB SETTINGS & BRAND IDENTITY ================= */}
      {activeAdminTab === 'club' && (
        <form onSubmit={handleSaveClubSettings} className="space-y-6">
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl p-6 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Building className="w-4 h-4 text-sky-400" />
                <span>Club Profile & Federation Rules</span>
              </h3>
              <p className="text-xs text-slate-400">
                Configure official club branding, kit colors, and youth football compliance parameters.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Club Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Club Official Name</label>
                <input
                  type="text"
                  value={clubSettings.clubName}
                  onChange={(e) => setClubSettings({ ...clubSettings, clubName: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              {/* Short Code */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Club Short Code & Initials</label>
                <input
                  type="text"
                  value={clubSettings.clubShortCode}
                  onChange={(e) => setClubSettings({ ...clubSettings, clubShortCode: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold uppercase focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              {/* Primary Kit Color */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-sky-400" />
                  <span>Primary Kit Colour</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={clubSettings.primaryColor}
                    onChange={(e) => setClubSettings({ ...clubSettings, primaryColor: e.target.value })}
                    className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={clubSettings.primaryColor}
                    onChange={(e) => setClubSettings({ ...clubSettings, primaryColor: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono font-semibold focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Secondary Kit Color */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-amber-400" />
                  <span>Secondary Trim Colour</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={clubSettings.secondaryColor}
                    onChange={(e) => setClubSettings({ ...clubSettings, secondaryColor: e.target.value })}
                    className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={clubSettings.secondaryColor}
                    onChange={(e) => setClubSettings({ ...clubSettings, secondaryColor: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono font-semibold focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Equal Playing Time Target */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Minimum Playing Time Target ({clubSettings.minGameTimePercent}%)
                </label>
                <input
                  type="range"
                  min="33"
                  max="75"
                  step="5"
                  value={clubSettings.minGameTimePercent}
                  onChange={(e) =>
                    setClubSettings({ ...clubSettings, minGameTimePercent: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <span className="text-[11px] text-slate-500 block">
                  FA Youth Charter mandates 50%+ equal playing time across all matchday fixtures.
                </span>
              </div>

              {/* Welfare Officer */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Club Child Welfare Officer</label>
                <input
                  type="text"
                  value={clubSettings.welfareOfficer || ''}
                  onChange={(e) => setClubSettings({ ...clubSettings, welfareOfficer: e.target.value })}
                  placeholder="e.g. Sarah Jenkins (Welfare Contact)"
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Visual Kit Preview Badge */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-lg ring-2 ring-white/10"
                  style={{ backgroundColor: clubSettings.primaryColor }}
                >
                  <span style={{ color: clubSettings.secondaryColor }}>{clubSettings.clubShortCode}</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{clubSettings.clubName}</h4>
                  <p className="text-[11px] text-slate-400">Matchday Pitch Canvas Kit Preview</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {clubSettings.minGameTimePercent}% FA Compliant
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="h-11 px-6 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition cursor-pointer"
              >
                Save Club Settings
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ================= TAB 3: BACKUPS & DISASTER RECOVERY ================= */}
      {activeAdminTab === 'backup' && (
        <div className="space-y-6">
          {/* Database Health Summary */}
          {backupStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Total Teams</span>
                <p className="text-2xl font-black text-slate-100">{backupStats.totalTeams}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Registered Players</span>
                <p className="text-2xl font-black text-slate-100">{backupStats.totalPlayers}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Fixtures Logged</span>
                <p className="text-2xl font-black text-slate-100">{backupStats.totalFixtures}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Tracked Minutes</span>
                <p className="text-2xl font-black text-emerald-400">{backupStats.totalTrackedMinutes}m</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Export Snapshot */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Download className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-100">Export Full System Snapshot</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Download an immutable JSON backup of all club squads, registered players, match schedules,
                  and custom claims. Useful before season roll-overs or major roster restructuring.
                </p>
              </div>

              <button
                onClick={handleDownloadBackup}
                className="h-11 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download JSON Backup</span>
              </button>
            </div>

            {/* Card 2: Restore from Snapshot */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-100">Restore Database from Snapshot</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Upload a previously exported <code>.json</code> snapshot to restore system state. All active
                  records will be synchronized and merged.
                </p>
              </div>

              <label className="h-11 px-5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" />
                <span>Select Backup JSON File</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Invite User */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Invite / Provision User</span>
              </h3>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="coach.name@therovers.local"
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Display Name (Optional)</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Dave Miller (U11 Coach)"
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Assigned Role & Claims</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:border-amber-500 focus:outline-none cursor-pointer"
                >
                  <option value="owner">Owner (Full Governance & Backups)</option>
                  <option value="coach">Coach (Matchday Squads & Lineups)</option>
                  <option value="viewer">Viewer (Read-Only Parent)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="h-10 px-4 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-750"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="h-10 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition disabled:opacity-50"
                >
                  {inviting ? 'Provisioning...' : 'Provision Claims'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete User */}
      <ConfirmModal
        isOpen={Boolean(userToDelete)}
        title="Remove User from Club?"
        message={`Are you sure you want to remove ${userToDelete?.email}? This will revoke their access privileges.`}
        confirmLabel="Remove User"
        isDestructive={true}
        onConfirm={confirmDeleteUser}
        onCancel={() => setUserToDelete(null)}
      />

      {/* Confirmation Modal: Restore Database */}
      <ConfirmModal
        isOpen={Boolean(pendingRestoreData)}
        title="Restore Database from Snapshot?"
        message={`This backup contains ${pendingRestoreData?.teams?.length || 0} teams, ${
          pendingRestoreData?.players?.length || 0
        } players, and ${
          pendingRestoreData?.fixtures?.length || 0
        } fixtures. Confirming will overwrite the current database.`}
        confirmLabel={restoring ? 'Restoring...' : 'Restore System State'}
        isDestructive={true}
        onConfirm={handleConfirmRestore}
        onCancel={() => setPendingRestoreData(null)}
      />
    </div>
  );
};
