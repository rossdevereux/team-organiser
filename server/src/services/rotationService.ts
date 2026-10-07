import {
  Player,
  TeamSettings,
  Fixture,
  MatchSquad,
  PeriodLineup,
  MatchPlayerStats,
  BroadPosition,
  PostMatchRecording,
  SuggestedSubPlan,
  SuggestedSubWindow,
  SingleSubChange,
} from '../types.js';
import { findFormation } from '../db/formations.js';

/**
 * Maps pitch position code to BroadPosition category
 */
export const positionToBroad = (pos: string): BroadPosition => {
  if (pos.startsWith('GK')) return 'Goalkeeper';
  if (pos.startsWith('DEF') || pos.includes('Back') || pos.includes('Sweeper')) return 'Defence';
  if (pos.startsWith('MID') || pos.startsWith('DM') || pos.startsWith('AM') || pos.includes('Wing')) return 'Midfield';
  return 'Attack';
};

/**
 * Checks whether a player is eligible to participate in a fixture on a given date.
 * Takes into account:
 * 1. Optional sign-on date (player registered)
 * 2. Optional leave date (player transferred/left)
 * 3. Unavailable dates (holidays, illness, vacation)
 */
export const isPlayerEligibleForFixture = (
  player: Player,
  fixtureDate: string
): { eligible: boolean; reason?: string } => {
  if (player.signOnDate && fixtureDate < player.signOnDate) {
    return { eligible: false, reason: `Not yet signed on (Signed: ${player.signOnDate})` };
  }
  if (player.leaveDate && fixtureDate > player.leaveDate) {
    return { eligible: false, reason: `Left the squad on ${player.leaveDate}` };
  }
  if (player.unavailableDates && player.unavailableDates.includes(fixtureDate)) {
    return { eligible: false, reason: `On holiday / unavailable on ${fixtureDate}` };
  }
  return { eligible: true };
};

/**
 * Calculates fair play statistics for a match squad, taking into account
 * any post-match recordings (full participation credit vs exact minutes).
 */
export const calculateMatchStats = (
  matchSquad: MatchSquad,
  players: Player[],
  settings: TeamSettings,
  postMatchRecording?: PostMatchRecording
): MatchPlayerStats[] => {
  const periodCount = settings.matchPeriodCount || 2;
  const duration = settings.periodDurationMinutes || 25;
  const totalMatchMinutes = periodCount * duration;
  const playerMap = new Map(players.map((p) => [p.id, p]));

  const stats: MatchPlayerStats[] = matchSquad.selectedPlayerIds.map((playerId) => {
    const player = playerMap.get(playerId) || {
      id: playerId,
      name: 'Unknown Player',
      preferredPositions: ['Midfield'],
      unavailableDates: [],
      matchesPlayed: 0,
      totalMinutesPlayed: 0,
    };

    const periodsPlayed: number[] = [];
    let playedAsGoalkeeper = false;
    const positionsPlayed: string[] = [];

    matchSquad.lineupsByPeriod.forEach((lineup) => {
      const pitchEntry = lineup.onPitch.find((item) => item.playerId === playerId);
      if (pitchEntry) {
        periodsPlayed.push(lineup.period);
        positionsPlayed.push(pitchEntry.position);
        if (pitchEntry.position === 'GK') {
          playedAsGoalkeeper = true;
        }
      }
    });

    let minutesPlayed = periodsPlayed.length * duration;
    let isPostMatchRecorded = false;

    // Handle post-match recordings
    if (postMatchRecording) {
      isPostMatchRecorded = true;
      if (postMatchRecording.trackingMode === 'full_credit') {
        // Coach opted for full credit / 100% equal participation without exact minute tracking
        minutesPlayed = totalMatchMinutes;
      } else if (postMatchRecording.trackingMode === 'exact') {
        if (postMatchRecording.playerMinutes && typeof postMatchRecording.playerMinutes[playerId] === 'number') {
          minutesPlayed = postMatchRecording.playerMinutes[playerId];
        }
      }
    }

    const gameTimePercent =
      totalMatchMinutes > 0 ? Math.round((minutesPlayed / totalMatchMinutes) * 100) : 0;
    const meetsTarget = gameTimePercent >= (settings.targetGameTimePercent || 50);

    return {
      playerId,
      player,
      periodsPlayed,
      minutesPlayed,
      gameTimePercent,
      playedAsGoalkeeper,
      positionsPlayed,
      meetsTarget,
      isPostMatchRecorded,
    };
  });

  return stats;
};

