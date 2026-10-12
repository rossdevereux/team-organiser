import React from 'react';
import { ClubSettings } from '../../types';
import { Building, Palette } from 'lucide-react';

interface AdminClubSettingsTabProps {
  clubSettings: ClubSettings;
  onChangeClubSettings: (newSettings: ClubSettings) => void;
  onSaveClubSettings: (e: React.FormEvent) => Promise<void>;
}

export const AdminClubSettingsTab: React.FC<AdminClubSettingsTabProps> = ({
  clubSettings,
  onChangeClubSettings,
  onSaveClubSettings,
}) => {
  return (
    <form onSubmit={onSaveClubSettings} className="space-y-6">
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl p-6 space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Building className="w-4 h-4 text-sky-400" />
            <span>Club Profile & Federation Rules</span>
          </h3>
          <p className="text-xs text-slate-400">
            Configure official club branding, kit colors, and youth football compliance parameters.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Club Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Club Official Name</label>
            <input
              type="text"
              value={clubSettings.clubName}
              onChange={(e) => onChangeClubSettings({ ...clubSettings, clubName: e.target.value })}
              className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:border-sky-500 focus:outline-none"
              required
            />
          </div>

          {/* Short Code */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Club Short Code & Initials</label>
            <input
              type="text"
              value={clubSettings.clubShortCode}
              onChange={(e) => onChangeClubSettings({ ...clubSettings, clubShortCode: e.target.value })}
              className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold uppercase focus:border-sky-500 focus:outline-none"
              required
            />
          </div>

          {/* Primary Kit Color */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-sky-400" />
              <span>Primary Kit Colour</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={clubSettings.primaryColor}
                onChange={(e) => onChangeClubSettings({ ...clubSettings, primaryColor: e.target.value })}
                className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={clubSettings.primaryColor}
                onChange={(e) => onChangeClubSettings({ ...clubSettings, primaryColor: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono font-semibold focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Secondary Kit Color */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>Secondary Trim Colour</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={clubSettings.secondaryColor}
                onChange={(e) => onChangeClubSettings({ ...clubSettings, secondaryColor: e.target.value })}
                className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={clubSettings.secondaryColor}
                onChange={(e) => onChangeClubSettings({ ...clubSettings, secondaryColor: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono font-semibold focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Equal Playing Time Target */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              Minimum Playing Time Target ({clubSettings.minGameTimePercent}%)
            </label>
            <input
              type="range"
              min="33"
              max="75"
              step="5"
              value={clubSettings.minGameTimePercent}
              onChange={(e) =>
                onChangeClubSettings({ ...clubSettings, minGameTimePercent: parseInt(e.target.value, 10) })
              }
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <span className="text-[11px] text-slate-500 block">
              FA Youth Charter mandates 50%+ equal playing time across all matchday fixtures.
            </span>
          </div>

          {/* Welfare Officer */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Club Child Welfare Officer</label>
            <input
              type="text"
              value={clubSettings.welfareOfficer || ''}
              onChange={(e) => onChangeClubSettings({ ...clubSettings, welfareOfficer: e.target.value })}
              placeholder="e.g. Sarah Jenkins (Welfare Contact)"
              className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Visual Kit Preview Badge */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-lg ring-2 ring-white/10"
              style={{ backgroundColor: clubSettings.primaryColor }}
            >
              <span style={{ color: clubSettings.secondaryColor }}>{clubSettings.clubShortCode}</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">{clubSettings.clubName}</h4>
              <p className="text-[11px] text-slate-400">Matchday Pitch Canvas Kit Preview</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {clubSettings.minGameTimePercent}% FA Compliant
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="h-11 px-6 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition cursor-pointer"
          >
            Save Club Settings
          </button>
        </div>
      </div>
    </form>
  );
};
