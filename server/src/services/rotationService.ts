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
  EarlyDeparture,
  PlannedInGameSub,
  SubstitutionTimingMode,
} from '../types.js';
import { findFormation } from '../db/formations.js';

/**
 * Maps pitch position code to BroadPosition category
 */
export const positionToBroad = (pos: string): BroadPosition => {
  const p = pos.toUpperCase();
  if (p.startsWith('GK') || p.includes('GOAL') || p.includes('KEEPER')) return 'Goalkeeper';
  if (p.startsWith('DEF') || p.includes('BACK') || p.includes('SWEEPER') || p === 'CB' || p === 'LB' || p === 'RB') return 'Defence';
  if (p.startsWith('MID') || p.startsWith('DM') || p.startsWith('AM') || p.includes('WING') || p === 'CM' || p === 'LM' || p === 'RM' || p === 'CAM' || p === 'CDM') return 'Midfield';
  return 'Attack';
};

/**
 * Calculates a preference compatibility score for placing a player into a broad category / slot code.
 * Higher score = stronger preference.
 * - 1st preference (preferredPositions[0] === slotCategory): 100
 * - 2nd preference (preferredPositions[1] === slotCategory): 60
 * - 3rd preference (preferredPositions[2] === slotCategory): 30
 * - 4th+ preference: 15
 * - Specific tactical role match bonus (e.g. 'Centre Back' matches 'CB'): +10
 * - Incompatible (not in preferredPositions): 0
 */
export const getPositionPreferenceScore = (
  player: Player,
  slotCategory: BroadPosition | string,
  slotCode?: string
): number => {
  const broad = typeof slotCategory === 'string' ? positionToBroad(slotCategory) : slotCategory;
  const prefIndex = player.preferredPositions.indexOf(broad as BroadPosition);

  // If broad is Goalkeeper but player doesn't have Goalkeeper in preferredPositions
  if (broad === 'Goalkeeper' && prefIndex === -1) {
    return 0;
  }

  // If player ONLY plays Goalkeeper and slot is outfield
  if (player.preferredPositions.length === 1 && player.preferredPositions[0] === 'Goalkeeper' && broad !== 'Goalkeeper') {
    return 0;
  }

  if (prefIndex === -1) {
    // Check specific positions if any mention the category
    if (player.specificPositions && player.specificPositions.some((sp) => sp.toLowerCase().includes(broad.toLowerCase()))) {
      return 15;
    }
    return 0;
  }

  // Base score based on preference rank
  let score = 0;
  if (prefIndex === 0) score = 100;      // Primary (1st preference)
  else if (prefIndex === 1) score = 60; // Secondary (2nd preference)
  else if (prefIndex === 2) score = 30; // 3rd preference
  else score = 15;                       // 4th+ preference

  // Specific tactical position role bonus (e.g. "Centre Back" matches "CB", "DEF_C", "CD")
  if (slotCode && player.specificPositions && player.specificPositions.length > 0) {
    const codeUpper = slotCode.toUpperCase();
    const matchesSpecific = player.specificPositions.some((role) => {
      const r = role.toLowerCase();
      if ((codeUpper.includes('CB') || codeUpper.includes('DEF_C')) && (r.includes('centre') || r.includes('center'))) return true;
      if ((codeUpper.includes('LB') || codeUpper.includes('DEF_L')) && r.includes('left')) return true;
      if ((codeUpper.includes('RB') || codeUpper.includes('DEF_R')) && r.includes('right')) return true;
      if ((codeUpper.includes('CM') || codeUpper.includes('MID_C')) && (r.includes('central') || r.includes('centre') || r.includes('center'))) return true;
      if ((codeUpper.includes('LW') || codeUpper.includes('MID_L') || codeUpper.includes('ATT_L')) && (r.includes('left') || r.includes('wing'))) return true;
      if ((codeUpper.includes('RW') || codeUpper.includes('MID_R') || codeUpper.includes('ATT_R')) && (r.includes('right') || r.includes('wing'))) return true;
      if ((codeUpper.includes('ST') || codeUpper.includes('ATT') || codeUpper.includes('CF')) && (r.includes('striker') || r.includes('forward') || r.includes('attack'))) return true;
      if (codeUpper.startsWith('GK') && r.includes('goal')) return true;
      return false;
    });
    if (matchesSpecific) {
      score += 10;
    }
  }

  return score;
};

/**
 * Solves Maximum Weight Bipartite Matching using the Kuhn-Munkres (Hungarian) algorithm.
 * Guarantees globally optimal assignment maximizing total player preference satisfaction.
 *
 * @param weights NxM matrix where weights[i][j] is the utility/preference of assigning player i to slot j.
 * @returns Array where index i is the assigned slot j for player i (or -1 if unmatched).
 */
