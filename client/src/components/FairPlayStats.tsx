import React, { useState, useMemo } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import {
  ShieldCheck,
  AlertCircle,
  Clock,
  Award,
  Users,
  CheckCircle2,
  TrendingUp,
  HeartHandshake,
  Calendar,
  Trophy,
  Sparkles,
  BarChart3,
  Filter,
  ArrowUpDown,
  Zap,
  Crown,
  Compass,
} from 'lucide-react';

export const FairPlayStats: React.FC = () => {
  const { stats, settings, activeFixture, fixtures, players, activeTeam } = useMatchday();

  // Mode: 'match' or 'season'
  const [viewMode, setViewMode] = useState<'match' | 'season'>('season');
  const [seasonFilter, setSeasonFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'minutes-desc' | 'minutes-asc' | 'matches-desc' | 'name'>('minutes-desc');

  const currentDefaultSeason = settings.currentSeason || '2026/2027';

  // Discover distinct seasons across fixtures
  const availableSeasons = useMemo(() => {
    const list = Array.from(new Set(fixtures.map((f) => f.season || currentDefaultSeason).filter(Boolean)));
    if (!list.includes(currentDefaultSeason)) {
      list.unshift(currentDefaultSeason);
    }
    return list;
  }, [fixtures, currentDefaultSeason]);

  // ================= Season-Long Stats Calculation =================
  const seasonStats = useMemo(() => {
    if (players.length === 0) return [];

    // Filter fixtures by selected season
    const relevantFixtures = fixtures.filter((f) => {
      if (seasonFilter === 'ALL') return true;
      return (f.season || currentDefaultSeason) === seasonFilter;
    });

    const completedFixtures = relevantFixtures.filter((f) => f.status === 'Completed' || Boolean(f.matchSquad));

    // Calculate aggregated minutes and matches per player
    return players.map((p) => {
      // Historical base minutes
      let minutes = p.totalMinutesPlayed || 0;
      let matches = p.matchesPlayed || 0;
      let gkCount = 0;
      let defPeriods = 0;
      let midPeriods = 0;
      let attPeriods = 0;
      let captainCount = 0;
      let potmCount = 0;

      // Count actual lineups in fixtures matching filter
      let fixtureMinutes = 0;
      let fixtureMatches = 0;

      relevantFixtures.forEach((f) => {
        if (f.captainId === p.id) captainCount++;
        if (f.playerOfTheMatchId === p.id) potmCount++;
        if (!f.matchSquad) return;

        const playedInMatch = f.matchSquad.lineupsByPeriod.some((l) =>
          l.onPitch.some((op) => op.playerId === p.id)
        );

        if (playedInMatch) {
          fixtureMatches++;
          let periodsInMatch = 0;
          f.matchSquad.lineupsByPeriod.forEach((l) => {
            const entry = l.onPitch.find((op) => op.playerId === p.id);
            if (entry) {
              periodsInMatch++;
              const pos = entry.position.toUpperCase();
              if (pos === 'GK') {
                gkCount++;
              } else if (
                pos.startsWith('DEF') ||
                pos === 'CB' ||
                pos === 'LB' ||
                pos === 'RB' ||
                pos === 'LWB' ||
                pos === 'RWB'
              ) {
                defPeriods++;
              } else if (
                pos.startsWith('MID') ||
                pos === 'CM' ||
                pos === 'CDM' ||
                pos === 'CAM' ||
                pos === 'LM' ||
                pos === 'RM' ||
                pos === 'LW' ||
                pos === 'RW'
              ) {
                midPeriods++;
              } else if (pos.startsWith('ATT') || pos === 'ST' || pos === 'CF') {
                attPeriods++;
              } else {
                midPeriods++;
              }
            }
          });
          fixtureMinutes += periodsInMatch * settings.periodDurationMinutes;
        }
      });

      // Use whichever is higher (fixture aggregations or recorded profile totals)
      const totalMinutes = Math.max(minutes, fixtureMinutes);
      const totalMatches = Math.max(matches, fixtureMatches);
      const avgMinutesPerMatch = totalMatches > 0 ? Math.round(totalMinutes / totalMatches) : 0;

      const thirdsPlayedCount = [defPeriods > 0, midPeriods > 0, attPeriods > 0, gkCount > 0].filter(
        Boolean
      ).length;

      return {
        playerId: p.id,
        player: p,
        totalMinutes,
        totalMatches,
        avgMinutesPerMatch,
        gkCount,
        defPeriods,
        midPeriods,
        attPeriods,
        captainCount,
        potmCount,
        thirdsPlayedCount,
      };
    });
  }, [players, fixtures, seasonFilter, currentDefaultSeason, settings.periodDurationMinutes]);

  // Squad average season minutes
  const squadAvgMinutes = useMemo(() => {
    if (seasonStats.length === 0) return 0;
    const sum = seasonStats.reduce((acc, s) => acc + s.totalMinutes, 0);
    return Math.round(sum / seasonStats.length);
  }, [seasonStats]);

  // Max minutes across squad
  const maxSeasonMinutes = useMemo(() => {
    if (seasonStats.length === 0) return 1;
    return Math.max(...seasonStats.map((s) => s.totalMinutes), 1);
  }, [seasonStats]);

  const minSeasonMinutes = useMemo(() => {
    if (seasonStats.length === 0) return 0;
    return Math.min(...seasonStats.map((s) => s.totalMinutes));
  }, [seasonStats]);

  // Equity compliance: players within 15% of squad average
  const equityCompliantCount = useMemo(() => {
    if (seasonStats.length === 0 || squadAvgMinutes === 0) return seasonStats.length;
    const tolerance = squadAvgMinutes * 0.15;
    return seasonStats.filter((s) => Math.abs(s.totalMinutes - squadAvgMinutes) <= tolerance).length;
  }, [seasonStats, squadAvgMinutes]);

  const equityRate = seasonStats.length > 0 ? Math.round((equityCompliantCount / seasonStats.length) * 100) : 100;

  // Players needing minutes (furthest behind average)
  const playersNeedingMinutes = useMemo(() => {
    return [...seasonStats]
      .filter((s) => s.totalMinutes < squadAvgMinutes)
      .sort((a, b) => a.totalMinutes - b.totalMinutes)
      .slice(0, 3);
  }, [seasonStats, squadAvgMinutes]);

  // Sorted list for rendering
  const sortedSeasonStats = useMemo(() => {
    const list = [...seasonStats];
    if (sortBy === 'minutes-desc') list.sort((a, b) => b.totalMinutes - a.totalMinutes);
    else if (sortBy === 'minutes-asc') list.sort((a, b) => a.totalMinutes - b.totalMinutes);
    else if (sortBy === 'matches-desc') list.sort((a, b) => b.totalMatches - a.totalMatches);
    else if (sortBy === 'name') list.sort((a, b) => a.player.name.localeCompare(b.player.name));
    return list;
  }, [seasonStats, sortBy]);

  // ================= Matchday Stats Calculation =================
  const totalMatchPlayers = stats.length;
  const compliantMatchPlayers = stats.filter((s) => s.meetsTarget).length;
  const matchComplianceRate = totalMatchPlayers > 0 ? Math.round((compliantMatchPlayers / totalMatchPlayers) * 100) : 0;
  const avgMatchMinutes = totalMatchPlayers > 0 ? Math.round(stats.reduce((acc, s) => acc + s.minutesPlayed, 0) / totalMatchPlayers) : 0;
  const avgMatchPercent = totalMatchPlayers > 0 ? Math.round(stats.reduce((acc, s) => acc + s.gameTimePercent, 0) / totalMatchPlayers) : 0;
  const goalkeepers = stats.filter((s) => s.playedAsGoalkeeper);

  return (
    <div className="space-y-6">
      {/* View Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-sky-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Equal Playing Time & Fair Play Analytics</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                FA Youth Charter Compliant
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Track game time equity across individual matchdays and cumulative season long rotations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('season')}
              className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'season'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Season-Long Fair Play</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('match')}
              className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'match'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Matchday Lineup</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. SEASON-LONG FAIR PLAY VIEW                            */}
      {/* ======================================================== */}
      {viewMode === 'season' && (
        <div className="space-y-6 animate-fade-in">
          {/* Season Filter & Sorting Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                <span>Filter Season:</span>
              </span>
              <select
                value={seasonFilter}
                onChange={(e) => setSeasonFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="ALL">All Recorded Seasons</option>
                {availableSeasons.map((s) => (
                  <option key={s} value={s}>
                    Season {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Sort Squad By:</span>
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="minutes-desc">Total Minutes (Highest First)</option>
                <option value="minutes-asc">Total Minutes (Lowest First)</option>
                <option value="matches-desc">Matches Played</option>
                <option value="name">Player Name (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Top Metric Cards (Season-Long) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Squad Equity Rate */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Squad Equity Index</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white font-mono">
                  {equityRate}%
                </span>
                <span className="text-xs text-slate-400">
                  ({equityCompliantCount}/{seasonStats.length} balanced)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    equityRate >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${equityRate}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Measures parity within ±15% of squad average
              </p>
            </div>

            {/* Squad Average Minutes */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Squad Average Minutes</span>
                <TrendingUp className="w-4 h-4 text-sky-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white font-mono">
                  {squadAvgMinutes}m
                </span>
                <span className="text-xs text-slate-400">
                  per player
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Target 50%+ equal game time benchmark
              </p>
            </div>

            {/* Playing Time Spread */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Season Minutes Spread</span>
                <BarChart3 className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white font-mono">
                  ±{Math.round((maxSeasonMinutes - minSeasonMinutes) / 2)}m
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ({minSeasonMinutes}m – {maxSeasonMinutes}m)
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Difference between lowest & highest played
              </p>
            </div>

            {/* Total Season Fixtures */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Fixtures in Season</span>
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white font-mono">
                  {fixtures.length}
                </span>
                <span className="text-xs text-slate-400">
                  matches scheduled
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {settings.matchPeriodCount} halves × {settings.periodDurationMinutes} mins
              </p>
            </div>
          </div>

          {/* Coach Rotation Advisory Banner */}
          {playersNeedingMinutes.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-xs space-y-1">
                <h4 className="font-bold text-amber-200">
                  Fair Play Rotation Recommendation for Next Fixture
                </h4>
                <p className="text-amber-300/80 leading-relaxed">
                  To keep squad playing time perfectly balanced, consider prioritizing extra minutes (100% match time) for:{' '}
                  <strong className="text-white">
                    {playersNeedingMinutes.map((p) => `${p.player.name} (${p.totalMinutes}m)`).join(', ')}
                  </strong>
                  . The rotation algorithm automatically weights historical minutes to achieve parity!
                </p>
              </div>
            </div>
          )}

          {/* Full Squad Season Fair Play Table / Cards */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-white">
                  Squad Season-Long Playing Time Ranking & Balance
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Squad target average: <strong className="text-white font-mono">{squadAvgMinutes}m</strong>
              </span>
            </div>

            <div className="space-y-3">
              {sortedSeasonStats.map((item) => {
                const deltaFromAvg = item.totalMinutes - squadAvgMinutes;
                const isBalanced = Math.abs(deltaFromAvg) <= squadAvgMinutes * 0.15;
                const percentOfMax = Math.round((item.totalMinutes / maxSeasonMinutes) * 100);

                return (
                  <div
                    key={item.playerId}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-[220px]">
                      <span className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 font-bold flex items-center justify-center shrink-0">
                        {item.player.squadNumber ? `#${item.player.squadNumber}` : '—'}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm block">
                            {item.player.name}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                              isBalanced
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : deltaFromAvg < 0
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                            }`}
                          >
                            {isBalanced ? 'Balanced' : deltaFromAvg < 0 ? 'Needs Minutes' : 'Above Avg'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {item.player.preferredPositions.join(', ')}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Stats */}
                    <div className="flex-1 max-w-lg">
                      <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
                        <span className="text-slate-400">
                          {item.totalMatches} matches ({item.avgMinutesPerMatch}m/match avg)
                        </span>
                        <span className="font-bold text-white">
                          {item.totalMinutes}m{' '}
                          <span className="text-[10px] font-normal text-slate-400">
                            ({deltaFromAvg >= 0 ? `+${deltaFromAvg}` : deltaFromAvg}m vs avg)
                          </span>
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isBalanced ? 'bg-emerald-500' : deltaFromAvg < 0 ? 'bg-amber-500' : 'bg-sky-500'
                          }`}
                          style={{ width: `${percentOfMax}%` }}
                        />
                      </div>
                    </div>

                    {/* GK and Details */}
                    <div className="flex items-center gap-2 shrink-0 text-slate-400 text-[11px]">
                      {item.gkCount > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300 flex items-center gap-1">
                          <Award className="w-3 h-3 text-amber-400" />
                          <span>{item.gkCount} GK {item.gkCount === 1 ? 'half' : 'halves'}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">Outfield</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ================= Goalkeeper Equity Tracker ================= */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>Goalkeeper Equity & Rotation Tracker</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                      FA Grassroots Development
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Ensuring all children rotate through goal to build spatial awareness, empathy, and holistic skillset.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Distinct GKs:</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20">
                  {seasonStats.filter((s) => s.gkCount > 0).length} of {seasonStats.length} Players
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              {seasonStats.map((item) => {
                const hasTriedGK = item.gkCount > 0;
                return (
                  <div
                    key={`gk-${item.playerId}`}
                    className={`p-3 rounded-xl border flex items-center justify-between transition ${
                      hasTriedGK
                        ? 'bg-slate-950/70 border-amber-500/30'
                        : 'bg-slate-950/40 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          hasTriedGK
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.player.squadNumber ? `#${item.player.squadNumber}` : '•'}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-white truncate">{item.player.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.gkCount} {item.gkCount === 1 ? 'half' : 'halves'} in goal
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        hasTriedGK
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                          : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                      }`}
                    >
                      {hasTriedGK ? `${item.gkCount}x GK` : 'Needs turn'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ================= Position Diversity & Versatility Tracker ================= */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>Position Diversity & Pitch Thirds Coverage</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-bold">
                      Well-Rounded Player Metric
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Tracks experience across Defence, Midfield, Attack, and Goalkeeper to avoid premature specialization.
                  </p>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
                  <span>Defence</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                  <span>Midfield</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                  <span>Attack</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                  <span>GK</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {seasonStats.map((item) => {
                const totalPeriods = item.defPeriods + item.midPeriods + item.attPeriods + item.gkCount;
                const defPct = totalPeriods > 0 ? Math.round((item.defPeriods / totalPeriods) * 100) : 0;
                const midPct = totalPeriods > 0 ? Math.round((item.midPeriods / totalPeriods) * 100) : 0;
                const attPct = totalPeriods > 0 ? Math.round((item.attPeriods / totalPeriods) * 100) : 0;
                const gkPct = totalPeriods > 0 ? Math.round((item.gkCount / totalPeriods) * 100) : 0;

                const score = item.thirdsPlayedCount;
                const scoreLabel =
                  score === 4
                    ? 'All-Rounder (4 Thirds)'
                    : score === 3
                    ? 'Versatile (3 Thirds)'
                    : score === 2
                    ? 'Dual Role (2 Thirds)'
                    : score === 1
                    ? 'Specialist (1 Third)'
                    : 'Unassigned';

                return (
                  <div
                    key={`div-${item.playerId}`}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {item.player.squadNumber ? `#${item.player.squadNumber}` : '•'}
                        </span>
                        <span className="font-semibold text-white truncate">{item.player.name}</span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          score >= 3
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : score === 2
                            ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {scoreLabel}
                      </span>
                    </div>

                    {/* Stacked Colored Bar */}
                    <div className="w-full h-2.5 rounded-full bg-slate-850 flex overflow-hidden">
                      {defPct > 0 && (
                        <div
                          style={{ width: `${defPct}%` }}
                          className="bg-sky-500 h-full"
                          title={`Defence: ${item.defPeriods} periods (${defPct}%)`}
                        />
                      )}
                      {midPct > 0 && (
                        <div
                          style={{ width: `${midPct}%` }}
                          className="bg-indigo-500 h-full"
                          title={`Midfield: ${item.midPeriods} periods (${midPct}%)`}
                        />
                      )}
                      {attPct > 0 && (
                        <div
                          style={{ width: `${attPct}%` }}
                          className="bg-rose-500 h-full"
                          title={`Attack: ${item.attPeriods} periods (${attPct}%)`}
                        />
                      )}
                      {gkPct > 0 && (
                        <div
                          style={{ width: `${gkPct}%` }}
                          className="bg-amber-500 h-full"
                          title={`Goalkeeper: ${item.gkCount} periods (${gkPct}%)`}
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Def: {item.defPeriods}p</span>
                      <span>Mid: {item.midPeriods}p</span>
                      <span>Att: {item.attPeriods}p</span>
                      <span>GK: {item.gkCount}p</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ================= Leadership & Sportsmanship Awards ================= */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Matchday Captaincy & Sportsmanship Accolades</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                    Equitable Recognition
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Tracking captain armband rotation (©) and Player of the Match awards (⭐) across the season.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              {seasonStats.map((item) => (
                <div
                  key={`acc-${item.playerId}`}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {item.player.squadNumber ? `#${item.player.squadNumber}` : '•'}
                    </span>
                    <span className="font-semibold text-white truncate">{item.player.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.captainCount > 0 && (
                      <span
                        className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-0.5"
                        title={`${item.captainCount} matches as Captain`}
                      >
                        <Crown className="w-2.5 h-2.5 text-amber-400" />
                        <span>{item.captainCount}x ©</span>
                      </span>
                    )}
                    {item.potmCount > 0 && (
                      <span
                        className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-0.5"
                        title={`${item.potmCount} Player of Match awards`}
                      >
                        <Award className="w-2.5 h-2.5 text-emerald-400" />
                        <span>{item.potmCount}x ⭐</span>
                      </span>
                    )}
                    {item.captainCount === 0 && item.potmCount === 0 && (
                      <span className="text-[10px] text-slate-500 italic">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MATCHDAY FAIR PLAY VIEW                               */}
      {/* ======================================================== */}
      {viewMode === 'match' && (
        <div className="space-y-6 animate-fade-in">
          {(!activeFixture || !activeFixture.matchSquad || stats.length === 0) ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
              No lineup created yet for active fixture vs {activeFixture?.opponent || 'Opponent'}. Click "Auto-Generate Fair Rotation" in the Lineup tab to generate one.
            </div>
          ) : (
            <>
              {/* Top Metric Cards (Matchday) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Compliance Meter */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Matchday Fair Play</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white font-mono">
                      {matchComplianceRate}%
                    </span>
                    <span className="text-xs text-slate-400">
                      ({compliantMatchPlayers}/{totalMatchPlayers} players)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        matchComplianceRate >= 90 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${matchComplianceRate}%` }}
                    />
                  </div>
                </div>

                {/* Average Playing Time */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Average Game Time</span>
                    <TrendingUp className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white font-mono">
                      {avgMatchPercent}%
                    </span>
                    <span className="text-xs text-slate-400 font-mono">({avgMatchMinutes} mins)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Target benchmark: {settings.targetGameTimePercent}%
                  </p>
                </div>

                {/* Goalkeeper Sharing */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Goalkeeper Duties</span>
                    <Award className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white font-mono">
                      {goalkeepers.length}
                    </span>
                    <span className="text-xs text-slate-400">
                      {goalkeepers.length === 1 ? 'dedicated GK' : 'shared GK'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {goalkeepers.map((g) => g.player.name).join(', ') || 'None assigned'}
                  </p>
                </div>

                {/* Match Duration & Periods */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Format & Durations</span>
                    <Clock className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white font-mono">
                      {settings.matchPeriodCount * settings.periodDurationMinutes}m
                    </span>
                    <span className="text-xs text-slate-400">
                      ({settings.matchPeriodCount} × {settings.periodDurationMinutes}m)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {settings.pitchPlayerCount}-a-side ({settings.defaultFormation})
                  </p>
                </div>
              </div>

              {/* Individual Player Breakdown */}
              <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-sky-400" />
                    <h3 className="text-sm font-semibold text-white">
                      Matchday Equal Playing Time Breakdown (vs {activeFixture.opponent})
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    Ordered by match game time percentage
                  </span>
                </div>

                <div className="space-y-3">
                  {[...stats]
                    .sort((a, b) => b.gameTimePercent - a.gameTimePercent)
                    .map((item) => (
                      <div
                        key={item.playerId}
                        className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-bold flex items-center justify-center shrink-0">
                            {item.player.squadNumber ? `#${item.player.squadNumber}` : '—'}
                          </span>
                          <div>
                            <span className="font-semibold text-white text-sm block">
                              {item.player.name}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Positions: {item.positionsPlayed.join(', ') || 'Sub'}
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 max-w-md">
                          <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
                            <span className="text-slate-400">
                              {item.periodsPlayed.length} of {settings.matchPeriodCount}{' '}
                              {settings.matchPeriodCount === 2 ? 'halves' : 'periods'} ({item.minutesPlayed}m)
                            </span>
                            <span
                              className={`font-bold ${
                                item.meetsTarget ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {item.gameTimePercent}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                item.meetsTarget ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, item.gameTimePercent)}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.playedAsGoalkeeper && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-semibold">
                              Goalkeeper
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.meetsTarget
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {item.meetsTarget ? 'Target Met' : 'Below Target'}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
