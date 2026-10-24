import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  HeartPulse,
} from 'lucide-react';
import { KitJerseyIcon } from '../design-system';
import { Player } from '../types';
import { EmptyState } from './EmptyState';
import { useToast } from '../context/ToastContext';
import { PlayerCallOffModal } from './PlayerCallOffModal';
import { EmergencyDepartureModal } from './EmergencyDepartureModal';
import { getPlayerInitials } from '../utils/playerUtils';

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
    setActiveTab,
  } = useMatchday();

  const { showToast } = useToast();
  const { t } = useTranslation();

  const [replacingSubPlayer, setReplacingSubPlayer] = useState<Player | null>(null);
  const [promotingRestedPlayer, setPromotingRestedPlayer] = useState<Player | null>(null);
  const [emergencyDepartureSubPlayer, setEmergencyDepartureSubPlayer] = useState<Player | null>(null);

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const statsMap = useMemo(() => new Map(stats.map((s) => [s.playerId, s])), [stats]);

  const currentLineup = useMemo(() => {
    return activeFixture?.matchSquad?.lineupsByPeriod.find((l) => l.period === activePeriod) || null;
  }, [activeFixture?.matchSquad?.lineupsByPeriod, activePeriod]);

  const subs = useMemo(() => {
    if (!currentLineup) return [];
    return currentLineup.subs
      .map((id) => playerMap.get(id))
      .filter((p): p is Player => Boolean(p));
  }, [currentLineup, playerMap]);

  const restedPlayers = useMemo(() => {
    if (!activeFixture?.matchSquad) return [];
    return (activeFixture.matchSquad.restedPlayerIds || [])
      .map((id) => playerMap.get(id))
      .filter((p): p is Player => Boolean(p));
  }, [activeFixture?.matchSquad?.restedPlayerIds, playerMap]);

  if (!activeFixture || !activeFixture.matchSquad || !currentLineup) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
          <Armchair className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">{t('lineup.bench')}</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {t('lineup.noBenchSubs')}
          </p>
        </div>
      </div>
    );
  }

  const selectedSquadCount = activeFixture.matchSquad.selectedPlayerIds.length;
  const squadCap = activeFixture.matchdaySquadCap || settings.matchdaySquadCap || 10;
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
        showToast(`✓ ${player.name} moved to team sheet, replacing ${outgoing.name}.`, 'success');
      }
    } else {
      setPromotingRestedPlayer(player);
    }
  };

  const handleDragStart = (e: React.DragEvent, playerId: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'sub', playerId }));
    selectSwapSource({ type: 'sub', playerId });
  };

  const effectivePeriodCount = activeFixture?.matchPeriodCount || settings.matchPeriodCount || 2;
  const periodLabel =
    effectivePeriodCount === 2
      ? activePeriod === 1
        ? 'First Half (Period 1)'
        : 'Second Half (Period 2)'
      : `Period ${activePeriod} of ${effectivePeriodCount}`;

  return (
    <div className="space-y-6">
      {/* Active Substitutes Bench */}
      <div className="p-4 sm:p-6 rounded-3xl bg-[var(--surface-card)] border border-[var(--surface-border)] shadow-xl backdrop-blur-sm space-y-4 transition-all duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Armchair className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-main)]">{t('lineup.bench')}</h3>
              <p className="text-xs text-slate-400">
                {periodLabel} ({subs.length} {t('common.players')})
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold whitespace-nowrap px-3 py-1 rounded-full bg-[var(--surface-base)] text-slate-300 border border-[var(--surface-border)] shrink-0">
            {selectedSwapSource ? t('lineup.selectSwapSource') : t('lineup.tapToSwap')}
          </span>
        </div>

        {/* Empty State when 0 players on bench */}
        {subs.length === 0 ? (
          <EmptyState
            variant="bench"
            title="All Selected Players Active On Pitch"
            description={`Every squad member is deployed on the pitch during ${periodLabel}. There are 0 resting substitutes for this period.`}
            action={{
              label: 'View Rotation Matrix',
              onClick: () => setActiveTab('matrix'),
            }}
            className="py-8"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            {subs.map((sub) => {
              const pStats = statsMap.get(sub.id);
              const isSelected = selectedSwapSource?.playerId === sub.id;
              const isEligibleTarget = Boolean(selectedSwapSource && !isSelected);
              const isCaptain = activeFixture.captainId === sub.id;

              return (
                <div
                  key={sub.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, sub.id)}
                  onClick={() => onSubClick(sub.id)}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 group overflow-hidden ${
                    isSelected
                      ? 'ring-4 ring-sky-400 border-white bg-slate-900 shadow-xl shadow-sky-500/40 scale-102'
                      : isEligibleTarget
                      ? 'ring-2 ring-emerald-400/80 border-emerald-400/60 bg-slate-950/90 hover:bg-slate-900 shadow-lg shadow-emerald-500/20'
                      : isCaptain
                      ? 'bg-slate-950/90 hover:bg-slate-900 border-amber-500/40'
                      : 'bg-slate-950/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Row: Full-width Avatar, Name & Preferred Position */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      {sub.squadNumber ? (
                        <KitJerseyIcon
                          number={sub.squadNumber}
                          isGk={sub.preferredPositions.includes('Goalkeeper')}
                          size={38}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-800 text-white font-black text-xs flex items-center justify-center border border-slate-700 shadow-sm">
                          {getPlayerInitials(sub.name)}
                        </div>
                      )}
                      {isCaptain && (
                        <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black leading-none border border-amber-200">
                          ©
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors flex items-center gap-1.5 leading-snug">
                        <span className="truncate" title={sub.name}>
                          {sub.name}
                        </span>
                        {isCaptain && (
                          <span className="text-[10px] text-amber-300 font-bold shrink-0">©</span>
                        )}
                      </h4>
                      <p
                        className="text-xs text-sky-400 font-medium truncate mt-0.5"
                        title={sub.preferredPositions.join(', ')}
                      >
                        {sub.preferredPositions.join(', ')}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Row: Match Stats & Quick Action Buttons */}
                  <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{pStats ? `${pStats.minutesPlayed}m played` : '0m'}</span>
                      <span className="text-slate-600">•</span>
                      <span
                        className={`font-bold ${
                          pStats && pStats.meetsTarget ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {pStats ? `${pStats.gameTimePercent}%` : '0%'}
                      </span>
                    </div>

                    {/* Touch Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEmergencyDepartureSubPlayer(sub);
                        }}
                        className="h-8 px-2.5 rounded-xl bg-rose-600/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition flex items-center gap-1 text-xs cursor-pointer font-semibold"
                        title="Player injured or leaving early mid-match? Lock out and rebalance"
                        aria-label={`Mark player injured or departing early ${sub.name}`}
                      >
                        <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                        <span className="text-[11px] font-medium hidden sm:inline">Injured / Left</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplacingSubPlayer(sub);
                        }}
                        className="h-8 px-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition flex items-center gap-1 text-xs cursor-pointer"
                        title="Player ill or called off pre-match? Remove or replace"
                        aria-label={`Replace absent or ill player ${sub.name}`}
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-medium hidden sm:inline">Call-off</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSubClick(sub.id);
                        }}
                        className={`h-8 px-3 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                          isEligibleTarget
                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30'
                            : isSelected
                            ? 'bg-sky-500 text-white'
                            : 'bg-slate-800 text-slate-200 hover:bg-sky-600 hover:text-white border border-slate-700'
                        }`}
                        title={
                          isEligibleTarget
                            ? 'Click to swap with selected player'
                            : 'Click to select for swap'
                        }
                        aria-label={`Swap ${sub.name} onto pitch`}
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        <span>{isEligibleTarget ? 'Swap Here' : isSelected ? 'Selected' : 'Swap'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rested Squad (Rotation Roster & Matchday Call-Off Replacements) */}
      <div className="p-4 sm:p-6 rounded-3xl bg-[var(--surface-card)] border border-[var(--surface-border)] shadow-lg space-y-4 transition-all duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-main)]">Rested Players (Rotation Roster)</h3>
              <p className="text-xs text-slate-400">
                {restedPlayers.length} rotated off • Tap any player to promote if someone is absent
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold text-indigo-300 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" /> Fair Rotation
          </span>
        </div>

        {restedPlayers.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-3 text-center">
            No players rested for this match (full squad attending).
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 pt-1">
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
                  className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between space-y-3 text-xs shadow-sm cursor-pointer transition ${
                    isSwapTarget
                      ? 'border-emerald-500/80 bg-emerald-950/30 hover:bg-emerald-950/50 ring-2 ring-emerald-500/40 shadow-emerald-950/50'
                      : 'bg-slate-950/70 hover:bg-slate-900 border-slate-800/90 hover:border-slate-700'
                  }`}
                  title={
                    isSwapTarget
                      ? `Click to replace selected player with ${player.name}`
                      : `Click to move ${player.name} to matchday team sheet`
                  }
                >
                  {/* Top Row: Squad Number / Avatar + Player Name & Position + Status Badge */}
                  <div className="flex items-center justify-between gap-2.5 min-w-0">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="w-8 h-8 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-xs border border-slate-700/60 shadow-sm shrink-0">
                        {player.squadNumber ? `#${player.squadNumber}` : getPlayerInitials(player.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white leading-snug truncate" title={player.name}>
                          {player.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5" title={player.preferredPositions.join(', ')}>
                          {player.preferredPositions.join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isUnavailable ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          Away
                        </span>
                      ) : isBeforeSignOn ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Pending
                        </span>
                      ) : isAfterLeave ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          Left
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          Rested
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Season Stats + Action Button */}
                  <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-mono">
                      <span>{player.matchesPlayed} matches</span>
                      <span className="text-slate-600">•</span>
                      <span>{player.totalMinutesPlayed}m season</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPromotingRestedPlayer(player);
                      }}
                      className="h-8 px-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{t('lineup.promoteToBench')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Promote Rested Player to Team Sheet (Matchday Call-off) */}
      {promotingRestedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in print:hidden">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
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
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
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
                  showToast(`✓ Added ${promotingRestedPlayer.name} to matchday bench squad.`, 'success');
                }}
                className="w-full min-h-[44px] p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
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
                      showToast(`✓ ${promotingRestedPlayer.name} replaced ${p.name} on the team sheet.`, 'success');
                    }}
                    className="w-full min-h-[48px] p-2.5 rounded-xl bg-slate-950/80 hover:bg-indigo-950/50 border border-slate-800 hover:border-indigo-500/50 text-left flex items-center justify-between transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                        {p.squadNumber || getPlayerInitials(p.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white group-hover:text-indigo-300 flex items-center flex-wrap gap-1 leading-snug">
                          <span className="break-words font-bold" title={p.name}>{p.name}</span>
                          {isCaptain && <span className="text-[10px] text-amber-300 font-bold shrink-0">©</span>}
                        </div>
                        <span className="text-[11px] text-slate-400 break-words block mt-0.5" title={p.preferredPositions.join(', ')}>
                          {p.preferredPositions.join(', ')}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-400 group-hover:text-indigo-300 shrink-0 px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20">
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
                className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mid-Match Departures Section */}
      {activeFixture.earlyDepartures && activeFixture.earlyDepartures.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-rose-950/20 border border-rose-500/30 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-rose-500/20">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Departed Players ({activeFixture.earlyDepartures.length})
              </h4>
            </div>
            <span className="text-[10px] text-rose-300 font-mono">
              Minutes Frozen at Exit
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {activeFixture.earlyDepartures.map((dep) => (
              <div
                key={dep.playerId}
                className="p-3 rounded-xl bg-slate-950/80 border border-rose-500/30 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>{dep.playerName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 uppercase">
                      {dep.reason}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Exit: Period {dep.period} ({dep.matchMinute}') • {dep.replacedByPlayerName ? `Replaced by ${dep.replacedByPlayerName}` : 'No cover'}
                  </div>
                </div>

                <div className="text-right font-mono text-xs font-bold text-emerald-400 shrink-0">
                  {dep.proRatedMinutes}m credited
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Mid-Match Emergency Departure & Rebalancer */}
      <EmergencyDepartureModal
        isOpen={Boolean(emergencyDepartureSubPlayer)}
        player={emergencyDepartureSubPlayer}
        currentLocation="bench"
        currentPeriod={activePeriod}
        onClose={() => setEmergencyDepartureSubPlayer(null)}
      />

      {/* Modal: Mark Sub as Sick / Call-Off (Remove without replacement OR replace from rested roster) */}
      <PlayerCallOffModal
        player={replacingSubPlayer}
        onClose={() => setReplacingSubPlayer(null)}
        currentLocation="bench"
      />
    </div>
  );
};
