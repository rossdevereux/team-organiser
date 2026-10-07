import React from 'react';
import { useMatchday } from '../context/MatchdayContext';
import { Armchair, ArrowLeftRight, Clock, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';

export const BenchView: React.FC = () => {
  const {
    activeFixture,
    activePeriod,
    settings,
    players,
    stats,
    selectedSwapSource,
    selectSwapSource,
    handleSwap,
  } = useMatchday();

  if (!activeFixture || !activeFixture.matchSquad) return null;

  const currentLineup = activeFixture.matchSquad.lineupsByPeriod.find(
    (l) => l.period === activePeriod
  );
  if (!currentLineup) return null;

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const statsMap = new Map(stats.map((s) => [s.playerId, s]));

  const subs = currentLineup.subs
    .map((id) => playerMap.get(id))
    .filter((p): p is (typeof players)[0] => Boolean(p));

  const restedPlayers = (activeFixture.matchSquad.restedPlayerIds || [])
    .map((id) => playerMap.get(id))
    .filter((p): p is (typeof players)[0] => Boolean(p));

  const onSubClick = (playerId: string) => {
    if (!selectedSwapSource) {
      selectSwapSource({ type: 'sub', playerId });
    } else {
      handleSwap({ type: 'sub', playerId });
    }
  };

  const handleDragStart = (e: React.DragEvent, playerId: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'sub', playerId }));
    selectSwapSource({ type: 'sub', playerId });
  };

  const periodLabel =
    settings.matchPeriodCount === 2
      ? activePeriod === 1
        ? 'First Half (Period 1)'
        : 'Second Half (Period 2)'
      : `Period ${activePeriod}`;

  return (
    <div className="space-y-6">
      {/* Active Substitutes Bench */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Armchair className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Substitutes Bench</h3>
              <p className="text-[11px] text-slate-400">
                Resting during {periodLabel} ({subs.length} players)
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            Click to swap on pitch
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {subs.map((sub) => {
            const pStats = statsMap.get(sub.id);
            const isSelected = selectedSwapSource?.playerId === sub.id;
            const isCaptain = activeFixture.captainId === sub.id;

            return (
              <div
                key={sub.id}
                draggable
                onDragStart={(e) => handleDragStart(e, sub.id)}
                onClick={() => onSubClick(sub.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 group ${
                  isSelected
                    ? 'ring-2 ring-sky-400 border-white bg-slate-850 shadow-lg shadow-sky-500/20'
                    : isCaptain
                    ? 'bg-slate-950/80 hover:bg-slate-900 border-amber-500/40'
                    : 'bg-slate-950/70 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                      {sub.squadNumber ? `#${sub.squadNumber}` : 'SUB'}
                      {isCaptain && (
                        <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black leading-none border border-amber-200">
                          ©
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white group-hover:text-sky-300 transition-colors flex items-center gap-1">
                        <span>{sub.name}</span>
                        {isCaptain && <span className="text-[10px] text-amber-300 font-bold">©</span>}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {sub.preferredPositions.join(', ')}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="p-1 rounded bg-slate-800 group-hover:bg-sky-600 text-slate-400 group-hover:text-white transition"
                    title="Click to swap with pitch player"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{pStats ? `${pStats.minutesPlayed}m played` : '0m'}</span>
                  </span>
                  <span
                    className={`font-semibold ${
                      pStats && pStats.meetsTarget ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {pStats ? `${pStats.gameTimePercent}%` : '0%'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rested Squad (Rotated Off for Matchday) */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-lg space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white">Rested Players (Rotation Roster)</h3>
              <p className="text-[11px] text-slate-400">
                Rotated off this match to maintain season-long fair play ({restedPlayers.length} players)
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-semibold text-indigo-300 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Fair Rotation
          </span>
        </div>

        {restedPlayers.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No players rested for this match.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 pt-1">
            {restedPlayers.map((player) => {
              const fixtureDate = activeFixture.date;
              const isUnavailable = player.unavailableDates?.includes(fixtureDate);
              const isBeforeSignOn = Boolean(
                player.signOnDate && fixtureDate && fixtureDate < player.signOnDate
              );
              const isAfterLeave = Boolean(
                player.leaveDate && fixtureDate && fixtureDate > player.leaveDate
              );

              return (
                <div
                  key={player.id}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between space-y-2.5 text-xs shadow-sm hover:border-slate-700 transition"
                >
                  {/* Top Row: Squad Number & Status Badge */}
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs border border-slate-700/60 shadow-sm">
                      {player.squadNumber ? `#${player.squadNumber}` : '—'}
                    </span>

                    {isUnavailable ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        Away
                      </span>
                    ) : isBeforeSignOn ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        Pending
                      </span>
                    ) : isAfterLeave ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        Left
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-400 border border-slate-700/60">
                        Rested
                      </span>
                    )}
                  </div>

                  {/* Middle Row: Player Name & Preferred Positions (Full Width) */}
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-white leading-snug">
                      {player.name}
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      {player.preferredPositions.join(', ')}
                    </p>
                  </div>

                  {/* Bottom Row: Season Statistics */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{player.matchesPlayed} matches</span>
                    <span>•</span>
                    <span>{player.totalMinutesPlayed}m season</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
