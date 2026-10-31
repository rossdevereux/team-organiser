import { Router, Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { storage } from '../db/storage.js';
import {
  generateFairRotation,
  calculateMatchStats,
  generateWhatsAppAnnouncement,
  generateSuggestedSubstitutions,
  rebalanceRemainingPeriods,
  reconcileMatchSquadPlannedSubs,
} from '../services/rotationService.js';
import { calculateSeasonDashboardSummary } from '../services/dashboardService.js';
import { getChangelogData } from '../services/changelogService.js';
import { getFormationsForTeamSize, DEFAULT_FORMATIONS } from '../db/formations.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/requireActiveSubscription.js';
import {
  Player,
  TeamSettings,
  Fixture,
  MatchSquad,
  Team,
  Formation,
  PostMatchRecording,
  GoalScorer,
  LiveMatchState,
  LiveStatusResponse,
  EarlyDeparture,
  UserOnboardingState,
  DEFAULT_ONBOARDING_STATE,
  SubsPerWindowOption,
} from '../types.js';

const router = Router();

// Apply optionalAuth to all routes so req.user is populated if token is present
router.use(optionalAuth);

// ================= Teams Endpoints (Multi-Team & User Isolation) =================

// GET /api/teams (Returns teams owned by or shared with logged-in user)
router.get('/teams', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    if (userId && userEmail) {
      await storage.claimPendingInvites(userId, userEmail);
    }
    const teams = await storage.getTeams(userId, userEmail);
    res.json(teams);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch teams', details: err.message });
  }
});

