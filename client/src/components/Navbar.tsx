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

interface NavbarProps {
  onOpenWhatsApp: () => void;
  onOpenPrint: () => void;
  onOpenSettings: () => void;
  onOpenSquadSelector: () => void;
  onOpenCustomFormation: () => void;
  onOpenLiveMatch?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenWhatsApp,
  onOpenPrint,
  onOpenSettings,
  onOpenSquadSelector,
  onOpenCustomFormation,
  onOpenLiveMatch,
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
    <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-40 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Header Bar */}
        <div className="h-16 flex items-center justify-between gap-3">
          {/* Brand & Team Switcher */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              onClick={() => setActiveTab('lineup')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-sky-500/20 ring-1 ring-white/10 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5 text-slate-950 font-black" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                    SubShuffle
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Halves Default
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Equal Playing Time & Matchday Manager</p>
              </div>
            </div>

            {/* Team Switcher Pill */}
            {activeTeam && (
              <div className="relative">
                <button
                  onClick={() => {
                    setTeamDropdownOpen(!teamDropdownOpen);
                    setFixtureDropdownOpen(false);
                  }}
                  className="h-9 whitespace-nowrap shrink-0 flex items-center gap-2 px-3 rounded-xl bg-slate-950/90 border border-indigo-500/30 hover:border-indigo-500/60 text-xs font-semibold text-white transition cursor-pointer shadow-sm"
                  title="Switch or manage teams"
                >
                  <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate max-w-[140px] sm:max-w-[180px]">
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

            {/* Fixture Selector Pill */}
            {activeFixture && (
              <div className="relative hidden md:block">
                <button
                  onClick={() => {
                    setFixtureDropdownOpen(!fixtureDropdownOpen);
                    setTeamDropdownOpen(false);
                  }}
                  className="h-9 whitespace-nowrap shrink-0 flex items-center gap-2 px-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 transition cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate max-w-[130px] lg:max-w-[180px]">
                    vs {activeFixture.opponent}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                </button>

                {fixtureDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-50 space-y-1">
                    <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-800">
                      Switch Match
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
                      className="w-full text-center py-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold border-t border-slate-800 mt-1 cursor-pointer"
                    >
                      + Manage Fixtures
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Tools & Auth */}
          <div className="flex items-center gap-2 shrink-0">
            {isOffline && (
              <div
                className="h-9 whitespace-nowrap shrink-0 flex items-center gap-1.5 px-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold animate-pulse"
                title="Pitch mode active: working offline with local storage"
              >
                <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden md:inline">Pitch Mode (Offline)</span>
              </div>
            )}

            {onOpenLiveMatch && activeFixture && (
              <button
                onClick={onOpenLiveMatch}
                className="h-9 whitespace-nowrap shrink-0 flex items-center gap-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition cursor-pointer shadow-sm shadow-amber-500/10"
                title="Pitchside stopwatch, sub timer & live substitution controls"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse shrink-0" />
                <span className="hidden sm:inline">Live Match</span>
              </button>
            )}

            <button
              onClick={onOpenWhatsApp}
              className="h-9 whitespace-nowrap shrink-0 flex items-center gap-1.5 px-3 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] text-xs font-semibold transition cursor-pointer"
              title="Share match announcement to WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">WhatsApp</span>
            </button>

            <button
              onClick={onOpenPrint}
              className="h-9 whitespace-nowrap shrink-0 flex items-center gap-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
              title="Print official matchday pitch sheet or save PDF"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="hidden lg:inline">Print / PDF</span>
            </button>

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
        <div className="py-2.5 flex flex-wrap items-center justify-between gap-y-2 gap-x-3 border-t border-slate-800/60 text-xs">
          {/* Main Navigation Tabs */}
          <div className="h-9 flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 overflow-x-auto shrink-0">
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

          {/* Quick Lineup Tools (When in lineup mode) */}
          {activeTab === 'lineup' && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Halves / Period Selector Tabs */}
              <div className="h-9 flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-500 px-2 hidden sm:inline whitespace-nowrap">
                  {periodCount === 2 ? 'Halves:' : 'Periods:'}
                </span>
                {periods.map((p) => (
                  <button
                    key={p}
                    onClick={() => setActivePeriod(p)}
                    className={`h-7 px-2.5 flex items-center rounded-lg font-semibold text-xs transition cursor-pointer whitespace-nowrap ${
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
                className="h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono font-semibold focus:outline-none focus:border-sky-500 cursor-pointer shrink-0"
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
                className="h-9 px-3 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 flex items-center"
                title={`Select matchday ${settings.matchdaySquadCap} players`}
              >
                Matchday Squad ({settings.matchdaySquadCap})
              </button>

              <button
                onClick={() => autoRotateCurrentFixture()}
                className="h-9 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
                title="Re-balance playing time automatically"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Auto-Balance</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
