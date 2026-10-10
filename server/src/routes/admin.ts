import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import {
  setCustomUserRole,
  listAllUsersWithClaims,
} from '../auth/claims.js';
import { storage } from '../db/storage.js';
import { UserRole, ClubSettings, BackupData } from '../types.js';

const router = Router();

// Protect all admin routes with authentication
router.use(requireAuth);

// ================= 1. User Management & Custom Claims =================

// GET /api/admin/users - List all users and their custom claims (Owners & Coaches)
router.get('/users', requireRole(['owner', 'coach']), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await listAllUsersWithClaims();
    res.json({
      users,
      count: users.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list users', details: err.message });
  }
});

// PUT /api/admin/users/:uid/role - Update user's role via Firebase Custom Claims (Owner only)
router.put('/users/:uid/role', requireRole(['owner']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUid = String(req.params.uid);
    const { role } = req.body as { role: UserRole };

    if (!role || !['owner', 'coach', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be owner, coach, or viewer.' });
    }

    // Safety guard: Prevent the only owner from demoting themselves
    if (req.user?.uid === targetUid && role !== 'owner') {
      const allUsers = await listAllUsersWithClaims();
      const owners = allUsers.filter((u) => u.role === 'owner');
      if (owners.length <= 1) {
        return res.status(400).json({
          error: 'Safety restriction: You are the sole Club Owner and cannot demote yourself. Promote another user first.',
        });
      }
    }

    await setCustomUserRole(targetUid, role);

    const updatedUser = await storage.getAdminUserByUid(targetUid);

    res.json({
      message: `User role successfully updated to ${role}`,
      uid: targetUid,
      role,
      user: updatedUser,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update user role', details: err.message });
  }
});

// POST /api/admin/users - Invite/Create user with custom role (Owner only)
router.post('/users', requireRole(['owner']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, displayName, role } = req.body as {
      email: string;
      displayName?: string;
      role: UserRole;
    };

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }

    const assignedRole: UserRole = role && ['owner', 'coach', 'viewer'].includes(role) ? role : 'viewer';
    const newUid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await setCustomUserRole(newUid, assignedRole);
    const createdUser = await storage.upsertAdminUser({
      uid: newUid,
      email: email.trim().toLowerCase(),
      displayName: displayName?.trim() || 'Club Member',
      role: assignedRole,
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    });

    res.status(201).json({
      message: `User ${email} invited with role ${assignedRole}`,
      user: createdUser,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to invite user', details: err.message });
  }
});

// DELETE /api/admin/users/:uid - Remove user from club (Owner only)
router.delete('/users/:uid', requireRole(['owner']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUid = String(req.params.uid);

    if (req.user?.uid === targetUid) {
      return res.status(400).json({ error: 'Cannot delete your own active administrator account.' });
    }

    const deleted = await storage.deleteAdminUser(targetUid);
    if (!deleted) {
      return res.status(404).json({ error: 'User not found in local registry.' });
    }

    res.json({ message: 'User deleted successfully', uid: targetUid });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete user', details: err.message });
  }
});

// ================= 2. Club Settings & Governance =================

// GET /api/admin/club-settings - Fetch club settings (Owners, Coaches & Viewers)
router.get('/club-settings', requireRole(['owner', 'coach', 'viewer']), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await storage.getClubSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch club settings', details: err.message });
  }
});

// PUT /api/admin/club-settings - Update club configuration (Owners & Coaches)
router.put('/club-settings', requireRole(['owner', 'coach']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updates = req.body as Partial<ClubSettings>;
    const updated = await storage.updateClubSettings(updates);
    res.json({
      message: 'Club settings updated successfully',
      settings: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update club settings', details: err.message });
  }
});

// ================= 3. System Backups & Disaster Recovery =================

// GET /api/admin/backup/export - Download full JSON database backup snapshot (Owner only)
router.get('/backup/export', requireRole(['owner']), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const backupData = await storage.exportBackup();
    const filename = `subshuffle-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(backupData);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to export backup', details: err.message });
  }
});

// POST /api/admin/backup/restore - Restore database from JSON backup snapshot (Owner only)
router.post('/backup/restore', requireRole(['owner']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const backupPayload = req.body as BackupData;
    const counts = await storage.restoreBackup(backupPayload);
    res.json({
      message: 'System state successfully restored from backup snapshot',
      restored: counts,
    });
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to restore backup snapshot', details: err.message });
  }
});

// GET /api/admin/backup/stats - System health & entity statistics (Owners & Coaches)
router.get('/backup/stats', requireRole(['owner', 'coach']), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const backup = await storage.exportBackup();
    const totalMinutes = backup.players.reduce((sum, p) => sum + (p.totalMinutesPlayed || 0), 0);
    res.json({
      exportedAt: backup.exportedAt,
      version: backup.version,
      stats: {
        totalTeams: backup.teams.length,
        totalPlayers: backup.players.length,
        totalFixtures: backup.fixtures.length,
        completedFixtures: backup.fixtures.filter((f) => f.status === 'Completed').length,
        registeredUsers: backup.users?.length || 0,
        totalTrackedMinutes: totalMinutes,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to calculate system stats', details: err.message });
  }
});

export default router;
