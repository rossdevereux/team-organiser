import React, { useState } from 'react';
import { AdminUser, SubscriptionStatus, SubscriptionTier } from '../../types';
import { UserRole } from '../../firebase';
import {
  Users,
  Crown,
  UserCheck,
  Eye,
  Plus,
  Trash2,
  CheckCircle2,
  Shield,
  Sparkles,
  Clock,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { ConfirmModal } from '../ConfirmModal';

interface AdminUsersTabProps {
  users: AdminUser[];
  onInviteUser: (email: string, displayName: string, role: UserRole) => Promise<void>;
  onUpdateRole: (uid: string, role: UserRole) => Promise<void>;
  onUpdateSubscription?: (uid: string, status: SubscriptionStatus, tier?: SubscriptionTier) => Promise<void>;
  onDeleteUser: (uid: string) => Promise<void>;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  onInviteUser,
  onUpdateRole,
  onUpdateSubscription,
  onDeleteUser,
}) => {
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('coach');
  const [inviting, setInviting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

  const ownersCount = users.filter((u) => u.role === 'owner').length;
  const coachesCount = users.filter((u) => u.role === 'coach').length;
  const viewersCount = users.filter((u) => u.role === 'viewer').length;
  const lifetimeCount = users.filter(
    (u) => u.subscription?.status === 'lifetime' || u.subscription?.tier === 'free_for_life'
  ).length;

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await onInviteUser(inviteEmail.trim().toLowerCase(), inviteName.trim(), inviteRole);
      setInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('coach');
    } finally {
      setInviting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    await onDeleteUser(userToDelete.uid);
    setUserToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500">Total Registered</span>
          <p className="text-2xl font-black text-slate-100">{users.length}</p>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Auth Accounts
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
            Tactical & Subs
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-amber-500/15 border border-yellow-500/25 space-y-1">
          <span className="text-[10px] uppercase font-bold text-amber-300">Free for Life</span>
          <p className="text-2xl font-black text-yellow-300">{lifetimeCount}</p>
          <span className="text-[11px] text-amber-300/80 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-yellow-400" />
            Perpetual Access
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Viewers / Parents</span>
          <p className="text-2xl font-black text-slate-300">{viewersCount}</p>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Eye className="w-3 h-3" />
            Read-Only Pitch
          </span>
        </div>
      </div>

      {/* User Management Card */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-100">User Access, Roles & Subscription Entitlements</h3>
            <p className="text-xs text-slate-400">
              Manage roles and subscription tiers (including complimentary Free for Life status) with instant Firebase token claim synchronization.
            </p>
          </div>

          <button
            type="button"
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
                <th className="py-3 px-4">JWT Role</th>
                <th className="py-3 px-4">Role Action</th>
                <th className="py-3 px-4">Subscription</th>
                <th className="py-3 px-4">Subscription Action</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => {
                const isLifetime =
                  u.subscription?.status === 'lifetime' || u.subscription?.tier === 'free_for_life';
                const subStatus = isLifetime ? 'lifetime' : (u.subscription?.status || 'trialing');

                return (
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
                      <span className="truncate max-w-[110px] block" title={u.uid}>
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
                        onChange={(e) => onUpdateRole(u.uid, e.target.value as UserRole)}
                        className="h-8 px-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="owner">Owner (Full Governance)</option>
                        <option value="coach">Coach (Tactical & Subs)</option>
                        <option value="viewer">Viewer (Read Only)</option>
                      </select>
                    </td>

                    {/* Subscription Status Badge */}
                    <td className="py-3.5 px-4">
                      {isLifetime ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-yellow-300 border border-amber-500/40 shadow-sm">
                          <Sparkles className="w-3 h-3 text-yellow-400" />
                          <span>Free for Life</span>
                        </span>
                      ) : u.subscription?.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Active Pro</span>
                        </span>
                      ) : u.subscription?.status === 'past_due' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          <span>Past Due</span>
                        </span>
                      ) : u.subscription?.status === 'expired' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          <XCircle className="w-3 h-3 text-rose-400" />
                          <span>Expired</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30">
                          <Clock className="w-3 h-3 text-sky-400" />
                          <span>Trialing</span>
                        </span>
                      )}
                    </td>

                    {/* Subscription Action Dropdown */}
                    <td className="py-3.5 px-4">
                      <select
                        value={subStatus}
                        onChange={(e) => {
                          const newStatus = e.target.value as SubscriptionStatus;
                          onUpdateSubscription?.(
                            u.uid,
                            newStatus,
                            newStatus === 'lifetime' ? 'free_for_life' : undefined
                          );
                        }}
                        className={`h-8 px-2.5 rounded-lg border text-xs font-semibold focus:outline-none cursor-pointer transition ${
                          isLifetime
                            ? 'bg-amber-950/40 border-amber-500/50 text-amber-200 focus:border-amber-400'
                            : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500'
                        }`}
                        title="Set subscription entitlement for this user"
                      >
                        <option value="lifetime">👑 Free for Life (Perpetual)</option>
                        <option value="active">✅ Active Pro</option>
                        <option value="trialing">⏱️ Free Trial (30d)</option>
                        <option value="expired">❌ Expired / Blocked</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setUserToDelete(u)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Remove user from club"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
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
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
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
                <label className="text-xs font-bold text-slate-300">Display Name</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Coach David"
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">User Role & Privileges</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:border-amber-500 focus:outline-none cursor-pointer"
                >
                  <option value="owner">Club Owner (Full Governance & Backups)</option>
                  <option value="coach">Team Coach (Manage Lineups, Subs, Matches)</option>
                  <option value="viewer">Viewer (Read Only for Parents & Guardians)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="h-10 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20"
                >
                  {inviting ? 'Sending Invite...' : 'Provision User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(userToDelete)}
        title="Revoke User Access"
        message={`Are you sure you want to revoke access and delete account for ${userToDelete?.email}? They will no longer be able to log in or manage club matchday sheets.`}
        confirmLabel="Revoke Access"
        cancelLabel="Keep User"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
};
