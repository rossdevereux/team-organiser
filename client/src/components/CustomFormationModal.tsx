import React, { useState } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import { Formation, PositionSlot, BroadPosition } from '../types';
import { Layers, X, Plus, Trash2, Check, Sparkles } from 'lucide-react';

interface CustomFormationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: BroadPosition[] = ['Goalkeeper', 'Defence', 'Midfield', 'Attack'];

export const CustomFormationModal: React.FC<CustomFormationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { settings, createCustomFormation } = useMatchday();
  const teamSize = settings.pitchPlayerCount || 7;

  const [name, setName] = useState('');
  const [slots, setSlots] = useState<PositionSlot[]>([
    { code: 'GK', label: 'Goalkeeper', category: 'Goalkeeper', x: 50, y: 88 },
  ]);

  if (!isOpen) return null;

  const handleAddSlot = (category: BroadPosition) => {
    if (slots.length >= teamSize) return;

    let defaultY = 50;
    if (category === 'Goalkeeper') defaultY = 88;
    else if (category === 'Defence') defaultY = 70;
    else if (category === 'Midfield') defaultY = 46;
    else if (category === 'Attack') defaultY = 22;

    const countOfCat = slots.filter((s) => s.category === category).length;
    const code =
      category === 'Defence'
        ? `DEF_${countOfCat + 1}`
        : category === 'Midfield'
        ? `MID_${countOfCat + 1}`
        : category === 'Attack'
        ? `ATT_${countOfCat + 1}`
        : 'GK';

    const newSlot: PositionSlot = {
      code,
      label: `${category} ${countOfCat + 1}`,
      category,
      x: 30 + (countOfCat * 20) % 60,
      y: defaultY,
    };

    setSlots([...slots, newSlot]);
  };

  const handleRemoveSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const handleSlotCoordChange = (index: number, x: number, y: number) => {
    setSlots(
      slots.map((s, i) => (i === index ? { ...s, x: Math.max(10, Math.min(90, x)), y: Math.max(10, Math.min(90, y)) } : s))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (slots.length !== teamSize) {
      alert(`Formation must have exactly ${teamSize} players for this team size.`);
      return;
    }

    const newFormation: Formation = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      teamSize,
      slots,
      isCustom: true,
    };

    await createCustomFormation(newFormation);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create Custom Formation</h3>
              <p className="text-xs text-slate-400">
                Design custom pitch node coordinates for {teamSize}-a-side
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Formation Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 2-3-1 Attacking Diamond"
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <span className="font-semibold text-slate-300">
              Slots Added: {slots.length} / {teamSize}
            </span>
            <div className="flex items-center gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleAddSlot(cat)}
                  disabled={slots.length >= teamSize}
                  className="px-2 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 disabled:opacity-50 text-sky-400 text-[11px] font-semibold border border-sky-500/30 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Slots List */}
          <div className="space-y-2">
            {slots.map((slot, index) => (
              <div
                key={index}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 min-w-[140px]">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                    {slot.code}
                  </span>
                  <span className="text-slate-200 font-semibold truncate">{slot.label}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <span>X:</span>
                    <input
                      type="number"
                      min="10"
                      max="90"
                      value={slot.x}
                      onChange={(e) =>
                        handleSlotCoordChange(index, parseInt(e.target.value, 10), slot.y)
                      }
                      className="w-12 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-white font-mono text-center"
                    />
                    <span>%</span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <span>Y:</span>
                    <input
                      type="number"
                      min="10"
                      max="90"
                      value={slot.y}
                      onChange={(e) =>
                        handleSlotCoordChange(index, slot.x, parseInt(e.target.value, 10))
                      }
                      className="w-12 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-white font-mono text-center"
                    />
                    <span>%</span>
                  </div>

                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot(index)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={slots.length !== teamSize}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold shadow-lg shadow-sky-600/20"
            >
              Save Formation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
