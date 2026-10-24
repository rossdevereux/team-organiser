import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import express from 'express';
import { storage } from '../db/storage.js';
import apiRouter from '../routes/api.js';
import { Player, TeamSettings, Fixture, MatchSquad } from '../types.js';
import {
  generateFairRotation,
  rebalanceRemainingPeriods,
  calculateMatchStats,
} from '../services/rotationService.js';

describe('Dynamic Sub Rebalancer & Emergency Departure Suite (Issue #18)', () => {
  let server: http.Server;
  let baseUrl: string;

  const testTeamId = 'team_rebalancer_test';

  const testSettings: TeamSettings = {
    pitchPlayerCount: 7,
    matchdaySquadCap: 10,
    subCount: 3,
    matchPeriodCount: 4, // 4 Quarters
    periodDurationMinutes: 15, // 15 mins per quarter = 60 min match
    defaultFormation: '2-3-1',
    targetGameTimePercent: 50,
  };

  const samplePlayers: Player[] = [
    { id: 'p1', teamId: testTeamId, name: 'Alex GK', preferredPositions: ['Goalkeeper'], unavailableDates: [], matchesPlayed: 5, totalMinutesPlayed: 200 },
    { id: 'p2', teamId: testTeamId, name: 'Ben DEF', preferredPositions: ['Defence'], unavailableDates: [], matchesPlayed: 5, totalMinutesPlayed: 190 },
    { id: 'p3', teamId: testTeamId, name: 'Charlie DEF', preferredPositions: ['Defence'], unavailableDates: [], matchesPlayed: 5, totalMinutesPlayed: 180 },
    { id: 'p4', teamId: testTeamId, name: 'Dan MID', preferredPositions: ['Midfield'], unavailableDates: [], matchesPlayed: 5, totalMinutesPlayed: 175 },
    { id: 'p5', teamId: testTeamId, name: 'Ethan MID', preferredPositions: ['Midfield'], unavailableDates: [], matchesPlayed: 5, totalMinutesPlayed: 160 },
    { id: 'p6', teamId: testTeamId, name: 'Frank MID', preferredPositions: ['Midfield'], unavailableDates: [], matchesPlayed: 5, totalMinutesPlayed: 150 },
    { id: 'p7', teamId: testTeamId, name: 'George ATT', preferredPositions: ['Attack'], unavailableDates: [], matchesPlayed: 5, totalMinutesPlayed: 140 },
    { id: 'p8', teamId: testTeamId, name: 'Harry SUB1', preferredPositions: ['Defence', 'Midfield'], unavailableDates: [], matchesPlayed: 5, totalMinutesPlayed: 130 },
    { id: 'p9', teamId: testTeamId, name: 'Ian SUB2', preferredPositions: ['Midfield', 'Attack'], unavailableDates: [], matchesPlayed: 5, totalMinutesPlayed: 120 },
    { id: 'p10', teamId: testTeamId, name: 'Jack SUB3', preferredPositions: ['Attack', 'Midfield'], unavailableDates: [], matchesPlayed: 5, totalMinutesPlayed: 110 },
  ];

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
    await storage.deleteTeam(testTeamId);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(async () => {
    await storage.saveTeam({
      id: testTeamId,
      name: 'Rebalancer FC',
      ageGroup: 'U10',
      ownerId: 'test_coach_rebalancer',
      sharedWith: [],
      settings: testSettings,
    });

    for (const p of samplePlayers) {
      await storage.savePlayer(p);
    }
  });

  it('rebalanceRemainingPeriods immediately replaces departed pitch player and locks them out of remaining periods', () => {
    const fixture: Fixture = {
      id: 'fix_rebal_1',
      teamId: testTeamId,
      date: '2026-11-01',
      opponent: 'Rovers',
      venue: 'Home',
      status: 'In Progress',
      matchPeriodCount: 4,
      periodDurationMinutes: 15,
      pitchPlayerCount: 7,
    };

    // Initial 4-quarter fair rotation with 10 players
    const initialSquad = generateFairRotation(fixture, samplePlayers, testSettings, samplePlayers.map((p) => p.id));
    fixture.matchSquad = initialSquad;

    // In Period 2, find an on-pitch player to depart
    const p2Lineup = initialSquad.lineupsByPeriod.find((l) => l.period === 2)!;
    const departedPlayer = p2Lineup.onPitch[1]; // e.g. p2
    const benchSub = p2Lineup.subs[0]; // e.g. p8

    // Execute dynamic sub rebalancer
    const rebalancedSquad = rebalanceRemainingPeriods(
      fixture,
      samplePlayers,
      testSettings,
      departedPlayer.playerId,
      2,
      benchSub
    );

    // 1. Period 1 must remain untouched
    const p1 = rebalancedSquad.lineupsByPeriod.find((l) => l.period === 1)!;
    const initialP1 = initialSquad.lineupsByPeriod.find((l) => l.period === 1)!;
    assert.deepEqual(p1.onPitch, initialP1.onPitch);
    assert.deepEqual(p1.subs, initialP1.subs);

    // 2. In Period 2: replacement bench player is placed in departed player's position
    const newP2 = rebalancedSquad.lineupsByPeriod.find((l) => l.period === 2)!;
    assert.equal(newP2.onPitch.some((op) => op.playerId === departedPlayer.playerId), false, 'Departed player must not be on pitch in period 2');
    assert.equal(newP2.subs.includes(departedPlayer.playerId), false, 'Departed player must not be on bench in period 2');
    assert.equal(newP2.onPitch.some((op) => op.playerId === benchSub), true, 'Replacement bench sub must be on pitch in period 2');
    assert.equal(newP2.subs.includes(benchSub), false, 'Replacement bench sub must no longer be on bench in period 2');

    // 3. In Periods 3 and 4: departed player is completely locked out
    for (const p of [3, 4]) {
      const lineup = rebalancedSquad.lineupsByPeriod.find((l) => l.period === p)!;
      assert.equal(
        lineup.onPitch.some((op) => op.playerId === departedPlayer.playerId),
        false,
        `Departed player must not be on pitch in period ${p}`
      );
      assert.equal(
        lineup.subs.includes(departedPlayer.playerId),
        false,
        `Departed player must not be on bench in period ${p}`
      );
      // Remaining active players (9 players) fill 7 pitch slots and 2 bench slots
      assert.equal(lineup.onPitch.length, 7, `Period ${p} must have 7 pitch slots filled`);
      assert.equal(lineup.subs.length, 2, `Period ${p} must have 2 bench subs`);
    }
  });

  it('maintains FA 50%+ rule for healthy players and prioritises players with lowest pitch time', () => {
    const fixture: Fixture = {
      id: 'fix_rebal_fa50',
      teamId: testTeamId,
      date: '2026-11-01',
      opponent: 'United',
      venue: 'Home',
      status: 'In Progress',
      matchPeriodCount: 4,
      periodDurationMinutes: 15,
      pitchPlayerCount: 7,
    };

    const initialSquad = generateFairRotation(fixture, samplePlayers, testSettings, samplePlayers.map((p) => p.id));
    fixture.matchSquad = initialSquad;

    // Suppose player on pitch departs in period 2
    const p2Lineup = initialSquad.lineupsByPeriod.find((l) => l.period === 2)!;
    const departedId = p2Lineup.onPitch[0].playerId;
    const replacementId = p2Lineup.subs[0];

    const rebalanced = rebalanceRemainingPeriods(
      fixture,
      samplePlayers,
      testSettings,
      departedId,
      2,
      replacementId
    );

    // Calculate periods played across all 4 periods for each remaining healthy player
    const healthyIds = samplePlayers.map((p) => p.id).filter((id) => id !== departedId);
    const periodsPlayedCount = new Map<string, number>();
    healthyIds.forEach((id) => periodsPlayedCount.set(id, 0));

    rebalanced.lineupsByPeriod.forEach((lineup) => {
      lineup.onPitch.forEach((op) => {
        if (periodsPlayedCount.has(op.playerId)) {
          periodsPlayedCount.set(op.playerId, (periodsPlayedCount.get(op.playerId) || 0) + 1);
        }
      });
    });

    // In a 4-period match, FA 50%+ target is >= 2 periods (50%)
    for (const id of healthyIds) {
      const count = periodsPlayedCount.get(id) || 0;
      assert.ok(
        count >= 2,
        `Healthy player ${id} played ${count} periods, which must meet FA 50%+ target (>= 2 periods)`
      );
    }
  });

  it('freezes departed player logged minutes at exact minute of exit in calculateMatchStats', () => {
    const fixture: Fixture = {
      id: 'fix_rebal_stats',
      teamId: testTeamId,
      date: '2026-11-01',
      opponent: 'Wanderers',
      venue: 'Home',
      status: 'In Progress',
      matchPeriodCount: 4,
      periodDurationMinutes: 15, // 15 mins per quarter
      pitchPlayerCount: 7,
      earlyDepartures: [
        {
          playerId: 'p2',
          playerName: 'Ben DEF',
          period: 2,
          minute: 10, // Left at minute 10 of period 2
          matchMinute: 25, // Total cumulative minute: 15 (Q1) + 10 (Q2) = 25m
          reason: 'injured',
          replacedByPlayerId: 'p8',
          replacedByPlayerName: 'Harry SUB1',
          departedAt: '2026-11-01T10:25:00Z',
          proRatedMinutes: 25,
        },
      ],
    };

    const initialSquad = generateFairRotation(fixture, samplePlayers, testSettings, samplePlayers.map((p) => p.id));
    fixture.matchSquad = initialSquad;

    const stats = calculateMatchStats(initialSquad, samplePlayers, testSettings, undefined, fixture);
    const p2Stats = stats.find((s) => s.playerId === 'p2')!;

    assert.equal(p2Stats.minutesPlayed, 25, 'Departed player minutes must be frozen at exactly 25 pro-rated minutes');
    // Total match minutes = 4 * 15 = 60m. 25 / 60 = 42%
    assert.equal(p2Stats.gameTimePercent, 42, 'Game time percent must reflect exact pro-rated minutes');
  });

  it('POST /api/fixtures/:id/early-departure executes touchline emergency substitution and rebalances', async () => {
    // 1. Create fixture in storage
    const fixture: Fixture = {
      id: 'fix_api_departure',
      teamId: testTeamId,
      date: '2026-11-01',
      opponent: 'Strikers FC',
      venue: 'Home',
      status: 'In Progress',
      matchPeriodCount: 4,
      periodDurationMinutes: 15,
      pitchPlayerCount: 7,
    };

    const initialSquad = generateFairRotation(fixture, samplePlayers, testSettings, samplePlayers.map((p) => p.id));
    fixture.matchSquad = initialSquad;
    await storage.saveFixture(fixture);

    const p2Lineup = initialSquad.lineupsByPeriod.find((l) => l.period === 2)!;
    const departingPitchPlayer = p2Lineup.onPitch[0].playerId;
    const incomingBenchPlayer = p2Lineup.subs[0];

    // 2. Call API endpoint
    const res = await fetch(`${baseUrl}/api/fixtures/${fixture.id}/early-departure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        departedPlayerId: departingPitchPlayer,
        departurePeriod: 2,
        minute: 8,
        matchMinute: 23,
        reason: 'injured',
        replacementPlayerId: incomingBenchPlayer,
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(data.earlyDeparture, 'Response must return earlyDeparture entry');
    assert.equal(data.earlyDeparture.playerId, departingPitchPlayer);
    assert.equal(data.earlyDeparture.reason, 'injured');
    assert.equal(data.earlyDeparture.minute, 8);
    assert.equal(data.earlyDeparture.matchMinute, 23);
    assert.equal(data.earlyDeparture.replacedByPlayerId, incomingBenchPlayer);
    assert.equal(data.earlyDeparture.proRatedMinutes, 23); // 15 (Q1) + 8 (Q2) = 23m

    // Verify fixture in storage has updated earlyDepartures and subLog audit
    const updatedFixture = await storage.getFixtureById(fixture.id);
    assert.ok(updatedFixture?.earlyDepartures?.length === 1);
    assert.equal(updatedFixture?.earlyDepartures[0].playerId, departingPitchPlayer);

    const subLog = updatedFixture?.liveMatchState?.subLog || [];
    assert.ok(subLog.length > 0, 'Must record departure in liveMatchState subLog');
    assert.ok(subLog[0].text.includes('INJURY / DEPARTURE'));
  });

  it('applyFixtureMinutes credits departed player with exact proRatedMinutes upon fixture completion', async () => {
    const fixture: Fixture = {
      id: 'fix_apply_dep_mins',
      teamId: testTeamId,
      date: '2026-11-01',
      opponent: 'Albion',
      venue: 'Home',
      status: 'Completed',
      matchPeriodCount: 4,
      periodDurationMinutes: 15,
      pitchPlayerCount: 7,
      earlyDepartures: [
        {
          playerId: 'p2',
          playerName: 'Ben DEF',
          period: 2,
          minute: 10,
          matchMinute: 25,
          reason: 'injured',
          proRatedMinutes: 25,
          departedAt: '2026-11-01T10:25:00Z',
        },
      ],
    };

    const initialSquad = generateFairRotation(fixture, samplePlayers, testSettings, samplePlayers.map((p) => p.id));
    fixture.matchSquad = initialSquad;

    const result = await storage.applyFixtureMinutes(fixture);
    assert.equal(result.fixture.creditedMinutes?.['p2'], 25, 'p2 credited minutes must equal proRatedMinutes (25m)');
  });
});
