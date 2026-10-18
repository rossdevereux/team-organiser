import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchday } from '../context/MatchdayContext';
import { Player } from '../types';
import { EmptyState } from './EmptyState';
import { useToast } from '../context/ToastContext';
import {
  Users,
  UserPlus,
  Trash2,
  Edit2,
  Palmtree,
  Download,
  Upload,
  Lock,
} from 'lucide-react';
import { getPlayerInitials } from '../utils/playerUtils';
import { getTodayDateString } from '../utils/dateUtils';
import { CSVImportModal } from './squad/CSVImportModal';
import { PlayerHolidayModal } from './squad/PlayerHolidayModal';
import { PlayerFormModal } from './squad/PlayerFormModal';

export const SquadManager: React.FC = () => {
  const {
    players,
    fixtures,
    activeFixture,
    createPlayer,
    bulkCreatePlayers,
    updatePlayer,
    deletePlayer,
  } = useMatchday();

  const { showToast } = useToast();
  const { t } = useTranslation();

  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [managingHolidaysPlayer, setManagingHolidaysPlayer] = useState<Player | null>(null);

  const fixtureDate = activeFixture?.date || getTodayDateString();

  const handleExportCSV = () => {
    if (players.length === 0) return;
    const headers = [
      'Name',
      'SquadNumber',
      'PreferredPositions',
      'SpecificPositions',
      'SignOnDate',
      'LeaveDate',
      'MatchesPlayed',
      'TotalMinutesPlayed',
    ];
    const rows = players.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`,
      p.squadNumber !== undefined ? p.squadNumber : '',
      `"${p.preferredPositions.join(';')}"`,
      `"${(p.specificPositions || []).join(';')}"`,
      p.signOnDate || '',
      p.leaveDate || '',
      p.matchesPlayed || 0,
      p.totalMinutesPlayed || 0,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `squad_roster_${getTodayDateString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStartAdd = () => {
    setEditingPlayer(null);
    setIsFormOpen(true);
  };

  const handleStartEdit = (p: Player) => {
    setEditingPlayer(p);
    setIsFormOpen(true);
  };

  const handleSavePlayer = async (playerData: {
    name: string;
    squadNumber?: number;
    preferredPositions: Player['preferredPositions'];
    specificPositions?: string[];
    isFixedPosition?: boolean;
    fixedPosition?: string;
    signOnDate?: string;
    leaveDate?: string;
  }) => {
    if (editingPlayer) {
      await updatePlayer({
        ...editingPlayer,
        ...playerData,
      });
      showToast(t('squad.saveSuccess'), 'success');
    } else {
      await createPlayer({
        ...playerData,
        unavailableDates: [],
        matchesPlayed: 0,
        totalMinutesPlayed: 0,
      });
      showToast(t('squad.saveSuccess'), 'success');
    }
    setIsFormOpen(false);
    setEditingPlayer(null);
  };

  const handleBulkImport = async (parsedPlayers: Partial<Player>[]) => {
    await bulkCreatePlayers(parsedPlayers);
  };

  const handleUpdateHolidayPlayer = async (updated: Player) => {
    await updatePlayer(updated);
    setManagingHolidaysPlayer(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{t('squad.title')} ({players.length})</h2>
            <p className="text-xs text-slate-400">
              {t('squad.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={players.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition cursor-pointer disabled:opacity-40"
            title="Download full squad roster as CSV file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('squad.exportCSV')}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold text-xs transition cursor-pointer"
            title="Bulk import squad roster from CSV or spreadsheet copy-paste"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{t('squad.importCSV')}</span>
          </button>

          <button
            type="button"
            onClick={handleStartAdd}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-lg shadow-sky-600/20 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('squad.addPlayer')}</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      <PlayerFormModal
        isOpen={isFormOpen}
        initialPlayer={editingPlayer}
        onClose={() => {
          setIsFormOpen(false);
          setEditingPlayer(null);
        }}
        onSave={handleSavePlayer}
      />

      {/* CSV Import Modal */}
      <CSVImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportPlayers={handleBulkImport}
      />

      {/* Holiday / Absence Management Modal */}
      <PlayerHolidayModal
        player={managingHolidaysPlayer}
        fixtures={fixtures}
        onClose={() => setManagingHolidaysPlayer(null)}
        onUpdatePlayer={handleUpdateHolidayPlayer}
      />

      {/* Players List Grid or Illustrated Empty State */}
      {players.length === 0 ? (
        <EmptyState
          variant="roster"
          title={t('squad.noPlayers')}
          description={t('squad.noPlayersDesc')}
          action={{
            label: t('squad.addPlayer'),
            onClick: handleStartAdd,
            icon: UserPlus,
          }}
          secondaryAction={{
            label: t('squad.importCSV'),
            onClick: () => setIsImportModalOpen(true),
            icon: Upload,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((player) => {
            const isUnavailableThisFixture = (player.unavailableDates || []).includes(fixtureDate);
            const holidayCount = (player.unavailableDates || []).length;
            const isNotSignedOnYet = Boolean(player.signOnDate && fixtureDate && fixtureDate < player.signOnDate);
            const hasLeftSquad = Boolean(player.leaveDate && fixtureDate && fixtureDate > player.leaveDate);
            const isInactiveForFixture = isUnavailableThisFixture || isNotSignedOnYet || hasLeftSquad;

            return (
              <div
                key={player.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  isInactiveForFixture
                    ? 'bg-slate-950/60 border-rose-900/40'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-white font-extrabold flex items-center justify-center text-sm border border-slate-700/60 shadow shrink-0">
                      {player.squadNumber ? `#${player.squadNumber}` : getPlayerInitials(player.name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-bold text-white leading-tight">{player.name}</h3>
                        {player.isFixedPosition && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Fixed: {player.fixedPosition || 'GK'}</span>
                          </span>
                        )}
                        {isNotSignedOnYet && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                            Not Signed On Yet
                          </span>
                        )}
                        {hasLeftSquad && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                            Left Squad
                          </span>
                        )}
                        {isUnavailableThisFixture && !isNotSignedOnYet && !hasLeftSquad && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                            Away Next Match
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {player.preferredPositions.map((pos, pIdx) => (
                          <span
                            key={pos}
                            className={`text-[10px] px-2 py-0.5 rounded font-medium flex items-center gap-1 ${
                              pIdx === 0
                                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            <span className="text-[9px] opacity-70 font-mono">#{pIdx + 1}</span>
                            <span>{pos}</span>
                            {pIdx === 0 && player.preferredPositions.length > 1 && (
                              <span className="text-[8px] uppercase tracking-wider text-sky-400 font-bold">Primary</span>
                            )}
                          </span>
                        ))}
                      </div>
                      {player.specificPositions && player.specificPositions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {player.specificPositions.map((sp) => (
                            <span
                              key={sp}
                              className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium"
                            >
                              {sp}
                            </span>
                          ))}
                        </div>
                      )}
                      {(player.signOnDate || player.leaveDate) && (
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                          {player.signOnDate && (
                            <span>Signed: {new Date(player.signOnDate).toLocaleDateString('en-GB')}</span>
                          )}
                          {player.signOnDate && player.leaveDate && <span>•</span>}
                          {player.leaveDate && (
                            <span className="text-rose-400/90">Left: {new Date(player.leaveDate).toLocaleDateString('en-GB')}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(player)}
                      className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center justify-center cursor-pointer"
                      title="Edit player"
                      aria-label={`Edit ${player.name}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Remove ${player.name} from squad?`)) {
                          deletePlayer(player.id);
                          showToast('Player removed from squad.', 'info');
                        }
                      }}
                      className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 transition flex items-center justify-center cursor-pointer"
                      title="Delete player"
                      aria-label={`Delete ${player.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Season Stats & Holidays Button */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                    <span>{player.matchesPlayed} matches</span>
                    <span>•</span>
                    <span>{player.totalMinutesPlayed}m</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setManagingHolidaysPlayer(player)}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold tracking-tight transition cursor-pointer flex items-center gap-1.5 ${
                      holidayCount > 0
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                        : 'bg-slate-800/80 text-slate-300 border border-slate-700 hover:text-white hover:bg-slate-700'
                    }`}
                    title="Manage holiday and absence dates"
                  >
                    <Palmtree className="w-3.5 h-3.5 text-amber-400" />
                    <span>{holidayCount > 0 ? `${holidayCount} Holidays` : 'Add Holidays'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
