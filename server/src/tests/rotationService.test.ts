import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  positionToBroad,
  getPositionPreferenceScore,
  maxWeightBipartiteMatching,
  isPlayerEligibleForFixture,
  findBestOutgoingPitchPlayer,
  generateFairRotation,
  generateSuggestedSubstitutions,
  selectMatchdaySquad,
  calculateMatchStats,
  getFixedPositionsMap,
  InMatchTracker,
  generateWhatsAppAnnouncement,
  filterActivePlannedInGameSubs,
  reconcileMatchSquadPlannedSubs,
} from '../services/rotationService.js';
import { Player, Fixture, TeamSettings } from '../types.js';

// Helper to create mock player
const createMockPlayer = (
  id: string,
  name: string,
  preferredPositions: ('Goalkeeper' | 'Defence' | 'Midfield' | 'Attack')[],
  overrides?: Partial<Player>
): Player => ({
  id,
  teamId: 'team-1',
  name,
  preferredPositions,
  specificPositions: [],
  unavailableDates: [],
  matchesPlayed: 0,
  totalMinutesPlayed: 0,
  ...overrides,
});

// Helper to create mock settings
const createMockSettings = (overrides?: Partial<TeamSettings>): TeamSettings => ({
  pitchPlayerCount: 7,
  matchPeriodCount: 2,
  periodDurationMinutes: 25,
  targetGameTimePercent: 50,
  defaultFormation: '2-3-1',
  matchdaySquadCap: 10,
  subCount: 3,
  ...overrides,
});

// Helper to create mock fixture
const createMockFixture = (overrides?: Partial<Fixture>): Fixture => ({
  id: 'fix-1',
  teamId: 'team-1',
  opponent: 'Rovers FC',
  venue: 'Home',
  status: 'Upcoming',
  date: '2026-10-15',
  kickOffTime: '10:00',
  pitchPlayerCount: 7,
  matchPeriodCount: 2,
  periodDurationMinutes: 25,
  formation: '2-3-1',
  matchdaySquadCap: 10,
  ...overrides,
});

