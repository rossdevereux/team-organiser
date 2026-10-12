import React, { useState, useEffect } from 'react';
import { Player, BroadPosition, SPECIFIC_POSITIONS_MAP } from '../../types';
import { Sparkles, X, Star, ArrowUp, ArrowDown, Check } from 'lucide-react';

const ALL_POSITIONS: BroadPosition[] = ['Goalkeeper', 'Defence', 'Midfield', 'Attack'];

interface PlayerFormModalProps {
  isOpen: boolean;
  initialPlayer: Player | null;
  onClose: () => void;
  onSave: (playerData: {
    name: string;
    squadNumber?: number;
    preferredPositions: BroadPosition[];
    specificPositions?: string[];
    signOnDate?: string;
    leaveDate?: string;
  }) => Promise<void>;
}

export const PlayerFormModal: React.FC<PlayerFormModalProps> = ({
  isOpen,
  initialPlayer,
  onClose,
  onSave,
}) => {
  const isEditing = Boolean(initialPlayer);

  const [name, setName] = useState<string>('');
  const [squadNumber, setSquadNumber] = useState<string>('');
  const [preferredPositions, setPreferredPositions] = useState<BroadPosition[]>(['Midfield']);
  const [specificPositions, setSpecificPositions] = useState<string[]>([]);
  const [signOnDate, setSignOnDate] = useState<string>('');
  const [leaveDate, setLeaveDate] = useState<string>('');

  useEffect(() => {
    if (initialPlayer) {
      setName(initialPlayer.name);
      setSquadNumber(initialPlayer.squadNumber ? String(initialPlayer.squadNumber) : '');
      setPreferredPositions(initialPlayer.preferredPositions.length > 0 ? initialPlayer.preferredPositions : ['Midfield']);
      setSpecificPositions(initialPlayer.specificPositions || []);
      setSignOnDate(initialPlayer.signOnDate || '');
      setLeaveDate(initialPlayer.leaveDate || '');
    } else {
      setName('');
      setSquadNumber('');
      setPreferredPositions(['Midfield']);
      setSpecificPositions([]);
      setSignOnDate('');
      setLeaveDate('');
    }
  }, [initialPlayer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const num = squadNumber.trim() ? parseInt(squadNumber, 10) : undefined;
    await onSave({
      name: name.trim(),
      squadNumber: num,
      preferredPositions,
      specificPositions,
      signOnDate: signOnDate || undefined,
      leaveDate: leaveDate || undefined,
    });
  };

  const togglePosition = (pos: BroadPosition) => {
    if (preferredPositions.includes(pos)) {
      if (preferredPositions.length > 1) {
        setPreferredPositions(preferredPositions.filter((p) => p !== pos));
      }
    } else {
      setPreferredPositions([...preferredPositions, pos]);
    }
  };

  const movePositionPriority = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= preferredPositions.length) return;
    const newPositions = [...preferredPositions];
    const [moved] = newPositions.splice(index, 1);
    newPositions.splice(targetIndex, 0, moved);
    setPreferredPositions(newPositions);
  };

  const setPrimaryPosition = (pos: BroadPosition) => {
    if (!preferredPositions.includes(pos)) {
      setPreferredPositions([pos, ...preferredPositions]);
    } else {
      setPreferredPositions([pos, ...preferredPositions.filter((p) => p !== pos)]);
    }
  };

  const toggleSpecificPosition = (specPos: string, broadCategory: BroadPosition) => {
    if (specificPositions.includes(specPos)) {
      setSpecificPositions(specificPositions.filter((s) => s !== specPos));
    } else {
      setSpecificPositions([...specificPositions, specPos]);
      if (!preferredPositions.includes(broadCategory)) {
        setPreferredPositions([...preferredPositions, broadCategory]);
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 rounded-2xl bg-slate-900 border border-sky-500/40 shadow-2xl space-y-4 animate-fade-in"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span>{isEditing ? 'Edit Player Details' : 'Add Player to Squad'}</span>
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block text-slate-400 font-semibold mb-1">Player Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Leo Davies"
            required
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Squad Number</label>
          <input
            type="number"
            value={squadNumber}
            onChange={(e) => setSquadNumber(e.target.value)}
            placeholder="e.g. 7"
            min="1"
            max="99"
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500 font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block text-slate-400 font-semibold mb-1">
            Sign-on Date (Registered) <span className="text-slate-500 font-normal">(Optional)</span>
          </label>
          <input
            type="date"
            value={signOnDate}
            onChange={(e) => setSignOnDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500 font-medium"
          />
          <span className="text-[10px] text-slate-500">Player cannot be picked before this date</span>
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">
            Leave Date (Transferred / Inactive) <span className="text-slate-500 font-normal">(Optional)</span>
          </label>
          <input
            type="date"
            value={leaveDate}
            onChange={(e) => setLeaveDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500 font-medium"
          />
          <span className="text-[10px] text-slate-500">Player cannot be picked after this date</span>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="block text-slate-400 font-semibold text-xs">
            Preferred Positions & Preference Order
          </label>
          <span className="text-[10px] text-slate-500">
            #1 is Primary, #2 is Secondary for team selection & subs
          </span>
        </div>

        {/* Position Category Buttons */}
        <div className="flex flex-wrap gap-2">
          {ALL_POSITIONS.map((pos) => {
            const index = preferredPositions.indexOf(pos);
            const isSelected = index !== -1;
            const isPrimary = index === 0;

            return (
              <button
                key={pos}
                type="button"
                onClick={() => togglePosition(pos)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? isPrimary
                      ? 'bg-sky-500/25 text-sky-200 border-sky-400/80 shadow-md ring-1 ring-sky-400/30'
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {isSelected ? (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                      isPrimary
                        ? 'bg-sky-500 text-slate-950'
                        : 'bg-indigo-500/40 text-indigo-200'
                    }`}
                  >
                    #{index + 1}
                  </span>
                ) : null}
                <span>{pos}</span>
                {isPrimary && (
                  <span className="text-[9px] uppercase tracking-wider font-bold text-sky-400">
                    Primary
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Preference Order Ranking Panel */}
        {preferredPositions.length > 1 && (
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 animate-fade-in">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Position Preference Ranking (Sub & Formation Priority)
            </span>
            <div className="space-y-1.5">
              {preferredPositions.map((pos, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === preferredPositions.length - 1;
                return (
                  <div
                    key={pos}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                          isFirst
                            ? 'bg-sky-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-white">{pos}</span>
                      <span className="text-[10px] text-slate-500">
                        {isFirst
                          ? '(1st Choice / Primary)'
                          : idx === 1
                          ? '(2nd Choice / Secondary)'
                          : `(${idx + 1}rd Choice)`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {!isFirst && (
                        <button
                          type="button"
                          onClick={() => setPrimaryPosition(pos)}
                          className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 font-semibold transition cursor-pointer flex items-center gap-1"
                          title="Set as 1st preference"
                        >
                          <Star className="w-2.5 h-2.5" />
                          <span>Make Primary</span>
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => movePositionPriority(idx, 'up')}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition cursor-pointer"
                        title="Move up priority"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => movePositionPriority(idx, 'down')}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition cursor-pointer"
                        title="Move down priority"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Specific Position Roles Selector */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <label className="block text-slate-400 font-semibold text-xs">
            Specific Position Roles <span className="text-slate-500 font-normal">(Optional — select specific tactical roles)</span>
          </label>
          {specificPositions.length > 0 && (
            <button
              type="button"
              onClick={() => setSpecificPositions([])}
              className="text-[10px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
            >
              Clear specific roles ({specificPositions.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {ALL_POSITIONS.map((category) => {
            const roles = SPECIFIC_POSITIONS_MAP[category] || [];
            const isBroadActive = preferredPositions.includes(category);

            return (
              <div
                key={category}
                className={`p-2.5 rounded-xl border transition ${
                  isBroadActive
                    ? 'bg-slate-950/80 border-slate-800'
                    : 'bg-slate-950/30 border-slate-900/80 opacity-70'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>{category} Roles</span>
                  {isBroadActive && (
                    <span className="text-[9px] text-sky-400 font-medium">Selected Broad</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {roles.map((role) => {
                    const isSelected = specificPositions.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleSpecificPosition(role, category)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/50 shadow-sm font-semibold'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-indigo-400 shrink-0" />}
                        <span>{role}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-1.5 rounded-xl bg-slate-850 text-slate-400 hover:text-white text-xs font-semibold transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition cursor-pointer"
        >
          {isEditing ? 'Update Player' : 'Save Player'}
        </button>
      </div>
    </form>
  );
};
