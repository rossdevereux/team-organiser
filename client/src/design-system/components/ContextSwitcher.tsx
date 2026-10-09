import React, { useState } from 'react';
import { useDesignSystem } from '../DesignSystemContext';
import { AppContextMode, ComponentDensity, POPULAR_KIT_PRESETS } from '../tokens';
import {
  Shield,
  Zap,
  Printer,
  Sliders,
  ChevronDown,
  Sparkles,
  Maximize2,
  Minimize2,
  Palette,
  Check,
} from 'lucide-react';

export interface ContextSwitcherProps {
  onOpenShowcase?: () => void;
  onOpenPrint?: () => void;
  className?: string;
}

export const ContextSwitcher: React.FC<ContextSwitcherProps> = ({
  onOpenShowcase,
  onOpenPrint,
  className = '',
}) => {
  const {
    context,
    setContext,
    density,
    setDensity,
    clubhouseMode,
    setClubhouseMode,
    kitPrimary,
    kitSecondary,
    setKitColors,
    isTouchline,
  } = useDesignSystem();

  const [isOpen, setIsOpen] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Primary Pill Button */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-sm backdrop-blur-md">
        {/* Quick Touchline Toggle Button */}
        <button
          onClick={() => setContext(isTouchline ? 'clubhouse' : 'touchline')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
            isTouchline
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400'
              : 'text-slate-300 hover:text-white hover:bg-slate-850'
          }`}
          title="Toggle High-Contrast Touchline Dugout Mode"
        >
          <Zap className={`w-3.5 h-3.5 ${isTouchline ? 'fill-slate-950' : 'text-emerald-400'}`} />
          <span className="hidden xl:inline">
            {isTouchline ? 'Touchline Mode' : 'Pitchside'}
          </span>
        </button>

        {/* Dropdown Options Trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-850 transition cursor-pointer"
          title="Theme, Density & Kit Settings"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Flyout Panel */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="absolute right-0 mt-2 w-[calc(100vw-2.5rem)] max-w-xs sm:w-80 rounded-3xl bg-slate-900/95 backdrop-blur-xl border border-slate-800 shadow-2xl p-4 space-y-4 z-50 text-xs text-slate-200 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-white">Context & Theme Engine</span>
            </div>
            {onOpenShowcase && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenShowcase();
                }}
                className="text-[10px] text-sky-400 hover:text-sky-300 font-bold underline cursor-pointer"
              >
                Styleguide
              </button>
            )}
          </div>

          {/* Context Mode Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 block">
              Application Context
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setContext('clubhouse')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition cursor-pointer ${
                  context === 'clubhouse'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5 mb-1" />
                <span className="text-[10px]">Clubhouse</span>
              </button>

              <button
                onClick={() => setContext('touchline')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition cursor-pointer ${
                  context === 'touchline'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5 mb-1 text-emerald-400" />
                <span className="text-[10px]">Touchline</span>
              </button>

              <button
                onClick={() => {
                  setContext('print');
                  setIsOpen(false);
                  if (onOpenPrint) {
                    onOpenPrint();
                  }
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition cursor-pointer ${
                  context === 'print'
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Printer className="w-3.5 h-3.5 mb-1 text-sky-400" />
                <span className="text-[10px]">Print Sheet</span>
              </button>
            </div>
          </div>

          {/* Density Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 block">
              Component Density
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['compact', 'normal', 'touchline'] as ComponentDensity[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDensity(d)}
                  className={`py-1.5 px-2 rounded-xl border text-center capitalize transition cursor-pointer text-[11px] ${
                    density === d
                      ? 'bg-slate-800 border-indigo-400 text-white font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Kit Color Preview & Quick Swatches */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                <Palette className="w-3 h-3 text-amber-400" />
                <span>Club Kit Colours</span>
              </label>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-4 h-4 rounded-full border border-white/30 shadow-inner"
                  style={{ backgroundColor: kitPrimary }}
                  title={`Primary: ${kitPrimary}`}
                />
                <div
                  className="w-4 h-4 rounded-full border border-white/30 shadow-inner"
                  style={{ backgroundColor: kitSecondary }}
                  title={`Secondary: ${kitSecondary}`}
                />
              </div>
            </div>

            {/* Swatch Presets */}
            <div className="grid grid-cols-4 gap-1.5">
              {POPULAR_KIT_PRESETS.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setKitColors(p.primary, p.secondary)}
                  className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                    kitPrimary === p.primary && kitSecondary === p.secondary
                      ? 'border-white bg-slate-800 ring-1 ring-sky-400'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                  }`}
                  title={p.name}
                >
                  <div className="flex -space-x-1">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/40"
                      style={{ backgroundColor: p.primary }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/40"
                      style={{ backgroundColor: p.secondary }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 truncate max-w-full">
                    {p.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
};
