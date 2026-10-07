import React, { useState, useEffect } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import { Users, Check, X, Wand2, AlertTriangle, ArrowRight, Clock, UserX } from 'lucide-react';

interface MatchdaySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MatchdaySelectorModal: React.FC<MatchdaySelectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { activeFixture, players, settings, autoRotateCurrentFixture } = useMatchday();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const squadCap = settings.matchdaySquadCap || 10;
  const fixtureDate = activeFixture?.date || '';

  const getPlayerEligibility = (player: (typeof players)[0]) => {
    const isBeforeSignOn = Boolean(player.signOnDate && fixtureDate && fixtureDate < player.signOnDate);
    const isAfterLeave = Boolean(player.leaveDate && fixtureDate && fixtureDate > player.leaveDate);
    const isOnHoliday = Boolean(player.unavailableDates && player.unavailableDates.includes(fixtureDate));
    const isEligible = !isBeforeSignOn && !isAfterLeave && !isOnHoliday;

    let reason = '';
    if (isBeforeSignOn) {
      reason = `Sign-on date (${player.signOnDate}) is after this fixture date (${fixtureDate})`;
    } else if (isAfterLeave) {
      reason = `Player left squad on ${player.leaveDate} (before this fixture date: ${fixtureDate})`;
    } else if (isOnHoliday) {
      reason = `Registered as on holiday / absent on ${fixtureDate}`;
    }

    return {
      isEligible,
      isBeforeSignOn,
      isAfterLeave,
      isOnHoliday,
      reason,
    };
  };

  useEffect(() => {
    const eligibleSet = new Set(
      players
        .filter((p) => {
          const isBeforeSignOn = Boolean(p.signOnDate && fixtureDate && fixtureDate < p.signOnDate);
          const isAfterLeave = Boolean(p.leaveDate && fixtureDate && fixtureDate > p.leaveDate);
          const isOnHoliday = Boolean(p.unavailableDates && p.unavailableDates.includes(fixtureDate));
          return !isBeforeSignOn && !isAfterLeave && !isOnHoliday;
        })
        .map((p) => p.id)
    );

    if (activeFixture?.matchSquad?.selectedPlayerIds) {
      const filtered = activeFixture.matchSquad.selectedPlayerIds.filter(
        (id) => eligibleSet.has(id)
      );
      setSelectedIds(filtered);
    } else {
      const available = players.filter((p) => eligibleSet.has(p.id));
      setSelectedIds(available.slice(0, squadCap).map((p) => p.id));
    }
  }, [activeFixture, players, squadCap, fixtureDate]);

  if (!isOpen || !activeFixture) return null;

  const toggleSelection = (id: string) => {
    const player = players.find((p) => p.id === id);
    if (!player) return;

    const { isEligible, reason } = getPlayerEligibility(player);
    if (!isEligible && !selectedIds.includes(id)) {
      alert(`${player.name} cannot be selected: ${reason}.`);
      return;
    }

    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((pId) => pId !== id));
    } else {
      if (selectedIds.length < squadCap) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  // Smart auto-select prioritising eligible players with fewer matches/minutes
  const handleSmartSelect = () => {
    const available = players.filter((p) => {
      const isBeforeSignOn = Boolean(p.signOnDate && fixtureDate && fixtureDate < p.signOnDate);
      const isAfterLeave = Boolean(p.leaveDate && fixtureDate && fixtureDate > p.leaveDate);
      const isOnHoliday = Boolean(p.unavailableDates && p.unavailableDates.includes(fixtureDate));
      return !isBeforeSignOn && !isAfterLeave && !isOnHoliday;
    });

    available.sort((a, b) => {
      if (a.matchesPlayed !== b.matchesPlayed) {
        return a.matchesPlayed - b.matchesPlayed;
      }
      return a.totalMinutesPlayed - b.totalMinutesPlayed;
    });

    const smartPick = available.slice(0, squadCap).map((p) => p.id);
    setSelectedIds(smartPick);
  };

  const handleApply = async () => {
    await autoRotateCurrentFixture(selectedIds);
    onClose();
  };

  const restedCount = players.length - selectedIds.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Select Matchday Squad</h3>
              <p className="text-xs text-slate-400">
                Pick {squadCap} matchday players vs {activeFixture.opponent} ({restedCount} rested)
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

        {/* Selection Counter & Smart Auto-Pick */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg ${
                selectedIds.length === squadCap
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {selectedIds.length} / {squadCap} Selected
            </span>
            <span className="text-xs text-slate-400">
              {restedCount} players will be rotated off
            </span>
          </div>

          <button
            type="button"
            onClick={handleSmartSelect}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-sky-400 hover:text-sky-300 font-semibold text-xs border border-sky-500/30 transition cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Smart Auto-Select Fair 10</span>
          </button>
        </div>

        {/* Player Selection List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {players.map((player) => {
            const isSelected = selectedIds.includes(player.id);
            const { isEligible, isBeforeSignOn, isAfterLeave, isOnHoliday } = getPlayerEligibility(player);

            return (
              <div
                key={player.id}
                onClick={() => toggleSelection(player.id)}
                className={`p-3 rounded-xl border flex items-center justify-between transition ${
                  !isEligible
                    ? 'bg-slate-950/30 border-rose-900/20 opacity-60 cursor-not-allowed'
                    : isSelected
                    ? 'bg-sky-950/40 border-sky-500/50 shadow-sm cursor-pointer'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition ${
                      isSelected
                        ? 'bg-sky-500 text-slate-950 font-black'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isSelected ? <Check className="w-3.5 h-3.5" /> : player.squadNumber || '—'}
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-white block">
                      {player.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {player.preferredPositions.join(', ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  {isBeforeSignOn && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-semibold">
                      <Clock className="w-3 h-3 text-amber-400" /> Starts {player.signOnDate}
                    </span>
                  )}

                  {isAfterLeave && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-semibold">
                      <UserX className="w-3 h-3 text-rose-400" /> Left {player.leaveDate}
                    </span>
                  )}

                  {isOnHoliday && !isBeforeSignOn && !isAfterLeave && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-semibold">
                      <AlertTriangle className="w-3 h-3 text-rose-400" /> Away Next Match
                    </span>
                  )}

                  <span className="text-[11px] font-mono text-slate-400">
                    {player.matchesPlayed} matches • {player.totalMinutesPlayed}m
                  </span>

                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      !isEligible
                        ? 'bg-slate-800 text-slate-500'
                        : isSelected
                        ? 'bg-sky-500/20 text-sky-300'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {!isEligible ? 'Ineligible' : isSelected ? 'Matchday' : 'Rested'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={selectedIds.length !== squadCap}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs shadow-lg shadow-sky-600/20 transition cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Apply Squad & Auto-Rotate</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