/**
 * Smart Squad Selection: selects matchday squad (e.g. 10 players) and rested players (e.g. 3)
 * prioritising lowest historical matches/minutes and respecting eligibility dates.
 */
export const selectMatchdaySquad = (
  players: Player[],
  fixtureDate: string,
  squadCap: number = 10
): { selectedIds: string[]; restedIds: string[]; unavailableIds: string[] } => {
  const available: Player[] = [];
  const unavailableIds: string[] = [];

  players.forEach((p) => {
    const check = isPlayerEligibleForFixture(p, fixtureDate);
    if (!check.eligible) {
      unavailableIds.push(p.id);
    } else {
      available.push(p);
    }
  });

  // Sort available players: lower matches played -> higher priority
  available.sort((a, b) => {
    if (a.matchesPlayed !== b.matchesPlayed) {
      return a.matchesPlayed - b.matchesPlayed;
    }
    return a.totalMinutesPlayed - b.totalMinutesPlayed;
  });

  // Ensure at least one goalkeeper candidate is included if available
  const gkCandidates = available.filter((p) => p.preferredPositions.includes('Goalkeeper'));
  const selected: Player[] = [];

  if (gkCandidates.length > 0) {
    selected.push(gkCandidates[0]);
  }

  // Fill remaining slots up to squadCap
  for (const p of available) {
    if (selected.length >= squadCap) break;
    if (!selected.some((item) => item.id === p.id)) {
      selected.push(p);
    }
  }

  const selectedIds = selected.map((p) => p.id);
  const restedIds = available.filter((p) => !selectedIds.includes(p.id)).map((p) => p.id);

  return { selectedIds, restedIds, unavailableIds };
};

/**
 * Youth Football Fair Rotation Generator
 * Supports 2 Halves or N periods, any team size (5s, 7s, 9s, 11s),
 * avoids consecutive benching, and matches preferred positions.
 */