describe('rotationService: Position Preference & Substitutions Suite', () => {

  describe('positionToBroad', () => {
    it('correctly maps specific pitch abbreviations to broad categories', () => {
      assert.equal(positionToBroad('GK'), 'Goalkeeper');
      assert.equal(positionToBroad('GK_1'), 'Goalkeeper');
      assert.equal(positionToBroad('Goalkeeper'), 'Goalkeeper');
      assert.equal(positionToBroad('GOALKEEPER'), 'Goalkeeper');

      assert.equal(positionToBroad('CB'), 'Defence');
      assert.equal(positionToBroad('LB'), 'Defence');
      assert.equal(positionToBroad('RB'), 'Defence');
      assert.equal(positionToBroad('DEF_C'), 'Defence');
      assert.equal(positionToBroad('DEF_L'), 'Defence');
      assert.equal(positionToBroad('RIGHT BACK'), 'Defence');

      assert.equal(positionToBroad('CM'), 'Midfield');
      assert.equal(positionToBroad('LM'), 'Midfield');
      assert.equal(positionToBroad('RM'), 'Midfield');
      assert.equal(positionToBroad('CAM'), 'Midfield');
      assert.equal(positionToBroad('CDM'), 'Midfield');
      assert.equal(positionToBroad('MID_C'), 'Midfield');
      assert.equal(positionToBroad('LEFT WING'), 'Midfield');

      assert.equal(positionToBroad('ST'), 'Attack');
      assert.equal(positionToBroad('CF'), 'Attack');
      assert.equal(positionToBroad('ATT_C'), 'Attack');
    });
  });

  describe('getPositionPreferenceScore', () => {
    it('ranks 1st preference (100) higher than 2nd (60), 3rd (30), and none (0)', () => {
      const dualPlayer = createMockPlayer('p1', 'Jack', ['Defence', 'Midfield']);

      // 1st preference = Defence (score 100)
      const defScore = getPositionPreferenceScore(dualPlayer, 'Defence');
      assert.equal(defScore, 100);

      // 2nd preference = Midfield (score 60)
      const midScore = getPositionPreferenceScore(dualPlayer, 'Midfield');
      assert.equal(midScore, 60);

      // Incompatible position = Attack (score 0)
      const attScore = getPositionPreferenceScore(dualPlayer, 'Attack');
      assert.equal(attScore, 0);
    });

    it('awards specific tactical position role bonus (+10)', () => {
      const cbPlayer = createMockPlayer('p2', 'Harry', ['Defence'], {
        specificPositions: ['Centre Back'],
      });

      // Matches broad Defence (100) + role 'Centre Back' matches slot 'CB' (+10) = 110
      const scoreWithBonus = getPositionPreferenceScore(cbPlayer, 'Defence', 'CB');
      assert.equal(scoreWithBonus, 110);

      // Matches broad Defence (100) without matching slot 'RB'
      const scoreWithoutBonus = getPositionPreferenceScore(cbPlayer, 'Defence', 'RB');
      assert.equal(scoreWithoutBonus, 100);
    });

    it('strictly prevents pure Goalkeepers from receiving outfield scores', () => {
      const pureGk = createMockPlayer('gk1', 'Sam', ['Goalkeeper']);

      assert.equal(getPositionPreferenceScore(pureGk, 'Goalkeeper', 'GK'), 100);
      assert.equal(getPositionPreferenceScore(pureGk, 'Defence', 'CB'), 0);
      assert.equal(getPositionPreferenceScore(pureGk, 'Midfield', 'CM'), 0);
      assert.equal(getPositionPreferenceScore(pureGk, 'Attack', 'ST'), 0);
    });

    it('strictly prevents outfield players without GK preference from receiving GK score', () => {
      const outfieldOnly = createMockPlayer('out1', 'Leo', ['Midfield', 'Attack']);

      assert.equal(getPositionPreferenceScore(outfieldOnly, 'Goalkeeper', 'GK'), 0);
      assert.equal(getPositionPreferenceScore(outfieldOnly, 'Midfield', 'CM'), 100);
    });

    it('supports dual-position Goalkeepers who can also play outfield', () => {
      const gkDef = createMockPlayer('gk2', 'Taylor', ['Goalkeeper', 'Defence']);

      assert.equal(getPositionPreferenceScore(gkDef, 'Goalkeeper', 'GK'), 100);
      assert.equal(getPositionPreferenceScore(gkDef, 'Defence', 'CB'), 60);
      assert.equal(getPositionPreferenceScore(gkDef, 'Midfield', 'CM'), 0);
    });
  });

  describe('maxWeightBipartiteMatching (Hungarian Algorithm)', () => {
    it('solves 2x2 preference conflict globally rather than greedily', () => {
      // Player 0: Defence (100), Midfield (60)
      // Player 1: Defence only (100), Midfield (0)
      // Slots: 0 = Defence, 1 = Midfield
      // Greedy might assign Player 0 to Slot 0 (100), leaving Player 1 with Slot 1 (0) -> Total 100.
      // Hungarian must assign Player 1 to Slot 0 (100) and Player 0 to Slot 1 (60) -> Total 160.
      const weights = [
        [100, 60], // Player 0
        [100, 0],  // Player 1
      ];

      const assignment = maxWeightBipartiteMatching(weights);
      assert.equal(assignment[0], 1, 'Player 0 should take 2nd preference Midfield');
      assert.equal(assignment[1], 0, 'Player 1 should take only preference Defence');
    });

    it('optimally matches 3x3 players to their respective 1st choices when distinct', () => {
      const weights = [
        [100, 0, 0], // Player 0 -> Defence
        [0, 100, 0], // Player 1 -> Midfield
        [0, 0, 100], // Player 2 -> Attack
      ];

      const assignment = maxWeightBipartiteMatching(weights);
      assert.deepEqual(assignment, [0, 1, 2]);
    });
  });

  describe('findBestOutgoingPitchPlayer', () => {
    it('prioritises incoming player 1st preference over 2nd preference', () => {
      // Incoming bench player: 1st Defence, 2nd Midfield
      const incoming = createMockPlayer('sub1', 'Charlie', ['Defence', 'Midfield']);

      const defPlayer = createMockPlayer('p1', 'Dan', ['Defence']);
      const midPlayer = createMockPlayer('p2', 'Mike', ['Midfield']);

      const onPitchOutfield: InMatchTracker[] = [
        {
          playerId: 'p1',
          player: defPlayer,
          minutesThisMatch: 15,
          timesSubbedOn: 0,
          hasPlayedThisMatch: true,
          isOnPitch: true,
          currentPosition: 'CB',
          stintMinutes: 15,
        },
        {
          playerId: 'p2',
          player: midPlayer,
          minutesThisMatch: 20, // Even though midPlayer has more minutes, 1st preference is Defence
          timesSubbedOn: 0,
          hasPlayedThisMatch: true,
          isOnPitch: true,
          currentPosition: 'CM',
          stintMinutes: 20,
        },
      ];

      const match = findBestOutgoingPitchPlayer(incoming, onPitchOutfield);
      assert.ok(match);
      assert.equal(match.outgoing.playerId, 'p1', 'Should sub off Defender to satisfy 1st preference');
      assert.equal(match.targetCategory, 'Defence');
      assert.equal(match.preferenceRank, 0);
    });

    it('falls back to 2nd preference when 1st preference pitch position is unavailable', () => {
      // Incoming bench player: 1st Defence, 2nd Midfield
      const incoming = createMockPlayer('sub1', 'Charlie', ['Defence', 'Midfield']);

      const midPlayer = createMockPlayer('p2', 'Mike', ['Midfield']);
      const attPlayer = createMockPlayer('p3', 'Alex', ['Attack']);

      // No defenders on the pitch list
      const onPitchOutfield: InMatchTracker[] = [
        {
          playerId: 'p2',
          player: midPlayer,
          minutesThisMatch: 15,
          timesSubbedOn: 0,
          hasPlayedThisMatch: true,
          isOnPitch: true,
          currentPosition: 'CM',
          stintMinutes: 15,
        },
        {
          playerId: 'p3',
          player: attPlayer,
          minutesThisMatch: 15,
          timesSubbedOn: 0,
          hasPlayedThisMatch: true,
          isOnPitch: true,
          currentPosition: 'ST',
          stintMinutes: 15,
        },
      ];

      const match = findBestOutgoingPitchPlayer(incoming, onPitchOutfield);
      assert.ok(match);
      assert.equal(match.outgoing.playerId, 'p2', 'Should sub off Midfielder for 2nd preference');
      assert.equal(match.targetCategory, 'Midfield');
      assert.equal(match.preferenceRank, 1);
    });

    it('returns null for pure goalkeeper trying to sub into outfield', () => {
      const pureGk = createMockPlayer('gk1', 'Oliver', ['Goalkeeper']);
      const midPlayer = createMockPlayer('p2', 'Mike', ['Midfield']);

      const onPitchOutfield: InMatchTracker[] = [
        {
          playerId: 'p2',
          player: midPlayer,
          minutesThisMatch: 15,
          timesSubbedOn: 0,
          hasPlayedThisMatch: true,
          isOnPitch: true,
          currentPosition: 'CM',
          stintMinutes: 15,
        },
      ];

      const match = findBestOutgoingPitchPlayer(pureGk, onPitchOutfield);
      assert.equal(match, null, 'Pure goalkeeper must not be subbed into outfield');
    });

    it('breaks ties between matching candidates by selecting the most fatigued player', () => {
      const incoming = createMockPlayer('sub1', 'Charlie', ['Defence']);

      const defPlayer1 = createMockPlayer('p1', 'Dan', ['Defence']);
      const defPlayer2 = createMockPlayer('p2', 'Ben', ['Defence']);

      const onPitchOutfield: InMatchTracker[] = [
        {
          playerId: 'p1',
          player: defPlayer1,
          minutesThisMatch: 10,
          timesSubbedOn: 0,
          hasPlayedThisMatch: true,
          isOnPitch: true,
          currentPosition: 'DEF_L',
          stintMinutes: 10,
        },
        {
          playerId: 'p2',
          player: defPlayer2,
          minutesThisMatch: 20, // Played more minutes
          timesSubbedOn: 0,
          hasPlayedThisMatch: true,
          isOnPitch: true,
          currentPosition: 'DEF_R',
          stintMinutes: 20,
        },
      ];

      const match = findBestOutgoingPitchPlayer(incoming, onPitchOutfield);
      assert.ok(match);
      assert.equal(match.outgoing.playerId, 'p2', 'Should sub off the player with higher match minutes');
    });
  });

  describe('isPlayerEligibleForFixture', () => {
    it('returns ineligible if fixture is before player sign-on date', () => {
      const player = createMockPlayer('p1', 'Tom', ['Midfield'], {
        signOnDate: '2026-11-01',
      });
      const res = isPlayerEligibleForFixture(player, '2026-10-15');
      assert.equal(res.eligible, false);
      assert.match(res.reason || '', /Not yet signed on/);
    });

    it('returns ineligible if fixture is after player leave date', () => {
      const player = createMockPlayer('p1', 'Tom', ['Midfield'], {
        leaveDate: '2026-10-01',
      });
      const res = isPlayerEligibleForFixture(player, '2026-10-15');
      assert.equal(res.eligible, false);
      assert.match(res.reason || '', /Left the squad/);
    });

    it('returns eligible when fixture is within active dates', () => {
      const player = createMockPlayer('p1', 'Tom', ['Midfield'], {
        signOnDate: '2026-09-01',
        leaveDate: '2026-12-31',
      });
      const res = isPlayerEligibleForFixture(player, '2026-10-15');
      assert.equal(res.eligible, true);
    });
  });

  describe('generateFairRotation', () => {
    it('generates balanced 2-period lineups matching preferred positions via optimal bipartite matching', () => {
      // 7v7 match with 9 players (7 on pitch, 2 on bench per period)
      const squadPlayers: Player[] = [
        createMockPlayer('p1', 'Goalkeeper Sam', ['Goalkeeper']),
        createMockPlayer('p2', 'Defender Dan', ['Defence']),
        createMockPlayer('p3', 'Defender / Mid Dave', ['Defence', 'Midfield']),
        createMockPlayer('p4', 'Midfielder Matt', ['Midfield']),
        createMockPlayer('p5', 'Midfielder Milo', ['Midfield']),
        createMockPlayer('p6', 'Mid / Attack Toby', ['Midfield', 'Attack']),
        createMockPlayer('p7', 'Attacker Adam', ['Attack']),
        createMockPlayer('p8', 'Bench Defender Bob', ['Defence']),
        createMockPlayer('p9', 'Bench Midfielder Ben', ['Midfield']),
      ];

      const fixture = createMockFixture();
      const settings = createMockSettings();

      const matchSquad = generateFairRotation(fixture, squadPlayers, settings);

      assert.equal(matchSquad.lineupsByPeriod.length, 2, 'Should have 2 periods');

      // Check period 1
      const p1Lineup = matchSquad.lineupsByPeriod[0];
      assert.equal(p1Lineup.onPitch.length, 7, 'Period 1 should have 7 players on pitch');
      assert.equal(p1Lineup.subs.length, 2, 'Period 1 should have 2 subs on bench');

      // Check period 2
      const p2Lineup = matchSquad.lineupsByPeriod[1];
      assert.equal(p2Lineup.onPitch.length, 7, 'Period 2 should have 7 players on pitch');
      assert.equal(p2Lineup.subs.length, 2, 'Period 2 should have 2 subs on bench');

      // Verify no player was benched in both periods (avoid consecutive benching)
      const benchedBoth = p1Lineup.subs.filter((id) => p2Lineup.subs.includes(id));
      assert.equal(benchedBoth.length, 0, 'No player should be benched consecutively in both periods');

      // Verify goalkeeper is placed in GK slot
      const p1Gk = p1Lineup.onPitch.find((entry) => entry.position === 'GK');
      assert.ok(p1Gk, 'GK slot should be filled');
      assert.equal(p1Gk.playerId, 'p1', 'Goalkeeper Sam should be in goal');

      // Verify player with Defence & Midfield is assigned to one of their preferred positions
      const p3EntryP1 = p1Lineup.onPitch.find((entry) => entry.playerId === 'p3');
      if (p3EntryP1) {
        const broad = positionToBroad(p3EntryP1.position);
        assert.ok(
          broad === 'Defence' || broad === 'Midfield',
          `Player p3 was placed in ${broad}, expected Defence or Midfield`
        );
      }
    });

    it('rotates between multiple goalkeepers across periods', () => {
      const players: Player[] = [
        createMockPlayer('gk1', 'Goalie One', ['Goalkeeper']),
        createMockPlayer('gk2', 'Goalie Two', ['Goalkeeper']),
        createMockPlayer('p3', 'Def One', ['Defence']),
        createMockPlayer('p4', 'Def Two', ['Defence']),
        createMockPlayer('p5', 'Mid One', ['Midfield']),
        createMockPlayer('p6', 'Mid Two', ['Midfield']),
        createMockPlayer('p7', 'Att One', ['Attack']),
      ];

      const fixture = createMockFixture();
      const settings = createMockSettings();

      const matchSquad = generateFairRotation(fixture, players, settings);

      const p1Gk = matchSquad.lineupsByPeriod[0].onPitch.find((e) => e.position === 'GK');
      const p2Gk = matchSquad.lineupsByPeriod[1].onPitch.find((e) => e.position === 'GK');

      assert.ok(p1Gk);
      assert.ok(p2Gk);
      assert.notEqual(p1Gk.playerId, p2Gk.playerId, 'GK should rotate between Period 1 and Period 2');
    });

    it('keeps fixed goalkeeper in goal across all periods when multiple goalkeepers exist', () => {
      const players: Player[] = [
        createMockPlayer('gk1', 'Fixed Goalie', ['Goalkeeper']),
        createMockPlayer('gk2', 'Backup Goalie', ['Goalkeeper']),
        createMockPlayer('p3', 'Def One', ['Defence']),
        createMockPlayer('p4', 'Def Two', ['Defence']),
        createMockPlayer('p5', 'Mid One', ['Midfield']),
        createMockPlayer('p6', 'Mid Two', ['Midfield']),
        createMockPlayer('p7', 'Att One', ['Attack']),
        createMockPlayer('p8', 'Sub Player', ['Midfield']),
      ];

      const fixture = createMockFixture({
        fixedPlayerPositions: { gk1: 'GK' },
      });
      const settings = createMockSettings();

      const matchSquad = generateFairRotation(fixture, players, settings);

      matchSquad.lineupsByPeriod.forEach((lineup) => {
        const gkEntry = lineup.onPitch.find((e) => e.position === 'GK');
        assert.ok(gkEntry, `GK slot should be filled in period ${lineup.period}`);
        assert.equal(
          gkEntry.playerId,
          'gk1',
          `gk1 must remain in goal in period ${lineup.period}`
        );
        assert.ok(
          !lineup.subs.includes('gk1'),
          `Fixed goalkeeper gk1 must not be benched in period ${lineup.period}`
        );
      });
    });

    it('keeps fixed outfield player in designated position across all periods without benching', () => {
      const players: Player[] = [
        createMockPlayer('gk1', 'Goalie', ['Goalkeeper']),
        createMockPlayer('lock_def', 'Fixed LeftBack', ['Defence'], {
          isFixedPosition: true,
          fixedPosition: 'DEF_L',
        }),
        createMockPlayer('p3', 'Def Two', ['Defence']),
        createMockPlayer('p4', 'Def Three', ['Defence']),
        createMockPlayer('p5', 'Mid One', ['Midfield']),
        createMockPlayer('p6', 'Mid Two', ['Midfield']),
        createMockPlayer('p7', 'Att One', ['Attack']),
        createMockPlayer('p8', 'Bench Sub', ['Attack']),
      ];

      const fixture = createMockFixture();
      const settings = createMockSettings();

      const matchSquad = generateFairRotation(fixture, players, settings);

      matchSquad.lineupsByPeriod.forEach((lineup) => {
        const pitchEntry = lineup.onPitch.find((e) => e.playerId === 'lock_def');
        assert.ok(
          pitchEntry,
          `lock_def must be on pitch in period ${lineup.period}`
        );
        assert.equal(
          pitchEntry.position,
          'DEF_L',
          `lock_def must stay in DEF_L in period ${lineup.period}`
        );
        assert.ok(
          !lineup.subs.includes('lock_def'),
          `lock_def must not be benched in period ${lineup.period}`
        );
      });
    });

    it('rotates a globally locked goalkeeper across periods when fixture explicitly unlocks them', () => {
      // gk1 has isFixedPosition: true globally on player profile
      // gk2 is a second goalkeeper
      // Fixture overrides gk1 with UNLOCKED
      const players: Player[] = [
        createMockPlayer('gk1', 'Globally Locked Goalie', ['Goalkeeper'], {
          isFixedPosition: true,
          fixedPosition: 'GK',
        }),
        createMockPlayer('gk2', 'Backup Goalie', ['Goalkeeper']),
        createMockPlayer('p3', 'Def One', ['Defence']),
        createMockPlayer('p4', 'Def Two', ['Defence']),
        createMockPlayer('p5', 'Mid One', ['Midfield']),
        createMockPlayer('p6', 'Mid Two', ['Midfield']),
        createMockPlayer('p7', 'Att One', ['Attack']),
      ];

      const fixture = createMockFixture({
        fixedPlayerPositions: { gk1: 'UNLOCKED' },
      });
      const settings = createMockSettings();

      const matchSquad = generateFairRotation(fixture, players, settings);

      const p1Gk = matchSquad.lineupsByPeriod[0].onPitch.find((e) => e.position === 'GK');
      const p2Gk = matchSquad.lineupsByPeriod[1].onPitch.find((e) => e.position === 'GK');

      assert.ok(p1Gk);
      assert.ok(p2Gk);
      // Because gk1 was unlocked for this specific fixture, the engine rotates between gk1 and gk2
      assert.notEqual(
        p1Gk.playerId,
        p2Gk.playerId,
        'Goalkeepers must rotate between Period 1 and Period 2 when globally fixed GK is unlocked on fixture'
      );
      // Fixture override should be preserved in returned matchSquad
      assert.equal(matchSquad.fixedPlayerPositions?.['gk1'], 'UNLOCKED');
    });

    it('locks an otherwise rotating goalkeeper for a specific fixture', () => {
      // Both gk1 and gk2 are normal rotating goalkeepers (neither isFixedPosition globally)
      // Fixture specifies { gk2: 'GK' }
      const players: Player[] = [
        createMockPlayer('gk1', 'Goalie One', ['Goalkeeper']),
        createMockPlayer('gk2', 'Goalie Two', ['Goalkeeper']),
        createMockPlayer('p3', 'Def One', ['Defence']),
        createMockPlayer('p4', 'Def Two', ['Defence']),
        createMockPlayer('p5', 'Mid One', ['Midfield']),
        createMockPlayer('p6', 'Mid Two', ['Midfield']),
        createMockPlayer('p7', 'Att One', ['Attack']),
        createMockPlayer('p8', 'Bench Sub', ['Midfield']),
      ];

      const fixture = createMockFixture({
        fixedPlayerPositions: { gk2: 'GK' },
      });
      const settings = createMockSettings();

      const matchSquad = generateFairRotation(fixture, players, settings);

      matchSquad.lineupsByPeriod.forEach((lineup) => {
        const gkEntry = lineup.onPitch.find((e) => e.position === 'GK');
        assert.ok(gkEntry, `GK slot should be filled in period ${lineup.period}`);
        assert.equal(
          gkEntry.playerId,
          'gk2',
          `gk2 must remain in goal in period ${lineup.period} due to fixture-level lock`
        );
        assert.ok(
          !lineup.subs.includes('gk2'),
          `Fixed goalkeeper gk2 must not be benched in period ${lineup.period}`
        );
      });
    });
  });

  describe('getFixedPositionsMap', () => {
    it('resolves fixed positions from fixture, matchSquad, and player settings in priority order', () => {
      const p1 = createMockPlayer('p1', 'Player 1', ['Goalkeeper']);
      const p2 = createMockPlayer('p2', 'Player 2', ['Defence'], {
        isFixedPosition: true,
        fixedPosition: 'DEF_C',
      });
      const p3 = createMockPlayer('p3', 'Player 3', ['Goalkeeper'], {
        isFixedPosition: true,
      });
      const p4 = createMockPlayer('p4', 'Player 4', ['Midfield'], {
        isFixedPosition: true,
        fixedPosition: 'MID_C',
      });

      // Fixture overrides p4 to DEF_R
      const fixture = createMockFixture({
        fixedPlayerPositions: { p4: 'DEF_R' },
        matchSquad: {
          fixtureId: 'fix-1',
          manualOverrides: false,
          selectedPlayerIds: ['p1', 'p2', 'p3', 'p4'],
          restedPlayerIds: [],
          lineupsByPeriod: [],
          fixedPlayerPositions: { p1: 'GK' },
        },
      });

      const map = getFixedPositionsMap(fixture, [p1, p2, p3, p4]);
      assert.equal(map.get('p4'), 'DEF_R', 'Fixture level takes highest priority');
      assert.equal(map.get('p1'), 'GK', 'matchSquad level takes second priority');
      assert.equal(map.get('p2'), 'DEF_C', 'Player level is honoured');
      assert.equal(map.get('p3'), 'GK', 'Player level defaults to GK for goalkeeper');
    });

    it('respects UNLOCKED, NONE, and ROTATE overrides to unlock globally fixed players on specific fixtures', () => {
      const p1 = createMockPlayer('p1', 'Player 1', ['Goalkeeper'], {
        isFixedPosition: true,
        fixedPosition: 'GK',
      });
      const p2 = createMockPlayer('p2', 'Player 2', ['Defence'], {
        isFixedPosition: true,
        fixedPosition: 'DEF_C',
      });
      const p3 = createMockPlayer('p3', 'Player 3', ['Midfield'], {
        isFixedPosition: true,
        fixedPosition: 'MID_C',
      });

      const fixture = createMockFixture({
        fixedPlayerPositions: {
          p1: 'UNLOCKED',
          p2: 'NONE',
        },
        matchSquad: {
          fixtureId: 'fix-1',
          manualOverrides: false,
          selectedPlayerIds: ['p1', 'p2', 'p3'],
          restedPlayerIds: [],
          lineupsByPeriod: [],
          fixedPlayerPositions: {
            p3: 'ROTATE',
          },
        },
      });

      const map = getFixedPositionsMap(fixture, [p1, p2, p3]);
      assert.equal(map.has('p1'), false, 'p1 should be unlocked via fixture UNLOCKED');
      assert.equal(map.has('p2'), false, 'p2 should be unlocked via fixture NONE');
      assert.equal(map.has('p3'), false, 'p3 should be unlocked via matchSquad ROTATE');
    });
  });

  describe('generateSuggestedSubstitutions', () => {
    it('produces 3 strategic sub plans respecting preference order and avoiding pure GKs', () => {
      const players: Player[] = [
        createMockPlayer('gk1', 'Sam GK', ['Goalkeeper']),
        createMockPlayer('d1', 'Dan CB', ['Defence']),
        createMockPlayer('d2', 'Dean LB', ['Defence']),
        createMockPlayer('m1', 'Mike CM', ['Midfield']),
        createMockPlayer('m2', 'Milo LM', ['Midfield']),
        createMockPlayer('m3', 'Mason RM', ['Midfield']),
        createMockPlayer('a1', 'Adam ST', ['Attack']),
        // Bench players
        createMockPlayer('sub_def_mid', 'Charlie Utility', ['Defence', 'Midfield']),
        createMockPlayer('sub_att', 'Archie Striker', ['Attack']),
        createMockPlayer('pure_gk_bench', 'Paul Backup GK', ['Goalkeeper']),
      ];

      const fixture = createMockFixture({
        matchSquad: {
          fixtureId: 'fix-1',
          manualOverrides: false,
          selectedPlayerIds: players.map((p) => p.id),
          restedPlayerIds: [],
          lineupsByPeriod: [
            {
              period: 1,
              onPitch: [
                { playerId: 'gk1', position: 'GK' },
                { playerId: 'd1', position: 'CB' },
                { playerId: 'd2', position: 'LB' },
                { playerId: 'm1', position: 'CM' },
                { playerId: 'm2', position: 'LM' },
                { playerId: 'm3', position: 'RM' },
                { playerId: 'a1', position: 'ST' },
              ],
              subs: ['sub_def_mid', 'sub_att', 'pure_gk_bench'],
            },
            {
              period: 2,
              onPitch: [
                { playerId: 'gk1', position: 'GK' },
                { playerId: 'sub_def_mid', position: 'CB' },
                { playerId: 'd2', position: 'LB' },
                { playerId: 'm1', position: 'CM' },
                { playerId: 'm2', position: 'LM' },
                { playerId: 'sub_att', position: 'ST' },
                { playerId: 'a1', position: 'RM' },
              ],
              subs: ['d1', 'm3', 'pure_gk_bench'],
            },
          ],
        },
      });

      const settings = createMockSettings();
      const plans = generateSuggestedSubstitutions(fixture, players, settings, 10);

      assert.equal(plans.length, 3, 'Should generate 3 strategic substitution plans');

      // Strategy 1: Fair Play
      const fairPlay = plans.find((p) => p.strategyName.includes('Equal Game Time'));
      assert.ok(fairPlay, 'Fair Play plan should exist');
      assert.ok(fairPlay.windows.length > 0, 'Fair Play should have sub windows');

      // Strategy 2: Tactical Shape
      const tactical = plans.find((p) => p.strategyName.includes('Positional Match'));
      assert.ok(tactical, 'Tactical Shape plan should exist');

      // Strategy 3: Rolling Sub
      const rolling = plans.find((p) => p.strategyName.includes('Rolling Single Sub'));
      assert.ok(rolling, 'Rolling plan should exist');

      // Check each sub change in all windows across all strategies
      plans.forEach((plan) => {
        plan.windows.forEach((win) => {
          win.subChanges.forEach((change) => {
            // Must not sub off and on the same player
            assert.notEqual(change.offPlayerId, change.onPlayerId);

            // Pure goalkeeper bench player must never be subbed on into outfield
            assert.notEqual(
              change.onPlayerId,
              'pure_gk_bench',
              `Pure GK Paul must never be subbed into outfield position in plan ${plan.strategyName}`
            );

            // The position category must not be Goalkeeper
            assert.notEqual(change.positionCategory, 'Goalkeeper');

            // Reason should include preference rank if it's fair play or rolling
            assert.ok(change.reason && change.reason.length > 0, 'Reason should be populated');
          });
        });
      });
    });

    it('substitutions reason specifies preference rank (Primary / 2nd preference)', () => {
      const players: Player[] = [
        createMockPlayer('gk1', 'Sam GK', ['Goalkeeper']),
        createMockPlayer('d1', 'Dan CB', ['Defence']),
        createMockPlayer('d2', 'Dean LB', ['Defence']),
        createMockPlayer('m1', 'Mike CM', ['Midfield']),
        createMockPlayer('m2', 'Milo LM', ['Midfield']),
        createMockPlayer('m3', 'Mason RM', ['Midfield']),
        createMockPlayer('a1', 'Adam ST', ['Attack']),
        // Bench player with primary Defence, secondary Midfield
        createMockPlayer('sub1', 'Liam Dual', ['Defence', 'Midfield']),
      ];

      const fixture = createMockFixture({
        matchSquad: {
          fixtureId: 'fix-1',
          manualOverrides: false,
          selectedPlayerIds: players.map((p) => p.id),
          restedPlayerIds: [],
          lineupsByPeriod: [
            {
              period: 1,
              onPitch: [
                { playerId: 'gk1', position: 'GK' },
                { playerId: 'd1', position: 'CB' },
                { playerId: 'd2', position: 'LB' },
                { playerId: 'm1', position: 'CM' },
                { playerId: 'm2', position: 'LM' },
                { playerId: 'm3', position: 'RM' },
                { playerId: 'a1', position: 'ST' },
              ],
              subs: ['sub1'],
            },
          ],
        },
      });

      const settings = createMockSettings();
      const plans = generateSuggestedSubstitutions(fixture, players, settings, 10);
      const fairPlay = plans.find((p) => p.strategyName.includes('Equal Game Time'))!;
      assert.ok(fairPlay.windows.length > 0);

      const firstSub = fairPlay.windows[0].subChanges[0];
      assert.equal(firstSub.onPlayerId, 'sub1');
      assert.equal(firstSub.positionCategory, 'Defence');
      // Sub should match 1st preference (Primary preference)
      assert.match(firstSub.reason || '', /Primary preference/);
    });

    it('never substitutes off a fixed player in any substitution window across all strategies', () => {
      const players: Player[] = [
        createMockPlayer('gk_fixed', 'Sam GK', ['Goalkeeper']),
        createMockPlayer('cb_fixed', 'Dan Fixed CB', ['Defence'], {
          isFixedPosition: true,
          fixedPosition: 'DEF_C',
        }),
        createMockPlayer('d2', 'Dean LB', ['Defence']),
        createMockPlayer('m1', 'Mike CM', ['Midfield']),
        createMockPlayer('m2', 'Milo LM', ['Midfield']),
        createMockPlayer('m3', 'Mason RM', ['Midfield']),
        createMockPlayer('a1', 'Adam ST', ['Attack']),
        // Bench players
        createMockPlayer('sub1', 'Charlie Utility', ['Defence', 'Midfield']),
        createMockPlayer('sub2', 'Archie Striker', ['Attack']),
      ];

      const fixture = createMockFixture({
        fixedPlayerPositions: { gk_fixed: 'GK' },
        matchSquad: {
          fixtureId: 'fix-1',
          manualOverrides: false,
          selectedPlayerIds: players.map((p) => p.id),
          restedPlayerIds: [],
          lineupsByPeriod: [
            {
              period: 1,
              onPitch: [
                { playerId: 'gk_fixed', position: 'GK' },
                { playerId: 'cb_fixed', position: 'CB' },
                { playerId: 'd2', position: 'LB' },
                { playerId: 'm1', position: 'CM' },
                { playerId: 'm2', position: 'LM' },
                { playerId: 'm3', position: 'RM' },
                { playerId: 'a1', position: 'ST' },
              ],
              subs: ['sub1', 'sub2'],
            },
            {
              period: 2,
              onPitch: [
                { playerId: 'gk_fixed', position: 'GK' },
                { playerId: 'cb_fixed', position: 'CB' },
                { playerId: 'sub1', position: 'LB' },
                { playerId: 'm1', position: 'CM' },
                { playerId: 'sub2', position: 'ST' },
                { playerId: 'm3', position: 'RM' },
                { playerId: 'a1', position: 'LM' },
              ],
              subs: ['d2', 'm2'],
            },
          ],
        },
      });

      const settings = createMockSettings();
      const plans = generateSuggestedSubstitutions(fixture, players, settings, 10);

      assert.ok(plans.length >= 3);
      plans.forEach((plan) => {
        plan.windows.forEach((win) => {
          win.subChanges.forEach((ch) => {
            assert.notEqual(
              ch.offPlayerId,
              'gk_fixed',
              `Fixed goalkeeper gk_fixed must never be substituted off in plan: ${plan.strategyName}`
            );
            assert.notEqual(
              ch.offPlayerId,
              'cb_fixed',
              `Fixed player cb_fixed must never be substituted off in plan: ${plan.strategyName}`
            );
          });
        });
      });
    });

    it('allows substitution of a globally fixed player when fixture explicitly overrides with UNLOCKED', () => {
      const players: Player[] = [
        createMockPlayer('gk_unlocked', 'Sam GK', ['Goalkeeper'], {
          isFixedPosition: true,
          fixedPosition: 'GK',
        }),
        createMockPlayer('gk_sub', 'Paul Backup GK', ['Goalkeeper']),
        createMockPlayer('d1', 'Dan CB', ['Defence']),
        createMockPlayer('d2', 'Dean LB', ['Defence']),
        createMockPlayer('m1', 'Mike CM', ['Midfield']),
        createMockPlayer('m2', 'Milo LM', ['Midfield']),
        createMockPlayer('m3', 'Mason RM', ['Midfield']),
        createMockPlayer('a1', 'Adam ST', ['Attack']),
        createMockPlayer('sub1', 'Liam Utility', ['Defence', 'Attack']),
      ];

      const fixture = createMockFixture({
        fixedPlayerPositions: { gk_unlocked: 'UNLOCKED' },
        matchSquad: {
          fixtureId: 'fix-1',
          manualOverrides: false,
          selectedPlayerIds: players.map((p) => p.id),
          restedPlayerIds: [],
          lineupsByPeriod: [
            {
              period: 1,
              onPitch: [
                { playerId: 'gk_unlocked', position: 'GK' },
                { playerId: 'd1', position: 'CB' },
                { playerId: 'd2', position: 'LB' },
                { playerId: 'm1', position: 'CM' },
                { playerId: 'm2', position: 'LM' },
                { playerId: 'm3', position: 'RM' },
                { playerId: 'a1', position: 'ST' },
              ],
              subs: ['gk_sub', 'sub1'],
            },
          ],
        },
      });

      const settings = createMockSettings();
      const plans = generateSuggestedSubstitutions(fixture, players, settings, 10);
      assert.ok(plans.length >= 3);
      const fixedMap = getFixedPositionsMap(fixture, players);
      assert.equal(fixedMap.has('gk_unlocked'), false, 'gk_unlocked must not be present in fixed map');
    });

    it('maintains forward-looking pitch and bench state across periods without duplicate ON or OFF suggestions (Issue #37)', () => {
      const players = [
        createMockPlayer('gk1', 'Keeper One', ['Goalkeeper']),
        createMockPlayer('d1', 'Def One', ['Defence']),
        createMockPlayer('d2', 'Def Two', ['Defence']),
        createMockPlayer('m1', 'Oliver Hazzard', ['Midfield']),
        createMockPlayer('m2', 'Archie Thompson', ['Midfield']),
        createMockPlayer('m3', 'James Rehill', ['Midfield']),
        createMockPlayer('a1', 'Attacker One', ['Attack']),
        createMockPlayer('sub1', 'Harry Fox', ['Midfield']),
        createMockPlayer('sub2', 'Caden Shough', ['Midfield']),
      ];

      const period1Lineup = {
        period: 1,
        onPitch: [
          { playerId: 'gk1', position: 'GK' },
          { playerId: 'd1', position: 'DEF_L' },
          { playerId: 'd2', position: 'DEF_R' },
          { playerId: 'm1', position: 'MID_C' },
          { playerId: 'm2', position: 'MID_R' },
          { playerId: 'm3', position: 'MID_L' },
          { playerId: 'a1', position: 'FWD' },
        ],
        subs: ['sub1', 'sub2'],
      };

      // Period 2 lineup repeats Period 1 baseline (as in rolling-sub / preserveLineupAcrossBreaks mode)
      const period2Lineup = {
        period: 2,
        onPitch: period1Lineup.onPitch.map((p) => ({ ...p })),
        subs: [...period1Lineup.subs],
      };

      const fixture = createMockFixture({
        matchPeriodCount: 2,
        periodDurationMinutes: 25,
        matchSquad: {
          fixtureId: 'fix-37',
          manualOverrides: false,
          selectedPlayerIds: players.map((p) => p.id),
          restedPlayerIds: [],
          lineupsByPeriod: [period1Lineup, period2Lineup],
        },
      });

      const settings = createMockSettings({
        matchPeriodCount: 2,
        periodDurationMinutes: 25,
      });

      const plans = generateSuggestedSubstitutions(fixture, players, settings, 10);
      assert.equal(plans.length, 3, 'Should return all 3 substitution strategies');

      for (const plan of plans) {
        const activePitch = new Set<string>(period1Lineup.onPitch.map((p) => p.playerId));
        const activeBench = new Set<string>(period1Lineup.subs);

        for (const window of plan.windows) {
          for (const change of window.subChanges) {
            assert.equal(
              activePitch.has(change.offPlayerId),
              true,
              `[${plan.strategyName} @ ${window.minute}'] Expected outgoing player ${change.offPlayerName} (${change.offPlayerId}) to be ON the pitch`
            );
            assert.equal(
              activeBench.has(change.onPlayerId),
              true,
              `[${plan.strategyName} @ ${window.minute}'] Expected incoming player ${change.onPlayerName} (${change.onPlayerId}) to be ON the bench`
            );
            assert.equal(
              activePitch.has(change.onPlayerId),
              false,
              `[${plan.strategyName} @ ${window.minute}'] Incoming player ${change.onPlayerName} (${change.onPlayerId}) must not already be ON the pitch`
            );

            // Advance forward-looking state
            activePitch.delete(change.offPlayerId);
            activeBench.add(change.offPlayerId);
            activeBench.delete(change.onPlayerId);
            activePitch.add(change.onPlayerId);
          }
        }
      }

      // Specifically verify Strategy 1 (Equal Game Time & Unused Subs):
      // 10' -> sub1 (Harry Fox) ON for m1 (Oliver Hazzard)
      // 20' -> sub2 (Caden Shough) ON for m2 (Archie Thompson)
      // 35' -> m1 (Oliver Hazzard, subbed off at 10') rotates back ON for m3 (James Rehill, 35m played)
      // 45' -> m2 (Archie Thompson, subbed off at 20') rotates back ON
      const strategy1 = plans[0];
      assert.equal(strategy1.windows.length, 4);
      const min20OnIds = strategy1.windows[1].subChanges.map((c) => c.onPlayerId);
      const min35OnIds = strategy1.windows[2].subChanges.map((c) => c.onPlayerId);
      assert.ok(min20OnIds.includes('sub2'), 'Caden Shough should come ON at 20m');
      assert.equal(
        min35OnIds.includes('sub2'),
        false,
        'Caden Shough is already on the pitch from 20m and must NOT be suggested to come ON again at 35m'
      );
      assert.ok(
        min35OnIds.includes('m1'),
        'Oliver Hazzard (subbed off at 10m with only 10m played) should rotate back ON at 35m'
      );
    });
  });

  describe('calculateMatchStats', () => {
    it('calculates player playing time and periods accurately', () => {
      const matchSquad = {
        fixtureId: 'fix-1',
        manualOverrides: false,
        selectedPlayerIds: ['p1', 'p2', 'p3'],
        restedPlayerIds: [],
        lineupsByPeriod: [
          {
            period: 1,
            onPitch: [
              { playerId: 'p1', position: 'GK' },
              { playerId: 'p2', position: 'CB' },
            ],
            subs: ['p3'],
          },
          {
            period: 2,
            onPitch: [
              { playerId: 'p1', position: 'GK' },
              { playerId: 'p3', position: 'CB' },
            ],
            subs: ['p2'],
          },
        ],
      };

      const mockPlayers = [
        createMockPlayer('p1', 'Player 1', ['Goalkeeper']),
        createMockPlayer('p2', 'Player 2', ['Defence']),
        createMockPlayer('p3', 'Player 3', ['Defence']),
      ];
      const settings = createMockSettings({ matchPeriodCount: 2, periodDurationMinutes: 25 });
      const stats = calculateMatchStats(matchSquad, mockPlayers, settings);
      const p1Stats = stats.find((s) => s.playerId === 'p1');
      const p2Stats = stats.find((s) => s.playerId === 'p2');
      const p3Stats = stats.find((s) => s.playerId === 'p3');

      assert.equal(p1Stats?.periodsPlayed.length, 2);
      assert.deepEqual(p1Stats?.periodsPlayed, [1, 2]);
      assert.equal(p1Stats?.minutesPlayed, 50);

      assert.equal(p2Stats?.periodsPlayed.length, 1);
      assert.deepEqual(p2Stats?.periodsPlayed, [1]);
      assert.equal(p2Stats?.minutesPlayed, 25);

      assert.equal(p3Stats?.periodsPlayed.length, 1);
      assert.deepEqual(p3Stats?.periodsPlayed, [2]);
      assert.equal(p3Stats?.minutesPlayed, 25);
    });

    it('pro-rates playing time accurately when plannedInGameSubs are present', () => {
      // 9 players in a 7-a-side 2x25m match (50 mins total)
      // p1..p7 start on pitch, p8 and p9 are bench subs
      // At min 12.5 of Period 1: p8 subs in for p2, p9 subs in for p3
      // At min 12.5 of Period 2: p8 subs in for p4, p9 subs in for p5
      const matchSquad = {
        fixtureId: 'fix-rolling-1',
        manualOverrides: false,
        selectedPlayerIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'],
        restedPlayerIds: [],
        lineupsByPeriod: [
          {
            period: 1,
            onPitch: [
              { playerId: 'p1', position: 'GK' },
              { playerId: 'p2', position: 'CB' },
              { playerId: 'p3', position: 'LB' },
              { playerId: 'p4', position: 'RB' },
              { playerId: 'p5', position: 'CM' },
              { playerId: 'p6', position: 'LM' },
              { playerId: 'p7', position: 'ST' },
            ],
            subs: ['p8', 'p9'],
          },
          {
            period: 2,
            onPitch: [
              { playerId: 'p1', position: 'GK' },
              { playerId: 'p2', position: 'CB' },
              { playerId: 'p3', position: 'LB' },
              { playerId: 'p4', position: 'RB' },
              { playerId: 'p5', position: 'CM' },
              { playerId: 'p6', position: 'LM' },
              { playerId: 'p7', position: 'ST' },
            ],
            subs: ['p8', 'p9'],
          },
        ],
        plannedInGameSubs: [
          {
            period: 1,
            targetMinute: 12.5,
            matchMinute: 13,
            playerOutId: 'p2',
            playerInId: 'p8',
            position: 'CB',
          },
          {
            period: 1,
            targetMinute: 12.5,
            matchMinute: 13,
            playerOutId: 'p3',
            playerInId: 'p9',
            position: 'LB',
          },
          {
            period: 2,
            targetMinute: 12.5,
            matchMinute: 38,
            playerOutId: 'p4',
            playerInId: 'p8',
            position: 'RB',
          },
          {
            period: 2,
            targetMinute: 12.5,
            matchMinute: 38,
            playerOutId: 'p5',
            playerInId: 'p9',
            position: 'CM',
          },
        ],
      };

      const mockPlayers = [
        createMockPlayer('p1', 'GK Player', ['Goalkeeper']),
        createMockPlayer('p2', 'CB Player', ['Defence']),
        createMockPlayer('p3', 'LB Player', ['Defence']),
        createMockPlayer('p4', 'RB Player', ['Defence']),
        createMockPlayer('p5', 'CM Player', ['Midfield']),
        createMockPlayer('p6', 'LM Player', ['Midfield']),
        createMockPlayer('p7', 'ST Player', ['Attack']),
        createMockPlayer('p8', 'Bench Def', ['Defence']),
        createMockPlayer('p9', 'Bench Mid', ['Midfield']),
      ];

      const settings = createMockSettings({
        matchPeriodCount: 2,
        periodDurationMinutes: 25,
        targetGameTimePercent: 50,
      });

      const stats = calculateMatchStats(matchSquad, mockPlayers, settings);

      // p1 plays both full halves = 50 mins (100%)
      const p1 = stats.find((s) => s.playerId === 'p1');
      assert.equal(p1?.minutesPlayed, 50);
      assert.equal(p1?.gameTimePercent, 100);
      assert.equal(p1?.meetsTarget, true);

      // p2 started in P1 (subbed off at 12.5 = 12.5m) and played full P2 (25m) = 37.5m (75%)
      const p2 = stats.find((s) => s.playerId === 'p2');
      assert.equal(p2?.minutesPlayed, 37.5);
      assert.equal(p2?.gameTimePercent, 75);
      assert.equal(p2?.meetsTarget, true);

      // p4 played full P1 (25m) and started P2 (subbed off at 12.5 = 12.5m) = 37.5m (75%)
      const p4 = stats.find((s) => s.playerId === 'p4');
      assert.equal(p4?.minutesPlayed, 37.5);
      assert.equal(p4?.gameTimePercent, 75);
      assert.equal(p4?.meetsTarget, true);

      // p8 was bench sub in P1 (came on at 12.5 = 12.5m) and in P2 (came on at 12.5 = 12.5m) = 25m (50%)
      const p8 = stats.find((s) => s.playerId === 'p8');
      assert.equal(p8?.minutesPlayed, 25);
      assert.equal(p8?.gameTimePercent, 50);
      assert.equal(p8?.meetsTarget, true);

      // p9 was bench sub in P1 (12.5m) and in P2 (12.5m) = 25m (50%)
      const p9 = stats.find((s) => s.playerId === 'p9');
      assert.equal(p9?.minutesPlayed, 25);
      assert.equal(p9?.gameTimePercent, 50);
      assert.equal(p9?.meetsTarget, true);
    });
  });

  describe('Lineup Continuity & In-Game Rolling Substitutions (Issue #25)', () => {
    it('preserves starting lineup across half-time when preserveLineupAcrossBreaks is true', () => {
      const mockPlayers = [
        createMockPlayer('p1', 'Player 1', ['Goalkeeper']),
        createMockPlayer('p2', 'Player 2', ['Defence']),
        createMockPlayer('p3', 'Player 3', ['Defence']),
        createMockPlayer('p4', 'Player 4', ['Midfield']),
        createMockPlayer('p5', 'Player 5', ['Midfield']),
        createMockPlayer('p6', 'Player 6', ['Attack']),
        createMockPlayer('p7', 'Player 7', ['Attack']),
        createMockPlayer('p8', 'Player 8', ['Defence']),
        createMockPlayer('p9', 'Player 9', ['Midfield']),
      ];

      const fixture = createMockFixture({
        preserveLineupAcrossBreaks: true,
        midPeriodSubIntervalMinutes: 12.5,
        matchPeriodCount: 2,
        periodDurationMinutes: 25,
      });

      const settings = createMockSettings({
        pitchPlayerCount: 7,
        matchdaySquadCap: 9,
        matchPeriodCount: 2,
        periodDurationMinutes: 25,
      });

      const squad = generateFairRotation(fixture, mockPlayers, settings);

      assert.equal(squad.lineupsByPeriod.length, 2);
      const p1Lineup = squad.lineupsByPeriod[0];
      const p2Lineup = squad.lineupsByPeriod[1];

      // Second half starting pitch lineup must be identical to first half
      const p1PitchIds = p1Lineup.onPitch.map((op) => op.playerId).sort();
      const p2PitchIds = p2Lineup.onPitch.map((op) => op.playerId).sort();
      assert.deepEqual(p1PitchIds, p2PitchIds, 'Period 2 starting pitch lineup must carry over from Period 1');

      // Bench substitutes must also be identical
      assert.deepEqual(p1Lineup.subs.sort(), p2Lineup.subs.sort());

      // Planned in-game substitutions must be generated
      assert.ok(squad.plannedInGameSubs);
      assert.ok(squad.plannedInGameSubs!.length >= 2, 'Should generate planned in-game rolling substitutions');

      // Check planned subs target minute
      squad.plannedInGameSubs!.forEach((sub) => {
        assert.equal(sub.targetMinute, 12.5);
        assert.ok(sub.matchMinute >= 12);
        assert.ok(sub.playerOutId);
        assert.ok(sub.playerInId);
        assert.ok(sub.position);
      });
    });

    it('generates planned in-game rolling subs when subTimingMode is in_game_rolling', () => {
      const mockPlayers = [
        createMockPlayer('p1', 'Player 1', ['Goalkeeper']),
        createMockPlayer('p2', 'Player 2', ['Defence']),
        createMockPlayer('p3', 'Player 3', ['Defence']),
        createMockPlayer('p4', 'Player 4', ['Midfield']),
        createMockPlayer('p5', 'Player 5', ['Midfield']),
        createMockPlayer('p6', 'Player 6', ['Attack']),
        createMockPlayer('p7', 'Player 7', ['Attack']),
        createMockPlayer('p8', 'Player 8', ['Defence']),
        createMockPlayer('p9', 'Player 9', ['Midfield']),
        createMockPlayer('p10', 'Player 10', ['Attack']),
      ];

      const fixture = createMockFixture({
        subTimingMode: 'in_game_rolling',
        matchPeriodCount: 2,
        periodDurationMinutes: 25,
      });

      const settings = createMockSettings({
        pitchPlayerCount: 7,
        matchdaySquadCap: 10,
        matchPeriodCount: 2,
        periodDurationMinutes: 25,
      });

      const squad = generateFairRotation(fixture, mockPlayers, settings);
      assert.ok(squad.plannedInGameSubs);
      assert.ok(squad.plannedInGameSubs!.length >= 4);

      // Verify that stats computed from this squad satisfy the 50% fair play threshold
      const stats = calculateMatchStats(squad, mockPlayers, settings, undefined, fixture);
      const belowTargetPlayers = stats.filter((s) => !s.meetsTarget);
      assert.equal(belowTargetPlayers.length, 0, 'All players should meet fair play target with rolling subs');
    });

    it('formats WhatsApp announcement with planned rolling subs when rolling mode is active', () => {
      const mockPlayers = [
        createMockPlayer('p1', 'Player 1', ['Goalkeeper']),
        createMockPlayer('p2', 'Player 2', ['Defence']),
        createMockPlayer('p3', 'Player 3', ['Defence']),
        createMockPlayer('p4', 'Player 4', ['Midfield']),
        createMockPlayer('p5', 'Player 5', ['Midfield']),
        createMockPlayer('p6', 'Player 6', ['Attack']),
        createMockPlayer('p7', 'Player 7', ['Attack']),
        createMockPlayer('p8', 'Player 8', ['Defence']),
      ];

      const fixture = createMockFixture({
        subTimingMode: 'in_game_rolling',
        preserveLineupAcrossBreaks: true,
        matchPeriodCount: 2,
        periodDurationMinutes: 25,
      });

      const settings = createMockSettings({
        pitchPlayerCount: 7,
        matchdaySquadCap: 8,
        matchPeriodCount: 2,
        periodDurationMinutes: 25,
      });

      const squad = generateFairRotation(fixture, mockPlayers, settings);
      fixture.matchSquad = squad;

      const announcement = generateWhatsAppAnnouncement(fixture, mockPlayers, settings);
      assert.ok(announcement.includes('PLANNED IN-GAME ROLLING SUBS'));
      assert.ok(announcement.includes('Half 1'));
      assert.ok(announcement.includes('Half 2'));
    });

    it('honours fixture-specific rolling sub override when global settings are at_breaks', () => {
      const mockPlayers = [
        createMockPlayer('p1', 'Player 1', ['Goalkeeper']),
        createMockPlayer('p2', 'Player 2', ['Defence']),
        createMockPlayer('p3', 'Player 3', ['Defence']),
        createMockPlayer('p4', 'Player 4', ['Midfield']),
        createMockPlayer('p5', 'Player 5', ['Midfield']),
        createMockPlayer('p6', 'Player 6', ['Attack']),
        createMockPlayer('p7', 'Player 7', ['Attack']),
        createMockPlayer('p8', 'Player 8', ['Defence']),
        createMockPlayer('p9', 'Player 9', ['Midfield']),
      ];

      // Global settings are at_breaks
      const settings = createMockSettings({
        pitchPlayerCount: 7,
        matchdaySquadCap: 9,
        matchPeriodCount: 2,
        periodDurationMinutes: 25,
        subTimingMode: 'at_breaks',
        preserveLineupAcrossBreaks: false,
      });

      // Fixture overrides to in_game_rolling
      const fixture = createMockFixture({
        subTimingMode: 'in_game_rolling',
        preserveLineupAcrossBreaks: true,
        midPeriodSubIntervalMinutes: 12.5,
        matchPeriodCount: 2,
        periodDurationMinutes: 25,
      });

      const squad = generateFairRotation(fixture, mockPlayers, settings);
      assert.equal(squad.lineupsByPeriod.length, 2);

      // Verify continuous lineup into Period 2
      const p1PitchIds = squad.lineupsByPeriod[0].onPitch.map((op) => op.playerId).sort();
      const p2PitchIds = squad.lineupsByPeriod[1].onPitch.map((op) => op.playerId).sort();
      assert.deepEqual(p1PitchIds, p2PitchIds);

      // Verify planned in-game subs are generated
      assert.ok(squad.plannedInGameSubs && squad.plannedInGameSubs.length > 0);
      assert.equal(squad.plannedInGameSubs[0].targetMinute, 12.5);
    });

    it('honours fixture-specific at_breaks override when global settings are in_game_rolling', () => {
      const mockPlayers = [
        createMockPlayer('p1', 'Player 1', ['Goalkeeper']),
        createMockPlayer('p2', 'Player 2', ['Defence']),
        createMockPlayer('p3', 'Player 3', ['Defence']),
        createMockPlayer('p4', 'Player 4', ['Midfield']),
        createMockPlayer('p5', 'Player 5', ['Midfield']),
        createMockPlayer('p6', 'Player 6', ['Attack']),
        createMockPlayer('p7', 'Player 7', ['Attack']),
        createMockPlayer('p8', 'Player 8', ['Defence']),
        createMockPlayer('p9', 'Player 9', ['Midfield']),
      ];

      // Global settings are in_game_rolling
      const settings = createMockSettings({
        pitchPlayerCount: 7,
        matchdaySquadCap: 9,
        matchPeriodCount: 2,
        periodDurationMinutes: 25,
        subTimingMode: 'in_game_rolling',
        preserveLineupAcrossBreaks: true,
      });

      // Fixture explicitly opts out of rolling subs (e.g. cup knockout)
      const fixture = createMockFixture({
        subTimingMode: 'at_breaks',
        preserveLineupAcrossBreaks: false,
        matchPeriodCount: 2,
        periodDurationMinutes: 25,
      });

      const squad = generateFairRotation(fixture, mockPlayers, settings);
      assert.equal(squad.lineupsByPeriod.length, 2);

      // Period 2 should rotate bench players onto the pitch at half-time
      const p1Bench = squad.lineupsByPeriod[0].subs;
      const p2PitchIds = new Set(squad.lineupsByPeriod[1].onPitch.map((op) => op.playerId));
      p1Bench.forEach((benchId) => {
        assert.ok(p2PitchIds.has(benchId), `Bench player ${benchId} should rotate onto pitch at half-time`);
      });

      // No planned in-game subs should be scheduled
      assert.equal(squad.plannedInGameSubs?.length || 0, 0);
    });

    it('excludes rested players and reconciles plannedInGameSubs when players are rested or promoted to pitch (Issue #38)', () => {
      const mockPlayers = [
        createMockPlayer('p1', 'Player 1', ['Goalkeeper']),
        createMockPlayer('p2', 'Player 2', ['Defence']),
        createMockPlayer('p3', 'Player 3', ['Defence']),
        createMockPlayer('p4', 'Player 4', ['Midfield']),
        createMockPlayer('p5', 'Player 5', ['Midfield']),
        createMockPlayer('p6', 'Player 6', ['Attack']),
        createMockPlayer('p7', 'Player 7', ['Attack']),
        createMockPlayer('p8', 'Player 8', ['Defence']),
        createMockPlayer('p9', 'Player 9', ['Midfield']),
      ];

      const fixture = createMockFixture({
        subTimingMode: 'in_game_rolling',
        preserveLineupAcrossBreaks: true,
        midPeriodSubIntervalMinutes: 12.5,
        matchPeriodCount: 2,
        periodDurationMinutes: 25,
      });

      const settings = createMockSettings({
        pitchPlayerCount: 7,
        matchdaySquadCap: 9,
        matchPeriodCount: 2,
        periodDurationMinutes: 25,
        subTimingMode: 'in_game_rolling',
        preserveLineupAcrossBreaks: true,
      });

      const initialSquad = generateFairRotation(fixture, mockPlayers, settings);
      assert.ok(initialSquad.plannedInGameSubs && initialSquad.plannedInGameSubs.length === 4);

      // Case A: Coach moves bench player 'p8' to Rested
      const squadAfterRestingBench = {
        ...initialSquad,
        selectedPlayerIds: initialSquad.selectedPlayerIds.filter((id) => id !== 'p8'),
        restedPlayerIds: ['p8'],
        lineupsByPeriod: initialSquad.lineupsByPeriod.map((l) => ({
          ...l,
          subs: l.subs.filter((id) => id !== 'p8'),
        })),
      };

      // Even before server reconciliation, filterActivePlannedInGameSubs must exclude rested 'p8'
      const filteredSubsA = filterActivePlannedInGameSubs(squadAfterRestingBench);
      assert.equal(
        filteredSubsA.some((s) => s.playerInId === 'p8' || s.playerOutId === 'p8'),
        false,
        'filterActivePlannedInGameSubs must immediately strip rested bench player p8'
      );

      // Reconciling squad updates plannedInGameSubs cleanly for remaining bench player p9
      const reconciledA = reconcileMatchSquadPlannedSubs(
        fixture,
        squadAfterRestingBench,
        mockPlayers,
        settings
      );
      assert.ok(reconciledA.plannedInGameSubs);
      assert.equal(reconciledA.plannedInGameSubs!.length, 2, 'Only 1 sub per period (p9) should remain');
      assert.equal(
        reconciledA.plannedInGameSubs!.some((s) => s.playerInId === 'p8' || s.playerOutId === 'p8'),
        false,
        'Rested player p8 must not appear in reconciled plannedInGameSubs'
      );

      // Case B: Coach moves starting pitch player 'p2' to Rested, promoting bench sub 'p8' to pitch
      const squadAfterRestingStarter = {
        ...initialSquad,
        selectedPlayerIds: initialSquad.selectedPlayerIds.filter((id) => id !== 'p2'),
        restedPlayerIds: ['p2'],
        lineupsByPeriod: initialSquad.lineupsByPeriod.map((l) => {
          const wasOnPitch = l.onPitch.find((op) => op.playerId === 'p2');
          const newOnPitch = l.onPitch.filter((op) => op.playerId !== 'p2');
          const newSubs = l.subs.filter((id) => id !== 'p8');
          if (wasOnPitch) {
            newOnPitch.push({ playerId: 'p8', position: wasOnPitch.position });
          }
          return { ...l, onPitch: newOnPitch, subs: newSubs };
        }),
      };

      // filterActivePlannedInGameSubs must exclude rested 'p2' AND promoted starter 'p8' (since p8 is now onPitch)
      const filteredSubsB = filterActivePlannedInGameSubs(squadAfterRestingStarter);
      assert.equal(
        filteredSubsB.some((s) => s.playerInId === 'p2' || s.playerOutId === 'p2'),
        false,
        'Rested starter p2 must be excluded'
      );
      assert.equal(
        filteredSubsB.some((s) => s.playerInId === 'p8'),
        false,
        'Promoted starter p8 is now on the pitch and must not be listed as coming off the bench'
      );

      const reconciledB = reconcileMatchSquadPlannedSubs(
        fixture,
        squadAfterRestingStarter,
        mockPlayers,
        settings
      );
      assert.ok(reconciledB.plannedInGameSubs);
      assert.equal(reconciledB.plannedInGameSubs!.length, 2);
      reconciledB.plannedInGameSubs!.forEach((s) => {
        assert.notEqual(s.playerOutId, 'p2');
        assert.notEqual(s.playerInId, 'p2');
        assert.equal(s.playerInId, 'p9', 'Only remaining bench sub p9 should be scheduled to come on');
      });

      // Verify WhatsApp announcement also excludes rested players from PLANNED IN-GAME ROLLING SUBS
      const announcement = generateWhatsAppAnnouncement(
        { ...fixture, matchSquad: squadAfterRestingBench },
        mockPlayers,
        settings
      );
      const rollingSection = announcement.split('🔄 *RESTED')[0].split('⏱️ *PLANNED IN-GAME ROLLING SUBS*')[1] || '';
      assert.equal(
        rollingSection.includes('Player 8'),
        false,
        'WhatsApp planned rolling subs section must not include rested Player 8'
      );
    });

    it('supports subsPerWindow (multi-player swaps) and ensureEveryoneSubbedOnce rule (Issue #39)', () => {
      const players: Player[] = [
        createMockPlayer('gk1', 'Keeper One', ['Goalkeeper'], { isFixedPosition: true, fixedPosition: 'GK' }),
        createMockPlayer('s1', 'Starter 1', ['Defence']),
        createMockPlayer('s2', 'Starter 2', ['Defence']),
        createMockPlayer('s3', 'Starter 3', ['Midfield']),
        createMockPlayer('s4', 'Starter 4', ['Midfield']),
        createMockPlayer('s5', 'Starter 5', ['Midfield']),
        createMockPlayer('s6', 'Starter 6', ['Attack']),
        createMockPlayer('b1', 'Bench 1', ['Midfield']),
        createMockPlayer('b2', 'Bench 2', ['Defence']),
        createMockPlayer('b3', 'Bench 3', ['Attack']),
      ];

      const settings = createMockSettings({
        pitchPlayerCount: 7,
        matchPeriodCount: 2,
        periodDurationMinutes: 25,
      });

      const fixture = createMockFixture({
        pitchPlayerCount: 7,
        matchPeriodCount: 2,
        periodDurationMinutes: 25,
        fixedPlayerPositions: { gk1: 'GK' },
        matchSquad: {
          fixtureId: 'fix-39',
          manualOverrides: false,
          selectedPlayerIds: players.map((p) => p.id),
          restedPlayerIds: [],
          lineupsByPeriod: [
            {
              period: 1,
              onPitch: [
                { playerId: 'gk1', position: 'GK' },
                { playerId: 's1', position: 'CB' },
                { playerId: 's2', position: 'LB' },
                { playerId: 's3', position: 'CM' },
                { playerId: 's4', position: 'LM' },
                { playerId: 's5', position: 'RM' },
                { playerId: 's6', position: 'ST' },
              ],
              subs: ['b1', 'b2', 'b3'],
            },
            {
              period: 2,
              onPitch: [
                { playerId: 'gk1', position: 'GK' },
                { playerId: 's1', position: 'CB' },
                { playerId: 's2', position: 'LB' },
                { playerId: 's3', position: 'CM' },
                { playerId: 's4', position: 'LM' },
                { playerId: 's5', position: 'RM' },
                { playerId: 's6', position: 'ST' },
              ],
              subs: ['b1', 'b2', 'b3'],
            },
          ],
        },
      });

      // 1. Verify subsPerWindow = 2 produces 2 swaps per window across all strategies
      const plansTwoPerWindow = generateSuggestedSubstitutions(fixture, players, settings, 10, {
        subsPerWindow: 2,
        ensureEveryoneSubbedOnce: false,
      });
      assert.equal(plansTwoPerWindow.length, 3);
      plansTwoPerWindow.forEach((plan) => {
        assert.ok(plan.windows.length > 0);
        plan.windows.forEach((win) => {
          assert.equal(
            win.subChanges.length,
            2,
            `Expected 2 subs per window in ${plan.strategyName} at ${win.minute}', got ${win.subChanges.length}`
          );
        });
      });

      // 2. Verify subsPerWindow = 'all_bench' produces 3 swaps per window (all 3 bench players)
      const plansAllBench = generateSuggestedSubstitutions(fixture, players, settings, 10, {
        subsPerWindow: 'all_bench',
      });
      plansAllBench[0].windows.forEach((win) => {
        assert.equal(win.subChanges.length, 3, 'All 3 bench players should swap in each window');
      });

      // 3. Verify ensureEveryoneSubbedOnce = true rotates all 6 non-fixed starters ('s1'..'s6')
      // onto the bench at least once before any player is subbed off a 2nd time.
      const plansEveryoneOnce = generateSuggestedSubstitutions(fixture, players, settings, 10, {
        subsPerWindow: 2,
        ensureEveryoneSubbedOnce: true,
      });

      for (const plan of plansEveryoneOnce) {
        const subbedOffSequence: string[] = [];
        plan.windows.forEach((w) => {
          w.subChanges.forEach((ch) => {
            subbedOffSequence.push(ch.offPlayerId);
          });
        });

        // The first 6 players subbed off must be the 6 distinct non-fixed starters ('s1'..'s6')
        const firstSixOff = subbedOffSequence.slice(0, 6);
        const uniqueFirstSix = new Set(firstSixOff);
        assert.equal(
          uniqueFirstSix.size,
          6,
          `In ${plan.strategyName}, all 6 non-fixed starters should be subbed off once before anyone is subbed off twice. Got: ${firstSixOff.join(', ')}`
        );
        ['s1', 's2', 's3', 's4', 's5', 's6'].forEach((starterId) => {
          assert.equal(
            uniqueFirstSix.has(starterId),
            true,
            `Starter ${starterId} was not rotated to the bench in ${plan.strategyName}`
          );
        });
      }
    });

    it('calculates exact player minutes across multi-window plannedInGameSubs within the same period (Issue #39)', () => {
      const players: Player[] = [
        createMockPlayer('p1', 'Player 1', ['Midfield']),
        createMockPlayer('p2', 'Player 2', ['Midfield']),
        createMockPlayer('p3', 'Player 3', ['Midfield']),
      ];

      const settings = createMockSettings({
        pitchPlayerCount: 2,
        matchPeriodCount: 1,
        periodDurationMinutes: 24,
      });

      const matchSquad = {
        fixtureId: 'fix-multi-win',
        manualOverrides: true,
        selectedPlayerIds: ['p1', 'p2', 'p3'],
        restedPlayerIds: [],
        lineupsByPeriod: [
          {
            period: 1,
            onPitch: [
              { playerId: 'p1', position: 'CM' },
              { playerId: 'p2', position: 'LM' },
            ],
            subs: ['p3'],
          },
        ],
        // Window 1 at 8': p1 OFF, p3 ON (p1 played 0..8 = 8m)
        // Window 2 at 16': p2 OFF, p1 ON (p2 played 0..16 = 16m; p1 plays 16..24 = 8m -> total 16m; p3 plays 8..24 = 16m)
        plannedInGameSubs: [
          {
            period: 1,
            targetMinute: 8,
            matchMinute: 8,
            playerOutId: 'p1',
            playerOutName: 'Player 1',
            playerInId: 'p3',
            playerInName: 'Player 3',
            position: 'CM',
          },
          {
            period: 1,
            targetMinute: 16,
            matchMinute: 16,
            playerOutId: 'p2',
            playerOutName: 'Player 2',
            playerInId: 'p1',
            playerInName: 'Player 1',
            position: 'LM',
          },
        ],
      };

      const activeSubs = filterActivePlannedInGameSubs(matchSquad);
      assert.equal(activeSubs.length, 2, 'Both multi-window planned subs in Period 1 must be accepted');

      const stats = calculateMatchStats(matchSquad, players, settings);
      const p1Stats = stats.find((s) => s.playerId === 'p1')!;
      const p2Stats = stats.find((s) => s.playerId === 'p2')!;
      const p3Stats = stats.find((s) => s.playerId === 'p3')!;

      assert.equal(p1Stats.minutesPlayed, 16, 'p1 played 0-8m and 16-24m = 16m');
      assert.equal(p2Stats.minutesPlayed, 16, 'p2 played 0-16m = 16m');
      assert.equal(p3Stats.minutesPlayed, 16, 'p3 played 8-24m = 16m');
    });
  });

});
