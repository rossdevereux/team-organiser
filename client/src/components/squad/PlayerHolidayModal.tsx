import React, { useState } from 'react';
import { Player, Fixture } from '../../types';
import {
  Palmtree,
  CalendarDays,
  Calendar,
  AlertCircle,
  CalendarOff,
  Trash2,
  Plus,
  X,
} from 'lucide-react';

interface PlayerHolidayModalProps {
  player: Player | null;
  fixtures: Fixture[];
  onClose: () => void;
  onUpdatePlayer: (updated: Player) => Promise<void>;
}

export const PlayerHolidayModal: React.FC<PlayerHolidayModalProps> = ({
  player,
  fixtures,
  onClose,
  onUpdatePlayer,
}) => {
  const [holidayStartDate, setHolidayStartDate] = useState<string>('');
  const [holidayEndDate, setHolidayEndDate] = useState<string>('');
  const [holidaySingleDate, setHolidaySingleDate] = useState<string>('');

  if (!player) return null;

  const handleAddSingleHoliday = async () => {
    if (!holidaySingleDate) return;
    const currentDates = new Set(player.unavailableDates || []);
    currentDates.add(holidaySingleDate);

    const updated = {
      ...player,
      unavailableDates: Array.from(currentDates).sort(),
    };
    await onUpdatePlayer(updated);
    setHolidaySingleDate('');
  };

  const handleAddHolidayRange = async () => {
    if (!holidayStartDate || !holidayEndDate) return;
    const start = new Date(holidayStartDate);
    const end = new Date(holidayEndDate);
    if (end < start) return;

    const currentDates = new Set(player.unavailableDates || []);
    const curr = new Date(start);
    while (curr <= end) {
      currentDates.add(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    const updated = {
      ...player,
      unavailableDates: Array.from(currentDates).sort(),
    };
    await onUpdatePlayer(updated);
    setHolidayStartDate('');
    setHolidayEndDate('');
  };

  const handleToggleFixtureDate = async (fDate: string) => {
    const current = new Set(player.unavailableDates || []);
    if (current.has(fDate)) {
      current.delete(fDate);
    } else {
      current.add(fDate);
    }
    const updated = {
      ...player,
      unavailableDates: Array.from(current).sort(),
    };
    await onUpdatePlayer(updated);
  };

  const handleRemoveDate = async (targetDate: string) => {
    const current = (player.unavailableDates || []).filter((d) => d !== targetDate);
    const updated = {
      ...player,
      unavailableDates: current,
    };
    await onUpdatePlayer(updated);
  };

  const handleClearAllDates = async () => {
    const updated = {
      ...player,
      unavailableDates: [],
    };
    await onUpdatePlayer(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Palmtree className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Manage Holidays & Absences</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {player.name} {player.squadNumber ? `#${player.squadNumber}` : ''}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                The rotation algorithm will automatically exclude this player from matches on these dates.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
          {/* Option A: Add Date Range / Holiday */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <h4 className="font-semibold text-white flex items-center gap-1.5 text-xs">
              <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Holiday Date Range (e.g. Vacation / Half-Term)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">From Date</label>
                <input
                  type="date"
                  value={holidayStartDate}
                  onChange={(e) => setHolidayStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">To Date</label>
                <input
                  type="date"
                  value={holidayEndDate}
                  onChange={(e) => setHolidayEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddHolidayRange}
              disabled={!holidayStartDate || !holidayEndDate}
              className="w-full py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Holiday Range</span>
            </button>
          </div>

          {/* Option B: Add Single Date */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <h4 className="font-semibold text-white flex items-center gap-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>Add Single Unavailable Day</span>
            </h4>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={holidaySingleDate}
                onChange={(e) => setHolidaySingleDate(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-sky-500 font-medium"
              />
              <button
                type="button"
                onClick={handleAddSingleHoliday}
                disabled={!holidaySingleDate}
                className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Day</span>
              </button>
            </div>
          </div>

          {/* Option C: Quick Pick From Upcoming Fixtures */}
          {fixtures.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <h4 className="font-semibold text-white flex items-center gap-1.5 text-xs">
                <AlertCircle className="w-3.5 h-3.5 text-indigo-400" />
                <span>Quick-Toggle for Upcoming Fixture Dates</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {fixtures.map((f) => {
                  const isUnavailable = (player.unavailableDates || []).includes(f.date);
                  const fFormatted = new Date(f.date).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  });
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleToggleFixtureDate(f.date)}
                      className={`p-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                        isUnavailable
                          ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <span className="font-semibold block truncate">vs {f.opponent}</span>
                        <span className="text-[10px] text-slate-400">{fFormatted}</span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isUnavailable
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isUnavailable ? 'Away' : 'Available'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scheduled Absences List */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span>Scheduled Unavailable Dates ({player.unavailableDates?.length || 0})</span>
              </span>
              {(player.unavailableDates || []).length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllDates}
                  className="text-[11px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                >
                  Clear all dates
                </button>
              )}
            </div>

            {(player.unavailableDates || []).length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs">
                No holiday dates currently set. {player.name} is fully available for all matches.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {player.unavailableDates.map((dateStr) => {
                  const displayDate = new Date(dateStr).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  return (
                    <div
                      key={dateStr}
                      className="p-2.5 rounded-xl bg-slate-950 border border-rose-900/40 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <CalendarOff className="w-3.5 h-3.5 text-rose-400" />
                        <div>
                          <span className="font-semibold text-white block">{displayDate}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{dateStr}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDate(dateStr)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition cursor-pointer"
                        title="Remove date"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-lg shadow-sky-600/20 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
