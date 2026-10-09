import React, { useEffect } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import { Printer, X, Download, ShieldCheck } from 'lucide-react';

interface PrintMatchSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrintMatchSheet: React.FC<PrintMatchSheetProps> = ({ isOpen, onClose }) => {
  const { activeFixture, players, settings, stats } = useMatchday();

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !activeFixture || !activeFixture.matchSquad) return null;

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const squad = activeFixture.matchSquad;
  const periodCount = settings.matchPeriodCount || 2;
  const periods = Array.from({ length: periodCount }, (_, i) => i + 1);

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(activeFixture.date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const captainPlayer = activeFixture.captainId ? playerMap.get(activeFixture.captainId) : null;
  const potmPlayer = activeFixture.playerOfTheMatchId ? playerMap.get(activeFixture.playerOfTheMatchId) : null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-6 py-6 sm:py-8 bg-black/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl print:bg-white print:text-black print:border-none print:shadow-none print:max-w-none flex flex-col"
      >
        {/* Sticky Modal Actions (Hidden in Print) */}
        <div className="sticky top-0 z-20 px-6 py-4 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">
              Official Matchday Pitch Sheet & PDF Export
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-lg shadow-sky-600/20 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Close print preview (Esc)"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Printable Document Area */}
          <div className="print-area bg-white text-slate-900 p-6 sm:p-8 rounded-2xl space-y-6 print:p-0 print:rounded-none" data-context="print">
          {/* Header Banner */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <img
                src="/logo-icon.png"
                alt="SubShuffle"
                className="w-12 h-12 object-contain shrink-0"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-800">
                    Grassroots Youth Football
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-xs font-semibold text-slate-600">
                    Equal Playing Time Certified
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 mt-0.5">
                  SubShuffle Official Match Sheet
                </h1>
                <p className="text-sm font-semibold text-slate-700">
                  vs {activeFixture.opponent} ({activeFixture.venue})
                  {activeFixture.groundAddress && ` • ${activeFixture.groundAddress}`}
                </p>
                {captainPlayer && (
                  <div className="text-xs font-bold text-amber-800 mt-1">
                    © Matchday Captain: {captainPlayer.squadNumber ? `#${captainPlayer.squadNumber} ` : ''}{captainPlayer.name}
                  </div>
                )}
              </div>
            </div>

            <div className="text-left md:text-right font-mono text-xs text-slate-800 space-y-1 shrink-0">
              <div><strong>Date:</strong> {formattedDate}</div>
              <div>
                <strong>Kick-off:</strong> {activeFixture.kickOffTime || 'TBC'}
                {activeFixture.meetTime && ` (Meet: ${activeFixture.meetTime})`}
              </div>
              <div><strong>Format:</strong> {settings.pitchPlayerCount}-a-side • {settings.defaultFormation}</div>
              <div>
                <strong>Periods:</strong>{' '}
                {periodCount === 2
                  ? `2 Halves × ${settings.periodDurationMinutes} mins`
                  : `${periodCount} Periods × ${settings.periodDurationMinutes} mins`}
              </div>
            </div>
          </div>

          {/* Lineups Matrix */}
          <div className="space-y-3">
            <h2 className="text-xs uppercase font-extrabold tracking-wider text-slate-950 border-b border-slate-300 pb-1">
              {periodCount === 2 ? 'Halves' : 'Period'} Tactical Lineups & Substitutions
            </h2>

            <div className={`grid grid-cols-1 ${periodCount === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'} gap-3`}>
              {periods.map((p) => {
                const lineup = squad.lineupsByPeriod.find((l) => l.period === p);
                return (
                  <div
                    key={p}
                    className="border-2 border-slate-300 rounded-xl p-3 bg-slate-50 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-300 pb-1 font-bold text-slate-900">
                      <span>{periodCount === 2 ? (p === 1 ? 'FIRST HALF (P1)' : 'SECOND HALF (P2)') : `PERIOD ${p}`}</span>
                      <span className="font-mono text-[10px] text-slate-600">
                        {settings.periodDurationMinutes} mins
                      </span>
                    </div>

                    {/* On Pitch List */}
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        On Pitch ({settings.pitchPlayerCount})
                      </span>
                      {lineup?.onPitch.map((entry) => {
                        const player = playerMap.get(entry.playerId);
                        return (
                          <div
                            key={entry.position}
                            className="flex items-center justify-between py-0.5 border-b border-slate-200 text-[11px]"
                          >
                            <span className="font-medium text-slate-900 truncate">
                              {player?.squadNumber ? `#${player.squadNumber} ` : ''}
                              {player?.name}
                            </span>
                            <span className="font-mono font-bold text-[10px] px-1 bg-slate-200 text-slate-800 rounded">
                              {entry.position.replace('_', ' ')}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Subs List */}
                    <div className="pt-2">
                      <span className="text-[10px] uppercase font-bold text-amber-700 block">
                        Substitutes Bench (3)
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {lineup?.subs.map((subId) => {
                          const player = playerMap.get(subId);
                          return (
                            <span
                              key={subId}
                              className="text-[10px] font-medium bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded"
                            >
                              {player?.squadNumber ? `#${player.squadNumber} ` : ''}
                              {player?.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Equal Playing Time Verification Table */}
          <div className="space-y-2">
            <h2 className="text-xs uppercase font-extrabold tracking-wider text-slate-950 border-b border-slate-300 pb-1">
              Matchday Playing Time Audit
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-[10px] uppercase font-bold text-slate-700">
                    <th className="p-2">Player</th>
                    <th className="p-2 text-center">No.</th>
                    {periods.map((p) => (
                      <th key={p} className="p-2 text-center">
                        {periodCount === 2 ? (p === 1 ? '1st Half' : '2nd Half') : `P${p}`}
                      </th>
                    ))}
                    <th className="p-2 text-center">Minutes</th>
                    <th className="p-2 text-center">% Played</th>
                    <th className="p-2 text-center">Goalie?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {stats.map((s) => (
                    <tr key={s.playerId}>
                      <td className="p-1.5 font-bold text-slate-900">{s.player.name}</td>
                      <td className="p-1.5 text-center font-mono">
                        {s.player.squadNumber || '—'}
                      </td>
                      {periods.map((p) => {
                        const played = s.periodsPlayed.includes(p);
                        return (
                          <td
                            key={p}
                            className={`p-1.5 text-center font-bold font-mono ${
                              played ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400'
                            }`}
                          >
                            {played ? 'PITCH' : 'SUB'}
                          </td>
                        );
                      })}
                      <td className="p-1.5 text-center font-mono font-bold">
                        {s.minutesPlayed}m
                      </td>
                      <td className="p-1.5 text-center font-mono font-bold">
                        {s.gameTimePercent}%
                      </td>
                      <td className="p-1.5 text-center">
                        {s.playedAsGoalkeeper ? '🧤 YES' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rested Players, Player of Match & Coach Notes Footer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-300 text-xs">
            <div className="p-3 border border-slate-300 rounded-xl bg-slate-50">
              <span className="font-bold uppercase text-[10px] text-slate-700 block mb-1">
                Rested Players (Rotation):
              </span>
              <p className="text-slate-700">
                {(squad.restedPlayerIds || [])
                  .map((id) => playerMap.get(id)?.name)
                  .filter(Boolean)
                  .join(', ') || 'None'}
              </p>
            </div>

            <div className="p-3 border border-slate-300 rounded-xl bg-slate-50">
              <span className="font-bold uppercase text-[10px] text-slate-700 block mb-1">
                ⭐ Player of the Match / Sportsmanship:
              </span>
              <p className="font-bold text-slate-900 mt-1">
                {potmPlayer
                  ? `${potmPlayer.squadNumber ? '#' + potmPlayer.squadNumber + ' ' : ''}${potmPlayer.name}`
                  : '[ ___________________________ ]'}
              </p>
            </div>

            <div className="p-3 border border-slate-300 rounded-xl bg-slate-50">
              <span className="font-bold uppercase text-[10px] text-slate-700 block mb-1">
                Match Sign-Off:
              </span>
              <div className="flex justify-between items-end h-7 text-[11px] text-slate-500">
                <span>Score: [ ___ - ___ ]</span>
                <span>Sign: ____________</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar (Hidden in Print) */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 print:hidden text-xs">
          <span className="text-slate-400">
            Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">Esc</kbd> or click outside to close
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold transition cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-lg shadow-sky-600/20 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
