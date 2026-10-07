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
} from 'lucide-react';
import { SingleSubChange } from '../types';

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
    handleSwap,
    getSuggestedSubs,
  } = useMatchday();

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [subLog, setSubLog] = useState<{ time: string; text: string }[]>([]);
  const [suggestedChanges, setSuggestedChanges] = useState<SingleSubChange[]>([]);
  const [selectedOffId, setSelectedOffId] = useState<string>('');
  const [selectedOnId, setSelectedOnId] = useState<string>('');

  const intervalSeconds = (settings.defaultSubIntervalMinutes || 10) * 60;
  const periodDurationSeconds = (settings.periodDurationMinutes || 25) * 60;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const whistlePlayedWindow = useRef<number>(-1);

  // Load suggested substitutions when fixture changes
  useEffect(() => {
    if (activeFixture) {
      getSuggestedSubs(activeFixture.id, settings.defaultSubIntervalMinutes || 10).then(
        (plans) => {
          if (plans.length > 0 && plans[0].windows.length > 0) {
            setSuggestedChanges(plans[0].windows[0].subChanges);
          }
        }
      );
    }
  }, [activeFixture, getSuggestedSubs, settings.defaultSubIntervalMinutes]);

  // Main match timer tick
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          const currentWindow = Math.floor(next / intervalSeconds);

          // Trigger whistle alert on sub interval reached
          if (
            soundEnabled &&
            next > 0 &&
            next % intervalSeconds === 0 &&
            whistlePlayedWindow.current !== currentWindow
          ) {
            whistlePlayedWindow.current = currentWindow;
            playRefWhistle();
          }

          return next;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, intervalSeconds, soundEnabled]);

  if (!isOpen || !activeFixture || !activeFixture.matchSquad) return null;

  const currentLineup = activeFixture.matchSquad.lineupsByPeriod.find(
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

  const handleToggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setElapsedSeconds(0);
    whistlePlayedWindow.current = -1;
  };

  const handleExecuteQuickSub = (offId: string, onId: string, targetPos?: string) => {
    const offPlayer = playerMap.get(offId);
    const onPlayer = playerMap.get(onId);
    if (!offPlayer || !onPlayer) return;

    handleSwap({ type: 'pitch', playerId: offId, position: targetPos });
    handleSwap({ type: 'sub', playerId: onId });

    const logEntry = {
      time: formattedTime,
      text: `OFF: ${offPlayer.name} ➡️ ON: ${onPlayer.name}${targetPos ? ` (${targetPos})` : ''}`,
    };
    setSubLog((prev) => [logEntry, ...prev]);

    if (soundEnabled) {
      playRefWhistle();
    }
  };

  const currentOnPitch = (currentLineup?.onPitch || []).map((op) => ({
    ...op,
    player: playerMap.get(op.playerId),
  }));

  const currentSubs = (currentLineup?.subs || []).map((subId) => playerMap.get(subId)).filter(Boolean);

  const periodDisplayName =
    settings.matchPeriodCount === 2
      ? activePeriod === 1
        ? 'First Half (Period 1)'
        : 'Second Half (Period 2)'
      : `Period ${activePeriod} of ${settings.matchPeriodCount}`;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md overflow-y-auto animate-fade-in ${
        highContrast ? 'bg-black text-white' : 'bg-slate-950/90 text-white'
      }`}
    >
      <div
        className={`relative w-full max-w-4xl rounded-3xl border shadow-2xl p-5 sm:p-7 space-y-6 flex flex-col ${
          highContrast
            ? 'bg-zinc-950 border-yellow-400 text-white shadow-yellow-500/10'
            : 'bg-slate-900 border-slate-800'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              {isRunning && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  isRunning ? 'bg-emerald-500' : 'bg-slate-500'
                }`}
              />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  ⚡ Sideline Live Match & Sub Buzzer
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30 font-mono">
                  vs {activeFixture.opponent}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Outdoor pitch timer with automatic audio whistle substitution alerts and 1-tap sideline rotation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Outdoor Sunlight High Contrast Toggle */}
            <button
              type="button"
              onClick={() => setHighContrast(!highContrast)}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
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
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
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
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

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
                onClick={handleToggleTimer}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-wide transition shadow-xl cursor-pointer ${
                  isRunning
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-5 h-5" />
                    <span>Pause Timer</span>
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

            {/* Period Switcher */}
            <div className="flex items-center gap-2 pt-2 text-xs">
              {Array.from({ length: settings.matchPeriodCount || 2 }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setActivePeriod(p)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    activePeriod === p
                      ? 'bg-sky-600 text-white shadow'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  {settings.matchPeriodCount === 2
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
            {suggestedChanges.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block">
                  Upcoming Suggested Rotation:
                </span>
                {suggestedChanges.slice(0, 1).map((sc, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="font-semibold text-slate-200 truncate">
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

          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={!selectedOffId || !selectedOnId}
              onClick={() => {
                const targetOp = currentOnPitch.find((op) => op.playerId === selectedOffId);
                handleExecuteQuickSub(selectedOffId, selectedOnId, targetOp?.position);
                setSelectedOffId('');
                setSelectedOnId('');
              }}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg transition cursor-pointer flex items-center gap-1.5"
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
    </div>
  );
};
