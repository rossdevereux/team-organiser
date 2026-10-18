import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import express from 'express';
import { storage } from '../db/storage.js';
import apiRouter from '../routes/api.js';
import { Team, Player, Fixture } from '../types.js';

describe('Team Data Isolation Suite (Issue #13)', () => {
  let server: http.Server;
  let baseUrl: string;

  const teamAlphaId = 'team_iso_alpha';
  const teamBetaId = 'team_iso_beta';

  const teamAlpha: Team = {
    id: teamAlphaId,
    name: 'Alpha Rovers U10',
    ageGroup: 'U10',
    ownerId: 'coach_alpha',
    ownerEmail: 'coach.alpha@isolation.local',
    sharedWith: [],
    settings: {
      pitchPlayerCount: 7,
      matchdaySquadCap: 10,
      subCount: 3,
      matchPeriodCount: 2,
      periodDurationMinutes: 25,
      targetGameTimePercent: 50,
      defaultFormation: '2-3-1',
      customFormations: [],
    },
    createdAt: new Date().toISOString(),
  };

  const teamBeta: Team = {
    id: teamBetaId,
    name: 'Beta Wanderers U12',
    ageGroup: 'U12',
    ownerId: 'coach_alpha',
    ownerEmail: 'coach.alpha@isolation.local',
    sharedWith: [],
    settings: {
      pitchPlayerCount: 9,
      matchdaySquadCap: 12,
      subCount: 3,
      matchPeriodCount: 2,
      periodDurationMinutes: 30,
      targetGameTimePercent: 50,
      defaultFormation: '3-3-2',
      customFormations: [],
    },
    createdAt: new Date().toISOString(),
  };

  before(async () => {
    // Spin up an ephemeral Express HTTP test server using apiRouter
    const app = express();
    app.use(express.json());
    app.use('/api', apiRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    // Clean up test teams and close ephemeral server
    await storage.deleteTeam(teamAlphaId);
    await storage.deleteTeam(teamBetaId);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(async () => {
    // Reset test teams in storage
    await storage.saveTeam(teamAlpha);
    await storage.saveTeam(teamBeta);
  });

  describe('Storage Layer Scoping', () => {
    it('returns empty array when querying players for a newly created secondary team', async () => {
      const players = await storage.getPlayers(teamBetaId);
      assert.deepStrictEqual(players, []);
    });

    it('returns empty array when querying fixtures for a newly created secondary team', async () => {
      const fixtures = await storage.getFixtures(teamBetaId);
      assert.deepStrictEqual(fixtures, []);
    });

    it('isolates players strictly between teams', async () => {
      const playerAlpha: Player = {
        id: 'player_alpha_1',
        teamId: teamAlphaId,
        name: 'Alpha Striker',
        squadNumber: 9,
        preferredPositions: ['Attack'],
        specificPositions: ['Striker'],
        unavailableDates: [],
        matchesPlayed: 1,
        totalMinutesPlayed: 25,
      };

      await storage.savePlayer(playerAlpha);

      const alphaPlayers = await storage.getPlayers(teamAlphaId);
      const betaPlayers = await storage.getPlayers(teamBetaId);

      assert.equal(alphaPlayers.some((p) => p.id === 'player_alpha_1'), true);
      assert.equal(betaPlayers.some((p) => p.id === 'player_alpha_1'), false);

      // Clean up
      await storage.deletePlayer('player_alpha_1');
    });

    it('isolates fixtures strictly between teams', async () => {
      const fixtureAlpha: Fixture = {
        id: 'fix_alpha_1',
        teamId: teamAlphaId,
        date: '2026-11-01',
        opponent: 'Alpha Valley FC',
        venue: 'Home',
        status: 'Upcoming',
      };

      await storage.saveFixture(fixtureAlpha);

      const alphaFixtures = await storage.getFixtures(teamAlphaId);
      const betaFixtures = await storage.getFixtures(teamBetaId);

      assert.equal(alphaFixtures.some((f) => f.id === 'fix_alpha_1'), true);
      assert.equal(betaFixtures.some((f) => f.id === 'fix_alpha_1'), false);

      // Clean up
      await storage.deleteFixture('fix_alpha_1');
    });
  });

  describe('API Endpoints Validation & Scoping', () => {
    it('POST /api/players returns 400 if teamId is missing', async () => {
      const res = await fetch(`${baseUrl}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Player Without Team',
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.error, 'teamId is required');
    });

    it('POST /api/players returns 400 if teamId is empty string', async () => {
      const res = await fetch(`${baseUrl}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Player Empty Team',
          teamId: '   ',
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.error, 'teamId is required');
    });

    it('POST /api/fixtures returns 400 if teamId is missing', async () => {
      const res = await fetch(`${baseUrl}/fixtures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opponent: 'Rival Wanderers',
          date: '2026-11-15',
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.error, 'teamId is required');
    });

    it('POST /api/fixtures returns 400 if teamId is whitespace', async () => {
      const res = await fetch(`${baseUrl}/fixtures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opponent: 'Rival Wanderers',
          date: '2026-11-15',
          teamId: '  ',
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.error, 'teamId is required');
    });

    it('POST /api/players/bulk returns 400 if teamId is completely missing', async () => {
      const res = await fetch(`${baseUrl}/players/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          players: [{ name: 'Bulk Player 1' }, { name: 'Bulk Player 2' }],
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.error, 'teamId is required for all players');
    });

    it('GET /api/players?teamId=... returns empty array for new secondary team', async () => {
      const res = await fetch(`${baseUrl}/players?teamId=${teamBetaId}`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.deepStrictEqual(data, []);
    });

    it('GET /api/fixtures?teamId=... returns empty array for new secondary team', async () => {
      const res = await fetch(`${baseUrl}/fixtures?teamId=${teamBetaId}`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.deepStrictEqual(data, []);
    });

    it('handles sequential alternating team queries without cross-team cache leakage', async () => {
      const pAlpha1: Player = {
        id: 'p_seq_alpha_1',
        teamId: teamAlphaId,
        name: 'Alpha Sequential 1',
        preferredPositions: ['Midfield'],
        unavailableDates: [],
        matchesPlayed: 0,
        totalMinutesPlayed: 0,
      };
      const pBeta1: Player = {
        id: 'p_seq_beta_1',
        teamId: teamBetaId,
        name: 'Beta Sequential 1',
        preferredPositions: ['Defence'],
        unavailableDates: [],
        matchesPlayed: 0,
        totalMinutesPlayed: 0,
      };

      await storage.savePlayer(pAlpha1);
      await storage.savePlayer(pBeta1);

      // Query Alpha -> only Alpha player
      const resA1 = await fetch(`${baseUrl}/players?teamId=${teamAlphaId}`);
      const dataA1 = (await resA1.json()) as Player[];
      assert.equal(dataA1.some((p) => p.id === 'p_seq_alpha_1'), true);
      assert.equal(dataA1.some((p) => p.id === 'p_seq_beta_1'), false);

      // Query Beta -> only Beta player
      const resB1 = await fetch(`${baseUrl}/players?teamId=${teamBetaId}`);
      const dataB1 = (await resB1.json()) as Player[];
      assert.equal(dataB1.some((p) => p.id === 'p_seq_beta_1'), true);
      assert.equal(dataB1.some((p) => p.id === 'p_seq_alpha_1'), false);

      // Query Alpha again -> Beta player has not leaked into Alpha cache
      const resA2 = await fetch(`${baseUrl}/players?teamId=${teamAlphaId}`);
      const dataA2 = (await resA2.json()) as Player[];
      assert.equal(dataA2.some((p) => p.id === 'p_seq_alpha_1'), true);
      assert.equal(dataA2.some((p) => p.id === 'p_seq_beta_1'), false);

      // Clean up
      await storage.deletePlayer('p_seq_alpha_1');
      await storage.deletePlayer('p_seq_beta_1');
    });

    it('creating player via API on Team Alpha is invisible to Team Beta queries', async () => {
      const createRes = await fetch(`${baseUrl}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Isolating Striker',
          teamId: teamAlphaId,
          preferredPositions: ['Attack'],
        }),
      });
      assert.equal(createRes.status, 201);
      const created = (await createRes.json()) as Player;

      // Query Beta
      const betaRes = await fetch(`${baseUrl}/players?teamId=${teamBetaId}`);
      const betaPlayers = (await betaRes.json()) as Player[];
      assert.equal(betaPlayers.some((p) => p.id === created.id), false);

      // Query Alpha
      const alphaRes = await fetch(`${baseUrl}/players?teamId=${teamAlphaId}`);
      const alphaPlayers = (await alphaRes.json()) as Player[];
      assert.equal(alphaPlayers.some((p) => p.id === created.id), true);

      // Clean up
      await storage.deletePlayer(created.id);
    });
  });
});