export const generateFairRotation = (
  fixture: Fixture,
  players: Player[],
  settings: TeamSettings,
  existingSelectedIds?: string[]
): MatchSquad => {
  const pitchCount = settings.pitchPlayerCount || 7;
  const periodCount = settings.matchPeriodCount || 2; // Default 2 Halves
  const squadCap = settings.matchdaySquadCap || 10;

  // Retrieve formation slots based on pitchPlayerCount and formation name
  const formation = findFormation(
    settings.defaultFormation || '2-3-1',
    pitchCount,
    settings.customFormations || []
  );

  const slotCodes = formation.slots.map((s) => s.code);

  // 1. Determine selected matchday squad
  let selectedIds: string[];
  let restedIds: string[];

  if (existingSelectedIds && existingSelectedIds.length > 0) {
    // Filter out players who are not eligible on this fixture's date
    const validSelected = existingSelectedIds.filter((id) => {
      const pl = players.find((p) => p.id === id);
      return pl && isPlayerEligibleForFixture(pl, fixture.date).eligible;
    });

    // If removing ineligible players leaves fewer players than pitchCount, re-select
    if (validSelected.length < Math.min(pitchCount, players.length)) {
      const selection = selectMatchdaySquad(players, fixture.date, squadCap);
      selectedIds = selection.selectedIds;
      restedIds = selection.restedIds;
    } else {
      selectedIds = validSelected;
      restedIds = players.filter((p) => !selectedIds.includes(p.id)).map((p) => p.id);
    }
  } else {
    const selection = selectMatchdaySquad(players, fixture.date, squadCap);
    selectedIds = selection.selectedIds;
    restedIds = selection.restedIds;
  }

  const selectedPlayers = selectedIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p));

  const totalSlots = pitchCount * periodCount; // e.g. 7 * 2 = 14 slots in 2 halves
  const squadSize = selectedPlayers.length || squadCap;
  const basePeriodsPerPlayer = Math.floor(totalSlots / squadSize);
  const extraPeriodsCount = totalSlots % squadSize;

  // Prioritize players with fewer historical minutes for extra periods
  const playersByHistoricalNeed = [...selectedPlayers].sort(
    (a, b) => a.totalMinutesPlayed - b.totalMinutesPlayed
  );

  const targetPeriodsMap = new Map<string, number>();
  playersByHistoricalNeed.forEach((p, idx) => {
    const target = idx < extraPeriodsCount ? basePeriodsPerPlayer + 1 : basePeriodsPerPlayer;
    targetPeriodsMap.set(p.id, Math.max(1, target));
  });

  const periodsPlayedMap = new Map<string, number>();
  selectedPlayers.forEach((p) => periodsPlayedMap.set(p.id, 0));

  let previousBenchIds: string[] = [];
  const lineupsByPeriod: PeriodLineup[] = [];

  const gkList = selectedPlayers.filter((p) => p.preferredPositions.includes('Goalkeeper'));

  for (let period = 1; period <= periodCount; period++) {
    // Determine GK for this period
    let periodGk: Player;
    if (gkList.length === 0) {
      periodGk = selectedPlayers[0];
    } else if (gkList.length === 1) {
      periodGk = gkList[0];
    } else {
      // Rotate between goalkeepers
      periodGk = gkList[(period - 1) % gkList.length];
    }

    const currentPitchPlayers: Player[] = [periodGk];
    periodsPlayedMap.set(periodGk.id, (periodsPlayedMap.get(periodGk.id) || 0) + 1);

    const candidates = selectedPlayers.filter((p) => p.id !== periodGk.id);

    // Sort candidates:
    // 1. Players benched in previous period (avoid consecutive benching)
    // 2. Players furthest behind their target periods for the match
    // 3. Lowest historical minutes played
    candidates.sort((a, b) => {
      const aWasBenched = previousBenchIds.includes(a.id) ? 1 : 0;
      const bWasBenched = previousBenchIds.includes(b.id) ? 1 : 0;
      if (aWasBenched !== bWasBenched) {
        return bWasBenched - aWasBenched; // benched previously gets priority
      }

      const aDeficit = (targetPeriodsMap.get(a.id) || 1) - (periodsPlayedMap.get(a.id) || 0);
      const bDeficit = (targetPeriodsMap.get(b.id) || 1) - (periodsPlayedMap.get(b.id) || 0);
      if (aDeficit !== bDeficit) {
        return bDeficit - aDeficit; // larger deficit gets priority
      }

      return a.totalMinutesPlayed - b.totalMinutesPlayed;
    });

    // Pick top (pitchCount - 1) outfield players
    const outfieldSlotsNeeded = pitchCount - 1;
    const selectedOutfield = candidates.slice(0, outfieldSlotsNeeded);

    selectedOutfield.forEach((p) => {
      currentPitchPlayers.push(p);
      periodsPlayedMap.set(p.id, (periodsPlayedMap.get(p.id) || 0) + 1);
    });

    const benchPlayers = candidates.slice(outfieldSlotsNeeded);
    previousBenchIds = benchPlayers.map((p) => p.id);

    // Assign positions on pitch matching preferred categories
    const outfieldSlots = formation.slots.filter((s) => s.category !== 'Goalkeeper');
    const availableOutfieldPlayers = [...selectedOutfield];

    const onPitchAssignments: { playerId: string; position: string }[] = [
      { playerId: periodGk.id, position: 'GK' },
    ];

    outfieldSlots.forEach((slot) => {
      if (availableOutfieldPlayers.length === 0) return;

      // Find player with preferred category match
      let matchIdx = availableOutfieldPlayers.findIndex((p) =>
        p.preferredPositions.includes(slot.category)
      );

      if (matchIdx === -1) {
        matchIdx = 0; // fallback to next available
      }

      const matchedPlayer = availableOutfieldPlayers.splice(matchIdx, 1)[0];
      onPitchAssignments.push({
        playerId: matchedPlayer.id,
        position: slot.code,
      });
    });

    lineupsByPeriod.push({
      period,
      onPitch: onPitchAssignments,
      subs: benchPlayers.map((p) => p.id),
    });
  }

  return {
    fixtureId: fixture.id,
    selectedPlayerIds: selectedIds,
    restedPlayerIds: restedIds,
    lineupsByPeriod,
    manualOverrides: false,
  };
};

