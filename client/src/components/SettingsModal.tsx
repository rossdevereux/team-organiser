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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="SubShuffle" className="w-8 h-8 object-contain drop-shadow-md" />
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

          {/* Club Kit Colours */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-slate-300 font-semibold">
                  Club Kit Colours (Design System)
                </label>
                <span className="text-[10px] text-slate-500">
                  Styles jersey icons, pitch tokens and club accents
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-5 h-5 rounded-full border border-white/40 shadow-sm"
                  style={{ backgroundColor: formData.kitPrimaryColor || '#1e3a8a' }}
                  title="Primary Kit"
                />
                <div
                  className="w-5 h-5 rounded-full border border-white/40 shadow-sm"
                  style={{ backgroundColor: formData.kitSecondaryColor || '#f59e0b' }}
                  title="Secondary Trim"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Primary Colour</label>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                  <input
                    type="color"
                    value={formData.kitPrimaryColor || '#1e3a8a'}
                    onChange={(e) =>
                      setFormData({ ...formData, kitPrimaryColor: e.target.value })
                    }
                    className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-slate-300 text-[11px]">
                    {formData.kitPrimaryColor || '#1e3a8a'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Secondary / Trim</label>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                  <input
                    type="color"
                    value={formData.kitSecondaryColor || '#f59e0b'}
                    onChange={(e) =>
                      setFormData({ ...formData, kitSecondaryColor: e.target.value })
                    }
                    className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-slate-300 text-[11px]">
                    {formData.kitSecondaryColor || '#f59e0b'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Kit Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { name: 'Royal/Gold', p: '#1e3a8a', s: '#f59e0b' },
                { name: 'Crimson/White', p: '#dc2626', s: '#ffffff' },
                { name: 'Sky/Navy', p: '#0284c7', s: '#0f172a' },
                { name: 'Emerald/Gold', p: '#059669', s: '#fbbf24' },
                { name: 'Onyx/Amber', p: '#18181b', s: '#f59e0b' },
              ].map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      kitPrimaryColor: preset.p,
                      kitSecondaryColor: preset.s,
                    })
                  }
                  className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/30"
                    style={{ backgroundColor: preset.p }}
                  />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
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
