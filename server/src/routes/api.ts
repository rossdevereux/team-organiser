import { Router, Request, Response } from 'express';
import { storage } from '../db/storage.js';
import {
  generateFairRotation,
  calculateMatchStats,
  generateWhatsAppAnnouncement,
  generateSuggestedSubstitutions,
} from '../services/rotationService.js';
import { getFormationsForTeamSize, DEFAULT_FORMATIONS } from '../db/formations.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { Player, TeamSettings, Fixture, MatchSquad, Team, Formation, PostMatchRecording } from '../types.js';

const router = Router();

// Apply optionalAuth to all routes so req.user is populated if token is present
router.use(optionalAuth);

// ================= Teams Endpoints (Multi-Team & User Isolation) =================

// GET /api/teams (Returns teams owned by or shared with logged-in user)
router.get('/teams', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    const teams = await storage.getTeams(userId, userEmail);
    res.json(teams);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch teams', details: err.message });
  }
});

// POST /api/teams (Create a new team)
router.post('/teams', async (req: AuthenticatedRequest, res: Response) => {
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

// POST /api/teams/:id/share (Share team with another coach via email)
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

    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid email address is required to share' });
    }

    const updatedTeam = await storage.shareTeam(id, email);
    if (!updatedTeam) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({
      message: `Team successfully shared with ${email}`,
      team: updatedTeam,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to share team', details: err.message });
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
      return res.json(players);
    }

    // If no teamId, return only players belonging to user-accessible teams
    const accessibleTeams = await storage.getTeams(userId, userEmail);
    const accessibleTeamIds = new Set(accessibleTeams.map((t) => t.id));
    const allPlayers = await storage.getPlayers();
    const filteredPlayers = allPlayers.filter((p) => !p.teamId || accessibleTeamIds.has(p.teamId));
    res.json(filteredPlayers);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch players', details: err.message });
  }
});

// POST /api/players
router.post('/players', async (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<Player>;
    if (!body.name) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    const newPlayer: Player = {
      id: body.id || `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      teamId: body.teamId,
      name: body.name.trim(),
      squadNumber: body.squadNumber,
      preferredPositions: body.preferredPositions || ['Midfield'],
      specificPositions: body.specificPositions || [],
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
router.post('/players/bulk', async (req: Request, res: Response) => {
  try {
    const { players: rawPlayers, teamId } = req.body as { players: Partial<Player>[]; teamId?: string };
    if (!Array.isArray(rawPlayers) || rawPlayers.length === 0) {
      return res.status(400).json({ error: 'Array of players is required' });
    }

    const createdPlayers: Player[] = rawPlayers.map((body) => ({
      id: body.id || `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      teamId: body.teamId || teamId,
      name: (body.name || 'Unnamed Player').trim(),
      squadNumber: body.squadNumber,
      preferredPositions: body.preferredPositions && body.preferredPositions.length > 0 ? body.preferredPositions : ['Midfield'],
      specificPositions: body.specificPositions || [],
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
router.get('/players/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const player = await storage.getPlayerById(id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json(player);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch player', details: err.message });
  }
});

// PUT /api/players/:id
router.put('/players/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await storage.getPlayerById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Player not found' });
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
router.delete('/players/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
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
      return res.json(fixtures);
    }

    // If no teamId, return only fixtures belonging to user-accessible teams
    const accessibleTeams = await storage.getTeams(userId, userEmail);
    const accessibleTeamIds = new Set(accessibleTeams.map((t) => t.id));
    const allFixtures = await storage.getFixtures();
    const filteredFixtures = allFixtures.filter((f) => !f.teamId || accessibleTeamIds.has(f.teamId));
    res.json(filteredFixtures);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch fixtures', details: err.message });
  }
});

// GET /api/fixtures/:id
router.get('/fixtures/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const fixture = await storage.getFixtureById(id);
    if (!fixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }
    res.json(fixture);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch fixture', details: err.message });
  }
});

// POST /api/fixtures
router.post('/fixtures', async (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<Fixture>;
    if (!body.opponent || !body.date) {
      return res.status(400).json({ error: 'Opponent and date are required' });
    }

    const groundAddress = body.groundAddress?.trim();
    const mapsUrl =
      body.mapsUrl ||
      (groundAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(groundAddress)}`
        : undefined);

    const newFixture: Fixture = {
      id: body.id || `fix_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      teamId: body.teamId,
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
    };

    const saved = await storage.saveFixture(newFixture);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create fixture', details: err.message });
  }
});

// PUT /api/fixtures/:id
router.put('/fixtures/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await storage.getFixtureById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    const groundAddress = req.body.groundAddress !== undefined ? req.body.groundAddress?.trim() : existing.groundAddress;
    const mapsUrl =
      req.body.mapsUrl ||
      (groundAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(groundAddress)}`
        : existing.mapsUrl);

    const updated: Fixture = {
      ...existing,
      ...req.body,
      groundAddress: groundAddress || undefined,
      mapsUrl: mapsUrl || undefined,
      id,
    };

    const saved = await storage.saveFixture(updated);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update fixture', details: err.message });
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
router.delete('/fixtures/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
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
router.put('/fixtures/:id/squad', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const matchSquad = req.body as MatchSquad;
    if (!matchSquad || !matchSquad.lineupsByPeriod) {
      return res.status(400).json({ error: 'Invalid match squad payload' });
    }

    const updatedFixture = await storage.updateMatchSquad(id, matchSquad);
    if (!updatedFixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    res.json(updatedFixture);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update match squad', details: err.message });
  }
});

// POST /api/fixtures/:id/auto-rotate
router.post('/fixtures/:id/auto-rotate', async (req: Request, res: Response) => {
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
    const stats = calculateMatchStats(fixture.matchSquad, players, settings, fixture.postMatchRecording);

    res.json({
      fixtureId: fixture.id,
      stats,
      targetPercent: settings.targetGameTimePercent,
      periodCount: settings.matchPeriodCount,
      periodDuration: settings.periodDurationMinutes,
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
      fixture: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save post-match recording', details: err.message });
  }
});

// GET /api/fixtures/:id/suggested-subs (Sideline substitution guide by interval)
router.get('/fixtures/:id/suggested-subs', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const interval = req.query.interval ? parseInt(req.query.interval as string, 10) : 10;
    const fixture = await storage.getFixtureById(id);
    if (!fixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    const players = await storage.getPlayers(fixture.teamId);
    const settings = await storage.getSettings(fixture.teamId);
    const plans = generateSuggestedSubstitutions(fixture, players, settings, interval);

    res.json({
      fixtureId: fixture.id,
      interval,
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

export default router;
