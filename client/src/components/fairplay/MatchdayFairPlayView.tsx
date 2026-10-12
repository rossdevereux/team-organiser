import React from 'react';
import { ShieldCheck, TrendingUp, Award, Clock, Users } from 'lucide-react';
import { Fixture, MatchPlayerStats, TeamSettings } from '../../types';

interface MatchdayFairPlayViewProps {
  activeFixture: Fixture | null;
  stats: MatchPlayerStats[];
  settings: TeamSettings;
  matchComplianceRate: number;
  compliantMatchPlayers: number;
  totalMatchPlayers: number;
  avgMatchPercent: number;
  avgMatchMinutes: number;
  goalkeepers: MatchPlayerStats[];
}

export const MatchdayFairPlayView: React.FC<MatchdayFairPlayViewProps> = ({
  activeFixture,
  stats,
  settings,
  matchComplianceRate,
  compliantMatchPlayers,
  totalMatchPlayers,
  avgMatchPercent,
  avgMatchMinutes,
  goalkeepers,
}) => {
  if (!activeFixture || !activeFixture.matchSquad || stats.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800 animate-fade-in">
        No lineup created yet for active fixture vs {activeFixture?.opponent || 'Opponent'}. Click "Auto-Generate Fair Rotation" in the Lineup tab to generate one.
      </div>
    );
  }

  const periodCount = activeFixture.matchPeriodCount || settings.matchPeriodCount || 2;
  const periodDuration = activeFixture.periodDurationMinutes || settings.periodDurationMinutes || 25;
  const totalMatchMinutes = periodCount * periodDuration;
  const pitchCount = activeFixture.pitchPlayerCount || settings.pitchPlayerCount || 7;
  const formation = activeFixture.formation || settings.defaultFormation;

  return (
    <div className="space-y-6 animate-fade-in">
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
              {totalMatchMinutes}m
            </span>
            <span className="text-xs text-slate-400">
              ({periodCount} × {periodDuration}m)
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {pitchCount}-a-side ({formation})
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
                      {item.periodsPlayed.length} of {periodCount}{' '}
                      {periodCount === 2 ? 'halves' : 'periods'} ({item.minutesPlayed}m)
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
    </div>
  );
};
