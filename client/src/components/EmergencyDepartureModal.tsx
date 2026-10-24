import React, { useState, useMemo, useEffect } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import { useToast } from '../context/ToastContext';
import { Player, BroadPosition } from '../types';
import {
  X,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Check,
  Activity,
  HeartPulse,
} from 'lucide-react';
import { KitJerseyIcon } from '../design-system';
import { getPlayerInitials } from '../utils/playerUtils';

interface EmergencyDepartureModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  currentLocation: 'pitch' | 'bench';
  currentPosition?: string;
  currentPeriod?: number;
}

export const EmergencyDepartureModal: React.FC<EmergencyDepartureModalProps> = ({
  isOpen,
  onClose,
  player,
  currentLocation,
  currentPosition,
  currentPeriod: propPeriod,
}) => {
  const {
    activeFixture,
    activePeriod: contextPeriod,
    settings,
    players,
    stats,
    handleEarlyDeparture,
  } = useMatchday();

  const { showToast } = useToast();

  const activePeriod = propPeriod || contextPeriod || 1;
  const periodDuration = activeFixture?.periodDurationMinutes || settings.periodDurationMinutes || 25;
  const effectivePeriodCount = activeFixture?.matchPeriodCount || settings.matchPeriodCount || 2;

  // Derive current match stopwatch elapsed time if available
  const activePeriodTimer = activeFixture?.liveMatchState?.periodTimers?.[activePeriod];
  const liveElapsedSeconds = activePeriodTimer
    ? activePeriodTimer.isRunning && activePeriodTimer.startedAt
      ? activePeriodTimer.elapsedSeconds +
        Math.max(0, Math.floor((Date.now() - new Date(activePeriodTimer.startedAt).getTime()) / 1000))
      : activePeriodTimer.elapsedSeconds || 0
    : activeFixture?.liveMatchState?.elapsedSeconds || 0;

  const liveElapsedMinutes = Math.min(periodDuration, Math.max(1, Math.floor(liveElapsedSeconds / 60) || 1));

  const [exitMinuteInPeriod, setExitMinuteInPeriod] = useState<number>(liveElapsedMinutes);
  const [reason, setReason] = useState<'injured' | 'unwell' | 'left_early'>('injured');
  const [selectedReplacementId, setSelectedReplacementId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync default exit minute when modal opens
  useEffect(() => {
    if (isOpen) {
      setExitMinuteInPeriod(liveElapsedMinutes);
    }
  }, [isOpen, liveElapsedMinutes]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const statsMap = useMemo(() => new Map(stats.map((s) => [s.playerId, s])), [stats]);

  const currentLineup = useMemo(() => {
    return activeFixture?.matchSquad?.lineupsByPeriod.find((l) => l.period === activePeriod) || null;
  }, [activeFixture?.matchSquad?.lineupsByPeriod, activePeriod]);

  // Available bench substitutes for current period (excluding the departing player)
  const benchSubstitutes = useMemo(() => {
    if (!currentLineup) return [];
    return currentLineup.subs
      .filter((subId) => subId !== player?.id)
      .map((subId) => playerMap.get(subId))
      .filter((p): p is Player => Boolean(p));
  }, [currentLineup, player, playerMap]);

  // Auto-select first bench sub if available and none selected yet
  useEffect(() => {
    if (currentLocation === 'pitch' && benchSubstitutes.length > 0 && !selectedReplacementId) {
      // Prioritize bench sub with the lowest minutes played so far
      const sortedSubs = [...benchSubstitutes].sort((a, b) => {
        const aMins = statsMap.get(a.id)?.minutesPlayed || 0;
        const bMins = statsMap.get(b.id)?.minutesPlayed || 0;
        return aMins - bMins;
      });
      setSelectedReplacementId(sortedSubs[0].id);
    }
  }, [currentLocation, benchSubstitutes, selectedReplacementId, statsMap]);

  if (!isOpen || !player || !activeFixture || !activeFixture.matchSquad) return null;

  const isPitchPlayer = currentLocation === 'pitch';

  // Calculate projected pro-rated minutes for departing player
  const priorCompletedPeriods = (activeFixture.matchSquad.lineupsByPeriod || []).filter(
    (l) => l.period < activePeriod && l.onPitch.some((op) => op.playerId === player.id)
  ).length;
  const priorMinutes = priorCompletedPeriods * periodDuration;
  const proRatedMinutes = isPitchPlayer ? priorMinutes + exitMinuteInPeriod : priorMinutes;
  const cumulativeMatchMinute = (activePeriod - 1) * periodDuration + (isPitchPlayer ? exitMinuteInPeriod : 0);

  const totalMatchMinutes = effectivePeriodCount * periodDuration;
  const projectedGameTimePercent =
    totalMatchMinutes > 0 ? Math.round((proRatedMinutes / totalMatchMinutes) * 100) : 0;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      const res = await handleEarlyDeparture(
        player.id,
        activePeriod,
        isPitchPlayer ? selectedReplacementId || undefined : undefined,
        reason,
        exitMinuteInPeriod,
        cumulativeMatchMinute
      );

      if (res.success) {
        const replacementName = selectedReplacementId
          ? playerMap.get(selectedReplacementId)?.name
          : undefined;

        if (replacementName) {
          showToast(
            `🚑 ${player.name} marked ${reason}. Replaced by ${replacementName} and remaining periods rebalanced!`,
            'success'
          );
        } else {
          showToast(
            `🚑 ${player.name} marked ${reason}. Remaining periods rebalanced across active squad!`,
            'success'
          );
        }
        onClose();
      } else {
        showToast('Failed to rebalance remaining periods. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Error in emergency departure:', err);
      showToast('An error occurred during emergency rebalance.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto print:hidden">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
              <HeartPulse className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
                  Mid-Match Injury / Early Departure
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Touchline emergency sub & automatic Fair Play rebalancer
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Departing Player Banner */}
        <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              {player.squadNumber ? (
                <KitJerseyIcon
                  number={player.squadNumber}
                  isGk={player.preferredPositions.includes('Goalkeeper')}
                  size={36}
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-slate-800 text-white font-black text-xs flex items-center justify-center border border-slate-700">
                  {getPlayerInitials(player.name)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-white text-sm truncate">{player.name}</div>
              <div className="text-[11px] text-rose-300 font-medium">
                {isPitchPlayer ? (
                  <span>
                    Currently On Pitch • Position: <strong>{currentPosition || 'Outfield'}</strong>
                  </span>
                ) : (
                  <span>Currently On Subs Bench</span>
                )}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0 uppercase tracking-wider">
            Departing
          </span>
        </div>

        {/* Reason Selector */}
        <div className="space-y-1.5 text-xs">
          <label className="text-slate-300 font-semibold block text-[11px]">
            Departure Reason:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'injured', label: '🚑 Injured', desc: 'Injury / Knock' },
              { id: 'unwell', label: '🤒 Unwell', desc: 'Illness / Sickness' },
              { id: 'left_early', label: '🚗 Left Early', desc: 'Prior Commitment' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setReason(opt.id as any)}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  reason === opt.id
                    ? 'bg-rose-500/20 border-rose-500 text-white shadow-md shadow-rose-950/40'
                    : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="font-bold text-xs">{opt.label}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Departure Time & Pro-Rated Minutes Freeze */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Exact Minute of Departure:</span>
            </span>
            <span className="text-[11px] font-mono text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              Period {activePeriod} of {effectivePeriodCount}
            </span>
          </div>

          {isPitchPlayer ? (
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max={periodDuration}
                    value={exitMinuteInPeriod}
                    onChange={(e) => setExitMinuteInPeriod(parseInt(e.target.value, 10) || 1)}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                  <span className="font-mono font-bold text-sm text-white w-10 text-right">
                    {exitMinuteInPeriod}'
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Start (1')</span>
                  <span>Mid-period ({Math.round(periodDuration / 2)}')</span>
                  <span>End ({periodDuration}')</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">
              Player was on the bench during Period {activePeriod} (0 mins played in current period).
            </p>
          )}

          {/* Frozen Credit Summary Banner */}
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Frozen Match Credit:</span>
            <span className="font-mono text-emerald-400 font-bold">
              {proRatedMinutes} mins ({projectedGameTimePercent}% match time)
            </span>
          </div>
        </div>

        {/* Pitch Player Replacement Prompt */}
        {isPitchPlayer && (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4 text-sky-400" />
                <span>Select Immediate Bench Substitute:</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {benchSubstitutes.length} on bench
              </span>
            </div>

            {benchSubstitutes.length === 0 ? (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                ⚠️ Bench is empty for Period {activePeriod}. Team will play with 1 fewer player for the remainder of this period. Remaining periods will rebalance across available squad.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {benchSubstitutes.map((sub) => {
                  const subStats = statsMap.get(sub.id);
                  const isSelected = selectedReplacementId === sub.id;

                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSelectedReplacementId(sub.id)}
                      className={`w-full p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-sky-500/20 border-sky-400 text-white shadow-md shadow-sky-950/40'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 font-bold flex items-center justify-center text-xs border border-slate-700 shrink-0">
                          {sub.squadNumber ? `#${sub.squadNumber}` : getPlayerInitials(sub.name)}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate flex items-center gap-1.5">
                            <span>{sub.name}</span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {sub.preferredPositions.join(', ')}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 font-mono text-[11px]">
                        <span className="text-slate-300">{subStats?.minutesPlayed || 0}m</span>
                        <span className="text-slate-500"> / </span>
                        <span
                          className={`font-bold ${
                            subStats?.meetsTarget ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {subStats?.gameTimePercent || 0}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Dynamic Rebalance Guarantee Notice */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-sky-950/30 to-slate-950 border border-indigo-500/25 space-y-1.5 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Automatic Touchline Rebalance Guarantee</span>
          </div>
          <ul className="space-y-1 text-slate-400 pl-1 list-disc list-inside">
            <li>
              <strong className="text-slate-200">{player.name}</strong> locked out of all subsequent periods.
            </li>
            <li>
              Remaining periods redistributed fairly, prioritising bench players with lowest pitch time.
            </li>
            <li>
              Protects FA 50%+ rule for all healthy squad members.
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || (isPitchPlayer && benchSubstitutes.length > 0 && !selectedReplacementId)}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-lg shadow-rose-950/50"
          >
            {isSubmitting ? (
              <span>Rebalancing...</span>
            ) : (
              <>
                <HeartPulse className="w-4 h-4" />
                <span>Confirm Departure & Rebalance</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