/**
 * Generates Sideline Suggested Substitutions based on configurable interval (e.g. every 10 mins).
 * Returns multiple strategic options taking into account players' positional preferences.
 */
interface InMatchTracker {
  playerId: string;
  player: Player;
  minutesThisMatch: number;
  timesSubbedOn: number;
  hasPlayedThisMatch: boolean;
  isOnPitch: boolean;
  currentPosition?: string;
  stintMinutes: number;
}

/**
 * Generates Sideline Suggested Substitutions based on configurable interval (e.g. every 10 mins).
 * Returns multiple strategic options taking into account:
 * 1. Spreading out in-game pitch minutes fairly across all squad members
 * 2. Strictly prioritising players who have NOT been subbed on yet in the game
 * 3. Balancing historical season minutes for tie-breaking
 * 4. Aligning with player preferred and specific positions
 */
export const generateSuggestedSubstitutions = (
  fixture: Fixture,
  players: Player[],
  settings: TeamSettings,
  intervalMinutes: number = 10
): SuggestedSubPlan[] => {
  const periodCount = settings.matchPeriodCount || 2;
  const duration = settings.periodDurationMinutes || 25;
  const totalMatchMinutes = periodCount * duration;
  const squad = fixture.matchSquad;
  const playerMap = new Map(players.map((p) => [p.id, p]));

  if (!squad || !squad.lineupsByPeriod || squad.lineupsByPeriod.length === 0) {
    return [];
  }

  const safeInterval = Math.max(5, Math.min(25, intervalMinutes));

  // Helper to initialise a clean match tracking state for all squad players
  const initSquadTracker = (): Map<string, InMatchTracker> => {
    const tracker = new Map<string, InMatchTracker>();
    squad.selectedPlayerIds.forEach((id) => {
      const pl = playerMap.get(id) || {
        id,
        name: 'Player',
        preferredPositions: ['Midfield'],
        unavailableDates: [],
        matchesPlayed: 0,
        totalMinutesPlayed: 0,
      };
      tracker.set(id, {
        playerId: id,
        player: pl,
        minutesThisMatch: 0,
        timesSubbedOn: 0,
        hasPlayedThisMatch: false,
        isOnPitch: false,
        stintMinutes: 0,
      });
    });
    return tracker;
  };

  // Helper to determine if a position matches player's preferences
  const matchesPositionPreference = (pl: Player, posCode: string): boolean => {
    const broad = positionToBroad(posCode);
    if (pl.preferredPositions.includes(broad)) return true;
    if (pl.specificPositions && pl.specificPositions.some((sp) => sp.toLowerCase().includes(broad.toLowerCase()))) {
      return true;
    }
    return false;
  };

  // =========================================================================
  // Strategy 1: Maximum Fair Play & Unused Subs Priority
  // =========================================================================
  const fairPlayWindows: SuggestedSubWindow[] = [];
  const tracker1 = initSquadTracker();

  for (let pIdx = 0; pIdx < squad.lineupsByPeriod.length; pIdx++) {
    const lineup = squad.lineupsByPeriod[pIdx];
    const period = lineup.period;
    const periodStartMinute = (period - 1) * duration;

    // Synchronise starters at the beginning of each period
    lineup.onPitch.forEach((entry) => {
      const t = tracker1.get(entry.playerId);
      if (t) {
        t.isOnPitch = true;
        t.currentPosition = entry.position;
        t.hasPlayedThisMatch = true;
        t.stintMinutes = 0;
      }
    });

    lineup.subs.forEach((subId) => {
      const t = tracker1.get(subId);
      if (t) {
        t.isOnPitch = false;
        t.currentPosition = undefined;
        t.stintMinutes = 0;
      }
    });

    // Sub interval marks within the period (e.g., at 10m, 20m)
    const subMinutes: number[] = [];
    for (let m = safeInterval; m < duration; m += safeInterval) {
      subMinutes.push(m);
    }

    let lastTickMinute = 0;

    subMinutes.forEach((minuteOffset) => {
      const matchClockMinute = periodStartMinute + minuteOffset;
      const elapsedSinceLastTick = minuteOffset - lastTickMinute;
      lastTickMinute = minuteOffset;

      // Advance minutes for all players currently on pitch
      tracker1.forEach((t) => {
        if (t.isOnPitch) {
          t.minutesThisMatch += elapsedSinceLastTick;
          t.stintMinutes += elapsedSinceLastTick;
        }
      });

      // Find current bench and outfield pitch players
      const benchCandidates: InMatchTracker[] = [];
      const onPitchOutfield: InMatchTracker[] = [];

      tracker1.forEach((t) => {
        if (!t.isOnPitch) {
          benchCandidates.push(t);
        } else if (t.currentPosition !== 'GK') {
          onPitchOutfield.push(t);
        }
      });

      if (benchCandidates.length === 0 || onPitchOutfield.length === 0) return;

      // Sort bench candidates:
      // 1. Unused players who haven't played AT ALL yet
      // 2. Players subbed on fewer times
      // 3. Lowest in-game minutes so far
      // 4. Lowest historical season minutes
      benchCandidates.sort((a, b) => {
        if (a.hasPlayedThisMatch !== b.hasPlayedThisMatch) {
          return a.hasPlayedThisMatch ? 1 : -1;
        }
        if (a.timesSubbedOn !== b.timesSubbedOn) {
          return a.timesSubbedOn - b.timesSubbedOn;
        }
        if (a.minutesThisMatch !== b.minutesThisMatch) {
          return a.minutesThisMatch - b.minutesThisMatch;
        }
        return (a.player.totalMinutesPlayed || 0) - (b.player.totalMinutesPlayed || 0);
      });

      const subChanges: SingleSubChange[] = [];
      const numToSub = Math.min(
        benchCandidates.length,
        Math.max(1, Math.floor(benchCandidates.length / Math.max(1, subMinutes.length)) || 1)
      );

      for (let s = 0; s < numToSub; s++) {
        const incoming = benchCandidates[s];
        if (!incoming) break;

        // Find best outgoing player among onPitchOutfield:
        // Try to find someone matching incoming player's position preference first
        const preferredBroad = incoming.player.preferredPositions[0] || 'Midfield';
        let matchedOutfield = onPitchOutfield.filter((t) =>
          positionToBroad(t.currentPosition || '') === preferredBroad
        );

        if (matchedOutfield.length === 0) {
          matchedOutfield = onPitchOutfield;
        }

        // Sort matched outgoing:
        // 1. Highest match minutes played so far
        // 2. Highest historical season minutes
        // 3. Longest current stint
        matchedOutfield.sort((a, b) => {
          if (a.minutesThisMatch !== b.minutesThisMatch) {
            return b.minutesThisMatch - a.minutesThisMatch;
          }
          if ((a.player.totalMinutesPlayed || 0) !== (b.player.totalMinutesPlayed || 0)) {
            return (b.player.totalMinutesPlayed || 0) - (a.player.totalMinutesPlayed || 0);
          }
          return b.stintMinutes - a.stintMinutes;
        });

        const outgoing = matchedOutfield[0];
        if (!outgoing) break;

        // Remove from available lists for this window
        const outgoingIdx = onPitchOutfield.findIndex((item) => item.playerId === outgoing.playerId);
        if (outgoingIdx !== -1) onPitchOutfield.splice(outgoingIdx, 1);

        const targetPos = outgoing.currentPosition || 'MID';

        // Reason formulation
        let reason = '';
        if (!incoming.hasPlayedThisMatch) {
          reason = `Unused sub: ${incoming.player.name} hasn't played yet this match (${incoming.player.totalMinutesPlayed}m season)`;
        } else if (outgoing.minutesThisMatch > incoming.minutesThisMatch) {
          reason = `Game time balance: ${outgoing.player.name} (${outgoing.minutesThisMatch}m played) rotated for ${incoming.player.name} (${incoming.minutesThisMatch}m played)`;
        } else {
          reason = `Fresh legs rotation: ${incoming.player.name} rotated into ${positionToBroad(targetPos)} (${incoming.player.totalMinutesPlayed}m season total)`;
        }

        subChanges.push({
          offPlayerId: outgoing.playerId,
          offPlayerName: outgoing.player.name,
          onPlayerId: incoming.playerId,
          onPlayerName: incoming.player.name,
          position: targetPos,
          positionCategory: positionToBroad(targetPos),
          reason,
        });

        // Update tracking state
        outgoing.isOnPitch = false;
        outgoing.currentPosition = undefined;
        outgoing.stintMinutes = 0;

        incoming.isOnPitch = true;
        incoming.currentPosition = targetPos;
        incoming.hasPlayedThisMatch = true;
        incoming.timesSubbedOn += 1;
        incoming.stintMinutes = 0;
      }

      if (subChanges.length > 0) {
        fairPlayWindows.push({
          minute: matchClockMinute,
          period,
          subChanges,
          description: `Rotate fresh legs (${safeInterval}m interval mark)`,
        });
      }
    });

    // Advance remaining minutes in the period
    const remainingPeriodMinutes = duration - lastTickMinute;
    tracker1.forEach((t) => {
      if (t.isOnPitch) {
        t.minutesThisMatch += remainingPeriodMinutes;
        t.stintMinutes += remainingPeriodMinutes;
      }
    });
  }

  // =========================================================================
  // Strategy 2: Positional Match & Tactical Shape Preservation
  // =========================================================================
  const positionalWindows: SuggestedSubWindow[] = [];
  const tracker2 = initSquadTracker();

  for (let pIdx = 0; pIdx < squad.lineupsByPeriod.length; pIdx++) {
    const lineup = squad.lineupsByPeriod[pIdx];
    const period = lineup.period;
    const periodStartMinute = (period - 1) * duration;

    lineup.onPitch.forEach((entry) => {
      const t = tracker2.get(entry.playerId);
      if (t) {
        t.isOnPitch = true;
        t.currentPosition = entry.position;
        t.hasPlayedThisMatch = true;
      }
    });

    lineup.subs.forEach((subId) => {
      const t = tracker2.get(subId);
      if (t) {
        t.isOnPitch = false;
        t.currentPosition = undefined;
      }
    });

    const subMinutes: number[] = [];
    for (let m = safeInterval; m < duration; m += safeInterval) {
      subMinutes.push(m);
    }

    subMinutes.forEach((minuteOffset) => {
      const matchClockMinute = periodStartMinute + minuteOffset;
      const subChanges: SingleSubChange[] = [];

      const bench = Array.from(tracker2.values()).filter((t) => !t.isOnPitch);
      const onPitch = Array.from(tracker2.values()).filter(
        (t) => t.isOnPitch && t.currentPosition !== 'GK'
      );

      // Prioritise bench players by lowest minutes / unplayed
      bench.sort((a, b) => {
        if (a.hasPlayedThisMatch !== b.hasPlayedThisMatch) return a.hasPlayedThisMatch ? 1 : -1;
        return a.minutesThisMatch - b.minutesThisMatch;
      });

      bench.forEach((inc) => {
        if (subChanges.some((c) => c.onPlayerId === inc.playerId)) return;
        const broad = inc.player.preferredPositions[0] || 'Midfield';

        const matchingOutfield = onPitch.filter(
          (out) =>
            positionToBroad(out.currentPosition || '') === broad &&
            !subChanges.some((c) => c.offPlayerId === out.playerId)
        );

        if (matchingOutfield.length > 0) {
          matchingOutfield.sort((a, b) => b.minutesThisMatch - a.minutesThisMatch);
          const out = matchingOutfield[0];
          const pos = out.currentPosition || 'MID';

          subChanges.push({
            offPlayerId: out.playerId,
            offPlayerName: out.player.name,
            onPlayerId: inc.playerId,
            onPlayerName: inc.player.name,
            position: pos,
            positionCategory: positionToBroad(pos),
            reason: `Like-for-like ${broad} rotation (${inc.player.totalMinutesPlayed}m season)`,
          });

          out.isOnPitch = false;
          out.currentPosition = undefined;
          inc.isOnPitch = true;
          inc.currentPosition = pos;
          inc.hasPlayedThisMatch = true;
        }
      });

      if (subChanges.length > 0) {
        positionalWindows.push({
          minute: matchClockMinute,
          period,
          subChanges,
          description: `Like-for-like positional rotation at ${matchClockMinute}'`,
        });
      }
    });
  }

  // =========================================================================
  // Strategy 3: Smooth Rolling Single Sub (1 swap per window)
  // =========================================================================
  const rollingWindows: SuggestedSubWindow[] = [];
  const tracker3 = initSquadTracker();

  for (let pIdx = 0; pIdx < squad.lineupsByPeriod.length; pIdx++) {
    const lineup = squad.lineupsByPeriod[pIdx];
    const period = lineup.period;
    const periodStartMinute = (period - 1) * duration;

    lineup.onPitch.forEach((entry) => {
      const t = tracker3.get(entry.playerId);
      if (t) {
        t.isOnPitch = true;
        t.currentPosition = entry.position;
        t.hasPlayedThisMatch = true;
      }
    });

    lineup.subs.forEach((subId) => {
      const t = tracker3.get(subId);
      if (t) {
        t.isOnPitch = false;
        t.currentPosition = undefined;
      }
    });

    for (let m = safeInterval; m < duration; m += safeInterval) {
      const matchClockMinute = periodStartMinute + m;

      const bench = Array.from(tracker3.values()).filter((t) => !t.isOnPitch);
      const onPitch = Array.from(tracker3.values()).filter(
        (t) => t.isOnPitch && t.currentPosition !== 'GK'
      );

      if (bench.length === 0 || onPitch.length === 0) break;

      // Pick top bench candidate (unplayed first, then lowest match minutes, then lowest season minutes)
      bench.sort((a, b) => {
        if (a.hasPlayedThisMatch !== b.hasPlayedThisMatch) return a.hasPlayedThisMatch ? 1 : -1;
        if (a.minutesThisMatch !== b.minutesThisMatch) return a.minutesThisMatch - b.minutesThisMatch;
        return (a.player.totalMinutesPlayed || 0) - (b.player.totalMinutesPlayed || 0);
      });

      // Pick outgoing with highest minutes
      onPitch.sort((a, b) => {
        if (a.minutesThisMatch !== b.minutesThisMatch) return b.minutesThisMatch - a.minutesThisMatch;
        return (b.player.totalMinutesPlayed || 0) - (a.player.totalMinutesPlayed || 0);
      });

      const inc = bench[0];
      const out = onPitch[0];
      const targetPos = out.currentPosition || 'MID';

      rollingWindows.push({
        minute: matchClockMinute,
        period,
        subChanges: [
          {
            offPlayerId: out.playerId,
            offPlayerName: out.player.name,
            onPlayerId: inc.playerId,
            onPlayerName: inc.player.name,
            position: targetPos,
            positionCategory: positionToBroad(targetPos),
            reason: !inc.hasPlayedThisMatch
              ? `Unused sub priority: ${inc.player.name} enters pitch`
              : `Single rolling rotation: ${out.player.name} rested for ${inc.player.name}`,
          },
        ],
        description: `Single rolling sub at ${matchClockMinute}'`,
      });

      out.isOnPitch = false;
      out.currentPosition = undefined;
      inc.isOnPitch = true;
      inc.currentPosition = targetPos;
      inc.hasPlayedThisMatch = true;
    }
  }

  return [
    {
      intervalMinutes: safeInterval,
      strategyName: `Equal Game Time & Unused Subs (Every ${safeInterval}m)`,
      strategyDescription: `Prioritises unused substitutes, balances in-game and historical season minutes, and maintains positional balance.`,
      windows: fairPlayWindows,
    },
    {
      intervalMinutes: safeInterval,
      strategyName: `Positional Match (Every ${safeInterval}m)`,
      strategyDescription: `Swaps substitutes into their preferred position categories (Defence for Defence, Midfield for Midfield) ensuring balanced roles.`,
      windows: positionalWindows,
    },
    {
      intervalMinutes: safeInterval,
      strategyName: `Rolling Single Sub (Every ${safeInterval}m)`,
      strategyDescription: `Smoothly rotates one substitute at a time to maintain match continuity and team cohesion on the pitch.`,
      windows: rollingWindows,
    },
  ];
};

