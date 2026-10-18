import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchday } from '../context/MatchdayContext';
import { CheckCircle2, AlertTriangle, Wand2, Shield, Eye, Lock } from 'lucide-react';

export const RotationMatrix: React.FC = () => {
  const { t } = useTranslation();
  const {
    activeFixture,
    players,
    settings,
    stats,
    setActivePeriod,
    setActiveTab,
    autoRotateCurrentFixture,
    isPlayerFixed,
    getFixedPlayerPosition,
  } = useMatchday();

  if (!activeFixture || !activeFixture.matchSquad) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
        {t('matrix.noMatrix')} {t('matrix.clickToGenerate')}
      </div>
    );
  }

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const statsMap = new Map(stats.map((s) => [s.playerId, s]));

  const matchSquad = activeFixture.matchSquad;
  const periodCount = activeFixture.matchPeriodCount || settings.matchPeriodCount || 2;
  const periods = Array.from({ length: periodCount }, (_, i) => i + 1);

  // Helper to get status of player in given period
  const getPeriodStatus = (playerId: string, periodNum: number) => {
    const lineup = matchSquad.lineupsByPeriod.find((l) => l.period === periodNum);
    if (!lineup) return { type: 'unknown', label: '—' };

    const onPitch = lineup.onPitch.find((item) => item.playerId === playerId);
    if (onPitch) {
      return {
        type: 'pitch',
        position: onPitch.position,
        label: onPitch.position.replace('_', ' '),
        isGk: onPitch.position === 'GK',
      };
    }

    if (lineup.subs.includes(playerId)) {
      return { type: 'sub', label: t('matrix.sub') };
    }

    return { type: 'rested', label: t('matrix.rested') };
  };

  const matrixTitle =
    periodCount === 2
      ? t('matrix.halfMatrix')
      : t('matrix.periodMatrix', { count: periodCount });

  return (
    <div className="space-y-4">
      {/* Table Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-lg">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>{matrixTitle}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {t('common.target')}: {settings.targetGameTimePercent}%+
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            {t('matrix.subtitle')}
          </p>
        </div>

        <button
          onClick={() => autoRotateCurrentFixture()}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-sky-600/20 transition cursor-pointer"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>{t('lineup.autoRotate')}</span>
        </button>
      </div>

      {/* Matrix Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">{t('matrix.player')}</th>
                <th className="py-3 px-3 text-center">{t('matrix.pos')}</th>
                {periods.map((p) => (
                  <th key={p} className="py-3 px-3 text-center">
                    <button
                      onClick={() => {
                        setActivePeriod(p);
                        setActiveTab('lineup');
                      }}
                      className="hover:text-sky-400 transition inline-flex items-center gap-1 cursor-pointer font-bold"
                      title={`Jump to Period ${p} on Pitch`}
                    >
                      <span>{periodCount === 2 ? (p === 1 ? t('lineup.firstHalf') : t('lineup.secondHalf')) : t('lineup.periodN', { period: p })}</span>
                      <Eye className="w-3 h-3 text-slate-500" />
                    </button>
                  </th>
                ))}
                <th className="py-3 px-3 text-center">{t('matrix.totalMins')}</th>
                <th className="py-3 px-3 text-center">{t('matrix.percentPlayed')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {players.map((player) => {
                const pStats = statsMap.get(player.id);
                const minutes = pStats?.minutesPlayed || 0;
                const percent = pStats?.gameTimePercent || 0;
                const meetsTarget = percent >= settings.targetGameTimePercent;
                const fixed = isPlayerFixed(player.id);
                const fixedPos = getFixedPlayerPosition(player.id);

                return (
                  <tr
                    key={player.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Player Info */}
                    <td className="py-2.5 px-4 font-medium text-white flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px] border border-slate-700">
                          {player.squadNumber || '—'}
                        </span>
                        <span className="font-semibold">{player.name}</span>
                      </div>
                      {fixed && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1"
                          title={`Locked as ${fixedPos} for this fixture`}
                        >
                          <Lock className="w-2.5 h-2.5" />
                          <span>{fixedPos}</span>
                        </span>
                      )}
                    </td>

                    {/* Preferred Position */}
                    <td className="py-2.5 px-3 text-center text-[11px] text-slate-400">
                      {player.preferredPositions.join(', ')}
                    </td>

                    {/* Status per period */}
                    {periods.map((p) => {
                      const status = getPeriodStatus(player.id, p);
                      return (
                        <td key={p} className="py-2.5 px-3 text-center">
                          {status.type === 'pitch' ? (
                            <span
                              className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                status.isGk
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {status.label}
                            </span>
                          ) : status.type === 'sub' ? (
                            <span className="inline-block px-2 py-1 rounded-md text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                              {status.label}
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-1 rounded-md text-[10px] font-semibold bg-slate-800/40 text-slate-500 border border-slate-800">
                              {status.label}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Total Minutes */}
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-200">
                      {minutes} {t('common.mins')}
                    </td>

                    {/* % Played + Target indicator */}
                    <td className="py-2.5 px-3 text-center font-mono">
                      <div className="flex items-center justify-center gap-1.5">
                        <span
                          className={`font-bold ${
                            meetsTarget ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {percent}%
                        </span>
                        {meetsTarget ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