export const maxWeightBipartiteMatching = (weights: number[][]): number[] => {
  const n = weights.length;
  if (n === 0) return [];
  const m = weights[0].length;
  if (m === 0) return new Array(n).fill(-1);

  // Pad to square matrix of size max(n, m)
  const size = Math.max(n, m);
  const matrix: number[][] = Array.from({ length: size }, () => new Array(size).fill(0));

  let maxVal = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      matrix[i][j] = weights[i][j];
      if (weights[i][j] > maxVal) maxVal = weights[i][j];
    }
  }

  // Convert maximization to minimization: cost = maxVal - weight
  const cost: number[][] = Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => maxVal - matrix[i][j])
  );

  const u = new Array(size + 1).fill(0);
  const v = new Array(size + 1).fill(0);
  const p = new Array(size + 1).fill(0);
  const way = new Array(size + 1).fill(0);

  for (let i = 1; i <= size; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(size + 1).fill(Infinity);
    const used = new Array(size + 1).fill(false);

    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;

      for (let j = 1; j <= size; j++) {
        if (!used[j]) {
          const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }

      for (let j = 0; j <= size; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const result = new Array(n).fill(-1);
  for (let j = 1; j <= size; j++) {
    const playerIdx = p[j] - 1;
    const slotIdx = j - 1;
    if (playerIdx >= 0 && playerIdx < n && slotIdx < m) {
      result[playerIdx] = slotIdx;
    }
  }

  return result;
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
  postMatchRecording?: PostMatchRecording,
  fixture?: Fixture
): MatchPlayerStats[] => {
  const periodCount = fixture?.matchPeriodCount || settings.matchPeriodCount || 2;
  const duration = fixture?.periodDurationMinutes || settings.periodDurationMinutes || 25;
  const totalMatchMinutes = periodCount * duration;
  const playerMap = new Map(players.map((p) => [p.id, p]));

  const stats: MatchPlayerStats[] = matchSquad.selectedPlayerIds.map((playerId) => {
    const player = playerMap.get(playerId) || {
      id: playerId,
      teamId: fixture?.teamId || '',
      name: 'Unknown Player',
      preferredPositions: ['Midfield'],
      unavailableDates: [],
      matchesPlayed: 0,
      totalMinutesPlayed: 0,
    };

    const periodsPlayed: number[] = [];
    let playedAsGoalkeeper = false;
    const positionsPlayed: string[] = [];
    let calculatedMinutes = 0;

    const hasPlannedSubs =
      matchSquad.plannedInGameSubs && matchSquad.plannedInGameSubs.length > 0;

    if (hasPlannedSubs) {
      for (let p = 1; p <= periodCount; p++) {
        const lineup = matchSquad.lineupsByPeriod.find((l) => l.period === p);
        const pitchEntry = lineup?.onPitch.find((item) => item.playerId === playerId);
        const subOut = matchSquad.plannedInGameSubs?.find(
          (s) => s.period === p && s.playerOutId === playerId
        );
        const subIn = matchSquad.plannedInGameSubs?.find(
          (s) => s.period === p && s.playerInId === playerId
        );

        if (subOut) {
          if (!periodsPlayed.includes(p)) periodsPlayed.push(p);
          if (pitchEntry && !positionsPlayed.includes(pitchEntry.position)) {
            positionsPlayed.push(pitchEntry.position);
            if (pitchEntry.position === 'GK') playedAsGoalkeeper = true;
          }
          calculatedMinutes += subOut.targetMinute;
        } else if (subIn) {
          if (!periodsPlayed.includes(p)) periodsPlayed.push(p);
          if (subIn.position && !positionsPlayed.includes(subIn.position)) {
            positionsPlayed.push(subIn.position);
            if (subIn.position === 'GK') playedAsGoalkeeper = true;
          }
          calculatedMinutes += Math.max(0, duration - subIn.targetMinute);
        } else if (pitchEntry) {
          if (!periodsPlayed.includes(p)) periodsPlayed.push(p);
          if (!positionsPlayed.includes(pitchEntry.position)) {
            positionsPlayed.push(pitchEntry.position);
            if (pitchEntry.position === 'GK') playedAsGoalkeeper = true;
          }
          calculatedMinutes += duration;
        }
      }
    } else {
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
      calculatedMinutes = periodsPlayed.length * duration;
    }

    let minutesPlayed = calculatedMinutes;
    let isPostMatchRecorded = false;

    // Check early departures to freeze departed player's logged minutes
    const departure = fixture?.earlyDepartures?.find((d) => d.playerId === playerId);
    if (departure) {
      minutesPlayed = departure.proRatedMinutes;
    } else if (fixture?.creditedMinutes && typeof fixture.creditedMinutes[playerId] === 'number') {
      minutesPlayed = fixture.creditedMinutes[playerId];
    }

    // Handle post-match recordings
    if (postMatchRecording) {
      isPostMatchRecorded = true;
      if (postMatchRecording.trackingMode === 'full_credit') {
        // Coach opted for full credit / 100% equal participation without exact minute tracking
        // (If player departed early, keep their frozen minutes rather than full credit)
        minutesPlayed = departure ? departure.proRatedMinutes : totalMatchMinutes;
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
 * Resolves map of playerId -> position code for players who are locked/fixed in position for all periods of a fixture.
 * Supports:
 * 1. Fixture-level position locks (e.g. { "p1": "GK" })
 * 2. Fixture-level unlock overrides (e.g. { "p1": "UNLOCKED" } or "NONE" to unlock globally fixed players on this specific fixture)
 * 3. MatchSquad-level position locks & unlock overrides
 * 4. Global player profile fallback (player.isFixedPosition) when not overridden on the fixture
 */
export const getFixedPositionsMap = (
  fixture: Fixture,
  players: Player[]
): Map<string, string> => {
  const map = new Map<string, string>();
  const explicitlyUnlocked = new Set<string>();

  const isUnlockedVal = (val: string): boolean => {
    const u = val.toUpperCase().trim();
    return u === 'UNLOCKED' || u === 'NONE' || u === 'ROTATE' || u === 'OFF' || u === 'FALSE';
  };

  // 1. Check fixture.fixedPlayerPositions
  if (fixture.fixedPlayerPositions) {
    Object.entries(fixture.fixedPlayerPositions).forEach(([playerId, pos]) => {
      if (pos && typeof pos === 'string') {
        const trimmed = pos.trim();
        if (isUnlockedVal(trimmed)) {
          explicitlyUnlocked.add(playerId);
        } else {
          map.set(playerId, trimmed);
        }
      }
    });
  }

  // 2. Check fixture.matchSquad?.fixedPlayerPositions
  if (fixture.matchSquad?.fixedPlayerPositions) {
    Object.entries(fixture.matchSquad.fixedPlayerPositions).forEach(([playerId, pos]) => {
      if (pos && typeof pos === 'string') {
        const trimmed = pos.trim();
        if (isUnlockedVal(trimmed)) {
          explicitlyUnlocked.add(playerId);
        } else if (!explicitlyUnlocked.has(playerId) && !map.has(playerId)) {
          map.set(playerId, trimmed);
        }
      }
    });
  }

  // 3. Check persistent player settings (player.isFixedPosition), unless explicitly unlocked on this fixture
  players.forEach((p) => {
    if (p.isFixedPosition && !map.has(p.id) && !explicitlyUnlocked.has(p.id)) {
      const pos =
        p.fixedPosition?.trim() ||
        (p.preferredPositions.includes('Goalkeeper') ? 'GK' : undefined) ||
        (p.preferredPositions[0] ? (p.preferredPositions[0] === 'Goalkeeper' ? 'GK' : p.preferredPositions[0]) : 'GK');
      map.set(p.id, pos);
    }
  });

  return map;
};

/**
 * Smart Squad Selection: selects matchday squad (e.g. 10 players) and rested players (e.g. 3)
 * prioritising lowest historical matches/minutes, guaranteeing fixed players are selected,
 * and respecting eligibility dates.
 */
export const selectMatchdaySquad = (
  players: Player[],
  fixtureDate: string,
  squadCap: number = 10,
  fixedPlayerIds: string[] = []
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

  const selected: Player[] = [];

  // Guarantee all available fixed players are selected first
  const fixedPlayers = available.filter((p) => fixedPlayerIds.includes(p.id));
  for (const fp of fixedPlayers) {
    if (selected.length < squadCap && !selected.some((s) => s.id === fp.id)) {
      selected.push(fp);
    }
  }

  // Ensure at least one goalkeeper candidate is included if available
  const gkCandidates = available.filter((p) => p.preferredPositions.includes('Goalkeeper'));
  if (gkCandidates.length > 0 && !selected.some((p) => p.preferredPositions.includes('Goalkeeper'))) {
    if (selected.length < squadCap) {
      selected.push(gkCandidates[0]);
    }
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
 * guarantees fixed players stay in their assigned positions all match,
 * avoids consecutive benching, and matches preferred positions.
 */
export const generateFairRotation = (
  fixture: Fixture,
  players: Player[],
  settings: TeamSettings,
  existingSelectedIds?: string[]
): MatchSquad => {
  const pitchCount = fixture.pitchPlayerCount || settings.pitchPlayerCount || 7;
  const periodCount = fixture.matchPeriodCount || settings.matchPeriodCount || 2; // Default 2 Halves
  const squadCap = fixture.matchdaySquadCap || settings.matchdaySquadCap || 10;

  // Retrieve formation slots based on pitchPlayerCount and formation name
  const formation = findFormation(
    fixture.formation || settings.defaultFormation || '2-3-1',
    pitchCount,
    settings.customFormations || []
  );

  // Identify players fixed in position all match
  const fixedMap = getFixedPositionsMap(fixture, players);
  const fixedPlayerIds = Array.from(fixedMap.keys());

  // 1. Determine selected matchday squad
  let selectedIds: string[];
  let restedIds: string[];

  if (existingSelectedIds && existingSelectedIds.length > 0) {
    // Filter out players who are not eligible on this fixture's date
    const validSelected = existingSelectedIds.filter((id) => {
      const pl = players.find((p) => p.id === id);
      return pl && isPlayerEligibleForFixture(pl, fixture.date).eligible;
    });

    // Ensure eligible fixed players are retained or included in matchday squad
    fixedPlayerIds.forEach((id) => {
      const pl = players.find((p) => p.id === id);
      if (pl && isPlayerEligibleForFixture(pl, fixture.date).eligible && !validSelected.includes(id)) {
        if (validSelected.length < squadCap) {
          validSelected.push(id);
        }
      }
    });

    // If removing ineligible players leaves fewer players than pitchCount, re-select
    if (validSelected.length < Math.min(pitchCount, players.length)) {
      const selection = selectMatchdaySquad(players, fixture.date, squadCap, fixedPlayerIds);
      selectedIds = selection.selectedIds;
      restedIds = selection.restedIds;
    } else {
      selectedIds = validSelected;
      restedIds = players.filter((p) => !selectedIds.includes(p.id)).map((p) => p.id);
    }
  } else {
    const selection = selectMatchdaySquad(players, fixture.date, squadCap, fixedPlayerIds);
    selectedIds = selection.selectedIds;
    restedIds = selection.restedIds;
  }

  const selectedPlayers = selectedIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p));

  const fixedPlayersInSquad = selectedPlayers.filter((p) => fixedMap.has(p.id));
  const nonFixedPlayers = selectedPlayers.filter((p) => !fixedMap.has(p.id));

  const periodsPlayedMap = new Map<string, number>();
  selectedPlayers.forEach((p) => periodsPlayedMap.set(p.id, 0));

  // Compute fair target periods for non-fixed players
  const fixedSlotsPerPeriod = fixedPlayersInSquad.length;
  const remainingPitchSlotsPerPeriod = Math.max(0, pitchCount - fixedSlotsPerPeriod);
  const totalRemainingSlots = remainingPitchSlotsPerPeriod * periodCount;
  const targetPeriodsMap = new Map<string, number>();

  if (nonFixedPlayers.length > 0) {
    const basePeriodsPerPlayer = Math.floor(totalRemainingSlots / nonFixedPlayers.length);
    const extraPeriodsCount = totalRemainingSlots % nonFixedPlayers.length;

    // Prioritize players with fewer historical minutes for extra periods
    const nonFixedByHistoricalNeed = [...nonFixedPlayers].sort(
      (a, b) => a.totalMinutesPlayed - b.totalMinutesPlayed
    );

    nonFixedByHistoricalNeed.forEach((p, idx) => {
      const target = idx < extraPeriodsCount ? basePeriodsPerPlayer + 1 : basePeriodsPerPlayer;
      targetPeriodsMap.set(p.id, Math.max(1, target));
    });
  }

  // Fixed players target is all periods
  fixedPlayersInSquad.forEach((p) => {
    targetPeriodsMap.set(p.id, periodCount);
  });

  let previousBenchIds: string[] = [];
  const lineupsByPeriod: PeriodLineup[] = [];

  const subTimingMode: SubstitutionTimingMode =
    fixture.subTimingMode || settings.subTimingMode || 'at_breaks';
  const shouldPreserveLineup =
    fixture.preserveLineupAcrossBreaks ??
    settings.preserveLineupAcrossBreaks ??
    (subTimingMode === 'in_game_rolling');

  for (let period = 1; period <= periodCount; period++) {
    // If lineup preservation across breaks is active and this is period 2+, carry forward previous period's lineup
    if (shouldPreserveLineup && period > 1 && lineupsByPeriod.length > 0) {
      const prevLineup = lineupsByPeriod[period - 2];
      const onPitchAssignments = prevLineup.onPitch.map((op) => ({ ...op }));
      const benchPlayerIds = [...prevLineup.subs];
      onPitchAssignments.forEach((op) => {
        periodsPlayedMap.set(op.playerId, (periodsPlayedMap.get(op.playerId) || 0) + 1);
      });

      lineupsByPeriod.push({
        period,
        onPitch: onPitchAssignments,
        subs: benchPlayerIds,
      });
      continue;
    }

    const onPitchAssignments: { playerId: string; position: string }[] = [];
    const assignedSlotCodes = new Set<string>();

    // A. Place fixed players in their assigned positions
    fixedPlayersInSquad.forEach((fixedPlayer) => {
      const wantedPos = fixedMap.get(fixedPlayer.id)!;
      // Find matching formation slot
      let matchedSlot = formation.slots.find(
        (s) => !assignedSlotCodes.has(s.code) && s.code.toUpperCase() === wantedPos.toUpperCase()
      );
      if (!matchedSlot) {
        matchedSlot = formation.slots.find(
          (s) => !assignedSlotCodes.has(s.code) && s.category === positionToBroad(wantedPos)
        );
      }
      if (!matchedSlot) {
        matchedSlot = formation.slots.find((s) => !assignedSlotCodes.has(s.code));
      }

      if (matchedSlot) {
        assignedSlotCodes.add(matchedSlot.code);
        onPitchAssignments.push({
          playerId: fixedPlayer.id,
          position: matchedSlot.code,
        });
        periodsPlayedMap.set(fixedPlayer.id, (periodsPlayedMap.get(fixedPlayer.id) || 0) + 1);
      }
    });

    // B. Check if Goalkeeper position is already occupied by a fixed player
    const hasFixedGk = onPitchAssignments.some(
      (item) => positionToBroad(item.position) === 'Goalkeeper'
    );

    if (!hasFixedGk) {
      // Determine GK for this period from non-fixed players
      const nonFixedGkList = nonFixedPlayers.filter((p) =>
        p.preferredPositions.includes('Goalkeeper')
      );

      let periodGk: Player | undefined;
      if (nonFixedGkList.length === 1) {
        periodGk = nonFixedGkList[0];
      } else if (nonFixedGkList.length > 1) {
        // Rotate between multiple non-fixed goalkeepers
        periodGk = nonFixedGkList[(period - 1) % nonFixedGkList.length];
      } else if (nonFixedPlayers.length > 0 && formation.slots.some((s) => s.category === 'Goalkeeper')) {
        // Fallback to first non-fixed player if no specialist GK
        periodGk = nonFixedPlayers[0];
      }

      if (periodGk && !onPitchAssignments.some((a) => a.playerId === periodGk!.id)) {
        const gkSlot =
          formation.slots.find(
            (s) => !assignedSlotCodes.has(s.code) && s.category === 'Goalkeeper'
          ) || formation.slots.find((s) => !assignedSlotCodes.has(s.code));

        if (gkSlot) {
          assignedSlotCodes.add(gkSlot.code);
          onPitchAssignments.push({
            playerId: periodGk.id,
            position: gkSlot.code,
          });
          periodsPlayedMap.set(periodGk.id, (periodsPlayedMap.get(periodGk.id) || 0) + 1);
        }
      }
    }

    // C. Non-fixed outfield rotation
    const unassignedFormationSlots = formation.slots.filter(
      (s) => !assignedSlotCodes.has(s.code)
    );
    const slotsNeeded = unassignedFormationSlots.length;

    const availableCandidates = nonFixedPlayers.filter(
      (p) => !onPitchAssignments.some((a) => a.playerId === p.id)
    );

    // Sort candidates:
    // 1. Players benched in previous period (avoid consecutive benching)
    // 2. Players furthest behind their target periods for the match
    // 3. Lowest historical minutes played
    availableCandidates.sort((a, b) => {
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

    const selectedOutfield = availableCandidates.slice(0, slotsNeeded);
    const benchPlayers = availableCandidates.slice(slotsNeeded);
    previousBenchIds = benchPlayers.map((p) => p.id);

    selectedOutfield.forEach((p) => {
      periodsPlayedMap.set(p.id, (periodsPlayedMap.get(p.id) || 0) + 1);
    });

    // Solve Maximum Weight Bipartite Matching for selectedOutfield against unassignedFormationSlots
    const weights: number[][] = selectedOutfield.map((player) =>
      unassignedFormationSlots.map((slot) =>
        getPositionPreferenceScore(player, slot.category, slot.code)
      )
    );

    const slotAssignments = maxWeightBipartiteMatching(weights);
    const assignedIndices = new Set<number>();
    const unassignedPlayers: Player[] = [];

    selectedOutfield.forEach((player, pIdx) => {
      const slotIdx = slotAssignments[pIdx];
      if (
        slotIdx !== undefined &&
        slotIdx >= 0 &&
        slotIdx < unassignedFormationSlots.length &&
        !assignedIndices.has(slotIdx)
      ) {
        assignedIndices.add(slotIdx);
        onPitchAssignments.push({
          playerId: player.id,
          position: unassignedFormationSlots[slotIdx].code,
        });
      } else {
        unassignedPlayers.push(player);
      }
    });

    // Fill any remaining unassigned slots
    unassignedFormationSlots.forEach((slot, sIdx) => {
      if (!assignedIndices.has(sIdx) && unassignedPlayers.length > 0) {
        const fallback = unassignedPlayers.shift()!;
        onPitchAssignments.push({
          playerId: fallback.id,
          position: slot.code,
        });
      }
    });

    lineupsByPeriod.push({
      period,
      onPitch: onPitchAssignments,
      subs: benchPlayers.map((p) => p.id),
    });
  }

  // Generate scheduled in-game rolling substitutions when continuity or in-game rolling mode is active
  const plannedInGameSubs: PlannedInGameSub[] = [];

  if (shouldPreserveLineup || subTimingMode === 'in_game_rolling') {
    const duration = fixture.periodDurationMinutes || settings.periodDurationMinutes || 25;
    const targetInterval =
      fixture.midPeriodSubIntervalMinutes ??
      settings.midPeriodSubIntervalMinutes ??
      (duration / 2);

    const subbedOffCounts = new Map<string, number>();
    selectedPlayers.forEach((p) => subbedOffCounts.set(p.id, 0));
    const playerMap = new Map<string, Player>(players.map((p) => [p.id, p]));

    for (let period = 1; period <= periodCount; period++) {
      const lineup = lineupsByPeriod.find((l) => l.period === period);
      if (!lineup || lineup.subs.length === 0) continue;

      const benchSubIds = [...lineup.subs];
      const availableOutfield = lineup.onPitch.filter(
        (op) => !fixedMap.has(op.playerId)
      );

      if (availableOutfield.length === 0) continue;

      // Sort outfield candidates to sub off:
      // 1. Players subbed off fewest times this match (ensures bench time is rotated fairly)
      // 2. Goalkeepers are last priority to sub off
      // 3. Historical minutes tie-breaker
      availableOutfield.sort((a, b) => {
        const aCount = subbedOffCounts.get(a.playerId) || 0;
        const bCount = subbedOffCounts.get(b.playerId) || 0;
        if (aCount !== bCount) return aCount - bCount;

        const aIsGk = positionToBroad(a.position) === 'Goalkeeper' ? 1 : 0;
        const bIsGk = positionToBroad(b.position) === 'Goalkeeper' ? 1 : 0;
        if (aIsGk !== bIsGk) return aIsGk - bIsGk;

        const aPl = playerMap.get(a.playerId);
        const bPl = playerMap.get(b.playerId);
        return (bPl?.totalMinutesPlayed || 0) - (aPl?.totalMinutesPlayed || 0);
      });

      const subsToRotateCount = Math.min(benchSubIds.length, availableOutfield.length);
      const chosenOutfield = availableOutfield.slice(0, subsToRotateCount);
      const chosenSubs = benchSubIds
        .slice(0, subsToRotateCount)
        .map((id) => playerMap.get(id))
        .filter((p): p is Player => Boolean(p));

      const weights: number[][] = chosenSubs.map((subPl) =>
        chosenOutfield.map((outfieldSlot) =>
          getPositionPreferenceScore(
            subPl,
            positionToBroad(outfieldSlot.position),
            outfieldSlot.position
          )
        )
      );

      const assignments = maxWeightBipartiteMatching(weights);
      const assignedOutfieldIndices = new Set<number>();
      const unassignedSubs: Player[] = [];

      chosenSubs.forEach((subPl, subIdx) => {
        const slotIdx = assignments[subIdx];
        if (
          slotIdx !== undefined &&
          slotIdx >= 0 &&
          slotIdx < chosenOutfield.length &&
          !assignedOutfieldIndices.has(slotIdx)
        ) {
          assignedOutfieldIndices.add(slotIdx);
          const outSlot = chosenOutfield[slotIdx];
          const outPl = playerMap.get(outSlot.playerId);

          plannedInGameSubs.push({
            period,
            targetMinute: targetInterval,
            matchMinute: (period - 1) * duration + Math.round(targetInterval),
            playerOutId: outSlot.playerId,
            playerOutName: outPl?.name,
            playerInId: subPl.id,
            playerInName: subPl.name,
            position: outSlot.position,
            reason: 'Mid-period rolling substitution',
          });
          subbedOffCounts.set(outSlot.playerId, (subbedOffCounts.get(outSlot.playerId) || 0) + 1);
        } else {
          unassignedSubs.push(subPl);
        }
      });

      chosenOutfield.forEach((outSlot, slotIdx) => {
        if (!assignedOutfieldIndices.has(slotIdx) && unassignedSubs.length > 0) {
          const subPl = unassignedSubs.shift()!;
          const outPl = playerMap.get(outSlot.playerId);
          plannedInGameSubs.push({
            period,
            targetMinute: targetInterval,
            matchMinute: (period - 1) * duration + Math.round(targetInterval),
            playerOutId: outSlot.playerId,
            playerOutName: outPl?.name,
            playerInId: subPl.id,
            playerInName: subPl.name,
            position: outSlot.position,
            reason: 'Mid-period rolling substitution',
          });
          subbedOffCounts.set(outSlot.playerId, (subbedOffCounts.get(outSlot.playerId) || 0) + 1);
        }
      });
    }
  }

  const fixedPositionsRecord: Record<string, string> = {};
  if (fixture.fixedPlayerPositions) {
    Object.entries(fixture.fixedPlayerPositions).forEach(([id, val]) => {
      fixedPositionsRecord[id] = val;
    });
  }
  fixedMap.forEach((pos, id) => {
    fixedPositionsRecord[id] = pos;
  });

  return {
    fixtureId: fixture.id,
    selectedPlayerIds: selectedIds,
    restedPlayerIds: restedIds,
    lineupsByPeriod,
    manualOverrides: false,
    fixedPlayerPositions:
      Object.keys(fixedPositionsRecord).length > 0 ? fixedPositionsRecord : undefined,
    plannedInGameSubs: plannedInGameSubs.length > 0 ? plannedInGameSubs : undefined,
  };
};

/**
 * Dynamic Sub Rebalancer for mid-match injuries and early departures.
 *
 * 1. Takes the fixture's existing MatchSquad and updates departurePeriod:
 *    - If departed player is onPitch, replaces them with replacementPlayerId (if provided).
 *    - Removes departed player from onPitch and active bench.
 * 2. Locks departed player out of all subsequent periods (period > departurePeriod).
 * 3. Re-distributes remaining pitch time across active players in future periods:
 *    - Prioritises players with lowest pitch time / periods played up to that point.
 *    - Avoids consecutive bench stints.
 *    - Maintains FA 50%+ target minutes rule for healthy players where mathematically possible.
 *    - Optimal position placement using Kuhn-Munkres Hungarian matching.
 *
 * @param fixture Current fixture state
 * @param players All squad players
 * @param settings Team settings
 * @param departedPlayerId ID of the player departing mid-match
 * @param departurePeriod 1-indexed period in which departure occurred
 * @param replacementPlayerId Optional ID of bench substitute stepping up onto pitch immediately
 */
export const rebalanceRemainingPeriods = (
  fixture: Fixture,
  players: Player[],
  settings: TeamSettings,
  departedPlayerId: string,
  departurePeriod: number,
  replacementPlayerId?: string
): MatchSquad => {
  if (!fixture.matchSquad) {
    throw new Error('Cannot rebalance a fixture without an existing match squad');
  }

  const pitchCount = fixture.pitchPlayerCount || settings.pitchPlayerCount || 7;
  const periodCount = fixture.matchPeriodCount || settings.matchPeriodCount || 2;
  const formation = findFormation(
    fixture.formation || settings.defaultFormation || '2-3-1',
    pitchCount,
    settings.customFormations || []
  );

  const fixedMap = getFixedPositionsMap(fixture, players);
  const playerMap = new Map(players.map((p) => [p.id, p]));

  // All previously departed player IDs plus this new departedPlayerId
  const allDepartedIds = new Set<string>(
    (fixture.earlyDepartures || []).map((d) => d.playerId).concat(departedPlayerId)
  );

  // Active squad players (excluding departed players)
  const activeSquadIds = fixture.matchSquad.selectedPlayerIds.filter(
    (id) => !allDepartedIds.has(id)
  );
  const activePlayers = activeSquadIds
    .map((id) => playerMap.get(id))
    .filter((p): p is Player => Boolean(p));

  const existingLineups = fixture.matchSquad.lineupsByPeriod;
  const newLineups: PeriodLineup[] = [];

  // 1. Periods before departurePeriod remain completely untouched
  for (let p = 1; p < departurePeriod; p++) {
    const existing = existingLineups.find((l) => l.period === p);
    if (existing) {
      newLineups.push({
        period: p,
        onPitch: [...existing.onPitch],
        subs: [...existing.subs],
      });
    }
  }

  // 2. Handle departurePeriod
  const currentLineup = existingLineups.find((l) => l.period === departurePeriod);
  if (currentLineup) {
    const isDepartedOnPitch = currentLineup.onPitch.some((op) => op.playerId === departedPlayerId);
    let updatedOnPitch = [...currentLineup.onPitch];
    let updatedSubs = currentLineup.subs.filter(
      (subId) => subId !== departedPlayerId && !allDepartedIds.has(subId)
    );

    if (isDepartedOnPitch) {
      const departedIdx = updatedOnPitch.findIndex((op) => op.playerId === departedPlayerId);
      const slotPos = updatedOnPitch[departedIdx].position;

      if (replacementPlayerId && updatedSubs.includes(replacementPlayerId)) {
        // Place replacement on pitch in departed player's position slot
        updatedOnPitch[departedIdx] = {
          playerId: replacementPlayerId,
          position: slotPos,
        };
        // Remove replacement from bench
        updatedSubs = updatedSubs.filter((id) => id !== replacementPlayerId);
      } else {
        // Remove departed player without replacement (play with 1 fewer)
        updatedOnPitch.splice(departedIdx, 1);
      }
    }

    newLineups.push({
      period: departurePeriod,
      onPitch: updatedOnPitch,
      subs: updatedSubs,
    });
  }

  // Track periods played so far across periods 1..departurePeriod for all active players
  const periodsPlayedMap = new Map<string, number>();
  activePlayers.forEach((p) => periodsPlayedMap.set(p.id, 0));

  newLineups.forEach((lineup) => {
    lineup.onPitch.forEach((entry) => {
      if (periodsPlayedMap.has(entry.playerId)) {
        periodsPlayedMap.set(entry.playerId, (periodsPlayedMap.get(entry.playerId) || 0) + 1);
      }
    });
  });

  // Track previous period bench IDs to prevent back-to-back benching
  let previousBenchIds: string[] = newLineups[newLineups.length - 1]?.subs || [];

  // 3. Rebalance remaining periods: departurePeriod + 1 to periodCount
  for (let period = departurePeriod + 1; period <= periodCount; period++) {
    const onPitchAssignments: { playerId: string; position: string }[] = [];
    const assignedSlotCodes = new Set<string>();

    // A. Fixed players still active
    const fixedActivePlayers = activePlayers.filter((p) => fixedMap.has(p.id));
    fixedActivePlayers.forEach((fixedPlayer) => {
      const wantedPos = fixedMap.get(fixedPlayer.id)!;
      let matchedSlot = formation.slots.find(
        (s) => !assignedSlotCodes.has(s.code) && s.code.toUpperCase() === wantedPos.toUpperCase()
      );
      if (!matchedSlot) {
        matchedSlot = formation.slots.find(
          (s) => !assignedSlotCodes.has(s.code) && s.category === positionToBroad(wantedPos)
        );
      }
      if (!matchedSlot) {
        matchedSlot = formation.slots.find((s) => !assignedSlotCodes.has(s.code));
      }

      if (matchedSlot) {
        assignedSlotCodes.add(matchedSlot.code);
        onPitchAssignments.push({
          playerId: fixedPlayer.id,
          position: matchedSlot.code,
        });
      }
    });

    // B. Goalkeeper assignment (if not occupied by fixed player)
    const hasFixedGk = onPitchAssignments.some(
      (item) => positionToBroad(item.position) === 'Goalkeeper'
    );

    const nonFixedActive = activePlayers.filter((p) => !fixedMap.has(p.id));

    if (!hasFixedGk) {
      const nonFixedGkList = nonFixedActive.filter((p) =>
        p.preferredPositions.includes('Goalkeeper')
      );

      let periodGk: Player | undefined;
      if (nonFixedGkList.length === 1) {
        periodGk = nonFixedGkList[0];
      } else if (nonFixedGkList.length > 1) {
        // Rotate between multiple GKs, prioritizing whoever played fewer periods
        periodGk = [...nonFixedGkList].sort((a, b) => {
          const aCount = periodsPlayedMap.get(a.id) || 0;
          const bCount = periodsPlayedMap.get(b.id) || 0;
          return aCount - bCount;
        })[0];
      } else if (nonFixedActive.length > 0 && formation.slots.some((s) => s.category === 'Goalkeeper')) {
        // Sort nonFixed by lowest periods played
        periodGk = [...nonFixedActive].sort(
          (a, b) => (periodsPlayedMap.get(a.id) || 0) - (periodsPlayedMap.get(b.id) || 0)
        )[0];
      }

      if (periodGk && !onPitchAssignments.some((a) => a.playerId === periodGk!.id)) {
        const gkSlot =
          formation.slots.find(
            (s) => !assignedSlotCodes.has(s.code) && s.category === 'Goalkeeper'
          ) || formation.slots.find((s) => !assignedSlotCodes.has(s.code));

        if (gkSlot) {
          assignedSlotCodes.add(gkSlot.code);
          onPitchAssignments.push({
            playerId: periodGk.id,
            position: gkSlot.code,
          });
        }
      }
    }

    // C. Non-fixed outfield rotation
    const unassignedFormationSlots = formation.slots.filter(
      (s) => !assignedSlotCodes.has(s.code)
    );
    // Number of available pitch slots (capped by remaining available players)
    const availableCandidates = nonFixedActive.filter(
      (p) => !onPitchAssignments.some((a) => a.playerId === p.id)
    );
    const slotsNeeded = Math.min(unassignedFormationSlots.length, availableCandidates.length);

    // Dynamic Sub Rebalancer Priority Sorting:
    // 1. Players benched in previous period (avoid consecutive bench stints)
    // 2. Players with fewest periods played so far (CRITICAL: lifts players with lowest pitch time to protect FA 50%+)
    // 3. Tie-breaker: lowest historical season minutes played
    availableCandidates.sort((a, b) => {
      const aWasBenched = previousBenchIds.includes(a.id) ? 1 : 0;
      const bWasBenched = previousBenchIds.includes(b.id) ? 1 : 0;
      if (aWasBenched !== bWasBenched) {
        return bWasBenched - aWasBenched; // benched previously gets priority
      }

      const aPlayed = periodsPlayedMap.get(a.id) || 0;
      const bPlayed = periodsPlayedMap.get(b.id) || 0;
      if (aPlayed !== bPlayed) {
        return aPlayed - bPlayed; // lower pitch time gets priority!
      }

      return a.totalMinutesPlayed - b.totalMinutesPlayed;
    });

    const selectedOutfield = availableCandidates.slice(0, slotsNeeded);
    const benchPlayers = availableCandidates.slice(slotsNeeded);
    previousBenchIds = benchPlayers.map((p) => p.id);

    // Solve Maximum Weight Bipartite Matching for tactical position happiness
    const targetSlots = unassignedFormationSlots.slice(0, slotsNeeded);
    const weights: number[][] = selectedOutfield.map((player) =>
      targetSlots.map((slot) =>
        getPositionPreferenceScore(player, slot.category, slot.code)
      )
    );

    const slotAssignments = maxWeightBipartiteMatching(weights);
    const assignedIndices = new Set<number>();
    const unassignedPlayers: Player[] = [];

    selectedOutfield.forEach((player, pIdx) => {
      const slotIdx = slotAssignments[pIdx];
      if (
        slotIdx !== undefined &&
        slotIdx >= 0 &&
        slotIdx < slotsNeeded &&
        !assignedIndices.has(slotIdx)
      ) {
        assignedIndices.add(slotIdx);
        onPitchAssignments.push({
          playerId: player.id,
          position: targetSlots[slotIdx].code,
        });
      } else {
        unassignedPlayers.push(player);
      }
    });

    targetSlots.forEach((slot, sIdx) => {
      if (!assignedIndices.has(sIdx) && unassignedPlayers.length > 0) {
        const player = unassignedPlayers.shift()!;
        assignedIndices.add(sIdx);
        onPitchAssignments.push({
          playerId: player.id,
          position: slot.code,
        });
      }
    });

    // Update periods played counter
    onPitchAssignments.forEach((item) => {
      periodsPlayedMap.set(item.playerId, (periodsPlayedMap.get(item.playerId) || 0) + 1);
    });

    newLineups.push({
      period,
      onPitch: onPitchAssignments,
      subs: benchPlayers.map((p) => p.id),
    });
  }

  return {
    ...fixture.matchSquad,
    manualOverrides: true,
    lineupsByPeriod: newLineups,
  };
};

/**
 * Generates Sideline Suggested Substitutions based on configurable interval (e.g. every 10 mins).
 * Returns multiple strategic options taking into account players' positional preferences.
 */
export interface InMatchTracker {
  playerId: string;
  player: Player;
  minutesThisMatch: number;
  timesSubbedOn: number;
  hasPlayedThisMatch: boolean;
  isOnPitch: boolean;
  currentPosition?: string;
  stintMinutes: number;
}

export interface OutgoingPitchMatch {
  outgoing: InMatchTracker;
  targetPos: string;
  targetCategory: BroadPosition;
  preferenceRank: number; // 0 = primary, 1 = 2nd, 2 = 3rd, etc., -1 = unranked fallback
}

/**
 * Finds the best on-pitch outfield player to rotate off for an incoming bench player,
 * strictly evaluating the incoming player's positional preferences in priority order,
 * while never rotating off players who are locked/fixed in position all match.
 */
export const findBestOutgoingPitchPlayer = (
  incomingPlayer: Player,
  onPitchOutfield: InMatchTracker[],
  fixedPlayerIds: Set<string> = new Set()
): OutgoingPitchMatch | null => {
  const availableOutfield = onPitchOutfield.filter((t) => !fixedPlayerIds.has(t.playerId));
  if (availableOutfield.length === 0) return null;

  // 1. Check each preferred position in strict preference order:
  // Index 0 (Primary), Index 1 (Secondary), etc.
  for (let rank = 0; rank < incomingPlayer.preferredPositions.length; rank++) {
    const preferredBroad = incomingPlayer.preferredPositions[rank];
    if (preferredBroad === 'Goalkeeper') continue; // Outfield subs do not sub into GK

    // Find on-pitch players whose current position matches this preference
    const candidates = availableOutfield.filter((t) =>
      positionToBroad(t.currentPosition || '') === preferredBroad
    );

    if (candidates.length > 0) {
      // Pick the on-pitch player who has played the most minutes (needs rest most)
      // Tie-break: highest season minutes, then longest current stint
      candidates.sort((a, b) => {
        if (a.minutesThisMatch !== b.minutesThisMatch) {
          return b.minutesThisMatch - a.minutesThisMatch;
        }
        if ((a.player.totalMinutesPlayed || 0) !== (b.player.totalMinutesPlayed || 0)) {
          return (b.player.totalMinutesPlayed || 0) - (a.player.totalMinutesPlayed || 0);
        }
        return b.stintMinutes - a.stintMinutes;
      });

      const chosen = candidates[0];
      const targetPos = chosen.currentPosition || 'MID';
      return {
        outgoing: chosen,
        targetPos,
        targetCategory: preferredBroad,
        preferenceRank: rank,
      };
    }
  }

  // 2. If incoming player has specificPositions, check if any match
  if (incomingPlayer.specificPositions && incomingPlayer.specificPositions.length > 0) {
    for (const spec of incomingPlayer.specificPositions) {
      const specBroad = positionToBroad(spec);
      if (specBroad === 'Goalkeeper') continue;

      const candidates = availableOutfield.filter((t) =>
        positionToBroad(t.currentPosition || '') === specBroad
      );
      if (candidates.length > 0) {
        candidates.sort((a, b) => b.minutesThisMatch - a.minutesThisMatch);
        const chosen = candidates[0];
        return {
          outgoing: chosen,
          targetPos: chosen.currentPosition || 'MID',
          targetCategory: specBroad,
          preferenceRank: 99,
        };
      }
    }
  }

  // 3. Pure goalkeeper check: pure GK should NEVER sub into outfield
  const isPureGk =
    incomingPlayer.preferredPositions.length === 1 &&
    incomingPlayer.preferredPositions[0] === 'Goalkeeper';
  if (isPureGk) {
    return null;
  }

  // 4. Fallback: only if incoming player can play outfield positions
  const sorted = [...availableOutfield].sort((a, b) => b.minutesThisMatch - a.minutesThisMatch);
  const chosen = sorted[0];
  const targetPos = chosen.currentPosition || 'MID';
  return {
    outgoing: chosen,
    targetPos,
    targetCategory: positionToBroad(targetPos),
    preferenceRank: -1,
  };
};

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
  const periodCount = fixture.matchPeriodCount || settings.matchPeriodCount || 2;
  const duration = fixture.periodDurationMinutes || settings.periodDurationMinutes || 25;
  const totalMatchMinutes = periodCount * duration;
  const squad = fixture.matchSquad;
  const playerMap = new Map(players.map((p) => [p.id, p]));

  if (!squad || !squad.lineupsByPeriod || squad.lineupsByPeriod.length === 0) {
    return [];
  }

  // Identify players fixed in position all match who should not be subbed off
  const fixedMap = getFixedPositionsMap(fixture, players);
  const fixedPlayerIds = new Set(fixedMap.keys());

  const safeInterval = Math.max(5, Math.min(25, intervalMinutes));

  // Helper to initialise a clean match tracking state for all squad players
  const initSquadTracker = (): Map<string, InMatchTracker> => {
    const tracker = new Map<string, InMatchTracker>();
    squad.selectedPlayerIds.forEach((id) => {
      const pl = playerMap.get(id) || {
        id,
        teamId: fixture?.teamId || '',
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

      // Find current bench and outfield pitch players (excluding fixed players from rotation off)
      const benchCandidates: InMatchTracker[] = [];
      const onPitchOutfield: InMatchTracker[] = [];

      tracker1.forEach((t) => {
        if (!t.isOnPitch) {
          if (!fixedPlayerIds.has(t.playerId)) {
            benchCandidates.push(t);
          }
        } else if (t.currentPosition !== 'GK' && !fixedPlayerIds.has(t.playerId)) {
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

        // Skip pure goalkeepers from outfield rotations
        if (incoming.player.preferredPositions.length === 1 && incoming.player.preferredPositions[0] === 'Goalkeeper') {
          continue;
        }

        // Find best outgoing player among onPitchOutfield matching incoming's preference order
        const matchResult = findBestOutgoingPitchPlayer(incoming.player, onPitchOutfield, fixedPlayerIds);
        if (!matchResult) continue;

        const { outgoing, targetPos, targetCategory, preferenceRank } = matchResult;

        // Remove from available lists for this window
        const outgoingIdx = onPitchOutfield.findIndex((item) => item.playerId === outgoing.playerId);
        if (outgoingIdx !== -1) onPitchOutfield.splice(outgoingIdx, 1);

        const rankLabel =
          preferenceRank === 0
            ? 'Primary preference'
            : preferenceRank === 1
            ? '2nd preference'
            : preferenceRank === 2
            ? '3rd preference'
            : preferenceRank > 0
            ? `${preferenceRank + 1}th preference`
            : 'Tactical rotation';

        let reason = '';
        if (!incoming.hasPlayedThisMatch) {
          reason = `Unused sub: ${incoming.player.name} rotated into ${targetCategory} (${rankLabel})`;
        } else if (outgoing.minutesThisMatch > incoming.minutesThisMatch) {
          reason = `Game time balance: ${outgoing.player.name} (${outgoing.minutesThisMatch}m played) rotated for ${incoming.player.name} into ${targetCategory} (${rankLabel})`;
        } else {
          reason = `Fresh legs rotation: ${incoming.player.name} rotated into ${targetCategory} (${rankLabel})`;
        }

        subChanges.push({
          offPlayerId: outgoing.playerId,
          offPlayerName: outgoing.player.name,
          onPlayerId: incoming.playerId,
          onPlayerName: incoming.player.name,
          position: targetPos,
          positionCategory: targetCategory,
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

      const bench = Array.from(tracker2.values()).filter(
        (t) => !t.isOnPitch && !fixedPlayerIds.has(t.playerId)
      );
      const onPitch = Array.from(tracker2.values()).filter(
        (t) => t.isOnPitch && t.currentPosition !== 'GK' && !fixedPlayerIds.has(t.playerId)
      );

      // Prioritise bench players by lowest minutes / unplayed
      bench.sort((a, b) => {
        if (a.hasPlayedThisMatch !== b.hasPlayedThisMatch) return a.hasPlayedThisMatch ? 1 : -1;
        return a.minutesThisMatch - b.minutesThisMatch;
      });

      bench.forEach((inc) => {
        if (subChanges.some((c) => c.onPlayerId === inc.playerId)) return;
        // Skip pure goalkeepers from outfield rotations
        if (inc.player.preferredPositions.length === 1 && inc.player.preferredPositions[0] === 'Goalkeeper') return;

        // Try preferences in order: 1st preference, then 2nd, then 3rd
        for (let rank = 0; rank < inc.player.preferredPositions.length; rank++) {
          const broad = inc.player.preferredPositions[rank];
          if (broad === 'Goalkeeper') continue;

          const matchingOutfield = onPitch.filter(
            (out) =>
              positionToBroad(out.currentPosition || '') === broad &&
              !subChanges.some((c) => c.offPlayerId === out.playerId)
          );

          if (matchingOutfield.length > 0) {
            matchingOutfield.sort((a, b) => b.minutesThisMatch - a.minutesThisMatch);
            const out = matchingOutfield[0];
            const pos = out.currentPosition || 'MID';

            const rankDesc = rank === 0 ? 'Primary' : rank === 1 ? '2nd preference' : `${rank + 1}th preference`;

            subChanges.push({
              offPlayerId: out.playerId,
              offPlayerName: out.player.name,
              onPlayerId: inc.playerId,
              onPlayerName: inc.player.name,
              position: pos,
              positionCategory: broad,
              reason: `Like-for-like ${broad} rotation (${rankDesc}, ${inc.player.totalMinutesPlayed}m season)`,
            });

            out.isOnPitch = false;
            out.currentPosition = undefined;
            inc.isOnPitch = true;
            inc.currentPosition = pos;
            inc.hasPlayedThisMatch = true;
            break;
          }
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

      const bench = Array.from(tracker3.values()).filter(
        (t) => !t.isOnPitch && !fixedPlayerIds.has(t.playerId)
      );
      const onPitch = Array.from(tracker3.values()).filter(
        (t) => t.isOnPitch && t.currentPosition !== 'GK' && !fixedPlayerIds.has(t.playerId)
      );

      if (bench.length === 0 || onPitch.length === 0) break;

      // Pick top bench candidate (unplayed first, then lowest match minutes, then lowest season minutes)
      bench.sort((a, b) => {
        if (a.hasPlayedThisMatch !== b.hasPlayedThisMatch) return a.hasPlayedThisMatch ? 1 : -1;
        if (a.minutesThisMatch !== b.minutesThisMatch) return a.minutesThisMatch - b.minutesThisMatch;
        return (a.player.totalMinutesPlayed || 0) - (b.player.totalMinutesPlayed || 0);
      });

      // For each bench candidate, find their best outgoing pitch match
      let bestPair: {
        inc: InMatchTracker;
        outgoingMatch: OutgoingPitchMatch;
        score: number;
      } | null = null;

      for (const inc of bench) {
        if (inc.player.preferredPositions.length === 1 && inc.player.preferredPositions[0] === 'Goalkeeper') continue;
        const match = findBestOutgoingPitchPlayer(inc.player, onPitch, fixedPlayerIds);
        if (!match) continue;

        // Prioritize unplayed bench players, preference rank (0 = primary highest), minutes difference
        let score = (match.outgoing.minutesThisMatch - inc.minutesThisMatch) * 10;
        if (!inc.hasPlayedThisMatch) score += 500;
        if (match.preferenceRank === 0) score += 300;
        else if (match.preferenceRank === 1) score += 150;
        else if (match.preferenceRank === 2) score += 75;

        if (!bestPair || score > (bestPair as { score: number }).score) {
          bestPair = { inc, outgoingMatch: match, score };
        }
      }

      if (bestPair) {
        const { inc, outgoingMatch } = bestPair;
        const { outgoing: out, targetPos, targetCategory, preferenceRank } = outgoingMatch;

        const rankLabel =
          preferenceRank === 0
            ? 'Primary preference'
            : preferenceRank === 1
            ? '2nd preference'
            : preferenceRank === 2
            ? '3rd preference'
            : preferenceRank > 0
            ? `${preferenceRank + 1}th preference`
            : 'Tactical rotation';

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
              positionCategory: targetCategory,
              reason: !inc.hasPlayedThisMatch
                ? `Unused sub priority: ${inc.player.name} rotated into ${targetCategory} (${rankLabel})`
                : `Single rolling rotation: ${out.player.name} rested for ${inc.player.name} into ${targetCategory} (${rankLabel})`,
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
  const fixedMap = getFixedPositionsMap(fixture, players);

  const dateObj = new Date(fixture.date);
  const formattedDate = dateObj.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const periodCount = fixture.matchPeriodCount || settings.matchPeriodCount || 2;
  const duration = fixture.periodDurationMinutes || settings.periodDurationMinutes || 25;
  const pitchCount = fixture.pitchPlayerCount || settings.pitchPlayerCount || 7;

  const periodLabel =
    periodCount === 2
      ? `2 Halves × ${duration} mins`
      : `${periodCount} Periods × ${duration} mins`;

  const sortFn = (a: Player, b: Player) => {
    const numA = a.squadNumber ?? 9999;
    const numB = b.squadNumber ?? 9999;
    if (numA !== numB) return numA - numB;
    return a.name.localeCompare(b.name);
  };

  const selectedNames = (squad?.selectedPlayerIds || [])
    .map((id) => playerMap.get(id))
    .filter((p): p is Player => Boolean(p))
    .sort(sortFn)
    .map((p) => {
      const numStr = p.squadNumber ? `#${p.squadNumber} ` : '';
      const posStr = p.preferredPositions.length > 0 ? ` (${p.preferredPositions[0]})` : '';
      const fixedStr = fixedMap.has(p.id) ? ` 🔒 [Fixed ${fixedMap.get(p.id)}]` : '';
      return `• ${numStr}${p.name}${posStr}${fixedStr}`;
    })
    .join('\n');

  const restedNames = (squad?.restedPlayerIds || [])
    .map((id) => playerMap.get(id))
    .filter((p): p is Player => Boolean(p))
    .sort(sortFn)
    .map((p) => `• ${p.squadNumber ? `#${p.squadNumber} ` : ''}${p.name}`)
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

  const isRolling =
    fixture.subTimingMode === 'in_game_rolling' ||
    fixture.preserveLineupAcrossBreaks ||
    settings.subTimingMode === 'in_game_rolling' ||
    settings.preserveLineupAcrossBreaks;

  const plannedSubsText =
    isRolling && squad?.plannedInGameSubs && squad.plannedInGameSubs.length > 0
      ? `\n⏱️ *PLANNED IN-GAME ROLLING SUBS*\n` +
        squad.plannedInGameSubs
          .map(
            (s) =>
              `• Half ${s.period} (~${s.targetMinute}m / Min ${s.matchMinute}): ${s.playerInName || 'Sub'} ➔ ${s.playerOutName || 'Player'} (${s.position})`
          )
          .join('\n') +
        '\n'
      : '';

  return `⚽ *SUBSHUFFLE MATCHDAY ANNOUNCEMENT* ⚽

🆚 *Opponent:* ${fixture.opponent}
📅 *Date:* ${formattedDate}
${timeText}
📍 *Venue:* ${fixture.venue}${groundText}${mapsText}${captainText}
⏱ *Format:* ${pitchCount}-a-side (${periodLabel})

📋 *MATCHDAY SQUAD (${squad?.selectedPlayerIds.length || 0})*
${selectedNames || 'Squad not finalised yet'}
${plannedSubsText}
🔄 *RESTED / ROTATION ROSTER (${squad?.restedPlayerIds.length || 0})*
${restedNames || 'None'}

⚖️ *FAIR PLAY PROMISE:* Every selected player is scheduled for balanced playing time (~${settings.targetGameTimePercent}%+ target).

⚠️ *REMINDERS:*
• Shin pads & water bottles are mandatory
• ${fixture.meetTime ? `Arrive promptly by ${fixture.meetTime}` : 'Arrive 30 minutes before kick-off'}
• Please confirm availability in the group chat!

_Generated by SubShuffle_`;
};
