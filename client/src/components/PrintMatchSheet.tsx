import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchday } from '../context/MatchdayContext';
import { Printer, X, Download, ShieldCheck } from 'lucide-react';
import { trackPrintSheet } from '../utils/analytics';

interface PrintMatchSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrintMatchSheet: React.FC<PrintMatchSheetProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { activeFixture, players, settings, stats, activeTeam } = useMatchday();

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

  useEffect(() => {
    if (isOpen && activeFixture) {
      trackPrintSheet({
        type: 'match_sheet',
        fixtureId: activeFixture.id,
        teamId: activeTeam?.id,
      });
    }
  }, [isOpen, activeFixture?.id, activeTeam?.id]);

  if (!isOpen || !activeFixture || !activeFixture.matchSquad) return null;

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const squad = activeFixture.matchSquad;
  const periodCount = activeFixture.matchPeriodCount || settings.matchPeriodCount || 2;
  const periodDuration = activeFixture.periodDurationMinutes || settings.periodDurationMinutes || 25;
  const pitchCount = activeFixture.pitchPlayerCount || settings.pitchPlayerCount || 7;
  const formationName = activeFixture.formation || settings.defaultFormation;
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
      role="dialog"
      aria-modal="true"
      aria-label="Official Matchday Pitch Sheet & PDF Export"
      onClick={onClose}
      className="official-print-modal fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-6 py-6 sm:py-8 bg-black/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto print:block print:w-full"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl print:bg-white print:text-black print:border-none print:shadow-none print:max-w-none print:w-full flex flex-col"
      >
        {/* Sticky Modal Actions (Hidden in Print) */}
        <div className="sticky top-0 z-20 px-6 py-4 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">
              {t('modals.printSheetTitle')}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-lg shadow-sky-600/20 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{t('common.printSheet')}</span>
            </button>
            <button
              onClick={onClose}
              className="min-h-[44px] flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Close print preview (Esc)"
            >
              <X className="w-4 h-4" />
              <span>{t('common.close')}</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 print:p-0 print:space-y-0">
          {/* Printable Document Area */}
          <div className="print-area bg-white text-slate-900 p-6 sm:p-8 rounded-2xl space-y-6 print:p-0 print:space-y-4 print:rounded-none" data-context="print">
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
                <h1 className="text-2xl font-black tracking-tight text-slate-950 mt-0.5">
                  Official Matchday Lineup & Referee Sheet
                </h1>
              </div>
            </div>

            {/* Quick Metadata Box */}
            <div className="bg-slate-100 border border-slate-300 rounded-xl p-3 text-xs space-y-1 font-mono md:text-right shrink-0">
              <div>
                <span className="text-slate-500 font-sans">Date: </span>
                <strong className="text-slate-900">{formattedDate}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-sans">Kick-Off: </span>
                <strong className="text-slate-900">{activeFixture.kickOffTime || '10:00'}</strong>
                <span className="text-slate-500 font-sans"> (Meet: {activeFixture.meetTime || '09:30'})</span>
              </div>
              <div>
                <span className="text-slate-500 font-sans">Format: </span>
                <strong className="text-slate-900">{pitchCount}-a-side ({formationName})</strong>
              </div>
            </div>
          </div>

          {/* Teams and Match Information */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Home Team</span>
              <p className="text-base font-bold text-slate-950 mt-0.5">
                {activeFixture.venue !== 'Away' ? activeTeam?.name || 'Our Team' : activeFixture.opponent}
              </p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Away Team</span>
              <p className="text-base font-bold text-slate-950 mt-0.5">
                {activeFixture.venue === 'Away' ? activeTeam?.name || 'Our Team' : activeFixture.opponent}
              </p>
            </div>
          </div>

          {/* Venue & Pitch Address */}
          {activeFixture.groundAddress && (
            <div className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2">
              <span className="font-bold text-slate-700 shrink-0">Ground / Venue:</span>
              <span className="text-slate-900 font-mono">{activeFixture.groundAddress}</span>
            </div>
          )}

          {/* Matchday Captain & Player of Match Accolades */}
          {(captainPlayer || potmPlayer) && (
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              {captainPlayer && (
                <div className="p-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-950">
                  <span className="text-[10px] uppercase font-sans font-bold text-amber-800 block">Match Captain ©</span>
                  <span className="font-bold text-sm">#{captainPlayer.squadNumber || '—'} {captainPlayer.name}</span>
                </div>
              )}
              {potmPlayer && (
                <div className="p-2.5 rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-950">
                  <span className="text-[10px] uppercase font-sans font-bold text-indigo-800 block">Player of the Match ★</span>
                  <span className="font-bold text-sm">#{potmPlayer.squadNumber || '—'} {potmPlayer.name}</span>
                </div>
              )}
            </div>
          )}

          {/* Period-by-Period Lineup Breakdown Tables */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 flex items-center justify-between">
              <span>Period-by-Period Player Rotations</span>
              <span className="text-xs font-normal text-slate-500 lowercase">
                {periodCount} periods • {periodDuration} mins each • {pitchCount} on pitch
              </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {periods.map((periodNum) => {
                const lineup = squad.lineupsByPeriod.find((l) => l.period === periodNum);
                const onPitchPlayers = (lineup?.onPitch || []).map((entry) => ({
                  ...entry,
                  player: playerMap.get(entry.playerId),
                }));
                const subPlayers = (lineup?.subs || [])
                  .map((id) => playerMap.get(id))
                  .filter(Boolean);

                return (
                  <div
                    key={periodNum}
                    className="border border-slate-300 rounded-xl overflow-hidden text-xs"
                  >
                    <div className="bg-slate-100 px-3 py-2 border-b border-slate-300 flex items-center justify-between font-bold">
                      <span>
                        {periodCount === 2
                          ? periodNum === 1
                            ? '1st Half'
                            : (activeFixture.preserveLineupAcrossBreaks ||
                               settings.preserveLineupAcrossBreaks ||
                               activeFixture.subTimingMode === 'in_game_rolling' ||
                               settings.subTimingMode === 'in_game_rolling')
                            ? '2nd Half (Continuous Lineup)'
                            : '2nd Half'
                          : `Period ${periodNum}`}
                      </span>
                      <span className="font-mono text-[11px] text-slate-600">
                        {onPitchPlayers.length} Active / {subPlayers.length} Subs
                      </span>
                    </div>

                    <div className="p-3 space-y-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                          On Pitch ({onPitchPlayers.length})
                        </span>
                        <div className="grid grid-cols-1 gap-1 font-mono">
                          {onPitchPlayers.map((entry, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between py-0.5 px-1.5 rounded bg-slate-50 border border-slate-200"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-500 w-5">
                                  {entry.player?.squadNumber ? `#${entry.player.squadNumber}` : '—'}
                                </span>
                                <span className="font-sans font-semibold text-slate-900">
                                  {entry.player?.name || 'Unknown'}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  entry.position === 'GK'
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                }`}
                              >
                                {entry.position}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {subPlayers.length > 0 && (
                        <div className="pt-2 border-t border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                            Substitutes Bench ({subPlayers.length})
                          </span>
                          <div className="flex flex-wrap gap-1 font-mono">
                            {subPlayers.map((p, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-[11px] text-slate-700"
                              >
                                #{p?.squadNumber || '—'} {p?.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Planned In-Game Rolling Substitutions Section */}
          {squad.plannedInGameSubs && squad.plannedInGameSubs.length > 0 && (
            <div className="pt-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2 flex items-center justify-between">
                <span>Planned Mid-Period Rolling Substitutions</span>
                <span className="text-xs font-normal text-slate-500 lowercase">
                  Continuous lineups across breaks • In-game rotation plan
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                {squad.plannedInGameSubs.map((ps, idx) => {
                  const outP = playerMap.get(ps.playerOutId);
                  const inP = playerMap.get(ps.playerInId);
                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-slate-300 bg-slate-50 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          {periodCount === 2
                            ? ps.period === 1
                              ? '1st Half'
                              : '2nd Half'
                            : `Period ${ps.period}`}{' '}
                          (~{ps.targetMinute}m / Match min {ps.matchMinute})
                        </div>
                        <div className="text-[11px] text-slate-700 mt-0.5">
                          <span className="text-rose-700 font-bold">OFF:</span> #
                          {outP?.squadNumber || '—'} {outP?.name || ps.playerOutName || 'Player'}{' '}
                          ➔{' '}
                          <span className="text-emerald-700 font-bold">ON:</span> #
                          {inP?.squadNumber || '—'} {inP?.name || ps.playerInName || 'Player'}
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-[10px]">
                        {ps.position}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full Squad Attendance and Season Minutes Audit */}
          <div className="pt-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
              Matchday Squad Roster & Target Game Time
            </h2>
            <table className="w-full text-xs text-left border border-slate-300">
              <thead className="bg-slate-100 border-b border-slate-300 font-bold font-mono text-[11px]">
                <tr>
                  <th className="p-2">No.</th>
                  <th className="p-2">Player Name</th>
                  <th className="p-2">Position(s)</th>
                  <th className="p-2 text-center">Periods Played</th>
                  <th className="p-2 text-right">Est. Minutes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {squad.selectedPlayerIds.map((id) => {
                  const p = playerMap.get(id);
                  const playerStat = stats?.find((st) => st.playerId === id);
                  let periodsPlayed = playerStat?.periodsPlayed?.length ?? 0;
                  if (periodsPlayed === 0) {
                    squad.lineupsByPeriod.forEach((l) => {
                      if (l.onPitch.some((item) => item.playerId === id)) {
                        periodsPlayed++;
                      }
                    });
                  }
                  const estMins = playerStat ? playerStat.minutesPlayed : periodsPlayed * periodDuration;

                  return (
                    <tr key={id}>
                      <td className="p-2 font-bold">{p?.squadNumber || '—'}</td>
                      <td className="p-2 font-sans font-semibold">{p?.name}</td>
                      <td className="p-2 text-slate-600">{p?.preferredPositions.join(', ')}</td>
                      <td className="p-2 text-center font-bold">
                        {periodsPlayed} / {periodCount}
                      </td>
                      <td className="p-2 text-right font-bold text-emerald-800">{estMins}m</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Official Referee & Coach Sign-off Section */}
          <div className="pt-4 border-t-2 border-slate-900 grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs">
            <div className="space-y-6">
              <span className="font-bold text-slate-700 block">Team Coach Signature:</span>
              <div className="border-b border-slate-400 w-full" />
            </div>
            <div className="space-y-6">
              <span className="font-bold text-slate-700 block">Opponent Coach Signature:</span>
              <div className="border-b border-slate-400 w-full" />
            </div>
            <div className="space-y-6">
              <span className="font-bold text-slate-700 block">Referee Sign-off & Score:</span>
              <div className="border-b border-slate-400 w-full" />
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
