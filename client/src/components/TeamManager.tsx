import React, { useState } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import { Team, TeamSettings } from '../types';
import { getFormationsForTeamSize } from '../utils/formations';
import {
  Shield,
  Plus,
  Users,
  Share2,
  Check,
  X,
  Trash2,
  CheckCircle2,
  Mail,
  UserCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const TeamManager: React.FC = () => {
  const {
    teams,
    activeTeamId,
    setActiveTeamId,
    createTeam,
    updateTeam,
    deleteTeam,
    shareTeam,
    currentUser,
    setActiveTab,
  } = useMatchday();

  const [isCreating, setIsCreating] = useState(false);
  const [sharingTeamId, setSharingTeamId] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  // New Team Form State
  const [name, setName] = useState('');
  const [ageGroup, setAgeGroup] = useState('U10');
  const [pitchPlayerCount, setPitchPlayerCount] = useState<number>(7);
  const [matchdaySquadCap, setMatchdaySquadCap] = useState<number>(10);
  const [defaultFormation, setDefaultFormation] = useState<string>('2-3-1');
  const [matchPeriodCount, setMatchPeriodCount] = useState<number>(2);
  const [periodDurationMinutes, setPeriodDurationMinutes] = useState<number>(25);

  const availableFormations = getFormationsForTeamSize(pitchPlayerCount);

  // Adjust defaults when pitchPlayerCount changes
  const handlePitchSizeChange = (size: number) => {
    setPitchPlayerCount(size);
    if (size === 5) {
      setMatchdaySquadCap(7);
      setDefaultFormation('1-2-1');
      setPeriodDurationMinutes(20);
    } else if (size === 7) {
      setMatchdaySquadCap(10);
      setDefaultFormation('2-3-1');
      setPeriodDurationMinutes(25);
    } else if (size === 9) {
      setMatchdaySquadCap(12);
      setDefaultFormation('3-3-2');
      setPeriodDurationMinutes(30);
    } else if (size === 11) {
      setMatchdaySquadCap(14);
      setDefaultFormation('4-4-2');
      setPeriodDurationMinutes(35);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await createTeam({
      name: name.trim(),
      ageGroup,
      settings: {
        pitchPlayerCount,
        matchdaySquadCap,
        subCount: Math.max(2, matchdaySquadCap - pitchPlayerCount),
        matchPeriodCount,
        periodDurationMinutes,
        targetGameTimePercent: 50,
        defaultFormation,
        customFormations: [],
      },
    });

    setIsCreating(false);
    setName('');
  };

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharingTeamId || !shareEmail.trim()) return;

    await shareTeam(sharingTeamId, shareEmail.trim());
    setShareSuccess(`Shared with ${shareEmail}`);
    setShareEmail('');
    setTimeout(() => {
      setShareSuccess(null);
      setSharingTeamId(null);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Manage Teams ({teams.length})</h2>
            <p className="text-xs text-slate-400">
              Configure independent squads, age groups, match formats, and co-coach sharing.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-lg shadow-sky-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Team</span>
        </button>
      </div>

      {/* Share Modal Dialog */}
      {sharingTeamId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white">Share Team with Assistant Coach</h3>
              </div>
              <button
                onClick={() => setSharingTeamId(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Invite a co-coach, assistant manager, or parent to view and edit this team's matchday lineups and rotations.
            </p>

            <form onSubmit={handleShareSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Co-Coach Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="coach.john@example.com"
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-500 font-medium"
                  />
                </div>
              </div>

              {shareSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{shareSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSharingTeamId(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-850 text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20"
                >
                  Send Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Team Form */}
      {isCreating && (
        <form
          onSubmit={handleCreateSubmit}
          className="p-5 rounded-2xl bg-slate-900 border border-sky-500/40 shadow-2xl space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>Create New Squad / Team</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Team Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. The Rovers FC U12s"
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Age Group</label>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500 font-medium"
              >
                <option value="U7">U7</option>
                <option value="U8">U8</option>
                <option value="U9">U9</option>
                <option value="U10">U10</option>
                <option value="U11">U11</option>
                <option value="U12">U12</option>
                <option value="U13">U13</option>
                <option value="U14+">U14+</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Pitch Format (Team Size)
              </label>
              <select
                value={pitchPlayerCount}
                onChange={(e) => handlePitchSizeChange(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500 font-medium"
              >
                <option value="5">5-a-side (Mini Soccer)</option>
                <option value="7">7-a-side (Development)</option>
                <option value="9">9-a-side (Youth)</option>
                <option value="11">11-a-side (Full Pitch)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Default Formation
              </label>
              <select
                value={defaultFormation}
                onChange={(e) => setDefaultFormation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500 font-medium"
              >
                {availableFormations.map((f) => (
                  <option key={f.id} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Matchday Squad Cap
              </label>
              <input
                type="number"
                min={pitchPlayerCount}
                max={pitchPlayerCount + 6}
                value={matchdaySquadCap}
                onChange={(e) => setMatchdaySquadCap(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Match Structure
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={matchPeriodCount}
                  onChange={(e) => setMatchPeriodCount(parseInt(e.target.value, 10))}
                  className="w-1/2 px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500 font-medium"
                >
                  <option value="2">2 Halves</option>
                  <option value="4">4 Quarters</option>
                  <option value="3">3 Periods</option>
                </select>
                <div className="w-1/2 flex items-center gap-1">
                  <input
                    type="number"
                    value={periodDurationMinutes}
                    onChange={(e) => setPeriodDurationMinutes(parseFloat(e.target.value))}
                    className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500 font-medium"
                  />
                  <span className="text-[10px] text-slate-400">m</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-850 text-slate-400 hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20"
            >
              Create Team
            </button>
          </div>
        </form>
      )}

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {teams.map((team) => {
          const isActive = team.id === activeTeamId;
          const isOwner = currentUser ? team.ownerId === currentUser.uid : true;

          return (
            <div
              key={team.id}
              onClick={() => {
                setActiveTeamId(team.id);
                setActiveTab('lineup');
              }}
              className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-4 ${
                isActive
                  ? 'bg-slate-900 border-sky-500/80 ring-2 ring-sky-500/30 shadow-2xl'
                  : 'bg-slate-900/40 hover:bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {team.ageGroup || 'Youth'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                      {team.settings.pitchPlayerCount}-a-side
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-2">{team.name}</h3>
                </div>

                {isActive && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Active Team</span>
                  </span>
                )}
              </div>

              {/* Team Specs Summary */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Formation</span>
                  <span className="font-semibold text-slate-200">
                    {team.settings.defaultFormation}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Periods</span>
                  <span className="font-semibold text-slate-200">
                    {team.settings.matchPeriodCount === 2 ? '2 Halves' : `${team.settings.matchPeriodCount} Periods`} ({team.settings.periodDurationMinutes}m)
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Squad Cap</span>
                  <span className="font-semibold text-slate-200">
                    {team.settings.matchdaySquadCap} players
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Target Play</span>
                  <span className="font-semibold text-emerald-400">
                    {team.settings.targetGameTimePercent}%+
                  </span>
                </div>
              </div>

              {/* Sharing & Owner Status */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    {team.sharedWith && team.sharedWith.length > 0
                      ? `Shared with ${team.sharedWith.length} coaches`
                      : 'Private to you'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSharingTeamId(team.id);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    title="Share team with co-coach"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>

                  {teams.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete ${team.name}?`)) {
                          deleteTeam(team.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition"
                      title="Delete team"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <span className="text-sky-400 font-semibold flex items-center text-[11px]">
                    <span>Select</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {teams.length === 0 && (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No Teams Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You don't have any squads configured yet. Create a new team with your preferred match format (5, 7, 9, or 11-a-side) or ask a fellow coach to share access with you.
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-lg shadow-sky-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your First Team</span>
          </button>
        </div>
      )}
    </div>
  );
};