// POST /api/teams (Create a new team)
router.post('/teams', requireActiveSubscription, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body as Partial<Team>;
    if (!body.name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const userId = req.user?.uid || 'dev-user-123';
    const userEmail = req.user?.email || 'coach@therovers.local';

    const newTeam: Team = {
      id: body.id || `team_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: body.name.trim(),
      ageGroup: body.ageGroup || 'U10',
      ownerId: userId,
      ownerEmail: userEmail,
      sharedWith: [],
      settings: body.settings || {
        pitchPlayerCount: 7,
        matchdaySquadCap: 10,
        subCount: 3,
        matchPeriodCount: 2, // 2 Halves default
        periodDurationMinutes: 25,
        targetGameTimePercent: 50,
        defaultFormation: '2-3-1',
        customFormations: [],
        subTimingMode: 'at_breaks',
        preserveLineupAcrossBreaks: false,
        midPeriodSubIntervalMinutes: 12.5,
      },
      createdAt: new Date().toISOString(),
    };

    const saved = await storage.saveTeam(newTeam);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create team', details: err.message });
  }
});

// GET /api/teams/:id
router.get('/teams/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const team = await storage.getTeamById(id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    if (userId && !storage.hasTeamAccess(team, userId, userEmail)) {
      return res.status(403).json({ error: 'Access denied to this team' });
    }
    res.json(team);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch team', details: err.message });
  }
});

// GET /api/teams/:id/dashboard-summary
router.get('/teams/:id/dashboard-summary', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const season = req.query.season as string | undefined;

    const team = await storage.getTeamById(id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    if (userId && !storage.hasTeamAccess(team, userId, userEmail)) {
      return res.status(403).json({ error: 'Access denied: not an authorized coach for this team' });
    }

    // Check cached summary
    const cached = storage.getCachedSeasonSummary(id, season);
    if (cached) {
      return res.json(cached);
    }

    const summary = await calculateSeasonDashboardSummary(id, season);
    storage.setCachedSeasonSummary(id, season, summary);
    res.json(summary);
  } catch (err: any) {
    console.error('Error generating season dashboard summary:', err);
    res.status(500).json({ error: 'Failed to generate season dashboard summary', details: err.message });
  }
});

// PUT /api/teams/:id
router.put('/teams/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await storage.getTeamById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    if (userId && !storage.hasTeamAccess(existing, userId, userEmail)) {
      return res.status(403).json({ error: 'Access denied: You do not have permission to edit this team' });
    }

    const updated: Team = {
      ...existing,
      ...req.body,
      id,
      updatedAt: new Date().toISOString(),
    };

    const saved = await storage.saveTeam(updated);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update team', details: err.message });
  }
});

// DELETE /api/teams/:id (Owner only)
router.delete('/teams/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await storage.getTeamById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    if (
      userId &&
      userId !== 'dev-user-123' &&
      existing.ownerId !== userId &&
      (!userEmail || existing.ownerEmail?.toLowerCase() !== userEmail.toLowerCase())
    ) {
      return res.status(403).json({ error: 'Only the team owner can delete this team' });
    }

    const deleted = await storage.deleteTeam(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Team not found' });
    }
    res.json({ message: 'Team deleted successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete team', details: err.message });
  }
});

// POST /api/teams/:id/share (Share team with another coach via email or userId)
router.post('/teams/:id/share', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await storage.getTeamById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    if (userId && !storage.hasTeamAccess(existing, userId, userEmail)) {
      return res.status(403).json({ error: 'Access denied: You do not have permission to share this team' });
    }

    const { email, role } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Valid email address is required to share' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let resolvedUserId: string | undefined = undefined;

    // 1. Attempt to resolve email to Firebase Auth user ID via Admin SDK
    try {
      const userRecord = await getAuth().getUserByEmail(normalizedEmail);
      if (userRecord && userRecord.uid) {
        resolvedUserId = userRecord.uid;
      }
    } catch {
      // User not found in Firebase Auth or unconfigured in test
    }

    // 2. Fallback: check storage adminUsers
    if (!resolvedUserId) {
      const adminUsers = await storage.getAdminUsers();
      const matched = adminUsers.find((u) => u.email?.trim().toLowerCase() === normalizedEmail);
      if (matched && matched.uid) {
        resolvedUserId = matched.uid;
      }
    }

    const updatedTeam = await storage.shareTeam(id, {
      email: normalizedEmail,
      userId: resolvedUserId,
      role: role || 'coach',
    });

    if (!updatedTeam) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({
      message: `Team successfully shared with ${email}`,
      team: updatedTeam,
      resolvedUserId,
      isPending: !resolvedUserId,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to share team', details: err.message });
  }
});

// DELETE /api/teams/:id/share/:memberIdOrEmail (Remove co-coach from shared team)
router.delete('/teams/:id/share/:memberIdOrEmail', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const memberIdOrEmail = req.params.memberIdOrEmail as string;
    const existing = await storage.getTeamById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    if (userId && !storage.hasTeamAccess(existing, userId, userEmail)) {
      return res.status(403).json({ error: 'Access denied: You do not have permission to modify team sharing' });
    }

    const updated = await storage.unshareTeam(id, memberIdOrEmail);
    if (!updated) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({
      message: `Member ${memberIdOrEmail} removed from team`,
      team: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to unshare team', details: err.message });
  }
});

// POST /api/teams/:id/seasons (Add a season to a team)
router.post('/teams/:id/seasons', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await storage.getTeamById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    if (userId && !storage.hasTeamAccess(existing, userId, userEmail)) {
      return res.status(403).json({ error: 'Access denied: Cannot add season to this team' });
    }

    const { season } = req.body;
    if (!season || typeof season !== 'string' || !season.trim()) {
      return res.status(400).json({ error: 'Season name is required' });
    }

    const updatedTeam = await storage.addSeason(id, season.trim());
    res.status(201).json(updatedTeam);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to add season', details: err.message });
  }
});

// ================= Formations Endpoints =================

// GET /api/formations?teamSize=7
router.get('/formations', (req: Request, res: Response) => {
  try {
    const teamSize = req.query.teamSize ? parseInt(req.query.teamSize as string, 10) : 7;
    const formations = getFormationsForTeamSize(teamSize);
    res.json(formations);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch formations', details: err.message });
  }
});

// POST /api/teams/:id/formations (Create custom formation for a team)
router.post('/teams/:id/formations', async (req: Request, res: Response) => {
  try {
    const teamId = req.params.id as string;
    const team = await storage.getTeamById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const formationData = req.body as Partial<Formation>;
    if (!formationData.name || !formationData.slots || formationData.slots.length === 0) {
      return res.status(400).json({ error: 'Formation name and slots are required' });
    }

    const newFormation: Formation = {
      id: formationData.id || `custom_${Date.now()}`,
      name: formationData.name.trim(),
      teamSize: formationData.teamSize || team.settings.pitchPlayerCount,
      slots: formationData.slots,
      isCustom: true,
    };

    const customFormations = team.settings.customFormations || [];
    team.settings.customFormations = [...customFormations, newFormation];
    await storage.saveTeam(team);

    res.status(201).json(newFormation);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create custom formation', details: err.message });
  }
});

// ================= Players Endpoints (Scoped by teamId) =================

// GET /api/players?teamId=...
router.get('/players', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teamId = req.query.teamId as string | undefined;
    const userId = req.user?.uid;
    const userEmail = req.user?.email;

    if (teamId) {
      const team = await storage.getTeamById(teamId);
      if (team && userId && !storage.hasTeamAccess(team, userId, userEmail)) {
        return res.status(403).json({ error: 'Access denied to team players' });
      }
      const players = await storage.getPlayers(teamId);
      return res.json(players.filter((p) => p.teamId === teamId));
    }

    // If no teamId, return only players belonging to user-accessible teams
    const accessibleTeams = await storage.getTeams(userId, userEmail);
    const accessibleTeamIds = new Set(accessibleTeams.map((t) => t.id));
    const allPlayers = await storage.getPlayers();
    const filteredPlayers = allPlayers.filter((p) => p.teamId && accessibleTeamIds.has(p.teamId));
    res.json(filteredPlayers);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch players', details: err.message });
  }
});

// POST /api/players
router.post('/players', requireActiveSubscription, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body as Partial<Player>;
    if (!body.name || !body.name.trim()) {
      return res.status(400).json({ error: 'Player name is required' });
    }
    if (!body.teamId || !body.teamId.trim()) {
      return res.status(400).json({ error: 'teamId is required' });
    }

    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    if (userId) {
      const team = await storage.getTeamById(body.teamId);
      if (team && !storage.hasTeamAccess(team, userId, userEmail)) {
        return res.status(403).json({ error: 'Access denied: Cannot add players to this team' });
      }
    }

    const newPlayer: Player = {
      id: body.id || `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      teamId: body.teamId.trim(),
      name: body.name.trim(),
      squadNumber: body.squadNumber,
      preferredPositions: body.preferredPositions || ['Midfield'],
      specificPositions: body.specificPositions || [],
      isFixedPosition: body.isFixedPosition,
      fixedPosition: body.fixedPosition,
      unavailableDates: body.unavailableDates || [],
      signOnDate: body.signOnDate,
      leaveDate: body.leaveDate,
      matchesPlayed: body.matchesPlayed || 0,
      totalMinutesPlayed: body.totalMinutesPlayed || 0,
    };

    const saved = await storage.savePlayer(newPlayer);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create player', details: err.message });
  }
});

