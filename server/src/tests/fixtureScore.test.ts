import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { storage } from '../db/storage.js';
import { Fixture, GoalScorer } from '../types.js';

describe('Fixture Scores & Goal Scorers Suite', () => {
  const testFixtureId = 'fix_test_score_1';

  beforeEach(async () => {
    // Setup a clean test fixture
    const initialFixture: Fixture = {
      id: testFixtureId,
      teamId: 'team-1',
      season: '2026/2027',
      date: '2026-10-25',
      opponent: 'North Valley Academy',
      venue: 'Home',
      status: 'Upcoming',
    };
    await storage.saveFixture(initialFixture);
  });

  it('successfully saves home and away scores and goal scorers via storage', async () => {
    const scorers: GoalScorer[] = [
      {
        id: 'scorer-1',
        playerId: 'p1',
        playerName: 'Leo Messi',
        team: 'home',
        minute: '14',
      },
      {
        id: 'scorer-2',
        playerId: 'p2',
        playerName: 'Julian Alvarez',
        team: 'home',
        minute: '45+2',
      },
      {
        id: 'scorer-3',
        playerName: 'Opposition Striker',
        team: 'away',
        minute: '32',
      },
    ];

    const updated = await storage.updateFixtureScore(testFixtureId, {
      homeScore: 2,
      awayScore: 1,
      scorers,
      status: 'Completed',
      isLive: false,
    });

    assert.ok(updated);
    assert.equal(updated.homeScore, 2);
    assert.equal(updated.awayScore, 1);
    assert.equal(updated.status, 'Completed');
    assert.equal(updated.isLive, false);
    assert.equal(updated.scorers?.length, 3);
    assert.equal(updated.scorers[0].playerName, 'Leo Messi');
    assert.equal(updated.scorers[1].minute, '45+2');
    assert.equal(updated.scorers[2].team, 'away');
  });

  it('supports live match in-progress score updates', async () => {
    const updated = await storage.updateFixtureScore(testFixtureId, {
      homeScore: 1,
      awayScore: 0,
      scorers: [
        {
          id: 'scorer-live',
          playerId: 'p1',
          playerName: 'Leo Messi',
          team: 'home',
          minute: '8',
        },
      ],
      status: 'In Progress',
      isLive: true,
    });

    assert.ok(updated);
    assert.equal(updated.homeScore, 1);
    assert.equal(updated.awayScore, 0);
    assert.equal(updated.status, 'In Progress');
    assert.equal(updated.isLive, true);
    assert.equal(updated.scorers?.length, 1);
  });

  it('clamps negative scores to zero', async () => {
    const updated = await storage.updateFixtureScore(testFixtureId, {
      homeScore: -3,
      awayScore: 0,
      scorers: [],
    });

    assert.ok(updated);
    assert.equal(updated.homeScore, 0);
    assert.equal(updated.awayScore, 0);
  });

  it('retrieves fixture with score intact from storage', async () => {
    await storage.updateFixtureScore(testFixtureId, {
      homeScore: 3,
      awayScore: 2,
      scorers: [
        { id: 's1', playerId: 'p1', team: 'home', minute: '10' },
        { id: 's2', playerId: 'p2', team: 'home', minute: '20' },
        { id: 's3', playerId: 'p3', team: 'home', minute: '30' },
        { id: 's4', team: 'away', minute: '15' },
        { id: 's5', team: 'away', minute: '40' },
      ],
      status: 'Played',
    });

    const retrieved = await storage.getFixtureById(testFixtureId);
    assert.ok(retrieved);
    assert.equal(retrieved.homeScore, 3);
    assert.equal(retrieved.awayScore, 2);
    assert.equal(retrieved.status, 'Played');
    assert.equal(retrieved.scorers?.length, 5);
  });
});
