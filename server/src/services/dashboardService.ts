import { storage } from '../db/storage.js';
import {
  Player,
  Fixture,
  TeamSettings,
  BroadPosition,
  TeamDashboardSummary,
  ScorerLeaderboardItem,
  PotmLeaderboardItem,
  DefensiveWallItem,
  PlayerVersatilityItem,
  TeamMilestoneBadge,
} from '../types.js';
import { positionToBroad } from './rotationService.js';

/**
 * Classifies any specific position code or role into one of the 4 BroadPosition categories
 */
export function classifyPosition(position: string): BroadPosition {
  return positionToBroad(position);
}

/**
 * Computes comprehensive season-long Team Dashboard analytics
 */
export async function calculateSeasonDashboardSummary(
  teamId: string,
  seasonFilter?: string
): Promise<TeamDashboardSummary> {
  const [players, allFixtures, settings] = await Promise.all([
    storage.getPlayers(teamId),
    storage.getFixtures(teamId),
    storage.getSettings(teamId),
  ]);

  const currentDefaultSeason = settings.currentSeason || '2026/2027';
  const effectiveSeason = seasonFilter && seasonFilter !== 'ALL' ? seasonFilter : currentDefaultSeason;

  // Filter fixtures by season unless requested for 'ALL'
  const relevantFixtures = allFixtures.filter((f) => {
    if (!seasonFilter || seasonFilter === 'ALL') return true;
    return (f.season || currentDefaultSeason) === seasonFilter;
  });

  // Sort chronologically
  relevantFixtures.sort((a, b) => a.date.localeCompare(b.date));

  // Determine completed / played fixtures
  const isCountable = (f: Fixture) =>
    f.status === 'Completed' ||
    f.status === 'Played' ||
    Boolean(f.postMatchRecording) ||
    Boolean(f.creditedMinutes) ||
    (typeof f.homeScore === 'number' && typeof f.awayScore === 'number');

  const completedFixtures = relevantFixtures.filter(isCountable);

  // Initialize Aggregations
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let cleanSheets = 0;
  let totalAvailableMinutes = 0;

  // Per-player tracking accumulators
  interface PlayerAccumulator {
    playerId: string;
    playerName: string;
    squadNumber?: number;
    matchesPlayed: number;
    totalMinutes: number;
    minutesByPosition: Record<BroadPosition, number>;
    periodsByPosition: Record<BroadPosition, number>;
    goals: number;
    hatTricks: number;
    matchGoals: { fixtureId: string; date: string; opponent: string; goals: number }[];
    potmAwards: number;
    latestPotmAward?: { fixtureId: string; date: string; opponent: string };
    cleanSheetsOnPitch: number;
    cleanSheetsInGoal: number;
    gkMinutes: number;
    outfieldDefMinutes: number;
  }

  const playerMap = new Map<string, PlayerAccumulator>();

  players.forEach((p) => {
    playerMap.set(p.id, {
      playerId: p.id,
      playerName: p.name,
      squadNumber: p.squadNumber,
      matchesPlayed: 0,
      totalMinutes: 0,
      minutesByPosition: {
        Goalkeeper: 0,
        Defence: 0,
        Midfield: 0,
        Attack: 0,
      },
      periodsByPosition: {
        Goalkeeper: 0,
        Defence: 0,
        Midfield: 0,
        Attack: 0,
      },
      goals: 0,
      hatTricks: 0,
      matchGoals: [],
      potmAwards: 0,
      cleanSheetsOnPitch: 0,
      cleanSheetsInGoal: 0,
      gkMinutes: 0,
      outfieldDefMinutes: 0,
    });
  });

  // Helper to safely fetch player accumulators (even if player was archived or not in active squad)
  const getAccumulator = (id: string, fallbackName?: string): PlayerAccumulator => {
    let acc = playerMap.get(id);
    if (!acc) {
      acc = {
        playerId: id,
        playerName: fallbackName || 'Unknown Player',
        matchesPlayed: 0,
        totalMinutes: 0,
        minutesByPosition: { Goalkeeper: 0, Defence: 0, Midfield: 0, Attack: 0 },
        periodsByPosition: { Goalkeeper: 0, Defence: 0, Midfield: 0, Attack: 0 },
        goals: 0,
        hatTricks: 0,
        matchGoals: [],
        potmAwards: 0,
        cleanSheetsOnPitch: 0,
        cleanSheetsInGoal: 0,
        gkMinutes: 0,
        outfieldDefMinutes: 0,
      };
      playerMap.set(id, acc);
    }
    return acc;
  };

  // Process Completed Fixtures
  let currentCleanSheetStreak = 0;
  let maxCleanSheetStreak = 0;

  completedFixtures.forEach((f) => {
    const isHome = f.venue !== 'Away';
    const hasHomeScore = typeof f.homeScore === 'number';
    const hasAwayScore = typeof f.awayScore === 'number';

    let matchTeamGoals = 0;
    let matchOppGoals = 0;
    let hasResult = false;

    if (hasHomeScore && hasAwayScore) {
      hasResult = true;
      matchTeamGoals = isHome ? f.homeScore! : f.awayScore!;
      matchOppGoals = isHome ? f.awayScore! : f.homeScore!;

      goalsFor += matchTeamGoals;
      goalsAgainst += matchOppGoals;

      if (matchTeamGoals > matchOppGoals) {
        wins++;
      } else if (matchTeamGoals === matchOppGoals) {
        draws++;
      } else {
        losses++;
      }

      if (matchOppGoals === 0) {
        cleanSheets++;
        currentCleanSheetStreak++;
        if (currentCleanSheetStreak > maxCleanSheetStreak) {
          maxCleanSheetStreak = currentCleanSheetStreak;
        }
      } else {
        currentCleanSheetStreak = 0;
      }
    }

    const pCount = f.matchPeriodCount || settings.matchPeriodCount || 2;
    const pDur = f.periodDurationMinutes || settings.periodDurationMinutes || 25;
    const matchFullMinutes = pCount * pDur;
    totalAvailableMinutes += matchFullMinutes;

    // Track Player of the Match
    if (f.playerOfTheMatchId) {
      const acc = getAccumulator(f.playerOfTheMatchId);
      acc.potmAwards++;
      acc.latestPotmAward = {
        fixtureId: f.id,
        date: f.date,
        opponent: f.opponent,
      };
    }

    // Track Goal Scorers
    if (f.scorers && f.scorers.length > 0) {
      const fixturePlayerGoals = new Map<string, number>();

      f.scorers.forEach((s) => {
        // Goal belongs to our team if player is registered or side matches
        const isTeamGoal = s.playerId ? playerMap.has(s.playerId) : s.team === (isHome ? 'home' : 'away');
        if (isTeamGoal && s.playerId) {
          const currentGoals = fixturePlayerGoals.get(s.playerId) || 0;
          fixturePlayerGoals.set(s.playerId, currentGoals + 1);
        }
      });

      fixturePlayerGoals.forEach((goals, pId) => {
        const acc = getAccumulator(pId);
        acc.goals += goals;
        if (goals >= 3) {
          acc.hatTricks++;
        }
        acc.matchGoals.push({
          fixtureId: f.id,
          date: f.date,
          opponent: f.opponent,
          goals,
        });
      });
    }

    // Track Period Positions, Defensive Unit & Minutes
    const playersInThisMatch = new Set<string>();
    const defendersOnPitch = new Set<string>();
    const keepersOnPitch = new Set<string>();

    if (f.matchSquad) {
      // Early departures lookup for pro-rating minutes
      const departureMap = new Map<string, number>();
      if (f.earlyDepartures) {
        f.earlyDepartures.forEach((ed) => {
          departureMap.set(ed.playerId, ed.proRatedMinutes);
        });
      }

      f.matchSquad.lineupsByPeriod.forEach((lineup) => {
        lineup.onPitch.forEach((slot) => {
          playersInThisMatch.add(slot.playerId);
          const acc = getAccumulator(slot.playerId);
          const broad = classifyPosition(slot.position);
          acc.periodsByPosition[broad]++;

          if (broad === 'Goalkeeper') {
            keepersOnPitch.add(slot.playerId);
          } else if (broad === 'Defence') {
            defendersOnPitch.add(slot.playerId);
          }
        });
      });

      // Calculate minutes played in this match
      f.matchSquad.selectedPlayerIds.forEach((pId) => {
        const acc = getAccumulator(pId);
        acc.matchesPlayed++;

        let pMinutes = 0;
        if (departureMap.has(pId)) {
          pMinutes = departureMap.get(pId)!;
        } else if (f.postMatchRecording?.playerMinutes?.[pId] !== undefined) {
          pMinutes = f.postMatchRecording.playerMinutes[pId];
        } else if (f.creditedMinutes?.[pId] !== undefined) {
          pMinutes = f.creditedMinutes[pId];
        } else {
          // Calculate from periods on pitch
          let periodsOnPitch = 0;
          f.matchSquad?.lineupsByPeriod.forEach((l) => {
            if (l.onPitch.some((op) => op.playerId === pId)) {
              periodsOnPitch++;
            }
          });
          pMinutes = periodsOnPitch * pDur;
        }

        acc.totalMinutes += pMinutes;

        // Attribute minutes across positions proportionally to periods played
        const totalPeriods =
          acc.periodsByPosition.Goalkeeper +
          acc.periodsByPosition.Defence +
          acc.periodsByPosition.Midfield +
          acc.periodsByPosition.Attack;

        const periodMinutes = pDur;
        let matchGkPeriods = 0;
        let matchDefPeriods = 0;

        f.matchSquad?.lineupsByPeriod.forEach((l) => {
          l.onPitch.forEach((op) => {
            if (op.playerId === pId) {
              const broad = classifyPosition(op.position);
              acc.minutesByPosition[broad] += periodMinutes;
              if (broad === 'Goalkeeper') matchGkPeriods++;
              if (broad === 'Defence') matchDefPeriods++;
            }
          });
        });

        acc.gkMinutes += matchGkPeriods * periodMinutes;
        acc.outfieldDefMinutes += matchDefPeriods * periodMinutes;
      });
    } else {
      // If no matchSquad, credit minutes from postMatchRecording or creditedMinutes
      players.forEach((p) => {
        if (f.postMatchRecording?.playerMinutes?.[p.id] !== undefined || f.creditedMinutes?.[p.id] !== undefined) {
          const acc = getAccumulator(p.id);
          const mins = f.postMatchRecording?.playerMinutes?.[p.id] ?? f.creditedMinutes?.[p.id] ?? 0;
          if (mins > 0) {
            acc.matchesPlayed++;
            acc.totalMinutes += mins;
          }
        }
      });
    }

    // If clean sheet kept, credit defenders and goalkeepers on pitch
    if (hasResult && matchOppGoals === 0) {
      defendersOnPitch.forEach((dId) => {
        getAccumulator(dId).cleanSheetsOnPitch++;
      });
      keepersOnPitch.forEach((kId) => {
        const acc = getAccumulator(kId);
        acc.cleanSheetsOnPitch++;
        acc.cleanSheetsInGoal++;
      });
    }
  });

  // Calculate Squad Equity Score (% of players hitting target game time threshold)
  const targetPercent = settings.targetGameTimePercent || 50;
  const avgTeamMatchMinutes = completedFixtures.length > 0 ? totalAvailableMinutes / (settings.pitchPlayerCount || 7) : 0;

  let playersMeetingTarget = 0;
  let totalAppearances = 0;

  playerMap.forEach((acc) => {
    totalAppearances += acc.matchesPlayed;
    const playerGameTimePercent = avgTeamMatchMinutes > 0 ? (acc.totalMinutes / avgTeamMatchMinutes) * 100 : 0;
    if (playerGameTimePercent >= targetPercent) {
      playersMeetingTarget++;
    }
  });

  const squadEquityScore =
    players.length > 0 && completedFixtures.length > 0
      ? Math.round((playersMeetingTarget / players.length) * 100)
      : 100;

  const totalPossibleAppearances = players.length * completedFixtures.length;
  const squadAttendanceRate =
    totalPossibleAppearances > 0 ? Math.round((totalAppearances / totalPossibleAppearances) * 100) : 100;

  // 1. Goal Scorers Leaderboard ("Golden Boot")
  const scorersLeaderboard: ScorerLeaderboardItem[] = Array.from(playerMap.values())
    .filter((acc) => acc.goals > 0)
    .map((acc) => ({
      playerId: acc.playerId,
      playerName: acc.playerName,
      squadNumber: acc.squadNumber,
      goals: acc.goals,
      matchesPlayed: acc.matchesPlayed,
      goalsPerMatch: acc.matchesPlayed > 0 ? Number((acc.goals / acc.matchesPlayed).toFixed(2)) : acc.goals,
      hatTricks: acc.hatTricks,
      matchGoals: acc.matchGoals,
    }))
    .sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (b.goalsPerMatch !== a.goalsPerMatch) return b.goalsPerMatch - a.goalsPerMatch;
      return a.playerName.localeCompare(b.playerName);
    });

  // 2. Player of the Match (PotM) Leaderboard
  const potmLeaderboard: PotmLeaderboardItem[] = Array.from(playerMap.values())
    .filter((acc) => acc.potmAwards > 0)
    .map((acc) => ({
      playerId: acc.playerId,
      playerName: acc.playerName,
      squadNumber: acc.squadNumber,
      awardsCount: acc.potmAwards,
      latestAward: acc.latestPotmAward,
    }))
    .sort((a, b) => {
      if (b.awardsCount !== a.awardsCount) return b.awardsCount - a.awardsCount;
      return a.playerName.localeCompare(b.playerName);
    });

  // 3. Defensive Recognition ("The Wall")
  const defensiveWall: DefensiveWallItem[] = Array.from(playerMap.values())
    .filter((acc) => acc.cleanSheetsOnPitch > 0 || acc.gkMinutes > 0 || acc.outfieldDefMinutes > 0)
    .map((acc) => {
      const defMins = acc.gkMinutes + acc.outfieldDefMinutes;
      const rate = acc.matchesPlayed > 0 ? Math.round((acc.cleanSheetsOnPitch / acc.matchesPlayed) * 100) : 0;
      return {
        playerId: acc.playerId,
        playerName: acc.playerName,
        squadNumber: acc.squadNumber,
        cleanSheets: acc.cleanSheetsOnPitch,
        defensiveMinutes: defMins,
        gkMinutes: acc.gkMinutes,
        outfieldDefMinutes: acc.outfieldDefMinutes,
        matchesPlayed: acc.matchesPlayed,
        cleanSheetRate: rate,
      };
    })
    .sort((a, b) => {
      if (b.cleanSheets !== a.cleanSheets) return b.cleanSheets - a.cleanSheets;
      if (b.defensiveMinutes !== a.defensiveMinutes) return b.defensiveMinutes - a.defensiveMinutes;
      return a.playerName.localeCompare(b.playerName);
    });

  // 4. Positional Versatility & Minutes Heatmap
  const teamMinutesByPosition: Record<BroadPosition, number> = {
    Goalkeeper: 0,
    Defence: 0,
    Midfield: 0,
    Attack: 0,
  };

  let designatedGkMinutes = 0;
  let totalGkMinutes = 0;

  const versatilityPlayers: PlayerVersatilityItem[] = Array.from(playerMap.values()).map((acc) => {
    const rawPlayer = players.find((p) => p.id === acc.playerId);
    const isDesignatedGk =
      (rawPlayer?.isFixedPosition && rawPlayer?.fixedPosition === 'GK') ||
      rawPlayer?.preferredPositions?.[0] === 'Goalkeeper';

    totalGkMinutes += acc.minutesByPosition.Goalkeeper;
    if (isDesignatedGk) {
      designatedGkMinutes += acc.minutesByPosition.Goalkeeper;
    }

    teamMinutesByPosition.Goalkeeper += acc.minutesByPosition.Goalkeeper;
    teamMinutesByPosition.Defence += acc.minutesByPosition.Defence;
    teamMinutesByPosition.Midfield += acc.minutesByPosition.Midfield;
    teamMinutesByPosition.Attack += acc.minutesByPosition.Attack;

    let catCount = 0;
    if (acc.minutesByPosition.Goalkeeper > 0) catCount++;
    if (acc.minutesByPosition.Defence > 0) catCount++;
    if (acc.minutesByPosition.Midfield > 0) catCount++;
    if (acc.minutesByPosition.Attack > 0) catCount++;

    let level: 'Specialist' | 'Developing' | 'Versatile' | 'Total Footballer' = 'Specialist';
    if (catCount === 2) level = 'Developing';
    else if (catCount === 3) level = 'Versatile';
    else if (catCount >= 4) level = 'Total Footballer';

    return {
      playerId: acc.playerId,
      playerName: acc.playerName,
      squadNumber: acc.squadNumber,
      totalMinutes: acc.totalMinutes,
      minutesByPosition: acc.minutesByPosition,
      periodsByPosition: acc.periodsByPosition,
      categoriesCount: catCount,
      versatilityLevel: level,
    };
  });

  versatilityPlayers.sort((a, b) => {
    if (b.categoriesCount !== a.categoriesCount) return b.categoriesCount - a.categoriesCount;
    return b.totalMinutes - a.totalMinutes;
  });

  const designatedGkCoveragePercent =
    totalGkMinutes > 0 ? Math.round((designatedGkMinutes / totalGkMinutes) * 100) : 100;

  // 5. Squad Milestones & Badges
  const milestones: TeamMilestoneBadge[] = [];

  // Team Clean Sheet Streak Badge
  if (maxCleanSheetStreak >= 2) {
    milestones.push({
      id: `milestone_team_cs_${maxCleanSheetStreak}`,
      title: `${maxCleanSheetStreak} Clean Sheets in a Row`,
      description: `Team defensive wall shut out opponents across ${maxCleanSheetStreak} consecutive fixtures.`,
      category: 'defensive',
      icon: 'shield',
      count: maxCleanSheetStreak,
    });
  }

  // Player Individual Milestones
  playerMap.forEach((acc) => {
    // 50 Appearances
    if (acc.matchesPlayed >= 50) {
      milestones.push({
        id: `milestone_app_50_${acc.playerId}`,
        title: '50 Appearances Club',
        description: `${acc.playerName} reached 50 appearances for the club!`,
        category: 'appearance',
        icon: 'medal',
        playerId: acc.playerId,
        playerName: acc.playerName,
        count: 50,
      });
    } else if (acc.matchesPlayed >= 25) {
      milestones.push({
        id: `milestone_app_25_${acc.playerId}`,
        title: '25 Appearances Club',
        description: `${acc.playerName} reached 25 appearances for the club!`,
        category: 'appearance',
        icon: 'medal',
        playerId: acc.playerId,
        playerName: acc.playerName,
        count: 25,
      });
    } else if (acc.matchesPlayed >= 10) {
      milestones.push({
        id: `milestone_app_10_${acc.playerId}`,
        title: '10 Appearances Club',
        description: `${acc.playerName} reached 10 appearances for the club!`,
        category: 'appearance',
        icon: 'medal',
        playerId: acc.playerId,
        playerName: acc.playerName,
        count: 10,
      });
    }

    // Safe Hands (3+ clean sheets in goal)
    if (acc.cleanSheetsInGoal >= 3) {
      milestones.push({
        id: `milestone_safe_hands_${acc.playerId}`,
        title: 'Safe Hands Award',
        description: `${acc.playerName} logged ${acc.cleanSheetsInGoal} clean sheets in goal.`,
        category: 'defensive',
        icon: 'hands',
        playerId: acc.playerId,
        playerName: acc.playerName,
        count: acc.cleanSheetsInGoal,
      });
    }

    // First Goal
    if (acc.goals >= 1) {
      milestones.push({
        id: `milestone_first_goal_${acc.playerId}`,
        title: 'On the Scoresheet',
        description: `${acc.playerName} scored ${acc.goals} goal${acc.goals > 1 ? 's' : ''} this season.`,
        category: 'attacking',
        icon: 'goal',
        playerId: acc.playerId,
        playerName: acc.playerName,
        count: acc.goals,
      });
    }

    // Hat-Trick Hero
    if (acc.hatTricks >= 1) {
      milestones.push({
        id: `milestone_hat_trick_${acc.playerId}`,
        title: 'Hat-Trick Hero',
        description: `${acc.playerName} scored 3+ goals in a single fixture!`,
        category: 'attacking',
        icon: 'star',
        playerId: acc.playerId,
        playerName: acc.playerName,
        count: acc.hatTricks,
      });
    }

    // Ever-Present (100% attendance with minimum 3 matches played)
    if (completedFixtures.length >= 3 && acc.matchesPlayed === completedFixtures.length) {
      milestones.push({
        id: `milestone_ever_present_${acc.playerId}`,
        title: 'Ever-Present Streak',
        description: `${acc.playerName} attended 100% of fixtures this season (${acc.matchesPlayed}/${completedFixtures.length}).`,
        category: 'attendance',
        icon: 'streak',
        playerId: acc.playerId,
        playerName: acc.playerName,
        count: acc.matchesPlayed,
      });
    }

    // Total Footballer (Played in all 4 categories: GK, DEF, MID, ATT)
    const catCount =
      (acc.minutesByPosition.Goalkeeper > 0 ? 1 : 0) +
      (acc.minutesByPosition.Defence > 0 ? 1 : 0) +
      (acc.minutesByPosition.Midfield > 0 ? 1 : 0) +
      (acc.minutesByPosition.Attack > 0 ? 1 : 0);

    if (catCount >= 4) {
      milestones.push({
        id: `milestone_total_footballer_${acc.playerId}`,
        title: 'Total Footballer',
        description: `${acc.playerName} has developed across every position category (GK, Defence, Midfield, Attack)!`,
        category: 'versatility',
        icon: 'star',
        playerId: acc.playerId,
        playerName: acc.playerName,
        count: 4,
      });
    }
  });

  return {
    teamId,
    season: effectiveSeason,
    generatedAt: new Date().toISOString(),
    overview: {
      matchesPlayed: completedFixtures.length,
      record: {
        wins,
        draws,
        losses,
      },
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      cleanSheets,
      squadEquityScore,
      squadAttendanceRate,
      totalSquadMembers: players.length,
      totalAvailableMinutes,
    },
    scorersLeaderboard,
    potmLeaderboard,
    defensiveWall,
    versatilityHeatmap: {
      teamMinutesByPosition,
      players: versatilityPlayers,
      designatedGkCoveragePercent,
    },
    milestones,
  };
}
