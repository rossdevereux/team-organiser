import React, { useState } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import { AuthButton } from './AuthButton';
import {
  Users,
  Calendar,
  Layers,
  Printer,
  MessageSquare,
  Sliders,
  ChevronDown,
  Wand2,
  Shield,
  Plus,
  Share2,
  Zap,
  WifiOff,
} from 'lucide-react';
import { ContextSwitcher } from '../design-system';

interface NavbarProps {
  onOpenWhatsApp: () => void;
  onOpenPrint: () => void;
  onOpenSettings: () => void;
  onOpenSquadSelector: () => void;
  onOpenCustomFormation: () => void;
  onOpenLiveMatch?: () => void;
  onOpenShowcase?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenWhatsApp,
  onOpenPrint,
  onOpenSettings,
  onOpenSquadSelector,
  onOpenCustomFormation,
  onOpenLiveMatch,
  onOpenShowcase,
}) => {
  const {
    teams,
    activeTeam,
    activeTeamId,
    setActiveTeamId,
    fixtures,
    activeFixture,
    activeFixtureId,
    setActiveFixtureId,
    settings,
    availableFormations,
    changeFormation,
    activePeriod,
    setActivePeriod,
    activeTab,
    setActiveTab,
    autoRotateCurrentFixture,
    isOffline,
  } = useMatchday();

  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [fixtureDropdownOpen, setFixtureDropdownOpen] = useState(false);

  const periodCount = settings.matchPeriodCount || 2;
  const periods = Array.from({ length: periodCount }, (_, i) => i + 1);

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-40 print:hidden w-full max-w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        {/* Main Header Bar */}
        <div className="h-16 flex items-center justify-between gap-2 sm:gap-4 w-full min-w-0">
          {/* Brand & Team Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 min-w-0">
            <div
              onClick={() => setActiveTab('lineup')}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group shrink-0 select-none"
              title="SubShuffle Home"
            >
              <img
                src="/logo-icon.png"
                alt="SubShuffle Logo"
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow-[0_4px_12px_rgba(16,185,129,0.3)] group-hover:scale-105 group-hover:rotate-6 transition-all duration-300 shrink-0"
              />
              <div className="hidden sm:block leading-tight shrink-0">
                <div className="flex items-center font-extrabold text-base sm:text-lg tracking-tight font-sans">
                  <span className="text-[#00e676] drop-shadow-[0_0_12px_rgba(0,230,118,0.35)]">Sub</span>
                  <span className="text-white">Shuffle</span>
                </div>
                <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400">
                  Smart Player Rotation
                </p>
              </div>
            </div>

            {/* Team Switcher Pill */}
            {activeTeam && (
              <div className="relative shrink-0">
                <button
                  onClick={() => {
                    setTeamDropdownOpen(!teamDropdownOpen);
                    setFixtureDropdownOpen(false);
                  }}
                  className="h-9 whitespace-nowrap shrink-0 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 rounded-xl bg-slate-950/90 border border-indigo-500/30 hover:border-indigo-500/60 text-xs font-semibold text-white transition cursor-pointer shadow-sm"
                  title="Switch or manage teams"
                >
                  <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate max-w-[90px] xs:max-w-[125px] sm:max-w-[150px] lg:max-w-[170px]">
                    {activeTeam.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {teamDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-50 space-y-1">
                    <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-800 flex items-center justify-between">
                      <span>Switch Team</span>
                      <span>{teams.length} teams</span>
                    </div>

                    {teams.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setActiveTeamId(t.id);
                          setTeamDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                          t.id === activeTeamId
                            ? 'bg-indigo-600 text-white'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="truncate">
                          <div>{t.name}</div>
                          <div className="text-[10px] opacity-70 font-mono">
                            {t.settings.pitchPlayerCount}-a-side • {t.settings.defaultFormation}
                          </div>
                        </div>
                        {t.id === activeTeamId && <Shield className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    ))}

                    {/* Quick Fixture Switcher section on mobile / convenience */}
                    {activeFixture && (
                      <div className="pt-1.5 border-t border-slate-800/80">
                        <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-500 flex items-center justify-between">
                          <span>Current Match</span>
                          <span className="text-sky-400 font-mono text-[9px]">{activeFixture.date}</span>
                        </div>
                        <div className="px-1 py-0.5">
                          <button
                            onClick={() => {
                              setActiveTab('fixtures');
                              setTeamDropdownOpen(false);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs bg-slate-800/60 hover:bg-slate-800 text-sky-300 flex items-center justify-between transition"
                            title="View all fixtures and switch match"
                          >
                            <span className="truncate">vs {activeFixture.opponent}</span>
                            <span className="text-[10px] text-slate-400">Manage ›</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setActiveTab('teams');
                        setTeamDropdownOpen(false);
                      }}
                      className="w-full text-center py-2 text-xs text-sky-400 hover:text-sky-300 font-semibold border-t border-slate-800 mt-1 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Manage All Teams & Sharing</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Fixture Selector Pill (Desktop - lg breakpoint and above) */}
            {activeFixture && (
              <div className="relative hidden lg:block shrink-0">
                <button
                  onClick={() => {
                    setFixtureDropdownOpen(!fixtureDropdownOpen);
                    setTeamDropdownOpen(false);
                  }}
                  className="h-9 whitespace-nowrap shrink-0 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 rounded-xl bg-slate-950/80 border border-sky-500/30 hover:border-sky-500/60 text-xs font-semibold text-slate-200 transition cursor-pointer shadow-sm"
                  title="Switch or manage fixtures"
                >
                  <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate max-w-[110px] xl:max-w-[160px]">
                    vs {activeFixture.opponent}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {fixtureDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-50 space-y-1">
                    <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-800 flex items-center justify-between">
                      <span>Switch Match</span>
                      <span>{fixtures.length} matches</span>
                    </div>
                    {fixtures.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => {
                          setActiveFixtureId(f.id);
                          setFixtureDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                          f.id === activeFixtureId
                            ? 'bg-sky-600 text-white'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="truncate">vs {f.opponent}</span>
                        <span className="text-[10px] opacity-70 font-mono">{f.date}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setActiveTab('fixtures');
                        setFixtureDropdownOpen(false);
                      }}
                      className="w-full text-center py-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold border-t border-slate-800 mt-1 cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Manage Fixtures</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Tools & Auth */}
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
            {isOffline && (
              <div
                className="h-9 whitespace-nowrap shrink-0 flex items-center gap-1.5 px-2 sm:px-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold animate-pulse"
                title="Pitch mode active: working offline with local storage"
              >
                <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden md:inline">Pitch Mode</span>
              </div>
            )}

            {onOpenLiveMatch && activeFixture && (
              <button
                onClick={onOpenLiveMatch}
                className="h-9 whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 w-9 lg:w-auto px-0 lg:px-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition cursor-pointer shadow-sm shadow-amber-500/10"
                title="Pitchside stopwatch, sub timer & live substitution controls"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse shrink-0" />
                <span className="hidden lg:inline">Live Match</span>
              </button>
            )}

            <button
              onClick={onOpenWhatsApp}
              className="h-9 whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 w-9 xl:w-auto px-0 xl:px-3 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] text-xs font-semibold transition cursor-pointer"
              title="Share match announcement to WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">WhatsApp</span>
            </button>

            <button
              onClick={onOpenPrint}
              className="h-9 whitespace-nowrap shrink-0 hidden md:flex items-center justify-center gap-1.5 w-9 xl:w-auto px-0 xl:px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
              title="Print official matchday pitch sheet or save PDF"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="hidden xl:inline">Print / PDF</span>
            </button>

            <div className="hidden md:block shrink-0">
              <ContextSwitcher onOpenShowcase={onOpenShowcase} onOpenPrint={onOpenPrint} />
            </div>

            <button
              onClick={onOpenSettings}
              className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="Team Settings & League Rules"
            >
              <Sliders className="w-4 h-4 shrink-0" />
            </button>

            <AuthButton />
          </div>
        </div>

        {/* Sub-bar: Navigation Tabs & Lineup Controls */}
        <div className="py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 border-t border-slate-800/60 text-xs w-full max-w-full overflow-hidden">
          {/* Main Navigation Tabs */}
          <div className="w-full md:w-auto max-w-full overflow-x-auto no-scrollbar scroll-smooth">
            <div className="inline-flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 shrink-0">
              <button
                onClick={() => setActiveTab('lineup')}
                className={`h-7 px-3 flex items-center rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'lineup'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Pitch Lineup
              </button>
              <button
                onClick={() => setActiveTab('matrix')}
                className={`h-7 px-3 flex items-center rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'matrix'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {periodCount === 2 ? '2-Half Matrix' : `${periodCount}-Period Matrix`}
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`h-7 px-3 flex items-center rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'stats'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Fair Play Stats
              </button>
              <button
                onClick={() => setActiveTab('squad')}
                className={`h-7 px-3 flex items-center rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'squad'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Squad Roster
              </button>
              <button
                onClick={() => setActiveTab('fixtures')}
                className={`h-7 px-3 flex items-center rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'fixtures'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Fixtures
              </button>
              <button
                onClick={() => setActiveTab('teams')}
                className={`h-7 px-3 flex items-center rounded-lg font-semibold transition cursor-pointer whitespace-nowrap gap-1.5 ${
                  activeTab === 'teams'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Teams & Sharing</span>
              </button>
            </div>
          </div>

          {/* Quick Lineup Tools (When in lineup mode) */}
          {activeTab === 'lineup' && (
            <div className="w-full md:w-auto flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* Halves / Period Selector Tabs */}
              <div className="h-8 sm:h-9 flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-500 px-1.5 hidden sm:inline whitespace-nowrap">
                  {periodCount === 2 ? 'Halves:' : 'Periods:'}
                </span>
                {periods.map((p) => (
                  <button
                    key={p}
                    onClick={() => setActivePeriod(p)}
                    className={`h-6 sm:h-7 px-2 sm:px-2.5 flex items-center rounded-lg font-semibold text-xs transition cursor-pointer whitespace-nowrap ${
                      activePeriod === p
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {periodCount === 2 ? (p === 1 ? '1st Half' : '2nd Half') : `Period ${p}`}
                  </button>
                ))}
              </div>

              {/* Dynamic Formation Dropdown based on pitch player count */}
              <select
                value={settings.defaultFormation}
                onChange={(e) => changeFormation(e.target.value)}
                className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono font-semibold focus:outline-none focus:border-sky-500 cursor-pointer"
                title={`Formations for ${settings.pitchPlayerCount}-a-side`}
              >
                {availableFormations.map((f) => (
                  <option key={f.id} value={f.name}>
                    {f.name} {f.isCustom ? '★' : ''}
                  </option>
                ))}
              </select>

              {/* Matchday Squad Selector */}
              <button
                onClick={onOpenSquadSelector}
                className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center"
                title={`Select matchday ${settings.matchdaySquadCap} players`}
              >
                Squad ({settings.matchdaySquadCap})
              </button>

              <button
                onClick={() => autoRotateCurrentFixture()}
                className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md transition cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                title="Re-balance playing time automatically"
              >
                <Wand2 className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xs:inline">Auto-Balance</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
