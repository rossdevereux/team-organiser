import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { storage } from '../db/storage.js';
import {
  Player,
  Fixture,
  Team,
  TeamSettings,
  GoalScorer,
  MatchSquad,
} from '../types.js';
import { calculateSeasonDashboardSummary } from '../services/dashboardService.js';

describe('Team Dashboard & Season Analytics Suite (Issue #17)', () => {
  const teamId = 'team_test_dash_1';
  const otherTeamId = 'team_test_dash_2';

  const samplePlayers: Player[] = [
    {
      id: 'p_dash_1',
      teamId,
      name: 'Noah Roberts',
      squadNumber: 9,
      preferredPositions: ['Attack', 'Midfield'],
      unavailableDates: [],
      matchesPlayed: 4,
      totalMinutesPlayed: 160,
    },
    {
      id: 'p_dash_2',
      teamId,
      name: 'Sophia Jenkins',
      squadNumber: 10,
      preferredPositions: ['Midfield', 'Attack'],
      unavailableDates: [],
      matchesPlayed: 4,
      totalMinutesPlayed: 180,
    },
    {
      id: 'p_dash_3',
      teamId,
      name: 'Leo Taylor',
      squadNumber: 1,
      preferredPositions: ['Goalkeeper'],
      isFixedPosition: true,
      fixedPosition: 'GK',
      unavailableDates: [],
      matchesPlayed: 4,
      totalMinutesPlayed: 200,
    },
    {
      id: 'p_dash_4',
      teamId,
      name: 'Maya Sharma',
      squadNumber: 4,
      preferredPositions: ['Defence'],
      unavailableDates: [],
      matchesPlayed: 4,
      totalMinutesPlayed: 180,
    },
    {
      id: 'p_dash_5',
      teamId,
      name: 'Ethan Miller',
      squadNumber: 5,
      preferredPositions: ['Defence', 'Goalkeeper'],
      unavailableDates: [],
      matchesPlayed: 3,
      totalMinutesPlayed: 120,
    },
  ];

  const sampleSettings: TeamSettings = {
    pitchPlayerCount: 5,
    matchdaySquadCap: 6,
    subCount: 1,
    matchPeriodCount: 2,
    periodDurationMinutes: 25,
    targetGameTimePercent: 50,
    defaultFormation: '1-2-1',
    currentSeason: '2026/2027',
  };

  beforeEach(async () => {
    // Save team
    const team: Team = {
      id: teamId,
      name: 'Cold Ash Haws U11',
      ageGroup: 'U11',
      ownerId: 'coach-123',
      sharedWith: [],
      settings: sampleSettings,
    };
    await storage.saveTeam(team);
    await storage.updateSettings(sampleSettings, teamId);

    // Save players
    await storage.bulkSavePlayers(samplePlayers);

    // Create 3 completed fixtures with scores, scorers, PotM, and lineups
    const f1MatchSquad: MatchSquad = {
      fixtureId: 'f_dash_1',
      selectedPlayerIds: ['p_dash_1', 'p_dash_2', 'p_dash_3', 'p_dash_4', 'p_dash_5'],
      restedPlayerIds: [],
      manualOverrides: false,
      lineupsByPeriod: [
        {
          period: 1,
          onPitch: [
            { playerId: 'p_dash_3', position: 'GK' },
            { playerId: 'p_dash_4', position: 'CB' },
            { playerId: 'p_dash_5', position: 'CB' },
            { playerId: 'p_dash_2', position: 'CM' },
            { playerId: 'p_dash_1', position: 'ST' },
          ],
          subs: [],
        },
        {
          period: 2,
          onPitch: [
            { playerId: 'p_dash_3', position: 'GK' },
            { playerId: 'p_dash_4', position: 'CB' },
            { playerId: 'p_dash_5', position: 'CB' },
            { playerId: 'p_dash_2', position: 'CM' },
            { playerId: 'p_dash_1', position: 'ST' },
          ],
          subs: [],
        },
      ],
    };

    const fixture1: Fixture = {
      id: 'f_dash_1',
      teamId,
      season: '2026/2027',
      date: '2026-10-04',
      opponent: 'Thatcham Tornadoes',
      venue: 'Home',
      status: 'Completed',
      homeScore: 3,
      awayScore: 0, // Clean sheet!
      playerOfTheMatchId: 'p_dash_2', // Sophia Jenkins
      scorers: [
        { id: 's1', playerId: 'p_dash_1', playerName: 'Noah Roberts', team: 'home', minute: '12' },
        { id: 's2', playerId: 'p_dash_1', playerName: 'Noah Roberts', team: 'home', minute: '24' },
        { id: 's3', playerId: 'p_dash_1', playerName: 'Noah Roberts', team: 'home', minute: '41' }, // Hat-trick!
      ],
      matchSquad: f1MatchSquad,
    };

    const fixture2: Fixture = {
      id: 'f_dash_2',
      teamId,
      season: '2026/2027',
      date: '2026-10-11',
      opponent: 'Newbury FC',
      venue: 'Away',
      status: 'Completed',
      homeScore: 0,
      awayScore: 2, // Clean sheet away!
      playerOfTheMatchId: 'p_dash_4', // Maya Sharma
      scorers: [
        { id: 's4', playerId: 'p_dash_1', playerName: 'Noah Roberts', team: 'away', minute: '10' },
        { id: 's5', playerId: 'p_dash_2', playerName: 'Sophia Jenkins', team: 'away', minute: '35' },
      ],
      matchSquad: f1MatchSquad,
    };

    const fixture3: Fixture = {
      id: 'f_dash_3',
      teamId,
      season: '2026/2027',
      date: '2026-10-18',
      opponent: 'Hungerford Town',
      venue: 'Home',
      status: 'Completed',
      homeScore: 1,
      awayScore: 2, // 1-2 loss
      playerOfTheMatchId: 'p_dash_2', // Sophia Jenkins (2nd PotM)
      scorers: [
        { id: 's6', playerId: 'p_dash_2', playerName: 'Sophia Jenkins', team: 'home', minute: '18' },
        { id: 's7', playerName: 'Opponent Striker', team: 'away', minute: '22' },
        { id: 's8', playerName: 'Opponent Mid', team: 'away', minute: '44' },
      ],
      matchSquad: f1MatchSquad,
    };

    await storage.saveFixture(fixture1);
    await storage.saveFixture(fixture2);
    await storage.saveFixture(fixture3);
  });

  it('correctly aggregates overview KPIs (W/D/L, Goals For/Against, Clean Sheets)', async () => {
    const summary = await calculateSeasonDashboardSummary(teamId, '2026/2027');

    assert.equal(summary.overview.matchesPlayed, 3);
    assert.equal(summary.overview.record.wins, 2);
    assert.equal(summary.overview.record.draws, 0);
    assert.equal(summary.overview.record.losses, 1);
    assert.equal(summary.overview.goalsFor, 6); // 3 + 2 + 1
    assert.equal(summary.overview.goalsAgainst, 2); // 0 + 0 + 2
    assert.equal(summary.overview.goalDifference, 4);
    assert.equal(summary.overview.cleanSheets, 2);
    assert.equal(summary.overview.totalSquadMembers, 5);
  });

  it('ranks Goal Scorers Leaderboard and detects hat-tricks', async () => {
    const summary = await calculateSeasonDashboardSummary(teamId, '2026/2027');

    assert.ok(summary.scorersLeaderboard.length >= 2);

    // 1st: Noah Roberts with 4 goals (3 in game 1, 1 in game 2)
    const topScorer = summary.scorersLeaderboard[0];
    assert.equal(topScorer.playerId, 'p_dash_1');
    assert.equal(topScorer.goals, 4);
    assert.equal(topScorer.hatTricks, 1);
    assert.ok(topScorer.goalsPerMatch > 1);

    // 2nd: Sophia Jenkins with 2 goals
    const secondScorer = summary.scorersLeaderboard[1];
    assert.equal(secondScorer.playerId, 'p_dash_2');
    assert.equal(secondScorer.goals, 2);
    assert.equal(secondScorer.hatTricks, 0);
  });

  it('ranks Player of the Match awards and tracks recency details', async () => {
    const summary = await calculateSeasonDashboardSummary(teamId, '2026/2027');

    assert.ok(summary.potmLeaderboard.length >= 2);

    // 1st: Sophia Jenkins with 2 awards
    const topPotm = summary.potmLeaderboard[0];
    assert.equal(topPotm.playerId, 'p_dash_2');
    assert.equal(topPotm.awardsCount, 2);
    assert.equal(topPotm.latestAward?.opponent, 'Hungerford Town');
    assert.equal(topPotm.latestAward?.date, '2026-10-18');

    // 2nd: Maya Sharma with 1 award
    const secondPotm = summary.potmLeaderboard[1];
    assert.equal(secondPotm.playerId, 'p_dash_4');
    assert.equal(secondPotm.awardsCount, 1);
    assert.equal(secondPotm.latestAward?.opponent, 'Newbury FC');
  });

  it('recognizes defensive contributions in The Wall (clean sheets on pitch & defensive minutes)', async () => {
    const summary = await calculateSeasonDashboardSummary(teamId, '2026/2027');

    assert.ok(summary.defensiveWall.length >= 3);

    // Defenders and Goalkeepers on pitch during 2 clean sheets
    const gk = summary.defensiveWall.find((w) => w.playerId === 'p_dash_3');
    assert.ok(gk);
    assert.equal(gk.cleanSheets, 2);
    assert.ok(gk.gkMinutes > 0);

    const cb1 = summary.defensiveWall.find((w) => w.playerId === 'p_dash_4');
    assert.ok(cb1);
    assert.equal(cb1.cleanSheets, 2);
    assert.ok(cb1.outfieldDefMinutes > 0);
  });

  it('calculates positional versatility and designated goalkeeper coverage', async () => {
    const summary = await calculateSeasonDashboardSummary(teamId, '2026/2027');

    assert.ok(summary.versatilityHeatmap.teamMinutesByPosition.Goalkeeper > 0);
    assert.ok(summary.versatilityHeatmap.teamMinutesByPosition.Defence > 0);
    assert.ok(summary.versatilityHeatmap.teamMinutesByPosition.Midfield > 0);
    assert.ok(summary.versatilityHeatmap.teamMinutesByPosition.Attack > 0);

    // Leo Taylor is fixed GK, so designated GK coverage should be 100%
    assert.equal(summary.versatilityHeatmap.designatedGkCoveragePercent, 100);
  });

  it('auto-generates team and individual achievement milestones', async () => {
    const summary = await calculateSeasonDashboardSummary(teamId, '2026/2027');

    const badges = summary.milestones;
    assert.ok(badges.length > 0);

    // Clean sheet streak (2 clean sheets in a row from fixture 1 & 2)
    const csStreakBadge = badges.find((b) => b.category === 'defensive' && b.icon === 'shield');
    assert.ok(csStreakBadge);

    // Hat-trick badge for Noah
    const hatTrickBadge = badges.find((b) => b.playerId === 'p_dash_1' && b.icon === 'star');
    assert.ok(hatTrickBadge);

    // First goal badge
    const firstGoalBadge = badges.find((b) => b.category === 'attacking' && b.icon === 'goal');
    assert.ok(firstGoalBadge);
  });

  it('isolates data cleanly between different teams', async () => {
    // Secondary team with no fixtures
    const otherTeam: Team = {
      id: otherTeamId,
      name: 'Other Team FC',
      ownerId: 'coach-999',
      sharedWith: [],
      settings: sampleSettings,
    };
    await storage.saveTeam(otherTeam);

    const summaryTeamA = await calculateSeasonDashboardSummary(teamId);
    const summaryTeamB = await calculateSeasonDashboardSummary(otherTeamId);

    assert.equal(summaryTeamA.overview.matchesPlayed, 3);
    assert.equal(summaryTeamB.overview.matchesPlayed, 0);
    assert.equal(summaryTeamB.overview.goalsFor, 0);
    assert.equal(summaryTeamB.scorersLeaderboard.length, 0);
  });
});
