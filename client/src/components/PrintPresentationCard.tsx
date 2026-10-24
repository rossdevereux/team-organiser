import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TeamDashboardSummary } from '../types';
import { useMatchday } from '../context/MatchdayContext';
import { Printer, X, Trophy, Shield, Star, Award, CheckCircle2 } from 'lucide-react';
import { trackPrintSheet } from '../utils/analytics';

interface PrintPresentationCardProps {
  isOpen: boolean;
  onClose: () => void;
  summary: TeamDashboardSummary;
}

export const PrintPresentationCard: React.FC<PrintPresentationCardProps> = ({
  isOpen,
  onClose,
  summary,
}) => {
  const { activeTeam, settings } = useMatchday();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      trackPrintSheet({
        type: 'presentation_award',
        teamId: activeTeam?.id,
      });
    }
  }, [isOpen, activeTeam?.id]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const topScorer = summary.scorersLeaderboard[0];
  const topPotm = summary.potmLeaderboard[0];
  const topWall = summary.defensiveWall[0];

  const matchesPlayed = summary.overview.matchesPlayed;
  const wins = summary.overview.record.wins;
  const draws = summary.overview.record.draws;
  const losses = summary.overview.record.losses;
  const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;
  const cleanSheetRate = matchesPlayed > 0 ? Math.round((summary.overview.cleanSheets / matchesPlayed) * 100) : 0;

  const modalContent = (
    <div
      id="awards-sheet-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Season Presentation & Awards Sheet"
      onClick={onClose}
      className="official-print-modal fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-6 py-6 sm:py-8 bg-black/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto print:block print:w-full print:border-none print:shadow-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="print-area w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 text-white shadow-2xl space-y-6 print:border-none print:shadow-none print:p-0 print:text-slate-900 print:bg-white print:max-w-none print:w-full"
      >
        {/* On-screen Action Toolbar (Hidden in Print) */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 print:hidden no-print">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Season Presentation & Awards Sheet</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition cursor-pointer print:hidden no-print"
              title="Print presentation sheet or save as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition cursor-pointer print:hidden no-print"
              title="Close dialog (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Certificate / Presentation Header */}
        <div className="text-center space-y-2 border-b-2 border-slate-700 print:border-slate-800 pb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase tracking-widest print:border-slate-400 print:bg-slate-100 print:text-slate-900">
            <Award className="w-3.5 h-3.5 text-amber-500 print:text-slate-900" />
            <span>Official Season Record & Presentation Day Summary</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white print:text-slate-900">
            {activeTeam?.name || 'SubShuffle Team'}
          </h1>
          <p className="text-xs text-slate-400 print:text-slate-700 font-medium">
            Season: <strong className="text-white print:text-slate-900">{summary.season}</strong> • Format: {settings.pitchPlayerCount}-a-side • Generated: {new Date(summary.generatedAt).toLocaleDateString('en-GB')}
          </p>
        </div>

        {/* Season Overview Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:gap-2">
          <div className="kpi-card p-3 rounded-xl bg-slate-850/60 border border-slate-800 print:border-slate-300 print:border print:bg-white text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Matches Record</div>
            <div className="text-lg font-black text-white print:text-slate-900 font-mono">
              {wins}W - {draws}D - {losses}L
            </div>
            <div className="text-[10px] text-emerald-400 print:text-slate-700 font-semibold">
              {winRate}% Win Rate ({matchesPlayed} Matches)
            </div>
          </div>
          <div className="kpi-card p-3 rounded-xl bg-slate-850/60 border border-slate-800 print:border-slate-300 print:border print:bg-white text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Goals (F / A / Diff)</div>
            <div className="text-lg font-black text-white print:text-slate-900 font-mono">
              {summary.overview.goalsFor} : {summary.overview.goalsAgainst} ({summary.overview.goalDifference > 0 ? `+${summary.overview.goalDifference}` : summary.overview.goalDifference})
            </div>
            <div className="text-[10px] text-sky-400 print:text-slate-700 font-semibold">
              {(summary.overview.goalsFor / Math.max(1, matchesPlayed)).toFixed(1)} Goals/Match
            </div>
          </div>
          <div className="kpi-card p-3 rounded-xl bg-slate-850/60 border border-slate-800 print:border-slate-300 print:border print:bg-white text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Clean Sheets</div>
            <div className="text-lg font-black text-white print:text-slate-900 font-mono">
              {summary.overview.cleanSheets}
            </div>
            <div className="text-[10px] text-indigo-400 print:text-slate-700 font-semibold">
              {cleanSheetRate}% Shutout Rate
            </div>
          </div>
          <div className="kpi-card p-3 rounded-xl bg-slate-850/60 border border-slate-800 print:border-slate-300 print:border print:bg-white text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Squad Equity</div>
            <div className="text-lg font-black text-emerald-400 print:text-slate-900 font-mono">
              {summary.overview.squadEquityScore}%
            </div>
            <div className="text-[10px] text-emerald-500 print:text-slate-700 font-semibold">
              FA Youth Charter Target
            </div>
          </div>
        </div>

        {/* Presentation Honor Cards: Golden Boot, POTM, Defensive Wall */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:gap-2">
          {/* Top Scorer */}
          <div className="award-card p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 print:border-slate-300 print:border print:bg-white space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 print:text-slate-900">
              <Trophy className="w-4 h-4 text-amber-400 print:text-slate-900" />
              <span>Golden Boot Winner</span>
            </div>
            {topScorer ? (
              <div>
                <div className="text-base font-black text-white print:text-slate-900">{topScorer.playerName}</div>
                <div className="text-xs text-amber-300 print:text-slate-700 font-semibold">
                  {topScorer.goals} Goals • {topScorer.matchesPlayed} Matches ({topScorer.goalsPerMatch} G/M)
                </div>
                {topScorer.hatTricks > 0 && (
                  <div className="text-[10px] text-amber-400 print:text-slate-600 font-mono">
                    ⚽ {topScorer.hatTricks} Hat-trick{topScorer.hatTricks > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-500 print:text-slate-500">No scorers registered yet</div>
            )}
          </div>

          {/* Player of the Match */}
          <div className="award-card p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 print:border-slate-300 print:border print:bg-white space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 print:text-slate-900">
              <Star className="w-4 h-4 text-purple-400 print:text-slate-900" />
              <span>Player of the Season</span>
            </div>
            {topPotm ? (
              <div>
                <div className="text-base font-black text-white print:text-slate-900">{topPotm.playerName}</div>
                <div className="text-xs text-purple-300 print:text-slate-700 font-semibold">
                  {topPotm.awardsCount} POTM Award{topPotm.awardsCount > 1 ? 's' : ''}
                </div>
                {topPotm.latestAward?.opponent && (
                  <div className="text-[10px] text-slate-400 print:text-slate-600">
                    Latest: vs {topPotm.latestAward.opponent}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-500 print:text-slate-500">No POTM awards registered</div>
            )}
          </div>

          {/* The Wall (Defensive Anchor) */}
          <div className="award-card p-4 rounded-xl bg-sky-950/20 border border-sky-500/30 print:border-slate-300 print:border print:bg-white space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400 print:text-slate-900">
              <Shield className="w-4 h-4 text-sky-400 print:text-slate-900" />
              <span>The Wall (Top Defender/GK)</span>
            </div>
            {topWall ? (
              <div>
                <div className="text-base font-black text-white print:text-slate-900">{topWall.playerName}</div>
                <div className="text-xs text-sky-300 print:text-slate-700 font-semibold">
                  {topWall.cleanSheets} Clean Sheets ({topWall.cleanSheetRate}%)
                </div>
                <div className="text-[10px] text-slate-400 print:text-slate-600 font-mono">
                  {topWall.defensiveMinutes + topWall.gkMinutes} Def/GK Minutes
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 print:text-slate-500">No defensive records yet</div>
            )}
          </div>
        </div>

        {/* Milestones Celebrated */}
        {summary.milestones.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase font-bold text-slate-400 print:text-slate-800 tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 print:text-slate-800" />
              <span>Season Milestones & Achievements</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 print:grid-cols-2">
              {summary.milestones.slice(0, 6).map((badge) => (
                <div
                  key={badge.id}
                  className="milestone-card p-2.5 rounded-xl bg-slate-850/40 border border-slate-800 print:border-slate-300 print:border print:bg-white flex items-center gap-2.5 text-xs"
                >
                  <span className="text-lg">{badge.icon}</span>
                  <div>
                    <div className="font-bold text-white print:text-slate-900">
                      {badge.title} {badge.playerName && `• ${badge.playerName}`}
                    </div>
                    <div className="text-[10px] text-slate-400 print:text-slate-600">{badge.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Official Coach Sign-off Footer */}
        <div className="pt-6 border-t border-slate-800 print:border-slate-400 flex items-center justify-between text-xs text-slate-400 print:text-slate-800">
          <div>
            <div className="font-semibold text-white print:text-slate-900">Head Coach: _____________________________</div>
            <div className="text-[10px] mt-1 text-slate-500 print:text-slate-600 font-medium">Club Verified FA Charter Standard Record</div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-white print:text-slate-900">Date: _____________________________</div>
            <div className="text-[10px] mt-1 text-slate-500 print:text-slate-600 font-medium">SubShuffle Youth Football Organiser</div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
