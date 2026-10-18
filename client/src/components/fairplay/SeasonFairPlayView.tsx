import React from 'react';
import {
  ShieldCheck,
  TrendingUp,
  HeartHandshake,
  Award,
  Filter,
  ArrowUpDown,
  Compass,
  Crown,
} from 'lucide-react';
import { Player } from '../../types';

export interface SeasonPlayerStat {
  player: Player;
  playerId: string;
  totalMatches: number;
  totalMinutes: number;
  gkCount: number;
  defPeriods: number;
  midPeriods: number;
  attPeriods: number;
  thirdsPlayedCount: number;
  captainCount: number;
  potmCount: number;
  goalsCount: number;
  diffFromAvg: number;
  equityCompliant: boolean;
  equityPercent: number;
  gameTimePercent?: number;
  meetsTarget?: boolean;
}

interface SeasonFairPlayViewProps {
  seasonStats: SeasonPlayerStat[];
  availableSeasons: string[];
  seasonFilter: string;
  onSeasonFilterChange: (season: string) => void;
  sortBy: 'minutes-desc' | 'minutes-asc' | 'matches-desc' | 'name';
  onSortByChange: (sort: 'minutes-desc' | 'minutes-asc' | 'matches-desc' | 'name') => void;
  equityRate: number;
  equityCompliantCount: number;
  squadAvgMinutes: number;
  overallTarget: number;
  gkRotationShareCount: number;
}

export const SeasonFairPlayView: React.FC<SeasonFairPlayViewProps> = ({
  seasonStats,
  availableSeasons,
  seasonFilter,
  onSeasonFilterChange,
  sortBy,
  onSortByChange,
  equityRate,
  equityCompliantCount,
  squadAvgMinutes,
  overallTarget,
  gkRotationShareCount,
}) => {
  return (
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
            onChange={(e) => onSeasonFilterChange(e.target.value)}
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
            onChange={(e) => onSortByChange(e.target.value as any)}
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
            <span className="text-xs text-slate-400">per player</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Target 50%+ equal game time benchmark
          </p>
        </div>

        {/* Goalkeeping Rotations */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Goalkeeping Rotations</span>
            <HeartHandshake className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              {gkRotationShareCount}
            </span>
            <span className="text-xs text-slate-400">
              of {seasonStats.length} tried GK
            </span>
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            Encourages every player to try the gloves
          </p>
        </div>

        {/* Target Benchmark */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Season Parity Target</span>
            <Award className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              {overallTarget}%
            </span>
            <span className="text-xs text-slate-400">FA Charter Goal</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Every child plays at least half the match
          </p>
        </div>
      </div>

      {/* Season Equity Progress Table */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Cumulative Playing Time & Equity Parity
            </h3>
            <p className="text-xs text-slate-400">
              Compares each player's playing time relative to the squad average ({squadAvgMinutes} mins).
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Balanced (±15%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Needs Rotation</span>
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {seasonStats.map((item) => {
            const maxMins = Math.max(...seasonStats.map((s) => s.totalMinutes), 1);
            const barWidth = Math.round((item.totalMinutes / maxMins) * 100);

            return (
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
                      {item.totalMatches} matches logged
                      {item.gameTimePercent !== undefined ? ` • ${item.gameTimePercent}% game time` : ''}
                      {item.goalsCount > 0 ? ` • ⚽ ${item.goalsCount} goal${item.goalsCount > 1 ? 's' : ''}` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex-1 max-w-md">
                  <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
                    <span className="text-slate-400">
                      {item.totalMinutes} mins played
                    </span>
                    <span
                      className={`font-bold ${
                        item.equityCompliant && (item.meetsTarget !== false) ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {item.diffFromAvg > 0 ? `+${item.diffFromAvg}m` : `${item.diffFromAvg}m`} vs avg
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.equityCompliant && (item.meetsTarget !== false) ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, barWidth)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.goalsCount > 0 && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <span>⚽</span>
                      <span>{item.goalsCount}</span>
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.equityCompliant && (item.meetsTarget !== false)
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {item.equityCompliant && (item.meetsTarget !== false)
                      ? 'Balanced'
                      : item.meetsTarget === false || item.diffFromAvg < 0
                      ? `Below Target (${item.gameTimePercent ?? 0}%)`
                      : 'Above Avg'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Goalkeeper Rotation Tracker */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 shadow-xl space-y-4">
        <div className="pb-3 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-amber-400" />
            <span>Goalkeeper Turn-Taking Tracker</span>
          </h3>
          <p className="text-xs text-slate-400">
            Encourages outfield players to gain goalkeeping experience in grassroots development football.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          {seasonStats.map((item) => {
            const hasTriedGK = item.gkCount > 0;
            return (
              <div
                key={`gk-${item.playerId}`}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center text-xs shrink-0 ${
                      hasTriedGK
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-500'
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

      {/* Position Diversity & Pitch Thirds Coverage */}
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

      {/* Leadership & Sportsmanship Awards */}
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
  );
};