// POST /api/players/bulk (Bulk import players)
router.post('/players/bulk', requireActiveSubscription, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { players: rawPlayers, teamId } = req.body as { players: Partial<Player>[]; teamId?: string };
    if (!Array.isArray(rawPlayers) || rawPlayers.length === 0) {
      return res.status(400).json({ error: 'Array of players is required' });
    }

    const resolvedTeamId = teamId || rawPlayers[0]?.teamId;
    if (!resolvedTeamId) {
      return res.status(400).json({ error: 'teamId is required for all players' });
    }

    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    if (userId) {
      const team = await storage.getTeamById(resolvedTeamId);
      if (team && !storage.hasTeamAccess(team, userId, userEmail)) {
        return res.status(403).json({ error: 'Access denied: Cannot add players to this team' });
      }
    }

    const createdPlayers: Player[] = rawPlayers.map((body) => ({
      id: body.id || `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      teamId: (body.teamId || resolvedTeamId).trim(),
      name: (body.name || 'Unnamed Player').trim(),
      squadNumber: body.squadNumber,
      preferredPositions: body.preferredPositions && body.preferredPositions.length > 0 ? body.preferredPositions : ['Midfield'],
      specificPositions: body.specificPositions || [],
      isFixedPosition: body.isFixedPosition,
      fixedPosition: body.fixedPosition,
      unavailableDates: body.unavailableDates || [],
      signOnDate: body.signOnDate,
      leaveDate: body.leaveDate,
      matchesPlayed: body.matchesPlayed || 0,
      totalMinutesPlayed: body.totalMinutesPlayed || 0,
      captainCount: body.captainCount || 0,
      playerOfTheMatchCount: body.playerOfTheMatchCount || 0,
    }));

    const saved = await storage.bulkSavePlayers(createdPlayers);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to bulk import players', details: err.message });
  }
});

// GET /api/players/:id
router.get('/players/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const player = await storage.getPlayerById(id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    if (player.teamId && userId) {
      const team = await storage.getTeamById(player.teamId);
      if (team && !storage.hasTeamAccess(team, userId, userEmail)) {
        return res.status(403).json({ error: 'Access denied to this player' });
      }
    }
    res.json(player);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch player', details: err.message });
  }
});

// PUT /api/players/:id
router.put('/players/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await storage.getPlayerById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    if (existing.teamId && userId) {
      const team = await storage.getTeamById(existing.teamId);
      if (team && !storage.hasTeamAccess(team, userId, userEmail)) {
        return res.status(403).json({ error: 'Access denied: Cannot modify player on this team' });
      }
    }

    const updated: Player = {
      ...existing,
      ...req.body,
      id,
    };

    const saved = await storage.savePlayer(updated);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update player', details: err.message });
  }
});

// DELETE /api/players/:id
router.delete('/players/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await storage.getPlayerById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    if (existing.teamId && userId) {
      const team = await storage.getTeamById(existing.teamId);
      if (team && !storage.hasTeamAccess(team, userId, userEmail)) {
        return res.status(403).json({ error: 'Access denied: Cannot delete player from this team' });
      }
    }

    const deleted = await storage.deletePlayer(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json({ message: 'Player deleted successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete player', details: err.message });
  }
});

// ================= Fixtures Endpoints (Scoped by teamId) =================

// GET /api/fixtures?teamId=...
router.get('/fixtures', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teamId = req.query.teamId as string | undefined;
    const userId = req.user?.uid;
    const userEmail = req.user?.email;

    if (teamId) {
      const team = await storage.getTeamById(teamId);
      if (team && userId && !storage.hasTeamAccess(team, userId, userEmail)) {
        return res.status(403).json({ error: 'Access denied to team fixtures' });
      }
      const fixtures = await storage.getFixtures(teamId);
      return res.json(fixtures.filter((f) => f.teamId === teamId));
    }

    // If no teamId, return only fixtures belonging to user-accessible teams
    const accessibleTeams = await storage.getTeams(userId, userEmail);
    const accessibleTeamIds = new Set(accessibleTeams.map((t) => t.id));
    const allFixtures = await storage.getFixtures();
    const filteredFixtures = allFixtures.filter((f) => f.teamId && accessibleTeamIds.has(f.teamId));
    res.json(filteredFixtures);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch fixtures', details: err.message });
  }
});

// GET /api/fixtures/:id
router.get('/fixtures/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const fixture = await storage.getFixtureById(id);
    if (!fixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }
    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    if (fixture.teamId && userId) {
      const team = await storage.getTeamById(fixture.teamId);
      if (team && !storage.hasTeamAccess(team, userId, userEmail)) {
        return res.status(403).json({ error: 'Access denied to this fixture' });
      }
    }
    res.json(fixture);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch fixture', details: err.message });
  }
});

// POST /api/fixtures
router.post('/fixtures', requireActiveSubscription, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body as Partial<Fixture>;
    if (!body.opponent || !body.opponent.trim() || !body.date) {
      return res.status(400).json({ error: 'Opponent and date are required' });
    }
    if (!body.teamId || !body.teamId.trim()) {
      return res.status(400).json({ error: 'teamId is required' });
    }

    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    if (userId) {
      const team = await storage.getTeamById(body.teamId);
      if (team && !storage.hasTeamAccess(team, userId, userEmail)) {
        return res.status(403).json({ error: 'Access denied: Cannot add fixtures to this team' });
      }
    }

    const groundAddress = body.groundAddress?.trim();
    const mapsUrl =
      body.mapsUrl ||
      (groundAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(groundAddress)}`
        : undefined);

    const newFixture: Fixture = {
      id: body.id || `fix_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      teamId: body.teamId.trim(),
      season: body.season || '2026/2027',
      date: body.date,
      kickOffTime: body.kickOffTime || '10:00',
      meetTime: body.meetTime || undefined,
      groundAddress: groundAddress || undefined,
      mapsUrl: mapsUrl || undefined,
      captainId: body.captainId || undefined,
      playerOfTheMatchId: body.playerOfTheMatchId || undefined,
      opponent: body.opponent.trim(),
      venue: body.venue || 'Home',
      status: body.status || 'Upcoming',
      matchdaySquadCap: body.matchdaySquadCap ? Number(body.matchdaySquadCap) : undefined,
      pitchPlayerCount: body.pitchPlayerCount ? Number(body.pitchPlayerCount) : undefined,
      matchPeriodCount: body.matchPeriodCount ? Number(body.matchPeriodCount) : undefined,
      periodDurationMinutes: body.periodDurationMinutes ? Number(body.periodDurationMinutes) : undefined,
      formation: body.formation?.trim() || undefined,
      fixedPlayerPositions: body.fixedPlayerPositions || undefined,
      subTimingMode: body.subTimingMode || undefined,
      preserveLineupAcrossBreaks:
        body.preserveLineupAcrossBreaks !== undefined
          ? Boolean(body.preserveLineupAcrossBreaks)
          : undefined,
      midPeriodSubIntervalMinutes: body.midPeriodSubIntervalMinutes
        ? Number(body.midPeriodSubIntervalMinutes)
        : undefined,
    };

    const saved = await storage.saveFixture(newFixture);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create fixture', details: err.message });
  }
});

// PUT /api/fixtures/:id
router.put('/fixtures/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await storage.getFixtureById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    if (existing.teamId && userId) {
      const team = await storage.getTeamById(existing.teamId);
      if (team && !storage.hasTeamAccess(team, userId, userEmail)) {
        return res.status(403).json({ error: 'Access denied: Cannot modify fixture on this team' });
      }
    }

    const groundAddress = req.body.groundAddress !== undefined ? req.body.groundAddress?.trim() : existing.groundAddress;
    const mapsUrl =
      req.body.mapsUrl ||
      (groundAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(groundAddress)}`
        : existing.mapsUrl);

    const matchdaySquadCap =
      req.body.matchdaySquadCap !== undefined
        ? (req.body.matchdaySquadCap ? Number(req.body.matchdaySquadCap) : undefined)
        : existing.matchdaySquadCap;

    const pitchPlayerCount =
      req.body.pitchPlayerCount !== undefined
        ? (req.body.pitchPlayerCount ? Number(req.body.pitchPlayerCount) : undefined)
        : existing.pitchPlayerCount;

    const matchPeriodCount =
      req.body.matchPeriodCount !== undefined
        ? (req.body.matchPeriodCount ? Number(req.body.matchPeriodCount) : undefined)
        : existing.matchPeriodCount;

    const periodDurationMinutes =
      req.body.periodDurationMinutes !== undefined
        ? (req.body.periodDurationMinutes ? Number(req.body.periodDurationMinutes) : undefined)
        : existing.periodDurationMinutes;

    const formation =
      req.body.formation !== undefined
        ? (req.body.formation?.trim() || undefined)
        : existing.formation;

    const fixedPlayerPositions =
      req.body.fixedPlayerPositions !== undefined
        ? req.body.fixedPlayerPositions
        : existing.fixedPlayerPositions;

    const subTimingMode =
      req.body.subTimingMode !== undefined
        ? (req.body.subTimingMode ? req.body.subTimingMode : undefined)
        : existing.subTimingMode;

    const preserveLineupAcrossBreaks =
      req.body.preserveLineupAcrossBreaks !== undefined
        ? (req.body.preserveLineupAcrossBreaks === null || req.body.preserveLineupAcrossBreaks === undefined
            ? undefined
            : Boolean(req.body.preserveLineupAcrossBreaks))
        : existing.preserveLineupAcrossBreaks;

    const midPeriodSubIntervalMinutes =
      req.body.midPeriodSubIntervalMinutes !== undefined
        ? (req.body.midPeriodSubIntervalMinutes ? Number(req.body.midPeriodSubIntervalMinutes) : undefined)
        : existing.midPeriodSubIntervalMinutes;

    const updated: Fixture = {
      ...existing,
      ...req.body,
      matchdaySquadCap,
      pitchPlayerCount,
      matchPeriodCount,
      periodDurationMinutes,
      formation,
      fixedPlayerPositions,
      subTimingMode,
      preserveLineupAcrossBreaks,
      midPeriodSubIntervalMinutes,
      groundAddress: groundAddress || undefined,
      mapsUrl: mapsUrl || undefined,
      id,
    };

    let saved = await storage.saveFixture(updated);
    if (saved.status === 'Completed' || saved.status === 'Played') {
      const resMinutes = await storage.applyFixtureMinutes(saved);
      saved = resMinutes.fixture;
    }
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update fixture', details: err.message });
  }
});

