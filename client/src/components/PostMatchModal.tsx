import React, { useState, useEffect } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import { Fixture, PostMatchRecording } from '../types';
import {
  Clock,
  CheckCircle2,
  X,
  Sliders,
  ShieldCheck,
  AlertCircle,
  Users,
  Award,
  Sparkles,
} from 'lucide-react';

interface PostMatchModalProps {
  fixture: Fixture | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PostMatchModal: React.FC<PostMatchModalProps> = ({
  fixture,
  isOpen,
  onClose,
}) => {
  const { players, settings, savePostMatchRecording, setPlayerOfTheMatch } = useMatchday();

  const totalMatchMinutes =
    (settings.matchPeriodCount || 2) * (settings.periodDurationMinutes || 25);

  const [trackingMode, setTrackingMode] = useState<'exact' | 'full_credit'>('full_credit');
  const [playerMinutes, setPlayerMinutes] = useState<Record<string, number>>({});
  const [playerOfTheMatchId, setPlayerOfTheMatchId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize from fixture existing postMatchRecording or default calculated minutes
  useEffect(() => {
    if (!fixture || !fixture.matchSquad) return;

    setPlayerOfTheMatchId(fixture.playerOfTheMatchId || '');

    if (fixture.postMatchRecording) {
      setTrackingMode(fixture.postMatchRecording.trackingMode);
      setPlayerMinutes(fixture.postMatchRecording.playerMinutes || {});
      setNotes(fixture.postMatchRecording.notes || '');
    } else {
      // Default: full credit mode, with default minutes calculated from lineup
      setTrackingMode('full_credit');
      const initialMinutes: Record<string, number> = {};
      const duration = settings.periodDurationMinutes || 25;

      fixture.matchSquad.selectedPlayerIds.forEach((pId) => {
        let periodsPlayed = 0;
        fixture.matchSquad!.lineupsByPeriod.forEach((lineup) => {
          if (lineup.onPitch.some((op) => op.playerId === pId)) {
            periodsPlayed++;
          }
        });
        initialMinutes[pId] = periodsPlayed * duration;
      });

      setPlayerMinutes(initialMinutes);
      setNotes('');
    }
  }, [fixture, settings.periodDurationMinutes]);

  if (!isOpen || !fixture || !fixture.matchSquad) return null;

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const selectedPlayers = fixture.matchSquad.selectedPlayerIds
    .map((id) => playerMap.get(id))
    .filter(Boolean);

  const handleMinuteChange = (playerId: string, mins: number) => {
    setPlayerMinutes((prev) => ({
      ...prev,
      [playerId]: Math.max(0, Math.min(totalMatchMinutes, mins)),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const recording: PostMatchRecording = {
        trackingMode,
        playerMinutes: trackingMode === 'full_credit'
          ? Object.fromEntries(fixture.matchSquad!.selectedPlayerIds.map((id) => [id, totalMatchMinutes]))
          : playerMinutes,
        recordedAt: new Date().toISOString(),
        notes: notes.trim(),
      };

      await savePostMatchRecording(fixture.id, recording);
      await setPlayerOfTheMatch(fixture.id, playerOfTheMatchId || undefined);
      onClose();
    } catch (err) {
      console.error('Failed to save post match recording:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Post-Match Game Time & Sub Recording</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  vs {fixture.opponent}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Match length: {totalMatchMinutes} mins ({settings.matchPeriodCount} halves × {settings.periodDurationMinutes}m)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
          {/* Tracking Mode Selection Toggle */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Matchday Game Time Tracking Mode</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Choose how playing time is credited for this match.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Option A: Full Credit 100% */}
              <div
                onClick={() => setTrackingMode('full_credit')}
                className={`p-3.5 rounded-xl border transition cursor-pointer space-y-1.5 ${
                  trackingMode === 'full_credit'
                    ? 'bg-emerald-950/30 border-emerald-500/60 ring-1 ring-emerald-500/30'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Equal Participation (100% Credit)</span>
                  </span>
                  <input
                    type="radio"
                    name="trackingMode"
                    checked={trackingMode === 'full_credit'}
                    onChange={() => setTrackingMode('full_credit')}
                    className="accent-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Turn off exact pitch timers. All {selectedPlayers.length} squad players who attended are credited with 100% equal matchday time.
                </p>
              </div>

              {/* Option B: Exact Pitch Minutes */}
              <div
                onClick={() => setTrackingMode('exact')}
                className={`p-3.5 rounded-xl border transition cursor-pointer space-y-1.5 ${
                  trackingMode === 'exact'
                    ? 'bg-sky-950/30 border-sky-500/60 ring-1 ring-sky-500/30'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-sky-400" />
                    <span>Exact In-Game Minutes</span>
                  </span>
                  <input
                    type="radio"
                    name="trackingMode"
                    checked={trackingMode === 'exact'}
                    onChange={() => setTrackingMode('exact')}
                    className="accent-sky-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Track or adjust precise minutes played per child (e.g. accounting for in-game injuries or rolling substitutes).
                </p>
              </div>
            </div>
          </div>

          {/* Exact Minutes Input List (when exact mode selected) */}
          {trackingMode === 'exact' && (
            <div className="space-y-2 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <span className="font-bold text-white">Player Minutes Played ({selectedPlayers.length} players)</span>
                <span className="text-[11px] text-slate-400">Match duration: {totalMatchMinutes}m</span>
              </div>

              <div className="space-y-2 pt-1">
                {selectedPlayers.map((player) => {
                  if (!player) return null;
                  const mins = playerMinutes[player.id] ?? 0;
                  const percent = totalMatchMinutes > 0 ? Math.round((mins / totalMatchMinutes) * 100) : 0;
                  const meetsTarget = percent >= settings.targetGameTimePercent;

                  return (
                    <div
                      key={player.id}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-[160px]">
                        <span className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs">
                          {player.squadNumber ? `#${player.squadNumber}` : '—'}
                        </span>
                        <div>
                          <span className="font-semibold text-white block">{player.name}</span>
                          <span className="text-[10px] text-slate-400">
                            {player.preferredPositions.join(', ')}
                          </span>
                        </div>
                      </div>

                      {/* Minute Input Slider & Field */}
                      <div className="flex items-center gap-3 flex-1 max-w-xs">
                        <input
                          type="range"
                          min="0"
                          max={totalMatchMinutes}
                          step="1"
                          value={mins}
                          onChange={(e) => handleMinuteChange(player.id, parseInt(e.target.value, 10))}
                          className="flex-1 accent-sky-500 cursor-pointer"
                        />
                        <div className="flex items-center gap-1 w-16 justify-end font-mono">
                          <input
                            type="number"
                            min="0"
                            max={totalMatchMinutes}
                            value={mins}
                            onChange={(e) => handleMinuteChange(player.id, parseInt(e.target.value, 10) || 0)}
                            className="w-12 px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-right text-white font-bold focus:outline-none focus:border-sky-500"
                          />
                          <span className="text-[10px] text-slate-500">m</span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          meetsTarget
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {percent}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Player of the Match / Sportsmanship Award Selector */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-white font-bold text-xs flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>Player of the Match / Sportsmanship Award (Optional)</span>
              </label>
              <span className="text-[10px] text-slate-400">FA Respect & Positive Motivation</span>
            </div>
            <select
              value={playerOfTheMatchId}
              onChange={(e) => setPlayerOfTheMatchId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">-- No Award Selected --</option>
              {selectedPlayers.map((p) => p && (
                <option key={p.id} value={p.id}>
                  {p.squadNumber ? `#${p.squadNumber} ` : ''}{p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Coach Notes */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 text-[11px]">
              Post-Match Coach Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Great teamwork in 2nd half; rotated Alex into midfield after knock."
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-850 text-slate-400 hover:text-white font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Match Participation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
