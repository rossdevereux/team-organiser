import React from 'react';
import { useMatchday } from '../context/MatchdayContext';
import { CheckCircle2, AlertTriangle, Wand2, Shield, Eye } from 'lucide-react';

export const RotationMatrix: React.FC = () => {
  const {
    activeFixture,
    players,
    settings,
    stats,
    setActivePeriod,
    setActiveTab,
    autoRotateCurrentFixture,
  } = useMatchday();

  if (!activeFixture || !activeFixture.matchSquad) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
        No matchday squad generated for this fixture yet. Click Auto-Balance to generate!
      </div>
    );
  }

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const statsMap = new Map(stats.map((s) => [s.playerId, s]));

  const matchSquad = activeFixture.matchSquad;
  const periodCount = settings.matchPeriodCount || 2;
  const periods = Array.from({ length: periodCount }, (_, i) => i + 1);

  // Helper to get status of player in given period
  const getPeriodStatus = (playerId: string, periodNum: number) => {
    const lineup = matchSquad.lineupsByPeriod.find((l) => l.period === periodNum);
    if (!lineup) return { type: 'unknown', label: '—' };

    const onPitch = lineup.onPitch.find((item) => item.playerId === playerId);
    if (onPitch) {
      return {
        type: 'pitch',
        position: onPitch.position,
        label: onPitch.position.replace('_', ' '),
        isGk: onPitch.position === 'GK',
      };
    }

    if (lineup.subs.includes(playerId)) {
      return { type: 'sub', label: 'SUB' };
    }

    return { type: 'rested', label: 'RESTED' };
  };

  const matrixTitle =
    periodCount === 2
      ? '2-Half Match Rotation Matrix'
      : `${periodCount}-Period Fair Rotation Matrix`;

  return (
    <div className="space-y-4">
      {/* Table Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-lg">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>{matrixTitle}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Target: {settings.targetGameTimePercent}%+
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Overview of pitch positions and substitutions across {periodCount === 2 ? 'both halves' : `all ${periodCount} periods`}.
          </p>
        </div>

        <button
          onClick={() => autoRotateCurrentFixture()}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-sky-600/20 transition cursor-pointer"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Auto-Balance Periods</span>
        </button>
      </div>

      {/* Matrix Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-3 text-center">Pref Position</th>
                {periods.map((p) => (
                  <th key={p} className="py-3 px-3 text-center">
                    <button
                      onClick={() => {
                        setActivePeriod(p);
                        setActiveTab('lineup');
                      }}
                      className="hover:text-sky-400 transition inline-flex items-center gap-1 cursor-pointer font-bold"
                      title={`Jump to ${periodCount === 2 ? (p === 1 ? '1st Half' : '2nd Half') : `Period ${p}`} on pitch`}
                    >
                      <span>
                        {periodCount === 2 ? (p === 1 ? '1st Half' : '2nd Half') : `P${p}`}
                      </span>
                      <Eye className="w-3 h-3 text-slate-500 hover:text-sky-400" />
                    </button>
                  </th>
                ))}
                <th className="py-3 px-3 text-center">Minutes</th>
                <th className="py-3 px-3 text-center">Game Time</th>
                <th className="py-3 px-4 text-center">Fairness</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {[...matchSquad.selectedPlayerIds]
                .sort((idA, idB) => {
                  const pA = playerMap.get(idA);
                  const pB = playerMap.get(idB);
                  const numA = typeof pA?.squadNumber === 'number' && !isNaN(pA.squadNumber) ? pA.squadNumber : 9999;
                  const numB = typeof pB?.squadNumber === 'number' && !isNaN(pB.squadNumber) ? pB.squadNumber : 9999;
                  if (numA !== numB) return numA - numB;
                  return (pA?.name || '').localeCompare(pB?.name || '');
                })
                .map((playerId) => {
                const player = playerMap.get(playerId);
                const pStats = statsMap.get(playerId);

                return (
                  <tr
                    key={playerId}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Player Name and Number */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                          {player?.squadNumber ? `#${player.squadNumber}` : '—'}
                        </span>
                        <div>
                          <span className="text-white font-semibold block text-xs">
                            {player?.name || 'Unknown'}
                          </span>
                          {pStats?.playedAsGoalkeeper && (
                            <span className="text-[10px] text-amber-400 font-normal flex items-center gap-1">
                              <Shield className="w-2.5 h-2.5" /> Played GK
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Preferred Position */}
                    <td className="py-3 px-3 text-center text-slate-400 text-[11px]">
                      {player?.preferredPositions.join(', ') || '—'}
                    </td>

                    {/* Quarter Cells */}
                    {periods.map((p) => {
                      const status = getPeriodStatus(playerId, p);

                      return (
                        <td key={p} className="py-3 px-3 text-center">
                          {status.type === 'pitch' ? (
                            <span
                              onClick={() => {
                                setActivePeriod(p);
                                setActiveTab('lineup');
                              }}
                              className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-tight cursor-pointer transition shadow-sm ${
                                status.isGk
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                                  : status.position?.startsWith('DEF')
                                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30'
                                  : status.position?.startsWith('MID')
                                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                              }`}
                              title={`Pitch position in Quarter ${p}. Click to view on pitch.`}
                            >
                              {status.label}
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/60 font-mono">
                              BENCH
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Total Minutes */}
                    <td className="py-3 px-3 text-center font-mono text-slate-200">
                      {pStats ? `${pStats.minutesPlayed}m` : '0m'}
                    </td>

                    {/* Game Time % */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`font-mono text-xs font-bold ${
                            pStats && pStats.meetsTarget
                              ? 'text-emerald-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {pStats ? `${pStats.gameTimePercent}%` : '0%'}
                        </span>
                        <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pStats && pStats.meetsTarget
                                ? 'bg-emerald-500'
                                : 'bg-amber-500'
                            }`}
                            style={{
                              width: `${pStats ? Math.min(100, pStats.gameTimePercent) : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Fairness Checkmark */}
                    <td className="py-3 px-4 text-center">
                      {pStats && pStats.meetsTarget ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Target Met</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>&lt; {settings.targetGameTimePercent}%</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
