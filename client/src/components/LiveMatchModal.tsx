import React, { useState, useEffect, useRef } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  ArrowRightLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Shirt,
  Sun,
  Moon,
  Sparkles,
  Users,
  ChevronRight,
  ShieldCheck,
  HeartPulse,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  SingleSubChange,
  LiveMatchPeriodTimer,
  LiveMatchState,
  Player,
  PlannedInGameSub,
} from '../types';
import { ScoreScorersModal } from './ScoreScorersModal';
import { EmergencyDepartureModal } from './EmergencyDepartureModal';
import { trackLiveMatchStarted, trackLiveSubstitution } from '../utils/analytics';

interface LiveMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Synthetic referee whistle via Web Audio API (Zero external assets, works 100% offline)
const playRefWhistle = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Pulse 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(2400, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(2850, ctx.currentTime + 0.18);
    gain1.gain.setValueAtTime(0.35, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.28);

    // Pulse 2 (Double blast)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(2600, ctx.currentTime + 0.35);
    osc2.frequency.exponentialRampToValueAtTime(3100, ctx.currentTime + 0.52);
    gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.35);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.35);
    osc2.stop(ctx.currentTime + 0.65);
  } catch (err) {
    console.warn('Web Audio whistle failed:', err);
  }
};

export const LiveMatchModal: React.FC<LiveMatchModalProps> = ({ isOpen, onClose }) => {
  const {
    activeFixture,
    activePeriod,
    setActivePeriod,
    settings,
    players,
    getSuggestedSubs,
    updateFixtureScore,
    updateLiveMatchState,
    updateMatchSquad,
    executeLiveSubstitution,
    activeTeam,
  } = useMatchday();

  // Active period timer derived deterministically from activeFixture's liveMatchState
  const activePeriodTimer: LiveMatchPeriodTimer =
    activeFixture?.liveMatchState?.periodTimers?.[activePeriod] || {
      elapsedSeconds:
        activeFixture?.liveMatchState?.currentPeriod === activePeriod
          ? activeFixture.liveMatchState.elapsedSeconds || 0
          : 0,
      isRunning:
        activeFixture?.liveMatchState?.currentPeriod === activePeriod
          ? Boolean(activeFixture.liveMatchState.isRunning)
          : false,
      startedAt:
        activeFixture?.liveMatchState?.currentPeriod === activePeriod
          ? activeFixture.liveMatchState.startedAt
          : undefined,
    };

  const isRunning = Boolean(activePeriodTimer.isRunning);
  const basePeriodDurationSeconds =
    (activeFixture?.periodDurationMinutes || settings.periodDurationMinutes || 25) * 60;
  const stoppageSeconds = activePeriodTimer.stoppageSeconds || 0;
  const periodDurationSeconds = basePeriodDurationSeconds + stoppageSeconds;

  // Re-render tick every second while timer is running so elapsedSeconds advances smoothly
  const [, setTicker] = useState<number>(0);
  useEffect(() => {
    if (!isOpen || !isRunning) return;
    const interval = setInterval(() => {
      setTicker((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isRunning]);

  // Derive current elapsed seconds (clamped to periodDurationSeconds to prevent runaway clocks)
  const rawElapsedSeconds =
    isRunning && activePeriodTimer.startedAt
      ? (activePeriodTimer.elapsedSeconds || 0) +
        Math.max(
          0,
          Math.floor((Date.now() - new Date(activePeriodTimer.startedAt).getTime()) / 1000)
        )
      : activePeriodTimer.elapsedSeconds || 0;
  const elapsedSeconds = Math.min(periodDurationSeconds, rawElapsedSeconds);
  const isPeriodComplete = elapsedSeconds >= periodDurationSeconds;

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [suggestedChanges, setSuggestedChanges] = useState<SingleSubChange[]>([]);
  const [showAddScheduledSub, setShowAddScheduledSub] = useState<boolean>(false);
  const [schedTargetMin, setSchedTargetMin] = useState<number>(10);
  const [schedOffId, setSchedOffId] = useState<string>('');
  const [schedOnId, setSchedOnId] = useState<string>('');
  const [selectedOffId, setSelectedOffId] = useState<string>('');
  const [selectedOnId, setSelectedOnId] = useState<string>('');
  const [isScoreModalOpen, setIsScoreModalOpen] = useState<boolean>(false);
  const [emergencyModalPlayer, setEmergencyModalPlayer] = useState<{
    player: Player;
    position?: string;
  } | null>(null);
  const whistlePlayedWindow = useRef<number>(-1);
  const plannedWhistlesPlayed = useRef<Set<string>>(new Set());
  const periodEndWhistlePlayed = useRef<Set<string>>(new Set());

  const subLog = activeFixture?.liveMatchState?.subLog || [];

  const homeScore = typeof activeFixture?.homeScore === 'number' ? activeFixture.homeScore : 0;
  const awayScore = typeof activeFixture?.awayScore === 'number' ? activeFixture.awayScore : 0;
  const liveScorers = activeFixture?.scorers || [];
  const ourTeamName = activeTeam?.name || 'Our Team';
  const isOurTeamHome = activeFixture?.venue !== 'Away';

  const handleLiveScoreChange = async (team: 'home' | 'away', delta: number) => {
    if (!activeFixture) return;
    const newHome = team === 'home' ? Math.max(0, homeScore + delta) : homeScore;
    const newAway = team === 'away' ? Math.max(0, awayScore + delta) : awayScore;

    await updateFixtureScore(activeFixture.id, {
      homeScore: newHome,
      awayScore: newAway,
      scorers: liveScorers,
      status: 'In Progress',
      isLive: true,
    });
  };

  const intervalSeconds = (settings.defaultSubIntervalMinutes || 10) * 60;

  // Auto-stop period timer when it reaches periodDurationSeconds (and clamp stale runaway clocks)
  useEffect(() => {
    if (!isOpen || !activeFixture || !isRunning || rawElapsedSeconds < periodDurationSeconds) {
      return;
    }

    const endKey = `${activeFixture.id}_p${activePeriod}_${periodDurationSeconds}`;
    // Sound end-of-period whistle if timer reached duration live (within 10s of threshold)
    if (
      soundEnabled &&
      rawElapsedSeconds - periodDurationSeconds <= 10 &&
      !periodEndWhistlePlayed.current.has(endKey)
    ) {
      periodEndWhistlePlayed.current.add(endKey);
      playRefWhistle();
    }

    const stoppedPeriodTimer: LiveMatchPeriodTimer = {
      isRunning: false,
      startedAt: undefined,
      elapsedSeconds: periodDurationSeconds,
      stoppageSeconds: activePeriodTimer.stoppageSeconds,
    };

    const prevTimers = activeFixture.liveMatchState?.periodTimers || {};
    const updatedLiveState: LiveMatchState = {
      isRunning: false,
      currentPeriod: activePeriod,
      startedAt: undefined,
      elapsedSeconds: periodDurationSeconds,
      periodTimers: {
        ...prevTimers,
        [activePeriod]: stoppedPeriodTimer,
      },
      subLog: activeFixture.liveMatchState?.subLog || [],
    };

    updateLiveMatchState(activeFixture.id, updatedLiveState, undefined, true);
  }, [
    isOpen,
    activeFixture,
    isRunning,
    rawElapsedSeconds,
    periodDurationSeconds,
    activePeriod,
    activePeriodTimer.stoppageSeconds,
    soundEnabled,
    updateLiveMatchState,
  ]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load suggested substitutions when fixture changes
  useEffect(() => {
    if (!isOpen || !activeFixture) return;
    let isCurrent = true;
    getSuggestedSubs(activeFixture.id, settings.defaultSubIntervalMinutes || 10).then(
      (plans) => {
        if (isCurrent && plans.length > 0 && plans[0].windows.length > 0) {
          setSuggestedChanges(plans[0].windows[0].subChanges);
        }
      }
    );
    return () => {
      isCurrent = false;
    };
  }, [isOpen, activeFixture, getSuggestedSubs, settings.defaultSubIntervalMinutes]);

  // Automatic whistle alert when substitution interval reached
  useEffect(() => {
    if (
      soundEnabled &&
      isRunning &&
      elapsedSeconds > 0 &&
      elapsedSeconds % intervalSeconds === 0
    ) {
      const currentWindow = Math.floor(elapsedSeconds / intervalSeconds);
      if (whistlePlayedWindow.current !== currentWindow) {
        whistlePlayedWindow.current = currentWindow;
        playRefWhistle();
      }
    }
  }, [elapsedSeconds, isRunning, intervalSeconds, soundEnabled]);

  // Automatic whistle alert when a scheduled mid-game rolling substitution is due
  useEffect(() => {
    if (!soundEnabled || !isRunning || !activeFixture?.matchSquad?.plannedInGameSubs) return;
    const currentMins = Math.floor(elapsedSeconds / 60);
    const restedSet = new Set(activeFixture.matchSquad.restedPlayerIds || []);
    const selectedSet = new Set(activeFixture.matchSquad.selectedPlayerIds || []);
    const periodLineup = activeFixture.matchSquad.lineupsByPeriod?.find(
      (l) => l.period === activePeriod
    );
    const pitchIds = new Set((periodLineup?.onPitch || []).map((op) => op.playerId));
    const benchIds = new Set(periodLineup?.subs || []);

    activeFixture.matchSquad.plannedInGameSubs.forEach((s) => {
      if (
        s.period === activePeriod &&
        currentMins >= Math.floor(s.targetMinute) &&
        !restedSet.has(s.playerOutId) &&
        !restedSet.has(s.playerInId) &&
        (selectedSet.size === 0 ||
          (selectedSet.has(s.playerOutId) && selectedSet.has(s.playerInId))) &&
        pitchIds.has(s.playerOutId) &&
        benchIds.has(s.playerInId)
      ) {
        const key = `${s.period}_${s.playerInId}_${s.targetMinute}`;
        if (!plannedWhistlesPlayed.current.has(key)) {
          plannedWhistlesPlayed.current.add(key);
          playRefWhistle();
        }
      }
    });
  }, [elapsedSeconds, isRunning, activePeriod, activeFixture, soundEnabled]);

  if (!isOpen || !activeFixture) return null;

  const currentLineup = activeFixture.matchSquad?.lineupsByPeriod?.find(
    (l) => l.period === activePeriod
  );
  const playerMap = new Map(players.map((p) => [p.id, p]));

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Time to next substitution
  const secondsIntoCurrentInterval = elapsedSeconds % intervalSeconds;
  const secondsUntilNextSub =
    intervalSeconds - (secondsIntoCurrentInterval === 0 && elapsedSeconds > 0 ? 0 : secondsIntoCurrentInterval);
  const subMinutes = Math.floor(secondsUntilNextSub / 60);
  const subSecs = secondsUntilNextSub % 60;
  const formattedSubCountdown = `${String(subMinutes).padStart(2, '0')}:${String(subSecs).padStart(2, '0')}`;
  const subProgressPercent = Math.min(100, Math.round((secondsIntoCurrentInterval / intervalSeconds) * 100));

  const handleToggleTimer = async () => {
    if (!activeFixture) return;
    const isNowRunning = !isRunning;
    const nowIso = new Date().toISOString();

    let newElapsed = activePeriodTimer.elapsedSeconds || 0;
    let startedAt: string | undefined = undefined;

    if (isNowRunning) {
      trackLiveMatchStarted({
        fixtureId: activeFixture.id,
        opponent: activeFixture.opponent,
        venue: activeFixture.venue,
        periodCount: activeFixture.matchPeriodCount || settings.matchPeriodCount,
      });
      startedAt = nowIso;
    } else {
      // Pausing: accumulate running time from current segment
      if (activePeriodTimer.startedAt) {
        const additional = Math.max(
          0,
          Math.floor((Date.now() - new Date(activePeriodTimer.startedAt).getTime()) / 1000)
        );
        newElapsed += additional;
      }
    }

    const updatedPeriodTimer: LiveMatchPeriodTimer = {
      isRunning: isNowRunning,
      startedAt,
      elapsedSeconds: Math.min(periodDurationSeconds, newElapsed),
      stoppageSeconds: activePeriodTimer.stoppageSeconds,
    };

    const prevTimers = activeFixture.liveMatchState?.periodTimers || {};
    const updatedTimers = {
      ...prevTimers,
      [activePeriod]: updatedPeriodTimer,
    };

    const updatedLiveState: LiveMatchState = {
      isRunning: isNowRunning,
      currentPeriod: activePeriod,
      startedAt,
      elapsedSeconds: updatedPeriodTimer.elapsedSeconds,
      periodTimers: updatedTimers,
      subLog: activeFixture.liveMatchState?.subLog || [],
    };

    await updateLiveMatchState(activeFixture.id, updatedLiveState);
  };

  const handleAddStoppageTime = async (extraMinutes: number) => {
    if (!activeFixture) return;
    const nowIso = new Date().toISOString();
    const newStoppageSeconds = (activePeriodTimer.stoppageSeconds || 0) + extraMinutes * 60;
    const updatedPeriodTimer: LiveMatchPeriodTimer = {
      isRunning: true,
      startedAt: nowIso,
      elapsedSeconds,
      stoppageSeconds: newStoppageSeconds,
    };

    const prevTimers = activeFixture.liveMatchState?.periodTimers || {};
    const updatedLiveState: LiveMatchState = {
      isRunning: true,
      currentPeriod: activePeriod,
      startedAt: nowIso,
      elapsedSeconds,
      periodTimers: {
        ...prevTimers,
        [activePeriod]: updatedPeriodTimer,
      },
      subLog: activeFixture.liveMatchState?.subLog || [],
    };

    await updateLiveMatchState(activeFixture.id, updatedLiveState);
  };

  const handleCompleteMatch = async () => {
    if (!activeFixture) return;
    await updateFixtureScore(activeFixture.id, {
      homeScore,
      awayScore,
      scorers: liveScorers,
      status: 'Completed',
      isLive: false,
    });
    onClose();
  };

  const handleResetTimer = async () => {
    if (!activeFixture) return;
    const updatedPeriodTimer: LiveMatchPeriodTimer = {
      isRunning: false,
      startedAt: undefined,
      elapsedSeconds: 0,
      stoppageSeconds: 0,
    };

    const prevTimers = activeFixture.liveMatchState?.periodTimers || {};
    const updatedTimers = {
      ...prevTimers,
      [activePeriod]: updatedPeriodTimer,
    };

    const updatedLiveState: LiveMatchState = {
      isRunning: false,
      currentPeriod: activePeriod,
      startedAt: undefined,
      elapsedSeconds: 0,
      periodTimers: updatedTimers,
      subLog: activeFixture.liveMatchState?.subLog || [],
    };

    whistlePlayedWindow.current = -1;
    plannedWhistlesPlayed.current.clear();
    await updateLiveMatchState(activeFixture.id, updatedLiveState);
  };

  const handleSelectPeriod = async (p: number) => {
    setActivePeriod(p);
    if (!activeFixture) return;

    const prevTimers = activeFixture.liveMatchState?.periodTimers || {};
    const targetTimer: LiveMatchPeriodTimer = prevTimers[p] || {
      isRunning: false,
      startedAt: undefined,
      elapsedSeconds: 0,
    };

    const updatedLiveState: LiveMatchState = {
      isRunning: targetTimer.isRunning,
      currentPeriod: p,
      startedAt: targetTimer.startedAt,
      elapsedSeconds: targetTimer.elapsedSeconds,
      periodTimers: {
        ...prevTimers,
        [p]: targetTimer,
      },
      subLog: activeFixture.liveMatchState?.subLog || [],
    };

    whistlePlayedWindow.current = -1;
    plannedWhistlesPlayed.current.clear();
    await updateLiveMatchState(activeFixture.id, updatedLiveState);
  };

  const handleExecuteQuickSub = async (offId: string, onId: string, targetPos?: string) => {
    const periodDuration = activeFixture?.periodDurationMinutes || settings.periodDurationMinutes || 25;
    const matchMinute = ((activePeriod - 1) * periodDuration) + Math.floor(elapsedSeconds / 60);

    trackLiveSubstitution({
      fixtureId: activeFixture?.id,
      period: activePeriod,
      isEmergency: false,
      reason: 'tactical',
      matchMinute,
    });

    await executeLiveSubstitution(offId, onId, targetPos);
    if (soundEnabled) {
      playRefWhistle();
    }
  };

  const currentOnPitch = (currentLineup?.onPitch || []).map((op) => ({
    ...op,
    player: playerMap.get(op.playerId),
  }));

  const currentSubs = (currentLineup?.subs || []).map((subId) => playerMap.get(subId)).filter(Boolean);

  const restedIdsSet = new Set(activeFixture.matchSquad?.restedPlayerIds || []);
  const selectedIdsSet = new Set(activeFixture.matchSquad?.selectedPlayerIds || []);
  const currentPitchIdsSet = new Set((currentLineup?.onPitch || []).map((op) => op.playerId));
  const currentBenchIdsSet = new Set(currentLineup?.subs || []);

  const validSuggestedChanges = suggestedChanges.filter(
    (sc) =>
      !restedIdsSet.has(sc.offPlayerId) &&
      !restedIdsSet.has(sc.onPlayerId) &&
      currentPitchIdsSet.has(sc.offPlayerId) &&
      currentBenchIdsSet.has(sc.onPlayerId)
  );

  const rawPeriodPlannedSubs = (activeFixture.matchSquad?.plannedInGameSubs || [])
    .filter(
      (s) =>
        s.period === activePeriod &&
        !restedIdsSet.has(s.playerOutId) &&
        !restedIdsSet.has(s.playerInId) &&
        (selectedIdsSet.size === 0 ||
          (selectedIdsSet.has(s.playerOutId) && selectedIdsSet.has(s.playerInId))) &&
        (currentPitchIdsSet.has(s.playerOutId) || currentBenchIdsSet.has(s.playerOutId)) &&
        (currentPitchIdsSet.has(s.playerInId) || currentBenchIdsSet.has(s.playerInId)) &&
        !subLog.some(
          (log) =>
            log.period === activePeriod &&
            log.offPlayerId === s.playerOutId &&
            log.onPlayerId === s.playerInId
        )
    )
    .sort((a, b) => a.targetMinute - b.targetMinute);

  const unexecutedPlannedSubs = (() => {
    const simPitch = new Set(currentPitchIdsSet);
    const simBench = new Set(currentBenchIdsSet);
    const valid: (PlannedInGameSub & { canExecuteNow: boolean })[] = [];

    for (const s of rawPeriodPlannedSubs) {
      if (simPitch.has(s.playerOutId) && simBench.has(s.playerInId)) {
        const canExecuteNow =
          currentPitchIdsSet.has(s.playerOutId) && currentBenchIdsSet.has(s.playerInId);
        valid.push({ ...s, canExecuteNow });
        simPitch.delete(s.playerOutId);
        simBench.add(s.playerOutId);
        simBench.delete(s.playerInId);
        simPitch.add(s.playerInId);
      }
    }
    return valid;
  })();

  const periodDurationMins =
    activeFixture?.periodDurationMinutes || settings.periodDurationMinutes || 25;

  const handleAddLiveScheduledSub = async () => {
    if (!activeFixture?.matchSquad || !schedOffId || !schedOnId || schedOffId === schedOnId) {
      return;
    }
    const offPl = playerMap.get(schedOffId);
    const onPl = playerMap.get(schedOnId);
    const pitchEntry = currentLineup?.onPitch.find((op) => op.playerId === schedOffId);
    const pos =
      pitchEntry?.position || onPl?.preferredPositions?.[0]?.slice(0, 3).toUpperCase() || 'MID';
    const clampedMin = Math.max(1, Math.min(periodDurationMins - 1, schedTargetMin));
    const matchMinute = (activePeriod - 1) * periodDurationMins + clampedMin;

    const newSub: PlannedInGameSub = {
      period: activePeriod,
      targetMinute: clampedMin,
      matchMinute,
      playerOutId: schedOffId,
      playerOutName: offPl?.name || 'Player',
      playerInId: schedOnId,
      playerInName: onPl?.name || 'Player',
      position: pos,
      reason: 'Scheduled during Live Match',
    };

    const existingSubs = (activeFixture.matchSquad.plannedInGameSubs || []).filter(
      (s) => !restedIdsSet.has(s.playerOutId) && !restedIdsSet.has(s.playerInId)
    );
    const updatedPlanned = [...existingSubs, newSub].sort(
      (a, b) => a.period - b.period || a.targetMinute - b.targetMinute
    );

    await updateMatchSquad({
      ...activeFixture.matchSquad,
      manualOverrides: true,
      plannedInGameSubs: updatedPlanned,
    });

    setSchedOffId('');
    setSchedOnId('');
    setShowAddScheduledSub(false);
  };

  const handleRemoveLiveScheduledSub = async (targetSub: PlannedInGameSub) => {
    if (!activeFixture?.matchSquad) return;
    const existingSubs = activeFixture.matchSquad.plannedInGameSubs || [];
    const updatedPlanned = existingSubs.filter(
      (s) =>
        !(
          s.period === targetSub.period &&
          s.targetMinute === targetSub.targetMinute &&
          s.playerOutId === targetSub.playerOutId &&
          s.playerInId === targetSub.playerInId
        )
    );

    await updateMatchSquad({
      ...activeFixture.matchSquad,
      manualOverrides: true,
      plannedInGameSubs: updatedPlanned.length > 0 ? updatedPlanned : undefined,
    });
  };

  const effectivePeriodCount = activeFixture?.matchPeriodCount || settings.matchPeriodCount || 2;

  const periodDisplayName =
    effectivePeriodCount === 2
      ? activePeriod === 1
        ? 'First Half (Period 1)'
        : 'Second Half (Period 2)'
      : `Period ${activePeriod} of ${effectivePeriodCount}`;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 py-6 sm:py-8 backdrop-blur-md overflow-y-auto animate-fade-in ${
        highContrast ? 'bg-black text-white' : 'bg-slate-950/90 text-white'
      }`}
    >
      <div
        className={`relative w-full max-w-4xl rounded-3xl border shadow-2xl p-5 sm:p-7 space-y-6 flex flex-col my-auto ${
          highContrast
            ? 'bg-zinc-950 border-yellow-400 text-white shadow-yellow-500/10'
            : 'bg-slate-900 border-slate-800'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-3 w-3 relative shrink-0">
              {isRunning && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  isRunning ? 'bg-emerald-500' : 'bg-slate-500'
                }`}
              />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  ⚡ Sideline Live Match & Sub Buzzer
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30 font-mono">
                  vs {activeFixture.opponent}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate sm:whitespace-normal">
                Outdoor pitch timer with automatic audio whistle substitution alerts and 1-tap sideline rotation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Outdoor Sunlight High Contrast Toggle */}
            <button
              type="button"
              onClick={() => setHighContrast(!highContrast)}
              className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                highContrast
                  ? 'bg-yellow-400 text-black border-yellow-300 font-bold'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
              title="Toggle outdoor pitch high-contrast mode for bright sunlight"
            >
              {highContrast ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="hidden sm:inline">{highContrast ? 'Sunlight Mode' : 'Normal'}</span>
            </button>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playRefWhistle();
              }}
              aria-label="Toggle referee whistle audio alert"
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl border text-xs font-semibold gap-1.5 transition cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="Toggle referee whistle audio alert"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close live match"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              title="Close live match (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Match Scoreboard Strip */}
        <div
          className={`p-4 rounded-3xl border flex items-center justify-between gap-4 flex-wrap shadow-xl ${
            highContrast ? 'bg-black border-yellow-400' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚽</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                  Live Match Score
                </span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 animate-pulse">
                  IN PROGRESS
                </span>
              </div>
              <div className="flex items-center gap-2.5 mt-1">
                <span className="text-sm font-bold text-white truncate max-w-[120px] sm:max-w-[180px]">
                  {isOurTeamHome ? ourTeamName : activeFixture.opponent}
                </span>
                <span className="text-2xl font-mono font-black text-amber-400 bg-slate-950 px-3 py-0.5 rounded-xl border border-slate-800">
                  {homeScore} - {awayScore}
                </span>
                <span className="text-sm font-bold text-white truncate max-w-[120px] sm:max-w-[180px]">
                  {isOurTeamHome ? activeFixture.opponent : ourTeamName}
                </span>
              </div>
            </div>
          </div>

          {/* Steppers & Scorers Action */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold px-1.5">Home:</span>
              <button
                type="button"
                onClick={() => handleLiveScoreChange('home', -1)}
                aria-label="Decrease home score live"
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center cursor-pointer"
              >
                -
              </button>
              <span className="w-5 text-center font-mono font-bold text-xs text-white">
                {homeScore}
              </span>
              <button
                type="button"
                onClick={() => handleLiveScoreChange('home', 1)}
                aria-label="Increase home score live"
                className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center cursor-pointer"
              >
                +
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold px-1.5">Away:</span>
              <button
                type="button"
                onClick={() => handleLiveScoreChange('away', -1)}
                aria-label="Decrease away score live"
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center cursor-pointer"
              >
                -
              </button>
              <span className="w-5 text-center font-mono font-bold text-xs text-white">
                {awayScore}
              </span>
              <button
                type="button"
                onClick={() => handleLiveScoreChange('away', 1)}
                aria-label="Increase away score live"
                className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center cursor-pointer"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsScoreModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>⚽</span>
              <span>Scorers ({liveScorers.length})</span>
            </button>
          </div>
        </div>

        {/* Second-Half Restart Prompt / Continuity Banner */}
        {activePeriod > 1 &&
          (activeFixture.preserveLineupAcrossBreaks ||
            activeFixture.subTimingMode === 'in_game_rolling' ||
            settings.preserveLineupAcrossBreaks ||
            settings.subTimingMode === 'in_game_rolling') && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-950/80 to-indigo-950/80 border border-sky-500/30 flex items-center justify-between gap-3 text-xs shadow-md">
              <div className="flex items-center gap-2.5">
                <span className="text-base">⚡</span>
                <div>
                  <span className="font-bold text-sky-200">
                    {effectivePeriodCount === 2
                      ? 'Starting Half 2 with the same lineup'
                      : `Starting Period ${activePeriod} with continuous lineup`}
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Active on-pitch players carry forward from previous half. Rolling substitutions take place mid-period.
                  </p>
                </div>
              </div>
              <div className="text-[11px] font-mono font-bold text-sky-400 bg-sky-950/90 px-2.5 py-1 rounded-xl border border-sky-800/60 shrink-0">
                Lineup Preserved
              </div>
            </div>
          )}

        {/* Big Match Clock & Next Sub Window */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pitchside Stopwatch Card */}
          <div
            className={`p-6 rounded-3xl border flex flex-col items-center justify-center space-y-4 shadow-xl ${
              highContrast
                ? 'bg-black border-yellow-400'
                : 'bg-gradient-to-b from-slate-950 to-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400">
                Match Stopwatch
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                {periodDisplayName}
              </span>
            </div>

            {/* Giant Outdoor Time Display */}
            <div
              className={`font-mono text-6xl sm:text-7xl font-black tracking-tight select-none ${
                highContrast
                  ? 'text-yellow-300'
                  : isRunning
                  ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.3)]'
                  : 'text-white'
              }`}
            >
              {formattedTime}
            </div>

            {/* Timer Controls */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isPeriodComplete && !isRunning}
                onClick={handleToggleTimer}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-wide transition shadow-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isRunning
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                    : isPeriodComplete
                    ? 'bg-slate-800 text-emerald-300 border border-emerald-500/40'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-5 h-5" />
                    <span>Pause Timer</span>
                  </>
                ) : isPeriodComplete ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Period Complete</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>Start Timer</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetTimer}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                title="Reset Match Stopwatch"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={playRefWhistle}
                className="px-3.5 py-3 rounded-2xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Test synthetic referee whistle"
              >
                <Volume2 className="w-4 h-4 text-indigo-400" />
                <span>Test Whistle</span>
              </button>
            </div>

            {/* Period End Action & Stoppage Time Banner */}
            {isPeriodComplete && !isRunning && (
              <div className="w-full p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5 text-xs animate-fade-in">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      {activePeriod < effectivePeriodCount
                        ? `${effectivePeriodCount === 2 ? `Half ${activePeriod}` : `Period ${activePeriod}`} Complete (${Math.floor(periodDurationSeconds / 60)}:00)`
                        : `Full Time Reached (${Math.floor(periodDurationSeconds / 60)}:00)`}
                    </span>
                  </span>
                  {stoppageSeconds > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200">
                      +{Math.round(stoppageSeconds / 60)}m stoppage played
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {activePeriod < effectivePeriodCount ? (
                    <button
                      type="button"
                      onClick={() => handleSelectPeriod(activePeriod + 1)}
                      className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>
                        Go to {effectivePeriodCount === 2 ? `Half ${activePeriod + 1}` : `Period ${activePeriod + 1}`}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCompleteMatch}
                      className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Complete Match</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleAddStoppageTime(1)}
                    className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 font-bold text-[11px] transition cursor-pointer"
                    title="Add 1 minute of injury/stoppage time and resume clock"
                  >
                    +1m Stoppage
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddStoppageTime(3)}
                    className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 font-bold text-[11px] transition cursor-pointer"
                    title="Add 3 minutes of injury/stoppage time and resume clock"
                  >
                    +3m Stoppage
                  </button>
                </div>
              </div>
            )}

            {/* Period Switcher */}
            <div className="flex items-center gap-2 pt-2 text-xs">
              {Array.from({ length: effectivePeriodCount }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSelectPeriod(p)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    activePeriod === p
                      ? 'bg-sky-600 text-white shadow'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  {effectivePeriodCount === 2
                    ? p === 1
                      ? 'Half 1'
                      : 'Half 2'
                    : `Period ${p}`}
                </button>
              ))}
            </div>
          </div>

          {/* Sub Countdown & Buzzer Alert Card */}
          <div
            className={`p-6 rounded-3xl border flex flex-col justify-between space-y-4 shadow-xl ${
              highContrast
                ? 'bg-black border-yellow-400'
                : 'bg-gradient-to-b from-slate-950 to-slate-900 border-slate-800'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Next Rotation Buzzer</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Every {settings.defaultSubIntervalMinutes || 10}m interval
                </span>
              </div>

              <div className="flex items-baseline gap-3 mt-4">
                <span
                  className={`font-mono text-5xl sm:text-6xl font-black ${
                    secondsUntilNextSub <= 30 && isRunning
                      ? 'text-rose-400 animate-pulse'
                      : 'text-amber-400'
                  }`}
                >
                  {formattedSubCountdown}
                </span>
                <span className="text-xs text-slate-400 font-semibold">remaining</span>
              </div>

              {/* Progress bar to next sub */}
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden mt-4 relative">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    secondsUntilNextSub <= 30
                      ? 'bg-rose-500'
                      : 'bg-gradient-to-r from-amber-500 to-emerald-400'
                  }`}
                  style={{ width: `${subProgressPercent}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  Automatic double referee whistle alert sounds when the countdown reaches 00:00!
                </span>
              </p>
            </div>

            {/* Quick Suggested Substitution Action */}
            {validSuggestedChanges.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block">
                  Upcoming Suggested Rotation:
                </span>
                {validSuggestedChanges.slice(0, 1).map((sc, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="font-semibold text-slate-200 break-words leading-tight" title={`OFF: ${sc.offPlayerName} ➡️ ON: ${sc.onPlayerName}`}>
                      <span className="text-rose-400">OFF:</span> {sc.offPlayerName} ➡️{' '}
                      <span className="text-emerald-400">ON:</span> {sc.onPlayerName}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExecuteQuickSub(sc.offPlayerId, sc.onPlayerId, sc.position)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition cursor-pointer shrink-0"
                    >
                      Execute Sub
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Scheduled Mid-Game Rolling Substitutions Cue */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/40 space-y-2.5 shadow-lg animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Scheduled Mid-Game Rolling Substitutions</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                {unexecutedPlannedSubs.length} Scheduled
              </span>
              <button
                type="button"
                onClick={() => setShowAddScheduledSub((prev) => !prev)}
                className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddScheduledSub ? 'Cancel' : 'Schedule Sub'}</span>
              </button>
            </div>
          </div>

          {showAddScheduledSub && (
            <div className="p-3 rounded-xl bg-slate-900/95 border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Minute in Period {activePeriod}
                </label>
                <input
                  type="number"
                  min={1}
                  max={periodDurationMins - 1}
                  value={schedTargetMin}
                  onChange={(e) => setSchedTargetMin(Number(e.target.value))}
                  className="w-full min-h-[36px] px-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-rose-300 uppercase mb-1">
                  Player OFF
                </label>
                <select
                  value={schedOffId}
                  onChange={(e) => setSchedOffId(e.target.value)}
                  className="w-full min-h-[36px] px-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                >
                  <option value="">Select OFF...</option>
                  {(currentLineup?.onPitch || [])
                    .filter((op) => !restedIdsSet.has(op.playerId))
                    .map((op) => {
                      const pl = playerMap.get(op.playerId);
                      return (
                        <option key={op.playerId} value={op.playerId}>
                          {pl?.name || 'Player'} ({op.position})
                        </option>
                      );
                    })}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-emerald-300 uppercase mb-1">
                  Player ON
                </label>
                <select
                  value={schedOnId}
                  onChange={(e) => setSchedOnId(e.target.value)}
                  className="w-full min-h-[36px] px-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                >
                  <option value="">Select ON...</option>
                  {(currentLineup?.subs || [])
                    .filter((id) => !restedIdsSet.has(id) && id !== schedOffId)
                    .map((id) => {
                      const pl = playerMap.get(id);
                      return (
                        <option key={id} value={id}>
                          {pl?.name || 'Sub'}
                        </option>
                      );
                    })}
                </select>
              </div>
              <button
                type="button"
                disabled={!schedOffId || !schedOnId || schedOffId === schedOnId}
                onClick={handleAddLiveScheduledSub}
                className="min-h-[36px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add to Schedule</span>
              </button>
            </div>
          )}

          {unexecutedPlannedSubs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {unexecutedPlannedSubs.map((ps, idx) => {
                const isDue = elapsedSeconds >= ps.targetMinute * 60;
                return (
                  <div
                    key={`${ps.period}-${ps.targetMinute}-${ps.playerOutId}-${ps.playerInId}-${idx}`}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs transition ${
                      isDue
                        ? 'bg-amber-500/25 border-amber-400 text-white shadow-md'
                        : 'bg-slate-900/90 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-400 font-mono">
                          ~Min {Math.round(ps.targetMinute)}
                        </span>
                        <span>{ps.position}</span>
                      </div>
                      <div className="text-[11px] text-slate-300 mt-1 truncate">
                        <span className="text-rose-400 font-semibold">OFF:</span>{' '}
                        {ps.playerOutName || playerMap.get(ps.playerOutId)?.name || 'Player'} ➔{' '}
                        <span className="text-emerald-400 font-semibold">ON:</span>{' '}
                        {ps.playerInName || playerMap.get(ps.playerInId)?.name || 'Player'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {ps.canExecuteNow ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleExecuteQuickSub(ps.playerOutId, ps.playerInId, ps.position)
                          }
                          className={`px-3 py-2 rounded-xl font-bold text-xs shadow-md transition cursor-pointer shrink-0 ${
                            isDue
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/30 ring-2 ring-amber-300 animate-pulse'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          Execute Sub
                        </button>
                      ) : (
                        <span className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-semibold text-slate-400">
                          Next Window
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveLiveScheduledSub(ps)}
                        aria-label="Remove scheduled substitution"
                        title="Remove scheduled substitution"
                        className="p-2 rounded-xl bg-slate-950/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-slate-300/90">
              No remaining scheduled subs for Period {activePeriod}. Click{' '}
              <strong className="text-amber-300">+ Schedule Sub</strong> above to queue a mid-game swap, or use{' '}
              <strong className="text-amber-300">Suggested Subs</strong> on the Pitch view to apply a multi-window schedule.
            </p>
          )}
        </div>

        {/* Sideline 1-Tap Substitution Controls */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-sky-400" />
              <span>1-Tap Live Sideline Substitution</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              Select pitch player & bench sub to swap instantly
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Outgoing Pitch Player */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1 text-[11px]">
                Player Coming Off Pitch
              </label>
              <select
                value={selectedOffId}
                onChange={(e) => setSelectedOffId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-500 font-medium"
              >
                <option value="">-- Select Outgoing Player --</option>
                {currentOnPitch.map((op) => (
                  <option key={op.playerId} value={op.playerId}>
                    {op.player?.squadNumber ? `#${op.player.squadNumber} ` : ''}
                    {op.player?.name} ({op.position})
                  </option>
                ))}
              </select>
            </div>

            {/* Incoming Bench Player */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1 text-[11px]">
                Substitute Coming On
              </label>
              <select
                value={selectedOnId}
                onChange={(e) => setSelectedOnId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="">-- Select Incoming Sub --</option>
                {currentSubs.map((sub) => sub && (
                  <option key={sub.id} value={sub.id}>
                    {sub.squadNumber ? `#${sub.squadNumber} ` : ''}
                    {sub.name} ({sub.preferredPositions.join(', ')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
            {selectedOffId ? (
              <button
                type="button"
                onClick={() => {
                  const targetOp = currentOnPitch.find((op) => op.playerId === selectedOffId);
                  if (targetOp?.player) {
                    setEmergencyModalPlayer({
                      player: targetOp.player,
                      position: targetOp.position,
                    });
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold text-xs shadow transition cursor-pointer flex items-center gap-1.5"
                title="Mark player injured or leaving early and rebalance remaining periods"
              >
                <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                <span>Injured / Left Early Rebalance</span>
              </button>
            ) : <div />}

            <button
              type="button"
              disabled={!selectedOffId || !selectedOnId}
              onClick={() => {
                const targetOp = currentOnPitch.find((op) => op.playerId === selectedOffId);
                handleExecuteQuickSub(selectedOffId, selectedOnId, targetOp?.position);
                setSelectedOffId('');
                setSelectedOnId('');
              }}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg transition cursor-pointer flex items-center gap-1.5 ml-auto"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Confirm Substitution Now</span>
            </button>
          </div>
        </div>

        {/* Live Sub Log Timeline */}
        {subLog.length > 0 && (
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 max-h-36 overflow-y-auto text-xs font-mono">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Match Sub Log:
            </span>
            {subLog.map((log, idx) => (
              <div key={idx} className="flex items-center gap-2 text-slate-300">
                <span className="text-amber-400 font-bold">[{log.time}]</span>
                <span>{log.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Emergency Departure Rebalance Modal */}
      <EmergencyDepartureModal
        isOpen={Boolean(emergencyModalPlayer)}
        player={emergencyModalPlayer ? emergencyModalPlayer.player : null}
        currentLocation="pitch"
        currentPosition={emergencyModalPlayer?.position}
        currentPeriod={activePeriod}
        onClose={() => setEmergencyModalPlayer(null)}
      />

      {/* Score & Scorers Modal */}
      <ScoreScorersModal
        fixture={activeFixture}
        isOpen={isScoreModalOpen}
        onClose={() => setIsScoreModalOpen(false)}
        defaultLiveMode={true}
      />
    </div>
  );
};
