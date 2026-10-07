import React, { useState, useEffect } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import { TeamSettings } from '../types';
import { getFormationsForTeamSize } from '../utils/formations';
import { Sliders, X, Check, Plus } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCustomFormation?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenCustomFormation,
}) => {
  const { settings, updateSettings, changeFormation } = useMatchday();

  const [formData, setFormData] = useState<TeamSettings>(settings);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  if (!isOpen) return null;

  const availableFormations = getFormationsForTeamSize(
    formData.pitchPlayerCount,
    formData.customFormations || []
  );

  const handlePitchSizeChange = (size: number) => {
    const newFormations = getFormationsForTeamSize(size, formData.customFormations || []);
    const newDefaultFormation = newFormations[0]?.name || '2-3-1';

    let squadCap = formData.matchdaySquadCap;
    if (size === 5 && squadCap > 8) squadCap = 7;
    if (size === 7 && (squadCap < 8 || squadCap > 12)) squadCap = 10;
    if (size === 9 && squadCap < 11) squadCap = 12;
    if (size === 11 && squadCap < 13) squadCap = 14;

    setFormData({
      ...formData,
      pitchPlayerCount: size,
      matchdaySquadCap: squadCap,
      subCount: Math.max(2, squadCap - size),
      defaultFormation: newDefaultFormation,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formData);
    if (formData.defaultFormation !== settings.defaultFormation) {
      await changeFormation(formData.defaultFormation);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Team & League Settings</h3>
              <p className="text-xs text-slate-400">
                Match periods, team sizes, and formation configurations
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Pitch Format (Team Size)
              </label>
              <select
                value={formData.pitchPlayerCount}
                onChange={(e) => handlePitchSizeChange(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="5">5-a-side</option>
                <option value="7">7-a-side</option>
                <option value="9">9-a-side</option>
                <option value="11">11-a-side</option>
              </select>
              <span className="text-[10px] text-slate-500">Filters formations automatically</span>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Matchday Squad Cap
              </label>
              <input
                type="number"
                min={formData.pitchPlayerCount}
                max={formData.pitchPlayerCount + 8}
                value={formData.matchdaySquadCap}
                onChange={(e) =>
                  setFormData({ ...formData, matchdaySquadCap: parseInt(e.target.value, 10) })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500">e.g. 10 matchday players</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Match Periods
              </label>
              <select
                value={formData.matchPeriodCount}
                onChange={(e) =>
                  setFormData({ ...formData, matchPeriodCount: parseInt(e.target.value, 10) })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="2">2 Periods (Halves) - Default</option>
                <option value="4">4 Periods (Quarters)</option>
                <option value="3">3 Periods (Thirds)</option>
              </select>
              <span className="text-[10px] text-slate-500">Halves default</span>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Period Duration (Mins)
              </label>
              <input
                type="number"
                step="0.5"
                min="5"
                max="45"
                value={formData.periodDurationMinutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    periodDurationMinutes: parseFloat(e.target.value),
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500">
                Total match: {formData.matchPeriodCount * formData.periodDurationMinutes} mins
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-semibold">Default Formation</label>
              {onOpenCustomFormation && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCustomFormation();
                  }}
                  className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Custom Formation</span>
                </button>
              )}
            </div>
            <select
              value={formData.defaultFormation}
              onChange={(e) => setFormData({ ...formData, defaultFormation: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-indigo-500"
            >
              {availableFormations.map((f) => (
                <option key={f.id} value={f.name}>
                  {f.name} {f.isCustom ? '(Custom)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Target Equal Game Time %
            </label>
            <input
              type="number"
              min="40"
              max="80"
              value={formData.targetGameTimePercent}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  targetGameTimePercent: parseInt(e.target.value, 10),
                })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-indigo-500"
            />
            <span className="text-[10px] text-slate-500">Youth fair play target (50% for 2 halves)</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/20 transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