// PUT /api/fixtures/:id/fixed-positions (Lock/unlock players in position all match)
router.put('/fixtures/:id/fixed-positions', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { fixedPlayerPositions } = req.body as { fixedPlayerPositions?: Record<string, string> };
    const existing = await storage.getFixtureById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Fixture not found' });
    }
    existing.fixedPlayerPositions = fixedPlayerPositions;
    if (existing.matchSquad) {
      existing.matchSquad.fixedPlayerPositions = fixedPlayerPositions;
    }
    const saved = await storage.saveFixture(existing);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update fixed positions', details: err.message });
  }
});

// PUT /api/fixtures/:id/captain
router.put('/fixtures/:id/captain', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { captainId } = req.body as { captainId?: string };
    const existing = await storage.getFixtureById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Fixture not found' });
    }
    existing.captainId = captainId;
    const saved = await storage.saveFixture(existing);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update match captain', details: err.message });
  }
});

// PUT /api/fixtures/:id/player-of-the-match
router.put('/fixtures/:id/player-of-the-match', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { playerOfTheMatchId } = req.body as { playerOfTheMatchId?: string };
    const existing = await storage.getFixtureById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Fixture not found' });
    }
    existing.playerOfTheMatchId = playerOfTheMatchId;
    const saved = await storage.saveFixture(existing);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update player of the match', details: err.message });
  }
});

