import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useMatchday } from '../context/MatchdayContext';
import { UserMenu } from './UserMenu';
import { TrialBadge } from './TrialBadge';
import {
  Calendar,
  Printer,
  MessageSquare,
  ChevronDown,
  Shield,
  Plus,
  Share2,
  Zap,
  WifiOff,
  Crown,
  BookOpen,
  Trophy,
} from 'lucide-react';
import { ContextSwitcher } from '../design-system';

interface NavbarProps {
  onOpenWhatsApp: () => void;
  onOpenPrint: () => void;
  onOpenSettings: () => void;
  onOpenSquadSelector?: () => void;
  onOpenCustomFormation?: () => void;
  onOpenLiveMatch?: () => void;
  onOpenShowcase?: () => void;
  onAutoRotate?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenWhatsApp,
  onOpenPrint,
  onOpenSettings,
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
    activeTab,
    setActiveTab,
    isOffline,
    currentUser,
  } = useMatchday();

  const location = useLocation();
  const isGuide = location.pathname === '/guide';

  const { t } = useTranslation();

  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [fixtureDropdownOpen, setFixtureDropdownOpen] = useState(false);
  const [shareDropdownOpen, setShareDropdownOpen] = useState(false);

  const teamDropdownRef = useRef<HTMLDivElement>(null);
  const fixtureDropdownRef = useRef<HTMLDivElement>(null);
  const shareDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (teamDropdownRef.current && !teamDropdownRef.current.contains(target)) {
        setTeamDropdownOpen(false);
      }
      if (fixtureDropdownRef.current && !fixtureDropdownRef.current.contains(target)) {
        setFixtureDropdownOpen(false);
      }
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(target)) {
        setShareDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTeamDropdownOpen(false);
        setFixtureDropdownOpen(false);
        setShareDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const periodCount = settings.matchPeriodCount || 2;

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-40 print:hidden w-full max-w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        {/* Main Header Bar */}
        <div className="h-16 flex items-center justify-between gap-2 sm:gap-4 w-full min-w-0">
          {/* Brand & Consolidated Breadcrumb Pill */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Link
              to="/lineup"
              search={(prev: any) => prev}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group shrink-0 select-none"
              title="SubShuffle Lineup Planner"
            >
              <img
                src="/logo-icon.png"
                alt="SubShuffle Logo"
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow-[0_4px_12px_rgba(16,185,129,0.3)] group-hover:scale-105 group-hover:rotate-6 transition-all duration-300 shrink-0"
              />
              <span className="sr-only">SubShuffle</span>
              <div className="hidden sm:block leading-tight shrink-0">
                <div className="flex items-center font-extrabold text-base sm:text-lg tracking-tight font-sans">
                  <span className="text-[#00e676] drop-shadow-[0_0_12px_rgba(0,230,118,0.35)]">Sub</span>
                  <span className="text-white">Shuffle</span>
                </div>
                <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400">
                  {t('nav.brandSubtitle')}
                </p>
              </div>
            </Link>

            {/* Consolidated Breadcrumb Pill: [ Team › Match ▾ ] */}
            {activeTeam ? (
              <div className="flex items-center rounded-xl bg-slate-950/90 border border-slate-800/90 p-0.5 shadow-sm shrink-0 min-w-0 max-w-[160px] xs:max-w-[200px] sm:max-w-[280px] md:max-w-[420px] lg:max-w-none">
                {/* Team Switcher Segment */}
                <div ref={teamDropdownRef} className="relative shrink-0 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      setTeamDropdownOpen(!teamDropdownOpen);
                      setFixtureDropdownOpen(false);
                      setShareDropdownOpen(false);
                    }}
                    className="min-h-[44px] sm:min-h-[36px] h-9 whitespace-nowrap shrink-0 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 rounded-lg hover:bg-slate-850 text-xs font-semibold text-white transition cursor-pointer min-w-0"
                    title="Switch or manage teams"
                    data-testid="team-switcher-button"
                  >
                    <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate max-w-[100px] xs:max-w-[130px] sm:max-w-[160px] md:max-w-[130px] lg:max-w-[170px]">
                      {activeTeam.name}
                    </span>
                    <ChevronDown
                      className={`w-3 h-3 text-slate-400 transition-transform duration-200 shrink-0 ${
                        teamDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {teamDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-72 max-h-80 overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-50 space-y-1">
                      <div className="sticky top-0 bg-slate-900 z-10 px-3 py-1 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-800 flex items-center justify-between">
                        <span>Switch Team</span>
                        <span>{teams.length} teams</span>
                      </div>

                      {teams.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setActiveTeamId(t.id);
                            setTeamDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
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

                      {/* Quick Fixture Switcher section */}
                      {activeFixture && (
                        <div className="pt-1.5 border-t border-slate-800/80">
                          <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-500 flex items-center justify-between">
                            <span>Current Match</span>
                            <span className="text-sky-400 font-mono text-[9px]">{activeFixture.date}</span>
                          </div>
                          <div className="px-1 py-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('fixtures');
                                setTeamDropdownOpen(false);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs bg-slate-800/60 hover:bg-slate-800 text-sky-300 flex items-center justify-between transition cursor-pointer"
                              title="View all fixtures and switch match"
                            >
                              <span className="truncate">vs {activeFixture.opponent}</span>
                              <span className="text-[10px] text-slate-400">Manage ›</span>
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
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

                {/* Breadcrumb Separator - Hidden on mobile (< md) */}
                <span className="text-slate-500 font-bold select-none px-1 text-xs shrink-0 hidden md:inline">›</span>

                {/* Fixture Switcher Segment - Hidden on mobile (< md) */}
                {activeFixture ? (
                  <div ref={fixtureDropdownRef} className="relative shrink-0 hidden md:block">
                    <button
                      type="button"
                      onClick={() => {
                        setFixtureDropdownOpen(!fixtureDropdownOpen);
                        setTeamDropdownOpen(false);
                        setShareDropdownOpen(false);
                      }}
                      className="min-h-[44px] sm:min-h-[36px] h-9 whitespace-nowrap shrink-0 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 rounded-lg hover:bg-slate-850 text-xs font-semibold text-slate-200 transition cursor-pointer min-w-0"
                      title="Switch or manage fixtures"
                      data-testid="fixture-switcher-button"
                    >
                      <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="truncate max-w-[90px] sm:max-w-[130px] lg:max-w-[170px]">
                        vs {activeFixture.opponent}
                      </span>
                      <ChevronDown
                        className={`w-3 h-3 text-slate-400 transition-transform duration-200 shrink-0 ${
                          fixtureDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
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
                            type="button"
                            onClick={() => {
                              setActiveFixtureId(f.id);
                              setFixtureDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
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
                          type="button"
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
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab('fixtures')}
                    className="min-h-[44px] sm:min-h-[36px] h-9 whitespace-nowrap shrink-0 items-center gap-1.5 px-2.5 rounded-lg hover:bg-slate-850 text-xs font-medium text-slate-400 hover:text-slate-200 transition cursor-pointer hidden md:flex"
                    title="Switch or manage fixtures"
                  >
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Select Match</span>
                  </button>
                )}
              </div>
            ) : currentUser ? (
              <button
                type="button"
                onClick={() => setActiveTab('teams')}
                className="min-h-[44px] h-9 whitespace-nowrap shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-xs font-semibold text-indigo-300 transition cursor-pointer shadow-sm"
                title="Create your first team"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Create Team</span>
              </button>
            ) : null}
          </div>

          {/* Action Tools & Consolidated User Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Trial Countdown Badge aligned on the right */}
            <TrialBadge />

            {isOffline && (
              <div
                className="h-10 whitespace-nowrap shrink-0 flex items-center gap-1.5 px-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold animate-pulse"
                title="Pitch mode active: working offline with local storage"
              >
                <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden md:inline">Pitch Mode</span>
              </div>
            )}

            {onOpenLiveMatch && activeFixture && (
              <button
                type="button"
                onClick={onOpenLiveMatch}
                className="min-h-[44px] min-w-[44px] h-10 whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition cursor-pointer shadow-sm shadow-amber-500/10"
                title="Pitchside stopwatch, sub timer & live substitution controls"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse shrink-0" />
                <span className="hidden lg:inline">Live Match</span>
              </button>
            )}

            {/* Consolidated Share / Export Dropdown */}
            <div ref={shareDropdownRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShareDropdownOpen(!shareDropdownOpen);
                  setTeamDropdownOpen(false);
                  setFixtureDropdownOpen(false);
                }}
                className="min-h-[44px] min-w-[44px] sm:min-w-0 h-10 sm:h-9 whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 hover:border-slate-600 text-xs font-semibold text-slate-200 transition cursor-pointer shadow-sm"
                title="Share match announcement or export printable sheet"
                data-testid="share-export-button"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="hidden sm:inline">Share / Export</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 hidden sm:inline ${
                    shareDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {shareDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-50 space-y-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-800/80 mb-1">
                    Share & Export Lineup
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenWhatsApp();
                      setShareDropdownOpen(false);
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer group min-h-[44px]"
                    data-testid="whatsapp-export-item"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#25D366]/15 group-hover:bg-[#25D366]/25 text-[#25D366] flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-200 group-hover:text-white">
                        WhatsApp Squad Card
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        Share lineup & meet times to team chat
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenPrint();
                      setShareDropdownOpen(false);
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer group min-h-[44px]"
                    data-testid="print-export-item"
                  >
                    <div className="w-8 h-8 rounded-lg bg-sky-500/15 group-hover:bg-sky-500/25 text-sky-400 flex items-center justify-center shrink-0">
                      <Printer className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-200 group-hover:text-white">
                        Print Team Sheet
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        Official pitch sheet & PDF download
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <div className="hidden md:block shrink-0">
              <ContextSwitcher onOpenShowcase={onOpenShowcase} onOpenPrint={onOpenPrint} />
            </div>

            {/* Consolidated User & Utility Avatar Menu */}
            <UserMenu onOpenSettings={onOpenSettings} />
          </div>
        </div>

        {/* Sub-bar: Navigation Tabs Strip */}
        <div className="relative border-t border-slate-800/60 w-full max-w-full">
          <div className="py-2 w-full max-w-full overflow-x-auto no-scrollbar scroll-smooth">
            <nav className="flex items-center gap-1.5 min-w-max px-0.5" aria-label="Main Navigation">
              <Link
                role="button"
                to="/lineup"
                search={(prev: any) => prev}
                className={`min-h-[44px] px-3.5 sm:px-4 flex items-center rounded-xl font-semibold text-xs transition cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'lineup'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {t('nav.lineup')}
              </Link>
              <Link
                role="button"
                to="/matrix"
                search={(prev: any) => prev}
                className={`min-h-[44px] px-3.5 sm:px-4 flex items-center rounded-xl font-semibold text-xs transition cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'matrix'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className="hidden 2xl:inline">{periodCount === 2 ? '2-Half ' : `${periodCount}-Period `}</span>{t('nav.matrix')}
              </Link>
              <Link
                role="button"
                to="/stats"
                search={(prev: any) => prev}
                className={`min-h-[44px] px-3.5 sm:px-4 flex items-center rounded-xl font-semibold text-xs transition cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'stats'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {t('nav.stats')}
              </Link>
              <Link
                role="button"
                to="/team-dashboard"
                search={(prev: any) => prev}
                className={`min-h-[44px] px-3.5 sm:px-4 flex items-center rounded-xl font-semibold text-xs transition cursor-pointer whitespace-nowrap shrink-0 gap-1.5 ${
                  activeTab === 'dashboard'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                title="Team Dashboard, Leaderboards & Awards"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('nav.dashboard')}</span>
              </Link>
              <Link
                role="button"
                to="/squad"
                search={(prev: any) => prev}
                className={`min-h-[44px] px-3.5 sm:px-4 flex items-center rounded-xl font-semibold text-xs transition cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'squad'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {t('nav.squad')}
              </Link>
              <Link
                role="button"
                to="/fixtures"
                search={(prev: any) => prev}
                className={`min-h-[44px] px-3.5 sm:px-4 flex items-center rounded-xl font-semibold text-xs transition cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'fixtures'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {t('nav.fixtures')}
              </Link>
              <Link
                role="button"
                to="/teams"
                search={(prev: any) => prev}
                className={`min-h-[44px] px-3.5 sm:px-4 flex items-center rounded-xl font-semibold text-xs transition cursor-pointer whitespace-nowrap shrink-0 gap-1.5 ${
                  activeTab === 'teams'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('nav.teams')}</span>
              </Link>
              <Link
                role="button"
                to="/admin"
                search={(prev: any) => prev}
                className={`min-h-[44px] px-3.5 sm:px-4 flex items-center rounded-xl font-semibold text-xs transition cursor-pointer whitespace-nowrap shrink-0 gap-1.5 ${
                  activeTab === 'admin'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                title="Club Administration & RBAC Portal"
              >
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('nav.admin')}</span>
              </Link>
              <Link
                role="button"
                to="/guide"
                search={(prev: any) => prev}
                className={`min-h-[44px] px-3.5 sm:px-4 flex items-center rounded-xl font-semibold text-xs transition cursor-pointer whitespace-nowrap shrink-0 gap-1.5 ${
                  isGuide
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                title="Coach User Guide & Handbook"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span>Guide</span>
              </Link>
            </nav>
          </div>
          {/* Subtle gradient cue on the right indicating scrollable overflow on mobile */}
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900/90 via-slate-900/40 to-transparent sm:hidden"
            aria-hidden="true"
          />
        </div>
      </div>
    </header>
  );
};
