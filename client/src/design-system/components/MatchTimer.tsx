import React from 'react';
import { Play, Pause, RotateCcw, Clock, Zap, ArrowRightLeft } from 'lucide-react';
import { Button } from './Button';

export interface MatchTimerProps {
  elapsedSeconds: number;
  periodDurationMinutes?: number;
  subIntervalMinutes?: number;
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onTriggerWhistle?: () => void;
  periodLabel?: string;
  className?: string;
}

export const MatchTimer: React.FC<MatchTimerProps> = ({
  elapsedSeconds,
  periodDurationMinutes = 25,
  subIntervalMinutes = 10,
  isRunning,
  onStart,
  onPause,
  onReset,
  onTriggerWhistle,
  periodLabel = '1st Half',
  className = '',
}) => {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const periodSeconds = periodDurationMinutes * 60;
  const intervalSeconds = subIntervalMinutes * 60;

  // Next substitution countdown
  const timeIntoCurrentWindow = elapsedSeconds % intervalSeconds;
  const secondsUntilNextSub = intervalSeconds - timeIntoCurrentWindow;
  const nextSubMin = Math.floor(secondsUntilNextSub / 60);
  const nextSubSec = secondsUntilNextSub % 60;
  const nextSubFormatted = `${nextSubMin}:${String(nextSubSec).padStart(2, '0')}`;
  const subProgress = (timeIntoCurrentWindow / intervalSeconds) * 100;

  const isSubDue = secondsUntilNextSub <= 30 && elapsedSeconds > 0;

  return (
    <div
      className={`rounded-3xl border bg-[var(--surface-card)] text-[var(--text-main)] border-[var(--surface-border)] p-5 sm:p-6 shadow-xl space-y-4 ${className}`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Pitchside Dugout Timer
          </span>
        </div>
        <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
          {periodLabel}
        </span>
      </div>

      {/* Main Digits */}
      <div className="flex flex-col items-center justify-center py-2">
        <div className="font-mono text-5xl sm:text-7xl font-black tracking-tight tabular-nums text-white drop-shadow-md">
          {formattedTime}
        </div>
        <p className="text-xs text-[var(--text-muted)] font-medium mt-1">
          Target: {periodDurationMinutes}:00 per period
        </p>
      </div>

      {/* Next Substitution Countdown Alert Bar */}
      <div
        className={`p-3 rounded-2xl border transition-all ${
          isSubDue
            ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 animate-pulse'
            : 'bg-[var(--surface-base)] border-[var(--surface-border)] text-[var(--text-muted)]'
        }`}
      >
        <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
          <div className="flex items-center gap-1.5">
            <ArrowRightLeft
              className={`w-3.5 h-3.5 ${isSubDue ? 'text-amber-400 animate-bounce' : 'text-sky-400'}`}
            />
            <span>
              {isSubDue ? (
                <strong className="text-amber-300">SUB WINDOW DUE NOW!</strong>
              ) : (
                `Next Rotation in ${nextSubFormatted}`
              )}
            </span>
          </div>
          <span className="font-mono text-[11px]">{subIntervalMinutes}m interval</span>
        </div>
        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isSubDue ? 'bg-amber-400' : 'bg-gradient-to-r from-sky-500 to-indigo-500'
            }`}
            style={{ width: `${Math.min(100, subProgress)}%` }}
          />
        </div>
      </div>

      {/* Timer Controls */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        {isRunning ? (
          <Button
            variant="danger"
            size="touchline"
            onClick={onPause}
            leftIcon={<Pause className="w-5 h-5" />}
          >
            Pause
          </Button>
        ) : (
          <Button
            variant="tactical"
            size="touchline"
            onClick={onStart}
            leftIcon={<Play className="w-5 h-5 fill-white" />}
          >
            Start
          </Button>
        )}

        <Button
          variant="secondary"
          size="touchline"
          onClick={onReset}
          leftIcon={<RotateCcw className="w-4 h-4" />}
        >
          Reset
        </Button>

        {onTriggerWhistle && (
          <Button
            variant="outline"
            size="touchline"
            onClick={onTriggerWhistle}
            leftIcon={<Zap className="w-4 h-4 text-amber-400" />}
            title="Sound Synthetic Referee Whistle"
          >
            Whistle
          </Button>
        )}
      </div>
    </div>
  );
};