// DELETE /api/fixtures/:id
router.delete('/fixtures/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await storage.getFixtureById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    if (existing.teamId && userId) {
      const team = await storage.getTeamById(existing.teamId);
      if (team && !storage.hasTeamAccess(team, userId, userEmail)) {
        return res.status(403).json({ error: 'Access denied: Cannot delete fixture on this team' });
      }
    }

    const deleted = await storage.deleteFixture(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Fixture not found' });
    }
    res.json({ message: 'Fixture deleted successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete fixture', details: err.message });
  }
});

// PUT /api/fixtures/:id/squad (Manual overrides and lineup updates)
router.put('/fixtures/:id/squad', requireActiveSubscription, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const matchSquad = req.body as MatchSquad;
    if (!matchSquad || !matchSquad.lineupsByPeriod) {
      return res.status(400).json({ error: 'Invalid match squad payload' });
    }

    const existingFixture = await storage.getFixtureById(id);
    if (!existingFixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    const players = await storage.getPlayers(existingFixture.teamId);
    const settings = await storage.getSettings(existingFixture.teamId);
    const reconciledSquad = reconcileMatchSquadPlannedSubs(
      existingFixture,
      matchSquad,
      players,
      settings
    );

    const updatedFixture = await storage.updateMatchSquad(id, reconciledSquad);
    if (!updatedFixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    res.json(updatedFixture);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update match squad', details: err.message });
  }
});

