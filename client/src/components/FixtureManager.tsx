import React, { useState, useMemo } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import { Fixture, Player } from '../types';
import { PostMatchModal } from './PostMatchModal';
import { SuggestedSubsModal } from './SuggestedSubsModal';
import { AllFixturesTable } from './AllFixturesTable';
import { EditFixtureModal } from './EditFixtureModal';
import { EmptyState } from './EmptyState';
import { useToast } from '../context/ToastContext';
import {
  Calendar,
  Plus,
  MapPin,
  Clock,
  Trash2,
  CheckCircle2,
  ChevronRight,
  X,
  Trophy,
  Filter,
  ArrowRightLeft,
  Sliders,
  Sparkles,
  Award,
  FileSpreadsheet,
  LayoutGrid,
  ExternalLink,
  Crown,
  Edit3,
} from 'lucide-react';

export const FixtureManager: React.FC = () => {
  const {
    fixtures,
    players,
    activeFixtureId,
    setActiveFixtureId,
    createFixture,
    deleteFixture,
    setMatchCaptain,
    setActiveTab,
    settings,
    createSeason,
  } = useMatchday();

  const { showToast } = useToast();

  const currentDefaultSeason = settings.currentSeason || '2026/2027';

  // Configured seasons for the team
  const configuredSeasons = settings.seasons || ['2025/2026', '2026/2027'];
  const allDistinctSeasons = Array.from(
    new Set([...configuredSeasons, ...fixtures.map((f) => f.season || currentDefaultSeason)])
  ).filter(Boolean);

  if (!allDistinctSeasons.includes(currentDefaultSeason)) {
    allDistinctSeasons.unshift(currentDefaultSeason);
  }

  // Helper to compute meet time 30 mins before kick off
  const calcMeetTime = (ko: string, offsetMins: number = 30): string => {
    const [h, m] = ko.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '09:30';
    let total = h * 60 + m - offsetMins;
    if (total < 0) total += 24 * 60;
    const newH = Math.floor(total / 60) % 24;
    const newM = total % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [opponent, setOpponent] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [kickOffTime, setKickOffTime] = useState<string>('10:00');
  const [meetTime, setMeetTime] = useState<string>('09:30');
  const [groundAddress, setGroundAddress] = useState<string>('');
  const [captainId, setCaptainId] = useState<string>('');
  const [venue, setVenue] = useState<'Home' | 'Away'>('Home');
  const [season, setSeason] = useState<string>(currentDefaultSeason);
  const [selectedSeasonFilter, setSelectedSeasonFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // New Season Creation Modal State
  const [isCreatingSeason, setIsCreatingSeason] = useState<boolean>(false);
  const [newSeasonInput, setNewSeasonInput] = useState<string>('');

  // Captain Selection Modal State
  const [captainFixture, setCaptainFixture] = useState<Fixture | null>(null);

  // Modals for post-match and suggested substitutions
  const [postMatchFixture, setPostMatchFixture] = useState<Fixture | null>(null);
  const [suggestedSubsFixture, setSuggestedSubsFixture] = useState<Fixture | null>(null);
  const [editingFixture, setEditingFixture] = useState<Fixture | null>(null);

  const filteredFixtures = fixtures.filter((f) => {
    if (selectedSeasonFilter === 'ALL') return true;
    return (f.season || currentDefaultSeason) === selectedSeasonFilter;
  });

  const handleKickOffChange = (newKo: string) => {
    setKickOffTime(newKo);
    setMeetTime(calcMeetTime(newKo, 30));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponent.trim() || !date) return;

    const oppName = opponent.trim();
    await createFixture({
      opponent: oppName,
      season: season.trim() || currentDefaultSeason,
      date,
      kickOffTime,
      meetTime: meetTime || undefined,
      groundAddress: groundAddress.trim() || undefined,
      captainId: captainId || undefined,
      venue,
      status: 'Upcoming',
    });

    setIsAdding(false);
    setOpponent('');
    setGroundAddress('');
    setCaptainId('');
    showToast(`Scheduled fixture vs ${oppName}!`, 'success');
  };

  const handleAddNewSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeasonInput.trim()) return;
    const sName = newSeasonInput.trim();
    await createSeason(sName);
    setSeason(sName);
    setNewSeasonInput('');
    setIsCreatingSeason(false);
  };

  // Calculate captain appearances across fixtures for equitable rotation suggestion
  const playerCaptainCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    fixtures.forEach((f) => {
      if (f.captainId) {
        counts[f.captainId] = (counts[f.captainId] || 0) + 1;
      }
    });
    return counts;
  }, [fixtures]);

  const sortedPlayersForCaptaincy = useMemo(() => {
    return [...players].sort((a, b) => {
      const cA = playerCaptainCounts[a.id] || 0;
      const cB = playerCaptainCounts[b.id] || 0;
      return cA - cB;
    });
  }, [players, playerCaptainCounts]);

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Fixtures & Matches ({fixtures.length})</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold flex items-center gap-1">
                <Trophy className="w-3 h-3 text-indigo-400" />
                <span>{currentDefaultSeason}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Schedule upcoming matches, ground logistics, meet times, captaincy rotation, and post-match participation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle: Cards vs Table Matrix */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer text-xs ${
                viewMode === 'cards'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Display fixtures as match cards"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer text-xs ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Display team sheets matrix table with column per fixture"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Team Sheet Matrix</span>
            </button>
          </div>

          {/* Season Filter Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-400">Season:</span>
            <select
              value={selectedSeasonFilter}
              onChange={(e) => setSelectedSeasonFilter(e.target.value)}
              className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Seasons</option>
              {allDistinctSeasons.map((s) => (
                <option key={s} value={s} className="bg-slate-900 text-white">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Create Season Button */}
          <button
            type="button"
            onClick={() => setIsCreatingSeason(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
            title="Create a new season for your club"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Season</span>
          </button>

          <button
            onClick={() => {
              setSeason(currentDefaultSeason);
              setIsAdding(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Fixture</span>
          </button>
        </div>
      </div>

      {/* Create Season Mini Modal */}
      {isCreatingSeason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleAddNewSeason}
            className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Create New Season</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreatingSeason(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Add a league season (e.g. 2026/2027, 2027/2028, or Autumn 2026) to organize your squad's fixtures.
            </p>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Season Name</label>
              <input
                type="text"
                value={newSeasonInput}
                onChange={(e) => setNewSeasonInput(e.target.value)}
                placeholder="e.g. 2027/2028"
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingSeason(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-850 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20"
              >
                Create Season
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add New Fixture Modal/Card */}
      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="p-5 rounded-2xl bg-slate-900 border border-indigo-500/40 shadow-2xl space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-indigo-400" />
              <span>Schedule New Fixture & Logistics</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Opponent Team</label>
              <input
                type="text"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="e.g. Oakridge Youth Tigers"
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            {/* Season Dropdown with Create Option */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 font-semibold">Season</label>
                <button
                  type="button"
                  onClick={() => setIsCreatingSeason(true)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  + New
                </button>
              </div>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-medium"
              >
                {allDistinctSeasons.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Match Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Kick-off Time</label>
              <input
                type="time"
                value={kickOffTime}
                onChange={(e) => handleKickOffChange(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Venue</label>
              <select
                value={venue}
                onChange={(e) => setVenue(e.target.value as 'Home' | 'Away')}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="Home">Home</option>
                <option value="Away">Away</option>
              </select>
            </div>
          </div>

          {/* Row 2: Meet Time, Ground Address / Postcode, Captain Armband */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1 border-t border-slate-800/80">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-400" />
                  <span>Meet / Arrival Time</span>
                </label>
                <button
                  type="button"
                  onClick={() => setMeetTime(calcMeetTime(kickOffTime, 30))}
                  className="text-[10px] text-sky-400 hover:text-sky-300 font-medium"
                >
                  ⚡ Auto -30m
                </button>
              </div>
              <input
                type="time"
                value={meetTime}
                onChange={(e) => setMeetTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-rose-400" />
                <span>Ground Address & Postcode</span>
              </label>
              <input
                type="text"
                value={groundAddress}
                onChange={(e) => setGroundAddress(e.target.value)}
                placeholder="e.g. Riverside Rec Ground, RG1 4PS"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-400" />
                <span>Matchday Captain (©)</span>
              </label>
              <select
                value={captainId}
                onChange={(e) => setCaptainId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="">-- Select Captain (Optional) --</option>
                {sortedPlayersForCaptaincy.map((p: Player) => {
                  const count = playerCaptainCounts[p.id] || 0;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.squadNumber ? `#${p.squadNumber} ` : ''}{p.name} {count === 0 ? '(0x - Recommended)' : `(${count}x)`}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-850 text-slate-400 hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition cursor-pointer"
            >
              Create Fixture
            </button>
          </div>
        </form>
      )}

      {/* Conditional View: Table Matrix vs Cards Grid */}
      {viewMode === 'table' ? (
        <AllFixturesTable selectedSeason={selectedSeasonFilter} />
      ) : (
        <>
          {/* Fixtures List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFixtures.map((fixture) => {
          const isActive = fixture.id === activeFixtureId;
          const fixtureSeason = fixture.season || currentDefaultSeason;
          const formattedDate = new Date(fixture.date).toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });

          const isPostMatchDone = Boolean(fixture.postMatchRecording);

          return (
            <div
              key={fixture.id}
              onClick={() => {
                setActiveFixtureId(fixture.id);
                setActiveTab('lineup');
              }}
              className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-4 ${
                isActive
                  ? 'bg-slate-900 border-sky-500/80 ring-2 ring-sky-500/30 shadow-xl'
                  : 'bg-slate-900/40 hover:bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                        fixture.status === 'Upcoming'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : fixture.status === 'Completed'
                          ? 'bg-slate-800 text-slate-400 border-slate-700'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {fixture.status}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1">
                      <Trophy className="w-2.5 h-2.5" />
                      <span>{fixtureSeason}</span>
                    </span>
                    {isPostMatchDone && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        <span>{fixture.postMatchRecording?.trackingMode === 'full_credit' ? '100% Credit' : 'Exact Recorded'}</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white mt-2">
                    vs {fixture.opponent}
                  </h3>
                </div>

                {isActive && (
                  <span className="flex items-center gap-1 text-[11px] text-sky-400 font-semibold bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Active</span>
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{formattedDate}</span>
                </div>
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>KO: {fixture.kickOffTime || '10:00'}</span>
                    {fixture.meetTime && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 font-mono font-bold border border-indigo-500/25">
                        Meet: {fixture.meetTime}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">
                      {fixture.venue} {fixture.groundAddress ? `• ${fixture.groundAddress}` : 'Venue'}
                    </span>
                  </div>
                  {fixture.groundAddress && (
                    <a
                      href={fixture.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fixture.groundAddress)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/20 transition cursor-pointer"
                      title="Open address in Google Maps"
                    >
                      <span>Maps</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>

                {/* Captain Armband Section */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <div className="flex items-center gap-1.5">
                    {fixture.captainId && playerMap.get(fixture.captainId) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[10px]">
                        <Crown className="w-3 h-3 text-amber-400" />
                        <span>
                          © {playerMap.get(fixture.captainId)?.squadNumber ? `#${playerMap.get(fixture.captainId)?.squadNumber} ` : ''}
                          {playerMap.get(fixture.captainId)?.name}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic flex items-center gap-1">
                        <Crown className="w-3 h-3 text-slate-600" />
                        <span>No captain assigned</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCaptainFixture(fixture);
                    }}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold px-2 py-0.5 rounded hover:bg-slate-800 transition cursor-pointer"
                  >
                    {fixture.captainId ? 'Change ©' : '+ Assign ©'}
                  </button>
                </div>

                {/* Player of the Match Award (if recorded) */}
                {fixture.playerOfTheMatchId && playerMap.get(fixture.playerOfTheMatchId) && (
                  <div className="pt-1 flex items-center gap-1 text-[10px]">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                      <Award className="w-3 h-3 text-emerald-400" />
                      <span>⭐ Award: {playerMap.get(fixture.playerOfTheMatchId)?.name}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Suggested Subs & Post-Match Recording */}
              <div className="pt-2 flex items-center gap-2 flex-wrap text-xs">
                {fixture.matchSquad && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSuggestedSubsFixture(fixture);
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold text-[11px] flex items-center justify-center gap-1 transition"
                  >
                    <ArrowRightLeft className="w-3 h-3 text-amber-400" />
                    <span>Suggested Subs</span>
                  </button>
                )}

                {fixture.matchSquad && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPostMatchFixture(fixture);
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold text-[11px] flex items-center justify-center gap-1 transition"
                  >
                    <Sliders className="w-3 h-3 text-indigo-400" />
                    <span>Post-Match Record</span>
                  </button>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  Squad: {fixture.matchSquad?.selectedPlayerIds.length || 0} selected
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFixture(fixture);
                    }}
                    className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition cursor-pointer flex items-center justify-center"
                    title="Edit fixture logistics & details"
                    aria-label={`Edit fixture vs ${fixture.opponent}`}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete fixture vs ${fixture.opponent}? This action cannot be undone.`)) {
                        deleteFixture(fixture.id);
                        showToast(`Removed fixture vs ${fixture.opponent}`, 'info');
                      }
                    }}
                    className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer flex items-center justify-center"
                    title="Delete fixture"
                    aria-label={`Delete fixture vs ${fixture.opponent}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <span className="text-sky-400 font-semibold flex items-center text-xs">
                    <span>Lineup</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredFixtures.length === 0 && (
        <EmptyState
          variant="fixtures"
          title="No Fixtures Scheduled"
          description={
            selectedSeasonFilter === 'ALL'
              ? 'Schedule your upcoming league or friendly matches to generate tactical player rotations and lineups.'
              : `No fixtures found for season ${selectedSeasonFilter}. Schedule a match or select another season filter.`
          }
          action={{
            label: 'Schedule Match',
            onClick: () => setIsAdding(true),
            icon: Plus,
          }}
        />
      )}
        </>
      )}

      {/* Assign Matchday Captain Modal */}
      {captainFixture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Assign Matchday Captain (©)</span>
              </h3>
              <button
                type="button"
                onClick={() => setCaptainFixture(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Rotate the captain's armband across your players. Players who have captained least this season are prioritized at the top.
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {sortedPlayersForCaptaincy.map((p: Player) => {
                const count = playerCaptainCounts[p.id] || 0;
                const isCurrent = captainFixture.captainId === p.id;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={async () => {
                      await setMatchCaptain(captainFixture.id, isCurrent ? undefined : p.id);
                      setCaptainFixture(null);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs text-left transition cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 ring-2 ring-amber-500/30'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-white hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-xs">
                        {p.squadNumber ? `#${p.squadNumber}` : '©'}
                      </div>
                      <div>
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {p.preferredPositions.join(', ')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          count === 0
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {count === 0 ? '0x (Recommended)' : `${count}x captain`}
                      </span>
                      {isCurrent && (
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={async () => {
                  await setMatchCaptain(captainFixture.id, undefined);
                  setCaptainFixture(null);
                }}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
              >
                Clear Captain
              </button>
              <button
                type="button"
                onClick={() => setCaptainFixture(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Match Modal */}
      <PostMatchModal
        fixture={postMatchFixture}
        isOpen={Boolean(postMatchFixture)}
        onClose={() => setPostMatchFixture(null)}
      />

      {/* Suggested Subs Modal */}
      <SuggestedSubsModal
        fixture={suggestedSubsFixture}
        isOpen={Boolean(suggestedSubsFixture)}
        onClose={() => setSuggestedSubsFixture(null)}
      />

      {/* Edit Fixture Modal */}
      <EditFixtureModal
        fixture={editingFixture}
        isOpen={Boolean(editingFixture)}
        onClose={() => setEditingFixture(null)}
      />
    </div>
  );
};