/**
 * Formats matchday squad into WhatsApp-ready team sheet
 */
export const generateWhatsAppAnnouncement = (
  fixture: Fixture,
  players: Player[],
  settings: TeamSettings
): string => {
  const squad = fixture.matchSquad;
  const playerMap = new Map(players.map((p) => [p.id, p]));

  const dateObj = new Date(fixture.date);
  const formattedDate = dateObj.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const periodLabel =
    settings.matchPeriodCount === 2
      ? `2 Halves × ${settings.periodDurationMinutes} mins`
      : `${settings.matchPeriodCount} Periods × ${settings.periodDurationMinutes} mins`;

  const selectedNames = (squad?.selectedPlayerIds || [])
    .map((id) => {
      const p = playerMap.get(id);
      if (!p) return null;
      const numStr = p.squadNumber ? `#${p.squadNumber} ` : '';
      const posStr = p.preferredPositions.length > 0 ? ` (${p.preferredPositions[0]})` : '';
      return `• ${numStr}${p.name}${posStr}`;
    })
    .filter(Boolean)
    .join('\n');

  const restedNames = (squad?.restedPlayerIds || [])
    .map((id) => {
      const p = playerMap.get(id);
      if (!p) return null;
      return `• ${p.squadNumber ? `#${p.squadNumber} ` : ''}${p.name}`;
    })
    .filter(Boolean)
    .join('\n');

  const captainPlayer = fixture.captainId ? playerMap.get(fixture.captainId) : null;
  const captainText = captainPlayer
    ? `\n©️ *Matchday Captain:* ${captainPlayer.squadNumber ? `#${captainPlayer.squadNumber} ` : ''}${captainPlayer.name}`
    : '';

  const timeText = fixture.meetTime
    ? `⏰ *Meet Time:* ${fixture.meetTime} (Kick-off: ${fixture.kickOffTime || 'TBC'})`
    : `⏰ *Kick-off:* ${fixture.kickOffTime || 'TBC'}`;

  const groundText = fixture.groundAddress ? `\n🏟️ *Ground Address:* ${fixture.groundAddress}` : '';
  const mapsText = fixture.mapsUrl ? `\n🗺️ *Google Maps Link:* ${fixture.mapsUrl}` : '';

  return `⚽ *SUBSHUFFLE MATCHDAY ANNOUNCEMENT* ⚽

🆚 *Opponent:* ${fixture.opponent}
📅 *Date:* ${formattedDate}
${timeText}
📍 *Venue:* ${fixture.venue}${groundText}${mapsText}${captainText}
⏱ *Format:* ${settings.pitchPlayerCount}-a-side (${periodLabel})

📋 *MATCHDAY SQUAD (${squad?.selectedPlayerIds.length || 0})*
${selectedNames || 'Squad not finalised yet'}

🔄 *RESTED / ROTATION ROSTER (${squad?.restedPlayerIds.length || 0})*
${restedNames || 'None'}

⚖️ *FAIR PLAY PROMISE:* Every selected player is scheduled for balanced playing time (~${settings.targetGameTimePercent}%+ target).

⚠️ *REMINDERS:*
• Shin pads & water bottles are mandatory
• ${fixture.meetTime ? `Arrive promptly by ${fixture.meetTime}` : 'Arrive 30 minutes before kick-off'}
• Please confirm availability in the group chat!

_Generated by SubShuffle_`;
};
