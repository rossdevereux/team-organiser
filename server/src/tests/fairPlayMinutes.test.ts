import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import express from 'express';
import { storage } from '../db/storage.js';
import apiRouter from '../routes/api.js';
import { Player, PostMatchRecording } from '../types.js';

describe('Fair Play & Minutes Tracking Suite (Issue #15)', () => {
  let server: http.Server;
  let baseUrl: string;

  const teamAlphaId = 'team_fairplay_alpha';
  const teamBetaId = 'team_fairplay_beta';

  let playerA1: Player;
  let playerA2: Player;
  let playerB1: Player;

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api', apiRouter);

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await storage.deleteTeam(teamAlphaId);
    await storage.deleteTeam(teamBetaId);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(async () => {
    await storage.saveTeam({
      id: teamAlphaId,
      name: 'FairPlay Alpha FC',
      ageGroup: 'U10',
      ownerId: 'test_admin_fp',
      sharedWith: [],
      settings: {
        pitchPlayerCount: 7,
        matchdaySquadCap: 10,
        subCount: 3,
        matchPeriodCount: 2,
        periodDurationMinutes: 25,
        defaultFormation: '2-3-1',
        targetGameTimePercent: 50,
      },
    });

    await storage.saveTeam({
      id: teamBetaId,
      name: 'FairPlay Beta FC',
      ageGroup: 'U10',
      ownerId: 'test_admin_fp',
      sharedWith: [],
      settings: {
        pitchPlayerCount: 7,
        matchdaySquadCap: 10,
        subCount: 3,
        matchPeriodCount: 2,
        periodDurationMinutes: 25,
        defaultFormation: '2-3-1',
        targetGameTimePercent: 50,
      },
    });

    playerA1 = await storage.savePlayer({
      id: 'p_fp_a1',
      teamId: teamAlphaId,
      name: 'Alpha Striker',
      preferredPositions: ['Attack'],
      unavailableDates: [],
      matchesPlayed: 0,
      totalMinutesPlayed: 0,
    });

    playerA2 = await storage.savePlayer({
      id: 'p_fp_a2',
      teamId: teamAlphaId,
      name: 'Alpha Midfielder',
      preferredPositions: ['Midfield'],
      unavailableDates: [],
      matchesPlayed: 0,
      totalMinutesPlayed: 0,
    });

    playerB1 = await storage.savePlayer({
      id: 'p_fp_b1',
      teamId: teamBetaId,
      name: 'Beta Defender',
      preferredPositions: ['Defence'],
      unavailableDates: [],
      matchesPlayed: 0,
      totalMinutesPlayed: 0,
    });
  });

  it('updates Player.totalMinutesPlayed and matchesPlayed when postMatchRecording is saved in exact mode', async () => {
    const fixture = await storage.saveFixture({
      id: 'fix_fp_1',
      teamId: teamAlphaId,
      opponent: 'Rivals FC',
      venue: 'Home',
      date: '2026-10-25',
      status: 'Upcoming',
      matchPeriodCount: 2,
      periodDurationMinutes: 25,
      matchSquad: {
        fixtureId: 'fix_fp_1',
        selectedPlayerIds: [playerA1.id, playerA2.id],
        restedPlayerIds: [],
        manualOverrides: false,
        lineupsByPeriod: [
          {
            period: 1,
            onPitch: [{ playerId: playerA1.id, position: 'ATT' }],
            subs: [playerA2.id],
          },
          {
            period: 2,
            onPitch: [
              { playerId: playerA1.id, position: 'ATT' },
              { playerId: playerA2.id, position: 'MID' },
            ],
            subs: [],
          },
        ],
      },
    });

    const recording: PostMatchRecording = {
      trackingMode: 'exact',
      playerMinutes: {
        [playerA1.id]: 45,
        [playerA2.id]: 25,
      },
      recordedAt: new Date().toISOString(),
      notes: 'Good match',
    };

    const res = await storage.updatePostMatchRecording(fixture.id, recording);
    assert.ok(res);
    assert.equal(res.fixture.status, 'Completed');
    assert.deepEqual(res.fixture.creditedMinutes, {
      [playerA1.id]: 45,
      [playerA2.id]: 25,
    });

    const updatedA1 = await storage.getPlayerById(playerA1.id);
    const updatedA2 = await storage.getPlayerById(playerA2.id);

    assert.equal(updatedA1?.totalMinutesPlayed, 45);
    assert.equal(updatedA1?.matchesPlayed, 1);

    assert.equal(updatedA2?.totalMinutesPlayed, 25);
    assert.equal(updatedA2?.matchesPlayed, 1);
  });

  it('full_credit mode grants all selected players 100% total match minutes', async () => {
    const fixture = await storage.saveFixture({
      id: 'fix_fp_2',
      teamId: teamAlphaId,
      opponent: 'Tigers FC',
      venue: 'Away',
      date: '2026-10-26',
      status: 'Upcoming',
      matchPeriodCount: 2,
      periodDurationMinutes: 30, // 2 * 30 = 60 mins total
      matchSquad: {
        fixtureId: 'fix_fp_2',
        selectedPlayerIds: [playerA1.id, playerA2.id],
        restedPlayerIds: [],
        manualOverrides: false,
        lineupsByPeriod: [],
      },
    });

    const recording: PostMatchRecording = {
      trackingMode: 'full_credit',
      playerMinutes: {},
      recordedAt: new Date().toISOString(),
    };

    const res = await storage.updatePostMatchRecording(fixture.id, recording);
    assert.ok(res);

    const updatedA1 = await storage.getPlayerById(playerA1.id);
    const updatedA2 = await storage.getPlayerById(playerA2.id);

    assert.equal(updatedA1?.totalMinutesPlayed, 60);
    assert.equal(updatedA1?.matchesPlayed, 1);

    assert.equal(updatedA2?.totalMinutesPlayed, 60);
    assert.equal(updatedA2?.matchesPlayed, 1);
  });

  it('re-saving or editing postMatchRecording recalculates delta without duplicate minutes', async () => {
    const fixture = await storage.saveFixture({
      id: 'fix_fp_3',
      teamId: teamAlphaId,
      opponent: 'Lions FC',
      venue: 'Home',
      date: '2026-10-27',
      status: 'Upcoming',
      matchPeriodCount: 2,
      periodDurationMinutes: 25,
      matchSquad: {
        fixtureId: 'fix_fp_3',
        selectedPlayerIds: [playerA1.id, playerA2.id],
        restedPlayerIds: [],
        manualOverrides: false,
        lineupsByPeriod: [],
      },
    });

    // Initial save: 30 mins for A1, 20 mins for A2
    await storage.updatePostMatchRecording(fixture.id, {
      trackingMode: 'exact',
      playerMinutes: {
        [playerA1.id]: 30,
        [playerA2.id]: 20,
      },
      recordedAt: new Date().toISOString(),
    });

    let a1 = await storage.getPlayerById(playerA1.id);
    assert.equal(a1?.totalMinutesPlayed, 30);
    assert.equal(a1?.matchesPlayed, 1);

    // Coach adjusts minutes: A1 gets 40 (+10), A2 gets 15 (-5)
    await storage.updatePostMatchRecording(fixture.id, {
      trackingMode: 'exact',
      playerMinutes: {
        [playerA1.id]: 40,
        [playerA2.id]: 15,
      },
      recordedAt: new Date().toISOString(),
    });

    a1 = await storage.getPlayerById(playerA1.id);
    const a2 = await storage.getPlayerById(playerA2.id);

    assert.equal(a1?.totalMinutesPlayed, 40); // 30 + (40 - 30) = 40
    assert.equal(a1?.matchesPlayed, 1);

    assert.equal(a2?.totalMinutesPlayed, 15); // 20 + (15 - 20) = 15
    assert.equal(a2?.matchesPlayed, 1);
  });

  it('deleting a fixture rolls back credited minutes from player season totals', async () => {
    const fixture = await storage.saveFixture({
      id: 'fix_fp_4',
      teamId: teamAlphaId,
      opponent: 'Bears FC',
      venue: 'Home',
      date: '2026-10-28',
      status: 'Upcoming',
      matchPeriodCount: 2,
      periodDurationMinutes: 25,
      matchSquad: {
        fixtureId: 'fix_fp_4',
        selectedPlayerIds: [playerA1.id],
        restedPlayerIds: [],
        manualOverrides: false,
        lineupsByPeriod: [],
      },
    });

    await storage.updatePostMatchRecording(fixture.id, {
      trackingMode: 'exact',
      playerMinutes: { [playerA1.id]: 50 },
      recordedAt: new Date().toISOString(),
    });

    let a1 = await storage.getPlayerById(playerA1.id);
    assert.equal(a1?.totalMinutesPlayed, 50);
    assert.equal(a1?.matchesPlayed, 1);

    // Delete fixture
    await storage.deleteFixture(fixture.id);

    a1 = await storage.getPlayerById(playerA1.id);
    assert.equal(a1?.totalMinutesPlayed, 0);
    assert.equal(a1?.matchesPlayed, 0);
  });

  it('isolates fixture minutes strictly between teams', async () => {
    const fixAlpha = await storage.saveFixture({
      id: 'fix_fp_alpha',
      teamId: teamAlphaId,
      opponent: 'Alpha Rivals',
      venue: 'Home',
      date: '2026-10-29',
      status: 'Upcoming',
      matchPeriodCount: 2,
      periodDurationMinutes: 25,
      matchSquad: {
        fixtureId: 'fix_fp_alpha',
        selectedPlayerIds: [playerA1.id],
        restedPlayerIds: [],
        manualOverrides: false,
        lineupsByPeriod: [],
      },
    });

    await storage.updatePostMatchRecording(fixAlpha.id, {
      trackingMode: 'exact',
      playerMinutes: { [playerA1.id]: 50 },
      recordedAt: new Date().toISOString(),
    });

    const a1 = await storage.getPlayerById(playerA1.id);
    const b1 = await storage.getPlayerById(playerB1.id);

    assert.equal(a1?.totalMinutesPlayed, 50);
    assert.equal(a1?.matchesPlayed, 1);

    // Beta player remains untouched at 0
    assert.equal(b1?.totalMinutesPlayed, 0);
    assert.equal(b1?.matchesPlayed, 0);
  });

  it('PUT /api/fixtures/:id/post-match returns updated fixture and updatedPlayers array', async () => {
    const fixture = await storage.saveFixture({
      id: 'fix_fp_api',
      teamId: teamAlphaId,
      opponent: 'API FC',
      venue: 'Home',
      date: '2026-10-30',
      status: 'Upcoming',
      matchPeriodCount: 2,
      periodDurationMinutes: 25,
      matchSquad: {
        fixtureId: 'fix_fp_api',
        selectedPlayerIds: [playerA1.id, playerA2.id],
        restedPlayerIds: [],
        manualOverrides: false,
        lineupsByPeriod: [],
      },
    });

    const res = await fetch(`${baseUrl}/api/fixtures/${fixture.id}/post-match`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingMode: 'exact',
        playerMinutes: {
          [playerA1.id]: 35,
          [playerA2.id]: 35,
        },
      }),
    });

    assert.equal(res.status, 200);
    const data: any = await res.json();
    assert.ok(data.fixture);
    assert.equal(data.fixture.status, 'Completed');
    assert.ok(Array.isArray(data.updatedPlayers));
    assert.equal(data.updatedPlayers.length, 2);

    const returnedA1 = data.updatedPlayers.find((p: any) => p.id === playerA1.id);
    assert.equal(returnedA1.totalMinutesPlayed, 35);
    assert.equal(returnedA1.matchesPlayed, 1);
  });
});
