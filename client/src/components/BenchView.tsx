import React, { useState } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import {
  Armchair,
  ArrowLeftRight,
  Clock,
  ShieldAlert,
  Sparkles,
  UserCheck,
  UserPlus,
  UserX,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { KitJerseyIcon } from '../design-system';
import { Player } from '../types';

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
    replaceSquadPlayer,
    addPlayerToSquad,
  } = useMatchday();

  const [replacingSubPlayer, setReplacingSubPlayer] = useState<Player | null>(null);
  const [promotingRestedPlayer, setPromotingRestedPlayer] = useState<Player | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  if (!activeFixture || !activeFixture.matchSquad) return null;

  const currentLineup = activeFixture.matchSquad.lineupsByPeriod.find(
    (l) => l.period === activePeriod
  );
  if (!currentLineup) return null;

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const statsMap = new Map(stats.map((s) => [s.playerId, s]));

  const subs = currentLineup.subs
    .map((id) => playerMap.get(id))
    .filter((p): p is Player => Boolean(p));

  const restedPlayers = (activeFixture.matchSquad.restedPlayerIds || [])
    .map((id) => playerMap.get(id))
    .filter((p): p is Player => Boolean(p));

  const selectedSquadCount = activeFixture.matchSquad.selectedPlayerIds.length;
  const squadCap = settings.matchdaySquadCap || 10;
  const hasSquadSpace = selectedSquadCount < squadCap;

  const onSubClick = (playerId: string) => {
    if (!selectedSwapSource) {
      selectSwapSource({ type: 'sub', playerId });
    } else {
      handleSwap({ type: 'sub', playerId });
    }
  };

  const onRestedClick = (player: Player) => {
    if (selectedSwapSource) {
      const outgoing = playerMap.get(selectedSwapSource.playerId);
      handleSwap({ type: 'rested', playerId: player.id });
      if (outgoing) {
        setNotification(`✓ ${player.name} moved to team sheet, replacing ${outgoing.name}.`);
        setTimeout(() => setNotification(null), 4000);
      }
    } else {
      setPromotingRestedPlayer(player);
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
      {/* Toast Notification Banner */}
      {notification && (
        <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-emerald-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Active Substitutes Bench */}
      <div className="p-5 rounded-3xl bg-[var(--surface-card)] border border-[var(--surface-border)] shadow-xl backdrop-blur-sm space-y-4 transition-all duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Armchair className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-main)]">Substitutes Bench</h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Resting during {periodLabel} ({subs.length} players)
              </p>
            </div>
          </div>
          <span className="text-[11px] font-medium whitespace-nowrap px-2.5 py-0.5 rounded-full bg-[var(--surface-base)] text-[var(--text-muted)] border border-[var(--surface-border)] shrink-0">
            Click to swap on pitch
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 group overflow-hidden ${
                  isSelected
                    ? 'ring-2 ring-sky-400 border-white bg-slate-850 shadow-lg shadow-sky-500/20'
                    : isCaptain
                    ? 'bg-slate-950/80 hover:bg-slate-900 border-amber-500/40'
                    : 'bg-slate-950/70 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <KitJerseyIcon
                        number={sub.squadNumber}
                        isGk={sub.preferredPositions.includes('Goalkeeper')}
                        size={32}
                      />
                      {isCaptain && (
                        <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black leading-none border border-amber-200">
                          ©
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-semibold text-white group-hover:text-sky-300 transition-colors flex items-center gap-1 truncate">
                        <span className="truncate">{sub.name}</span>
                        {isCaptain && <span className="text-[10px] text-amber-300 font-bold shrink-0">©</span>}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">
                        {sub.preferredPositions.join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReplacingSubPlayer(sub);
                      }}
                      className="p-1 rounded bg-slate-850 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700/60 transition"
                      title="Player ill or called off? Replace with rested player"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                    <span
                      className="p-1 rounded bg-slate-800/80 group-hover:bg-sky-600 text-slate-400 group-hover:text-white transition shrink-0"
                      title="Click to swap with pitch player"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
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

      {/* Rested Squad (Rotation Roster & Matchday Call-Off Replacements) */}
      <div className="p-5 rounded-3xl bg-[var(--surface-card)] border border-[var(--surface-border)] shadow-lg space-y-3 transition-all duration-200">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--surface-border)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-main)]">Rested Players (Rotation Roster)</h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                {restedPlayers.length} rotated off • Tap any player to promote if someone is sick
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-semibold text-indigo-300 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Fair Rotation
          </span>
        </div>

        {restedPlayers.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2">No players rested for this match (full squad attending).</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {restedPlayers.map((player) => {
              const fixtureDate = activeFixture.date;
              const isUnavailable = player.unavailableDates?.includes(fixtureDate);
              const isBeforeSignOn = Boolean(
                player.signOnDate && fixtureDate && fixtureDate < player.signOnDate
              );
              const isAfterLeave = Boolean(
                player.leaveDate && fixtureDate && fixtureDate > player.leaveDate
              );
              const isSwapTarget = selectedSwapSource !== null;

              return (
                <div
                  key={player.id}
                  onClick={() => onRestedClick(player)}
                  className={`p-3 rounded-xl border flex flex-col justify-between space-y-2 text-xs shadow-sm cursor-pointer transition ${
                    isSwapTarget
                      ? 'border-emerald-500/80 bg-emerald-950/20 hover:bg-emerald-950/40 ring-1 ring-emerald-500/40'
                      : 'bg-slate-950/60 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700'
                  }`}
                  title={
                    isSwapTarget
                      ? `Click to replace selected player with ${player.name}`
                      : `Click to move ${player.name} to matchday team sheet`
                  }
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

                  {/* Middle Row: Player Name & Preferred Positions */}
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-white leading-snug">
                      {player.name}
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      {player.preferredPositions.join(', ')}
                    </p>
                  </div>

                  {/* Quick Action Button: Move to Team Sheet */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPromotingRestedPlayer(player);
                    }}
                    className="w-full py-1.5 px-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Move to Team Sheet</span>
                  </button>

                  {/* Bottom Row: Season Statistics */}
                  <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
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

      {/* Modal: Promote Rested Player to Team Sheet (Matchday Call-off) */}
      {promotingRestedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Move to Team Sheet</h3>
                  <p className="text-xs text-slate-400">
                    Promote <strong>{promotingRestedPlayer.name}</strong> on matchday
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPromotingRestedPlayer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              If a squad member called in sick or is absent, select them below to replace them with{' '}
              <strong className="text-white">{promotingRestedPlayer.name}</strong> across the matchday lineup:
            </p>

            {hasSquadSpace && (
              <button
                type="button"
                onClick={async () => {
                  await addPlayerToSquad(promotingRestedPlayer.id);
                  setPromotingRestedPlayer(null);
                  setNotification(`✓ Added ${promotingRestedPlayer.name} to matchday bench squad.`);
                  setTimeout(() => setNotification(null), 4000);
                }}
                className="w-full p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Add directly to bench ({selectedSquadCount}/{squadCap} squad slots used)</span>
              </button>
            )}

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                Select player who is absent / ill to replace:
              </span>
              {activeFixture.matchSquad.selectedPlayerIds.map((id) => {
                const p = playerMap.get(id);
                if (!p) return null;
                const isCaptain = activeFixture.captainId === p.id;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={async () => {
                      await replaceSquadPlayer(p.id, promotingRestedPlayer.id);
                      setPromotingRestedPlayer(null);
                      setNotification(`✓ ${promotingRestedPlayer.name} replaced ${p.name} on the team sheet.`);
                      setTimeout(() => setNotification(null), 4000);
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-950/80 hover:bg-indigo-950/50 border border-slate-800 hover:border-indigo-500/50 text-left flex items-center justify-between transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {p.squadNumber || '—'}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white group-hover:text-indigo-300 flex items-center gap-1 truncate">
                          <span>{p.name}</span>
                          {isCaptain && <span className="text-[10px] text-amber-300 font-bold">©</span>}
                        </div>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {p.preferredPositions.join(', ')}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-indigo-400 group-hover:text-indigo-300 shrink-0 px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20">
                      Replace
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setPromotingRestedPlayer(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Mark Sub as Sick / Call-Off and replace with Rested Player */}
      {replacingSubPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Player Ill / Call-Off</h3>
                  <p className="text-xs text-slate-400">
                    Replace <strong>{replacingSubPlayer.name}</strong> on matchday
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplacingSubPlayer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Select a player from the rested rotation roster to take{' '}
              <strong className="text-white">{replacingSubPlayer.name}</strong>'s spot on the team sheet:
            </p>

            {restedPlayers.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                <AlertCircle className="w-6 h-6 text-amber-400 mx-auto" />
                <p className="text-xs text-slate-400">No players currently in rested roster.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {restedPlayers.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={async () => {
                      await replaceSquadPlayer(replacingSubPlayer.id, r.id);
                      setReplacingSubPlayer(null);
                      setNotification(`✓ ${r.name} moved to team sheet, replacing ${replacingSubPlayer.name}.`);
                      setTimeout(() => setNotification(null), 4000);
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-950/80 hover:bg-emerald-950/50 border border-slate-800 hover:border-emerald-500/50 text-left flex items-center justify-between transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {r.squadNumber || '—'}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white group-hover:text-emerald-300 truncate">
                          {r.name}
                        </div>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {r.preferredPositions.join(', ')} • {r.totalMinutesPlayed}m season
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-400 group-hover:text-emerald-300 shrink-0 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                      Bring In
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setReplacingSubPlayer(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