// POST /api/fixtures/:id/auto-rotate
router.post('/fixtures/:id/auto-rotate', requireActiveSubscription, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const fixture = await storage.getFixtureById(id);
    if (!fixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    // Get players for this fixture's team
    const players = await storage.getPlayers(fixture.teamId);
    const settings = await storage.getSettings(fixture.teamId);
    const selectedPlayerIds = req.body.selectedPlayerIds as string[] | undefined;

    const generatedSquad = generateFairRotation(fixture, players, settings, selectedPlayerIds);
    const updatedFixture = await storage.updateMatchSquad(id, generatedSquad);

    res.json({
      message: 'Fair rotation generated successfully',
      matchSquad: generatedSquad,
      fixture: updatedFixture,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate fair rotation', details: err.message });
  }
});

// POST /api/fixtures/:id/early-departure (Dynamic Sub Rebalancer for mid-match injury / departure)
router.post('/fixtures/:id/early-departure', requireActiveSubscription, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const fixture = await storage.getFixtureById(id);
    if (!fixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    const team = await storage.getTeamById(fixture.teamId);
    if (team && userId && !storage.hasTeamAccess(team, userId, userEmail)) {
      return res.status(403).json({ error: 'Access denied: Cannot modify fixture for this team' });
    }

    if (!fixture.matchSquad) {
      return res.status(400).json({ error: 'Match squad has not been generated for this fixture yet' });
    }

    const {
      departedPlayerId,
      departurePeriod,
      minute,
      matchMinute,
      reason = 'injured',
      replacementPlayerId,
    } = req.body;

    if (!departedPlayerId || typeof departurePeriod !== 'number') {
      return res.status(400).json({ error: 'departedPlayerId and departurePeriod are required' });
    }

    const players = await storage.getPlayers(fixture.teamId);
    const settings = await storage.getSettings(fixture.teamId);

    const departedPlayer = players.find((p) => p.id === departedPlayerId);
    const replacementPlayer = replacementPlayerId
      ? players.find((p) => p.id === replacementPlayerId)
      : undefined;

    const duration = fixture.periodDurationMinutes || settings.periodDurationMinutes || 25;

    // Calculate pro-rated minutes for departed player
    const priorCompletedPeriods = fixture.matchSquad.lineupsByPeriod.filter(
      (l) => l.period < departurePeriod && l.onPitch.some((op) => op.playerId === departedPlayerId)
    ).length;
    const priorMinutes = priorCompletedPeriods * duration;

    const currentLineup = fixture.matchSquad.lineupsByPeriod.find((l) => l.period === departurePeriod);
    const wasOnPitch = Boolean(currentLineup?.onPitch.some((op) => op.playerId === departedPlayerId));

    const exitMinInPeriod = wasOnPitch
      ? typeof minute === 'number' && minute >= 0
        ? Math.min(duration, Math.max(1, Math.round(minute)))
        : duration
      : 0;

    const proRatedMinutes = priorMinutes + exitMinInPeriod;

    const calcMatchMinute =
      typeof matchMinute === 'number' && matchMinute >= 0
        ? Math.round(matchMinute)
        : (departurePeriod - 1) * duration + exitMinInPeriod;

    const departureEntry: EarlyDeparture = {
      playerId: departedPlayerId,
      playerName: departedPlayer?.name || 'Player',
      period: departurePeriod,
      minute: exitMinInPeriod,
      matchMinute: calcMatchMinute,
      reason: reason as 'injured' | 'left_early' | 'unwell',
      replacedByPlayerId: replacementPlayerId,
      replacedByPlayerName: replacementPlayer?.name,
      departedAt: new Date().toISOString(),
      proRatedMinutes,
    };

    // Rebalance remaining periods using the dynamic sub rebalancer engine
    const rebalancedSquad = rebalanceRemainingPeriods(
      fixture,
      players,
      settings,
      departedPlayerId,
      departurePeriod,
      replacementPlayerId
    );

    // Record departure in earlyDepartures on fixture
    const existingDepartures = (fixture.earlyDepartures || []).filter(
      (d) => d.playerId !== departedPlayerId
    );
    fixture.earlyDepartures = [...existingDepartures, departureEntry];
    fixture.matchSquad = rebalancedSquad;

    // Audit log entry in live match state subLog
    const minStr = String(Math.floor(calcMatchMinute)).padStart(2, '0');
    const timeFormatted = `${minStr}:00`;
    const actionDesc =
      wasOnPitch && replacementPlayer
        ? `🚨 INJURY / DEPARTURE: ${departureEntry.playerName} off (${departureEntry.reason}) ➡️ ON: ${replacementPlayer.name}`
        : `🚨 EARLY DEPARTURE: ${departureEntry.playerName} departed match (${departureEntry.reason})`;

    const subLogEntry = {
      id: `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      minute: calcMatchMinute,
      time: timeFormatted,
      period: departurePeriod,
      offPlayerId: departedPlayerId,
      offPlayerName: departureEntry.playerName,
      onPlayerId: replacementPlayerId || '',
      onPlayerName: replacementPlayer?.name || '',
      text: actionDesc,
      timestamp: new Date().toISOString(),
    };

    if (fixture.liveMatchState) {
      fixture.liveMatchState.subLog = [subLogEntry, ...(fixture.liveMatchState.subLog || [])];
    } else {
      fixture.liveMatchState = {
        isRunning: false,
        currentPeriod: departurePeriod,
        elapsedSeconds: 0,
        subLog: [subLogEntry],
      };
    }

    const updatedFixture = await storage.saveFixture(fixture);

    res.json({
      message: 'Dynamic sub rebalancing completed successfully',
      earlyDeparture: departureEntry,
      matchSquad: rebalancedSquad,
      fixture: updatedFixture,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to process early departure and rebalance', details: err.message });
  }
});

// GET /api/fixtures/:id/stats
router.get('/fixtures/:id/stats', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const fixture = await storage.getFixtureById(id);
    if (!fixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }
    if (!fixture.matchSquad) {
      return res.status(400).json({ error: 'Match squad has not been generated for this fixture yet' });
    }

    const players = await storage.getPlayers(fixture.teamId);
    const settings = await storage.getSettings(fixture.teamId);
    const stats = calculateMatchStats(fixture.matchSquad, players, settings, fixture.postMatchRecording, fixture);

    res.json({
      fixtureId: fixture.id,
      stats,
      targetPercent: settings.targetGameTimePercent,
      periodCount: fixture.matchPeriodCount || settings.matchPeriodCount,
      periodDuration: fixture.periodDurationMinutes || settings.periodDurationMinutes,
      pitchPlayerCount: fixture.pitchPlayerCount || settings.pitchPlayerCount,
      postMatchRecording: fixture.postMatchRecording,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to calculate stats', details: err.message });
  }
});

// PUT /api/fixtures/:id/post-match (Record actual in-game time or default 100% full credit)
router.put('/fixtures/:id/post-match', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const recording = req.body as PostMatchRecording;
    if (!recording || !recording.trackingMode) {
      return res.status(400).json({ error: 'Invalid post-match recording payload. trackingMode required.' });
    }

    const updated = await storage.updatePostMatchRecording(id, recording);
    if (!updated) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    res.json({
      message: 'Post-match playing time saved successfully',
      fixture: updated.fixture,
      updatedPlayers: updated.updatedPlayers,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save post-match recording', details: err.message });
  }
});

// PUT /api/fixtures/:id/score (Record final score and goal scorers or live-match updates)
router.put('/fixtures/:id/score', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const fixture = await storage.getFixtureById(id);
    if (!fixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    // Permission check: ensure user has team access if fixture belongs to a team and token is provided
    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    if (fixture.teamId && userId) {
      const team = await storage.getTeamById(fixture.teamId);
      if (team && !storage.hasTeamAccess(team, userId, userEmail)) {
        return res.status(403).json({ error: 'Access denied: only authorised coaches or organisers can record match scores' });
      }
    }

    const { homeScore, awayScore, scorers, status, isLive } = req.body as {
      homeScore: number;
      awayScore: number;
      scorers?: GoalScorer[];
      status?: Fixture['status'];
      isLive?: boolean;
    };

    // Validation: scores must be non-negative integers
    if (typeof homeScore !== 'number' || isNaN(homeScore) || homeScore < 0 || !Number.isInteger(homeScore)) {
      return res.status(400).json({ error: 'Home score must be a non-negative whole integer (>= 0)' });
    }
    if (typeof awayScore !== 'number' || isNaN(awayScore) || awayScore < 0 || !Number.isInteger(awayScore)) {
      return res.status(400).json({ error: 'Away score must be a non-negative whole integer (>= 0)' });
    }

    // Validation: scorers array and counts per team
    const validScorers: GoalScorer[] = [];
    if (scorers !== undefined) {
      if (!Array.isArray(scorers)) {
        return res.status(400).json({ error: 'Scorers must be provided as an array' });
      }

      for (let i = 0; i < scorers.length; i++) {
        const s = scorers[i];
        if (!s || (s.team !== 'home' && s.team !== 'away')) {
          return res.status(400).json({ error: `Scorer at index ${i} must have a valid team ('home' or 'away')` });
        }
        if (s.minute !== undefined && s.minute !== null && s.minute !== '') {
          const minuteStr = String(s.minute).trim();
          // Allow numeric or stoppage time formats like '45', '45+2', '90+4'
          const minuteRegex = /^\d+(\+\d+)?$/;
          if (!minuteRegex.test(minuteStr)) {
            return res.status(400).json({
              error: `Invalid goal minute '${s.minute}' at index ${i}. Must be numeric (e.g. 15) or stoppage time (e.g. 45+2)`,
            });
          }
        }
        validScorers.push({
          id: s.id || `scorer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          playerId: s.playerId?.trim() || undefined,
          playerName: s.playerName?.trim() || undefined,
          team: s.team,
          minute: s.minute !== undefined && s.minute !== null && s.minute !== '' ? String(s.minute).trim() : undefined,
          isOwnGoal: Boolean(s.isOwnGoal),
        });
      }

      const homeScorerCount = validScorers.filter((s) => s.team === 'home').length;
      const awayScorerCount = validScorers.filter((s) => s.team === 'away').length;

      if (homeScorerCount > homeScore) {
        return res.status(400).json({
          error: `Total home scorers (${homeScorerCount}) cannot exceed entered home score (${homeScore})`,
        });
      }
      if (awayScorerCount > awayScore) {
        return res.status(400).json({
          error: `Total away scorers (${awayScorerCount}) cannot exceed entered away score (${awayScore})`,
        });
      }
    }

    const updated = await storage.updateFixtureScore(id, {
      homeScore,
      awayScore,
      scorers: validScorers,
      status:
        status ||
        (isLive
          ? 'In Progress'
          : fixture.status === 'Upcoming' || fixture.status === 'In Progress'
          ? 'Completed'
          : fixture.status),
      isLive: isLive !== undefined ? isLive : false,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    let updatedPlayers: Player[] | undefined;
    if (updated.status === 'Completed' || updated.status === 'Played') {
      updatedPlayers = await storage.getPlayers(updated.teamId);
    }

    res.json({
      message: 'Fixture score and goal scorers saved successfully',
      fixture: updated,
      updatedPlayers,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save fixture score', details: err.message });
  }
});

// PUT /api/fixtures/:id/live-state (Persist live match timer, period timestamps, substitutions, and running state)
router.put('/fixtures/:id/live-state', requireActiveSubscription, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const fixture = await storage.getFixtureById(id);
    if (!fixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    if (fixture.teamId && userId) {
      const team = await storage.getTeamById(fixture.teamId);
      if (team && !storage.hasTeamAccess(team, userId, userEmail)) {
        return res.status(403).json({ error: 'Access denied: only authorised coaches or organisers can update live match state' });
      }
    }

    // Body can be { liveMatchState: LiveMatchState, matchSquad?: MatchSquad } or directly LiveMatchState
    const payload = req.body;
    const liveMatchState: LiveMatchState = payload?.liveMatchState || payload;
    const matchSquad: MatchSquad | undefined = payload?.matchSquad;

    if (!liveMatchState || typeof liveMatchState !== 'object') {
      return res.status(400).json({ error: 'Live match state payload is required' });
    }

    if (matchSquad && matchSquad.lineupsByPeriod) {
      await storage.updateMatchSquad(id, matchSquad);
    }

    const updated = await storage.updateLiveMatchState(id, liveMatchState);
    if (!updated) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    res.json({
      message: 'Live match state persisted successfully',
      fixture: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update live match state', details: err.message });
  }
});

// GET /api/fixtures/:id/live-status (Lightweight polling heartbeat with ETag / 304 conditional support)
router.get('/fixtures/:id/live-status', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const fixture = await storage.getFixtureById(id);
    if (!fixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    // Determine normalized match runtime status
    let status: LiveStatusResponse['status'] = 'upcoming';
    if (fixture.status === 'Completed' || fixture.status === 'Played') {
      status = 'completed';
    } else if (fixture.liveMatchState?.isRunning) {
      status = 'live';
    } else if (
      fixture.liveMatchState &&
      !fixture.liveMatchState.isRunning &&
      ((fixture.liveMatchState.elapsedSeconds || 0) > 0 || (fixture.liveMatchState.currentPeriod || 1) > 1)
    ) {
      status = 'paused';
    } else if (fixture.status === 'In Progress' || fixture.isLive) {
      status = 'live';
    } else {
      status = 'upcoming';
    }

    const period = fixture.liveMatchState?.currentPeriod ?? 1;
    const homeScore = fixture.homeScore ?? 0;
    const awayScore = fixture.awayScore ?? 0;
    const periodStartedAt = fixture.liveMatchState?.startedAt
      ? new Date(fixture.liveMatchState.startedAt).getTime()
      : null;
    const version = fixture.version ?? 1;
    const updatedAt =
      fixture.updatedAt ||
      fixture.liveMatchState?.updatedAt ||
      (fixture.date ? new Date(fixture.date).toISOString() : new Date().toISOString());

    // Generate ETag based on fixture ID, version, and updatedAt timestamp
    const timestampMs = new Date(updatedAt).getTime();
    const etag = `W/"${fixture.id}-${version}-${timestampMs}"`;

    // Edge CDN & Browser Caching Headers
    res.setHeader('Cache-Control', 'public, max-age=1, s-maxage=3, stale-while-revalidate=2');
    res.removeHeader('Pragma');
    res.removeHeader('Expires');
    res.setHeader('ETag', etag);
    res.setHeader('Access-Control-Expose-Headers', 'ETag');

    // HTTP Conditional Request Handling (If-None-Match)
    const clientEtag = req.headers['if-none-match'];
    if (clientEtag) {
      const cleanClient = clientEtag.replace(/^W\//, '').replace(/"/g, '').trim();
      const cleanServer = etag.replace(/^W\//, '').replace(/"/g, '').trim();
      if (cleanClient === cleanServer || clientEtag === etag) {
        return res.status(304).end();
      }
    }

    const payload: LiveStatusResponse = {
      status,
      period,
      homeScore,
      awayScore,
      periodStartedAt,
      version,
      updatedAt,
    };

    return res.status(200).json(payload);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch live match status', details: err.message });
  }
});

// GET /api/fixtures/:id/suggested-subs (Sideline substitution guide by interval)
router.get('/fixtures/:id/suggested-subs', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const interval = req.query.interval ? parseInt(req.query.interval as string, 10) : 10;
    const rawSubsPerWindow = req.query.subsPerWindow as string | undefined;
    let subsPerWindow: SubsPerWindowOption = 'auto';
    if (rawSubsPerWindow === 'all_bench' || rawSubsPerWindow === 'auto') {
      subsPerWindow = rawSubsPerWindow;
    } else if (rawSubsPerWindow) {
      const parsedCount = parseInt(rawSubsPerWindow, 10);
      if (!isNaN(parsedCount) && parsedCount >= 1) {
        subsPerWindow = parsedCount;
      }
    }
    const ensureEveryoneSubbedOnce = req.query.ensureEveryoneSubbedOnce === 'true';

    const fixture = await storage.getFixtureById(id);
    if (!fixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    const players = await storage.getPlayers(fixture.teamId);
    const settings = await storage.getSettings(fixture.teamId);
    const plans = generateSuggestedSubstitutions(fixture, players, settings, interval, {
      subsPerWindow,
      ensureEveryoneSubbedOnce,
    });

    res.json({
      fixtureId: fixture.id,
      interval,
      subsPerWindow,
      ensureEveryoneSubbedOnce,
      plans,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate suggested substitutions', details: err.message });
  }
});

// GET /api/fixtures/:id/export/whatsapp
router.get('/fixtures/:id/export/whatsapp', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const fixture = await storage.getFixtureById(id);
    if (!fixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    const players = await storage.getPlayers(fixture.teamId);
    const settings = await storage.getSettings(fixture.teamId);
    const announcementText = generateWhatsAppAnnouncement(fixture, players, settings);

    res.json({
      fixtureId: fixture.id,
      announcement: announcementText,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate announcement', details: err.message });
  }
});

// GET /api/changelog (Public changelog endpoint with cache-control)
router.get('/changelog', async (_req: Request, res: Response) => {
  try {
    const changelog = getChangelogData();
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.json(changelog);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve changelog', details: err.message });
  }
});

// ================= User Onboarding Endpoints =================

// GET /api/user/onboarding
router.get('/user/onboarding', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.json({ onboarding: DEFAULT_ONBOARDING_STATE });
    }
    const onboarding = await storage.getUserOnboarding(uid);
    res.json({ onboarding });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve onboarding state', details: err.message });
  }
});

// POST /api/user/onboarding
router.post('/user/onboarding', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const body = req.body as Partial<UserOnboardingState>;

    if (body.hasCompletedWizard !== undefined && typeof body.hasCompletedWizard !== 'boolean') {
      return res.status(400).json({ error: 'hasCompletedWizard must be a boolean' });
    }
    if (body.hasSeenTour !== undefined && typeof body.hasSeenTour !== 'boolean') {
      return res.status(400).json({ error: 'hasSeenTour must be a boolean' });
    }
    if (body.completedSteps !== undefined && !Array.isArray(body.completedSteps)) {
      return res.status(400).json({ error: 'completedSteps must be an array' });
    }

    if (!uid) {
      const onboarding: UserOnboardingState = {
        ...DEFAULT_ONBOARDING_STATE,
        ...body,
      };
      return res.json({ onboarding });
    }

    const onboarding = await storage.saveUserOnboarding(uid, body);
    res.json({ onboarding });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update onboarding state', details: err.message });
  }
});

export default router;
