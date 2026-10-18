import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchday } from '../context/MatchdayContext';
import { useToast } from '../context/ToastContext';
import { Fixture, GoalScorer, Player } from '../types';
import {
  X,
  Plus,
  Trash2,
  Trophy,
  Clock,
  AlertCircle,
  CheckCircle2,
  Zap,
  Shield,
  Users,
} from 'lucide-react';

interface ScoreScorersModalProps {
  fixture: Fixture | null;
  isOpen: boolean;
  onClose: () => void;
  defaultLiveMode?: boolean;
}

export const ScoreScorersModal: React.FC<ScoreScorersModalProps> = ({
  fixture,
  isOpen,
  onClose,
  defaultLiveMode = false,
}) => {
  const { players, activeTeam, updateFixtureScore } = useMatchday();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [scorers, setScorers] = useState<GoalScorer[]>([]);
  const [isLive, setIsLive] = useState<boolean>(defaultLiveMode);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Derive which team is "Home"
  const ourTeamName = activeTeam?.name || 'Our Team';
  const opponentName = fixture?.opponent || 'Opponent';
  const isOurTeamHome = fixture?.venue !== 'Away';
  const homeTeamDisplayName = isOurTeamHome ? ourTeamName : opponentName;
  const awayTeamDisplayName = isOurTeamHome ? opponentName : ourTeamName;

  // Initialize form state when fixture changes
  useEffect(() => {
    if (!fixture) return;

    setHomeScore(typeof fixture.homeScore === 'number' ? Math.max(0, fixture.homeScore) : 0);
    setAwayScore(typeof fixture.awayScore === 'number' ? Math.max(0, fixture.awayScore) : 0);
    setScorers(fixture.scorers ? [...fixture.scorers] : []);
    setIsLive(Boolean(fixture.isLive || defaultLiveMode));
    setValidationError(null);
    setIsSubmitting(false);
  }, [fixture, defaultLiveMode, isOpen]);

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

  if (!isOpen || !fixture) return null;

  // Roster players mapped for selection
  const squadPlayers = [...players].sort((a, b) => {
    const numA = typeof a.squadNumber === 'number' ? a.squadNumber : 999;
    const numB = typeof b.squadNumber === 'number' ? b.squadNumber : 999;
    if (numA !== numB) return numA - numB;
    return a.name.localeCompare(b.name);
  });

  const homeScorerCount = scorers.filter((s) => s.team === 'home').length;
  const awayScorerCount = scorers.filter((s) => s.team === 'away').length;

  const isHomeScorersExceeded = homeScorerCount > homeScore;
  const isAwayScorersExceeded = awayScorerCount > awayScore;
  const effectiveError =
    validationError ||
    (isHomeScorersExceeded
      ? `Total home scorers (${homeScorerCount}) cannot exceed entered home score (${homeScore})`
      : isAwayScorersExceeded
      ? `Total away scorers (${awayScorerCount}) cannot exceed entered away score (${awayScore})`
      : null);

  const handleScoreStepper = (team: 'home' | 'away', delta: number) => {
    if (team === 'home') {
      const next = Math.max(0, homeScore + delta);
      setHomeScore(next);
      if (homeScorerCount > next) {
        setValidationError(`Total home scorers (${homeScorerCount}) cannot exceed home score (${next})`);
      } else {
        setValidationError(null);
      }
    } else {
      const next = Math.max(0, awayScore + delta);
      setAwayScore(next);
      if (awayScorerCount > next) {
        setValidationError(`Total away scorers (${awayScorerCount}) cannot exceed away score (${next})`);
      } else {
        setValidationError(null);
      }
    }
  };

  const handleAddScorer = (team: 'home' | 'away') => {
    const currentCount = team === 'home' ? homeScorerCount : awayScorerCount;
    const maxScore = team === 'home' ? homeScore : awayScore;

    if (currentCount >= maxScore) {
      // Auto-increment score by 1 if adding scorer would exceed score
      if (team === 'home') {
        setHomeScore(maxScore + 1);
      } else {
        setAwayScore(maxScore + 1);
      }
    }

    // Default to first squad player if our team, otherwise opposition
    const isOurTeam = (team === 'home' && isOurTeamHome) || (team === 'away' && !isOurTeamHome);
    const defaultPlayer = isOurTeam && squadPlayers.length > 0 ? squadPlayers[0] : null;

    const newScorer: GoalScorer = {
      id: `scorer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      team,
      playerId: defaultPlayer ? defaultPlayer.id : undefined,
      playerName: defaultPlayer ? defaultPlayer.name : isOurTeam ? 'Our Player' : opponentName,
      minute: '',
      isOwnGoal: false,
    };

    setScorers((prev) => [...prev, newScorer]);
    setValidationError(null);
  };

  const handleUpdateScorer = (index: number, updates: Partial<GoalScorer>) => {
    setScorers((prev) => {
      const next = [...prev];
      const existing = next[index];
      if (!existing) return prev;

      // If playerId changed, sync playerName
      if (updates.playerId !== undefined) {
        if (updates.playerId === '') {
          updates.playerName = 'Unknown / Opposition Player';
        } else {
          const match = players.find((p) => p.id === updates.playerId);
          if (match) {
            updates.playerName = match.name;
          }
        }
      }

      next[index] = { ...existing, ...updates };
      return next;
    });
  };

  const handleRemoveScorer = (index: number) => {
    setScorers((prev) => prev.filter((_, i) => i !== index));
    setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate scorers vs scores
    const finalHomeScorers = scorers.filter((s) => s.team === 'home').length;
    const finalAwayScorers = scorers.filter((s) => s.team === 'away').length;

    if (finalHomeScorers > homeScore) {
      setValidationError(`Total home scorers (${finalHomeScorers}) cannot exceed home score (${homeScore})`);
      return;
    }
    if (finalAwayScorers > awayScore) {
      setValidationError(`Total away scorers (${finalAwayScorers}) cannot exceed away score (${awayScore})`);
      return;
    }

    // Validate minute formats
    const minuteRegex = /^\d+(\+\d+)?$/;
    for (let i = 0; i < scorers.length; i++) {
      const s = scorers[i];
      if (s.minute && String(s.minute).trim() !== '') {
        const val = String(s.minute).trim();
        if (!minuteRegex.test(val)) {
          setValidationError(`Invalid minute '${s.minute}'. Must be a number (e.g. 23) or stoppage time (e.g. 45+2)`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      const newStatus = isLive ? 'In Progress' : fixture.status === 'Upcoming' ? 'Completed' : fixture.status;
      await updateFixtureScore(fixture.id, {
        homeScore,
        awayScore,
        scorers,
        status: newStatus,
        isLive,
      });

      showToast(
        isLive
          ? `Live score updated: ${homeScore} - ${awayScore}`
          : `Match score & scorers saved: ${homeScore} - ${awayScore}`,
        'success'
      );
      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'Failed to save score and scorers');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="score-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              ⚽
            </div>
            <div>
              <h2 id="score-modal-title" className="text-base font-bold text-white flex items-center gap-2">
                <span>{t('modals.scoreTitle')}</span>
              </h2>
              <p className="text-xs text-slate-400">
                vs {fixture.opponent} • {fixture.date} • {t(fixture.venue === 'Away' ? 'common.away' : 'common.home')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close score modal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Live vs Final Match Mode Switch */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  isLive
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {isLive ? <Zap className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  {isLive ? 'Live In-Progress Mode' : 'Final Match Result'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {isLive
                    ? 'Updates match in real time during play'
                    : 'Final score for completed match records'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsLive(!isLive)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                isLive
                  ? 'bg-rose-600/20 text-rose-300 border-rose-500/40 hover:bg-rose-600/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              {isLive ? '🔴 Set Final' : '⚡ Switch to Live'}
            </button>
          </div>

          {/* Interactive Scoreboard Display */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/30 border border-slate-800 shadow-inner">
            <div className="grid grid-cols-5 items-center gap-2 text-center">
              {/* Home Team */}
              <div className="col-span-2 space-y-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block truncate">
                  {homeTeamDisplayName}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
                  Home {isOurTeamHome ? '(Our Team)' : ''}
                </span>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleScoreStepper('home', -1)}
                    aria-label="Decrease home score"
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-lg border border-slate-700 transition flex items-center justify-center cursor-pointer shadow-sm"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={homeScore}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                      setHomeScore(val);
                    }}
                    aria-label="Home team score"
                    className="w-14 h-12 text-center text-3xl font-extrabold text-white bg-slate-900 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleScoreStepper('home', 1)}
                    aria-label="Increase home score"
                    className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-lg border border-indigo-500/40 transition flex items-center justify-center cursor-pointer shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Scoreboard Divider */}
              <div className="col-span-1 flex flex-col items-center justify-center">
                <span className="text-xl font-mono font-bold text-slate-500">vs</span>
                <span className="text-[10px] text-slate-400 font-mono mt-1">FT</span>
              </div>

              {/* Away Team */}
              <div className="col-span-2 space-y-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block truncate">
                  {awayTeamDisplayName}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
                  Away {!isOurTeamHome ? '(Our Team)' : ''}
                </span>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleScoreStepper('away', -1)}
                    aria-label="Decrease away score"
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-lg border border-slate-700 transition flex items-center justify-center cursor-pointer shadow-sm"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={awayScore}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                      setAwayScore(val);
                    }}
                    aria-label="Away team score"
                    className="w-14 h-12 text-center text-3xl font-extrabold text-white bg-slate-900 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleScoreStepper('away', 1)}
                    aria-label="Increase away score"
                    className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-lg border border-indigo-500/40 transition flex items-center justify-center cursor-pointer shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Banner if Scorers Exceed Score */}
          {effectiveError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{effectiveError}</span>
            </div>
          )}

          {/* Goal Scorers Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Goal Scorers</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    ({scorers.length} recorded)
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Home: {homeScorerCount} / {homeScore} • Away: {awayScorerCount} / {awayScore}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddScorer('home')}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Home Goal</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddScorer('away')}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Away Goal</span>
                </button>
              </div>
            </div>

            {/* Scorers List */}
            {scorers.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center space-y-1">
                <p className="text-xs text-slate-400">No goal scorers added yet.</p>
                <p className="text-[11px] text-slate-400">
                  Click "+ Home Goal" or "+ Away Goal" to record individual goal scorers and minutes.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {scorers.map((scorer, idx) => {
                  const isHome = scorer.team === 'home';
                  const isOurGoal = (isHome && isOurTeamHome) || (!isHome && !isOurTeamHome);

                  return (
                    <div
                      key={scorer.id || idx}
                      className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-2.5 flex-wrap sm:flex-nowrap"
                    >
                      {/* Team Pill */}
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateScorer(idx, { team: scorer.team === 'home' ? 'away' : 'home' })
                        }
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border uppercase tracking-wider shrink-0 cursor-pointer ${
                          isHome
                            ? 'bg-sky-500/10 text-sky-300 border-sky-500/30 hover:bg-sky-500/20'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                        }`}
                        title="Click to toggle Home/Away"
                      >
                        {scorer.team}
                      </button>

                      {/* Scorer Player Selector */}
                      <div className="flex-1 min-w-[160px]">
                        <select
                          value={scorer.playerId || ''}
                          onChange={(e) => handleUpdateScorer(idx, { playerId: e.target.value })}
                          aria-label={`Goal scorer ${idx + 1} player`}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 font-medium"
                        >
                          <option value="">
                            {isOurGoal ? 'Select Squad Player...' : `Opposition Player (${opponentName})`}
                          </option>
                          {squadPlayers.map((p) => (
                            <option key={p.id} value={p.id}>
                              {typeof p.squadNumber === 'number' ? `#${p.squadNumber} ` : ''}
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Goal Minute Input */}
                      <div className="w-24 shrink-0 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <input
                          type="text"
                          value={scorer.minute !== undefined ? String(scorer.minute) : ''}
                          onChange={(e) => handleUpdateScorer(idx, { minute: e.target.value })}
                          placeholder="Min (e.g. 23)"
                          aria-label={`Goal scorer ${idx + 1} minute`}
                          className="w-full px-2 py-1 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Own Goal Toggle */}
                      <button
                        type="button"
                        onClick={() => handleUpdateScorer(idx, { isOwnGoal: !scorer.isOwnGoal })}
                        className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition cursor-pointer shrink-0 ${
                          scorer.isOwnGoal
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300'
                        }`}
                        title="Toggle Own Goal"
                      >
                        {scorer.isOwnGoal ? 'OG ⚠️' : 'OG?'}
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveScorer(idx)}
                        aria-label={`Remove scorer ${idx + 1}`}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || Boolean(effectiveError)}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition cursor-pointer flex items-center gap-2"
          >
            {isSubmitting ? (
              <span>{t('common.loading')}</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('common.save')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
