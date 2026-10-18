import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import express from 'express';
import { storage } from '../db/storage.js';
import apiRouter from '../routes/api.js';
import { Fixture, LiveMatchState, MatchSquad } from '../types.js';

describe('Live Match State & Synchronized Timer Suite (Issue #14)', () => {
  let server: http.Server;
  let baseUrl: string;

  const testFixtureId = 'fix_test_live_state_1';
  const testTeamId = 'team-1';

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
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(async () => {
    // Setup a clean test fixture
    const initialFixture: Fixture = {
      id: testFixtureId,
      teamId: testTeamId,
      season: '2026/2027',
      date: '2026-10-25',
      opponent: 'Oakwood Rovers',
      venue: 'Home',
      status: 'Upcoming',
      matchPeriodCount: 2,
      periodDurationMinutes: 25,
      matchSquad: {
        fixtureId: testFixtureId,
        selectedPlayerIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'],
        restedPlayerIds: [],
        manualOverrides: false,
        lineupsByPeriod: [
          {
            period: 1,
            onPitch: [
              { playerId: 'p1', position: 'GK' },
              { playerId: 'p2', position: 'DEF' },
              { playerId: 'p3', position: 'DEF' },
              { playerId: 'p4', position: 'MID' },
              { playerId: 'p5', position: 'MID' },
              { playerId: 'p6', position: 'ATT' },
              { playerId: 'p7', position: 'ATT' },
            ],
            subs: ['p8'],
          },
          {
            period: 2,
            onPitch: [
              { playerId: 'p1', position: 'GK' },
              { playerId: 'p2', position: 'DEF' },
              { playerId: 'p3', position: 'DEF' },
              { playerId: 'p4', position: 'MID' },
              { playerId: 'p5', position: 'MID' },
              { playerId: 'p8', position: 'ATT' },
              { playerId: 'p7', position: 'ATT' },
            ],
            subs: ['p6'],
          },
        ],
      },
    };
    await storage.saveFixture(initialFixture);
  });

  it('persists running live match state and marks fixture as In Progress / isLive', async () => {
    const startedAt = new Date().toISOString();
    const liveState: LiveMatchState = {
      isRunning: true,
      currentPeriod: 1,
      startedAt,
      elapsedSeconds: 0,
      periodTimers: {
        1: { isRunning: true, startedAt, elapsedSeconds: 0 },
      },
      subLog: [],
    };

    const updated = await storage.updateLiveMatchState(testFixtureId, liveState);

    assert.ok(updated);
    assert.equal(updated.isLive, true);
    assert.equal(updated.status, 'In Progress');
    assert.ok(updated.liveMatchState);
    assert.equal(updated.liveMatchState.isRunning, true);
    assert.equal(updated.liveMatchState.currentPeriod, 1);
    assert.equal(updated.liveMatchState.startedAt, startedAt);
    assert.equal(updated.liveMatchState.elapsedSeconds, 0);
    assert.ok(updated.liveMatchState.updatedAt);
  });

  it('persists paused timer state with accumulated elapsedSeconds', async () => {
    const liveState: LiveMatchState = {
      isRunning: false,
      currentPeriod: 1,
      startedAt: undefined,
      elapsedSeconds: 620, // 10m 20s
      periodTimers: {
        1: { isRunning: false, startedAt: undefined, elapsedSeconds: 620 },
      },
      subLog: [],
    };

    const updated = await storage.updateLiveMatchState(testFixtureId, liveState);

    assert.ok(updated);
    assert.ok(updated.liveMatchState);
    assert.equal(updated.liveMatchState.isRunning, false);
    assert.equal(updated.liveMatchState.startedAt, undefined);
    assert.equal(updated.liveMatchState.elapsedSeconds, 620);
    assert.equal(updated.liveMatchState.periodTimers?.[1].elapsedSeconds, 620);
  });

  it('records in-match substitution log entries and maintains sub history', async () => {
    const liveState: LiveMatchState = {
      isRunning: true,
      currentPeriod: 1,
      startedAt: new Date().toISOString(),
      elapsedSeconds: 600,
      subLog: [
        {
          id: 'sub_1',
          minute: 10,
          time: '10:00',
          period: 1,
          offPlayerId: 'p6',
          offPlayerName: 'Player Six',
          onPlayerId: 'p8',
          onPlayerName: 'Player Eight',
          position: 'ATT',
          text: 'OFF: Player Six ➡️ ON: Player Eight (ATT)',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const updated = await storage.updateLiveMatchState(testFixtureId, liveState);

    assert.ok(updated?.liveMatchState?.subLog);
    assert.equal(updated.liveMatchState.subLog.length, 1);
    assert.equal(updated.liveMatchState.subLog[0].offPlayerId, 'p6');
    assert.equal(updated.liveMatchState.subLog[0].onPlayerId, 'p8');
    assert.equal(updated.liveMatchState.subLog[0].minute, 10);
  });

  it('tracks distinct timers across multiple match periods', async () => {
    const liveState: LiveMatchState = {
      isRunning: true,
      currentPeriod: 2,
      startedAt: new Date().toISOString(),
      elapsedSeconds: 120, // 2 minutes into second half
      periodTimers: {
        1: { isRunning: false, startedAt: undefined, elapsedSeconds: 1500 }, // Period 1 completed 25 mins
        2: { isRunning: true, startedAt: new Date().toISOString(), elapsedSeconds: 120 },
      },
      subLog: [],
    };

    const updated = await storage.updateLiveMatchState(testFixtureId, liveState);

    assert.ok(updated?.liveMatchState?.periodTimers);
    assert.equal(updated.liveMatchState.currentPeriod, 2);
    assert.equal(updated.liveMatchState.periodTimers[1].elapsedSeconds, 1500);
    assert.equal(updated.liveMatchState.periodTimers[1].isRunning, false);
    assert.equal(updated.liveMatchState.periodTimers[2].elapsedSeconds, 120);
    assert.equal(updated.liveMatchState.periodTimers[2].isRunning, true);
  });

  it('PUT /api/fixtures/:id/live-state persists live match state via HTTP endpoint', async () => {
    const startedAt = new Date().toISOString();
    const liveState: LiveMatchState = {
      isRunning: true,
      currentPeriod: 1,
      startedAt,
      elapsedSeconds: 0,
      periodTimers: {
        1: { isRunning: true, startedAt, elapsedSeconds: 0 },
      },
      subLog: [],
    };

    const res = await fetch(`${baseUrl}/api/fixtures/${testFixtureId}/live-state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(liveState),
    });

    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.ok(body.fixture);
    assert.equal(body.fixture.isLive, true);
    assert.equal(body.fixture.liveMatchState.isRunning, true);
    assert.equal(body.fixture.liveMatchState.startedAt, startedAt);
  });

  it('PUT /api/fixtures/:id/live-state simultaneously persists in-match substitutions and squad changes', async () => {
    const initial = await storage.getFixtureById(testFixtureId);
    assert.ok(initial?.matchSquad);

    const updatedSquad: MatchSquad = {
      ...initial.matchSquad,
      manualOverrides: true,
      lineupsByPeriod: [
        {
          period: 1,
          onPitch: [
            { playerId: 'p1', position: 'GK' },
            { playerId: 'p2', position: 'DEF' },
            { playerId: 'p3', position: 'DEF' },
            { playerId: 'p4', position: 'MID' },
            { playerId: 'p5', position: 'MID' },
            { playerId: 'p8', position: 'ATT' }, // p8 swapped onto pitch
            { playerId: 'p7', position: 'ATT' },
          ],
          subs: ['p6'], // p6 off
        },
        initial.matchSquad.lineupsByPeriod[1],
      ],
    };

    const liveState: LiveMatchState = {
      isRunning: true,
      currentPeriod: 1,
      startedAt: new Date().toISOString(),
      elapsedSeconds: 600,
      subLog: [
        {
          id: 'sub_live_1',
          minute: 10,
          time: '10:00',
          period: 1,
          offPlayerId: 'p6',
          offPlayerName: 'Player Six',
          onPlayerId: 'p8',
          onPlayerName: 'Player Eight',
          position: 'ATT',
          text: 'OFF: Player Six ➡️ ON: Player Eight (ATT)',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const res = await fetch(`${baseUrl}/api/fixtures/${testFixtureId}/live-state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        liveMatchState: liveState,
        matchSquad: updatedSquad,
      }),
    });

    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.ok(body.fixture);
    // Verified match squad was updated
    assert.equal(body.fixture.matchSquad.lineupsByPeriod[0].subs[0], 'p6');
    assert.equal(body.fixture.matchSquad.lineupsByPeriod[0].onPitch[5].playerId, 'p8');
    // Verified sub log was updated
    assert.equal(body.fixture.liveMatchState.subLog.length, 1);
    assert.equal(body.fixture.liveMatchState.subLog[0].offPlayerId, 'p6');
  });

  it('PUT /api/fixtures/:id/live-state returns 404 for unknown fixture', async () => {
    const res = await fetch(`${baseUrl}/api/fixtures/non_existent_fixture/live-state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isRunning: true,
        currentPeriod: 1,
        elapsedSeconds: 0,
      }),
    });

    assert.equal(res.status, 404);
  });
});
