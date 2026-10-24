import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchday } from '../context/MatchdayContext';
import { Team, TeamSettings, SubstitutionTimingMode } from '../types';
import { getFormationsForTeamSize } from '../utils/formations';
import { trackTeamCreated } from '../utils/analytics';
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
  Clock,
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
    unshareTeam,
    currentUser,
    setActiveTab,
  } = useMatchday();

  const { t } = useTranslation();

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
  const [subTimingMode, setSubTimingMode] = useState<SubstitutionTimingMode>('at_breaks');
  const [preserveLineupAcrossBreaks, setPreserveLineupAcrossBreaks] = useState<boolean>(false);
  const [midPeriodSubIntervalMinutes, setMidPeriodSubIntervalMinutes] = useState<number>(12.5);

  const availableFormations = getFormationsForTeamSize(pitchPlayerCount);

  // Adjust defaults when pitchPlayerCount changes
  const handlePitchSizeChange = (size: number) => {
    setPitchPlayerCount(size);
    if (size === 5) {
      setMatchdaySquadCap(7);
      setDefaultFormation('1-2-1');
      setPeriodDurationMinutes(20);
      setMidPeriodSubIntervalMinutes(10);
    } else if (size === 7) {
      setMatchdaySquadCap(10);
      setDefaultFormation('2-3-1');
      setPeriodDurationMinutes(25);
      setMidPeriodSubIntervalMinutes(12.5);
    } else if (size === 9) {
      setMatchdaySquadCap(12);
      setDefaultFormation('3-3-2');
      setPeriodDurationMinutes(30);
      setMidPeriodSubIntervalMinutes(15);
    } else if (size === 11) {
      setMatchdaySquadCap(14);
      setDefaultFormation('4-4-2');
      setPeriodDurationMinutes(35);
      setMidPeriodSubIntervalMinutes(17.5);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    trackTeamCreated({
      format: pitchPlayerCount,
      ageGroup,
    });

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
        subTimingMode,
        preserveLineupAcrossBreaks,
        midPeriodSubIntervalMinutes,
      },
    });

    setIsCreating(false);
    setName('');
    setSubTimingMode('at_breaks');
    setPreserveLineupAcrossBreaks(false);
    setMidPeriodSubIntervalMinutes(12.5);
  };

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharingTeamId || !shareEmail.trim()) return;

    const emailToShare = shareEmail.trim();
    await shareTeam(sharingTeamId, emailToShare);
    setShareSuccess(t('teams.shareSuccess', { email: emailToShare }));
    setShareEmail('');
    setTimeout(() => {
      setShareSuccess(null);
      setSharingTeamId(null);
    }, 2500);
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
            <h2 className="text-base font-bold text-white">{t('teams.title')} ({teams.length})</h2>
            <p className="text-xs text-slate-400">
              {t('teams.subtitle')}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-lg shadow-sky-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('teams.createTeam')}</span>
        </button>
      </div>

      {/* Share Modal Dialog */}
      {sharingTeamId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white">{t('teams.shareTitle')}</h3>
              </div>
              <button
                onClick={() => setSharingTeamId(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              {t('teams.shareDesc')}
            </p>

            {/* Existing Shared Members List */}
            {(() => {
              const currentTeam = teams.find((t) => t.id === sharingTeamId);
              const members = currentTeam?.sharedMembers || [];
              const rawSharedWith = currentTeam?.sharedWith || [];
              const pending = currentTeam?.pendingInvites || [];

              // Collect unique list of coaches
              const coachList: { identifier: string; email: string; userId?: string; isPending: boolean }[] = [];

              members.forEach((m) => {
                if (!coachList.some((c) => c.email.toLowerCase() === m.email.toLowerCase())) {
                  coachList.push({
                    identifier: m.userId || m.email,
                    email: m.email,
                    userId: m.userId,
                    isPending: !m.userId,
                  });
                }
              });

              // Also check pendingInvites not in members
              pending.forEach((pEmail) => {
                if (!coachList.some((c) => c.email.toLowerCase() === pEmail.toLowerCase())) {
                  coachList.push({
                    identifier: pEmail,
                    email: pEmail,
                    isPending: true,
                  });
                }
              });

              // Also check sharedWith entries that might be legacy emails
              rawSharedWith.forEach((idOrEmail) => {
                if (idOrEmail.includes('@')) {
                  if (!coachList.some((c) => c.email.toLowerCase() === idOrEmail.toLowerCase())) {
                    coachList.push({
                      identifier: idOrEmail,
                      email: idOrEmail,
                      isPending: true,
                    });
                  }
                } else if (!coachList.some((c) => c.userId === idOrEmail)) {
                  coachList.push({
                    identifier: idOrEmail,
                    email: idOrEmail,
                    userId: idOrEmail,
                    isPending: false,
                  });
                }
              });

              if (coachList.length === 0) return null;

              return (
                <div className="space-y-2 pt-1 border-t border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    Shared Coaches ({coachList.length})
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {coachList.map((coach) => (
                      <div
                        key={coach.identifier}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate mr-2">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="text-white truncate font-medium">{coach.email}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono shrink-0 border ${
                              coach.userId
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                            }`}
                          >
                            {coach.userId ? 'Linked UID' : 'Pending'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (currentTeam) {
                              await unshareTeam(currentTeam.id, coach.identifier);
                            }
                          }}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                          title="Revoke access"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <form onSubmit={handleShareSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  {t('auth.emailAddress')}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder={t('teams.shareEmailPlaceholder')}
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
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20"
                >
                  {t('teams.sendInvite')}
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

          {/* Substitution & Rotation Timing Section */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div>
              <label className="block text-slate-300 font-semibold flex items-center gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>{t('settings.subTimingMode', 'Substitution Timing Strategy')}</span>
              </label>
              <span className="text-[10px] text-slate-500">
                Choose whether players rotate at period breaks or via mid-game rolling substitutions
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSubTimingMode('at_breaks');
                  setPreserveLineupAcrossBreaks(false);
                }}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  subTimingMode === 'at_breaks' && !preserveLineupAcrossBreaks
                    ? 'bg-sky-600/20 border-sky-500/60 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-[11px] text-white">At Period Breaks</div>
                <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                  Lineups shuffle at half-time / quarter transitions
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSubTimingMode('in_game_rolling');
                  setPreserveLineupAcrossBreaks(true);
                  if (!midPeriodSubIntervalMinutes) {
                    setMidPeriodSubIntervalMinutes(periodDurationMinutes / 2);
                  }
                }}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  subTimingMode === 'in_game_rolling' || preserveLineupAcrossBreaks
                    ? 'bg-emerald-600/20 border-emerald-500/60 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-[11px] text-emerald-300 flex items-center gap-1">
                  <span>In-Game Rolling Subs</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">FA Rec</span>
                </div>
                <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                  Carry over lineup across breaks; rotate bench mid-half
                </div>
              </button>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preserveLineupAcrossBreaks}
                  onChange={(e) => setPreserveLineupAcrossBreaks(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <div className="text-left">
                  <span className="block font-semibold text-slate-200 text-[11px]">
                    {t('settings.preserveLineupAcrossBreaks', 'Keep Same Lineup at Half-Time')}
                  </span>
                  <span className="block text-[10px] text-slate-400 leading-normal">
                    {t('settings.preserveLineupAcrossBreaksDesc', 'Start subsequent periods with the identical on-pitch lineup to maintain momentum')}
                  </span>
                </div>
              </label>

              {(preserveLineupAcrossBreaks || subTimingMode === 'in_game_rolling') && (
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-900/40 space-y-1.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-semibold text-[11px]">
                      {t('settings.midPeriodSubInterval', 'In-Game Sub Interval (Minutes)')}
                    </label>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      ~{midPeriodSubIntervalMinutes || 12.5} mins
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="5"
                    max={periodDurationMinutes ? periodDurationMinutes - 2 : 25}
                    value={midPeriodSubIntervalMinutes}
                    onChange={(e) => setMidPeriodSubIntervalMinutes(parseFloat(e.target.value) || 12.5)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    {t('settings.midPeriodSubIntervalDesc', 'Target interval to schedule rolling substitutions (e.g. 12.5m for 25m halves)')}
                  </span>
                </div>
              )}
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
          const isOwner = currentUser
            ? team.ownerId === currentUser.uid ||
              Boolean(currentUser.email && team.ownerEmail?.toLowerCase() === currentUser.email.toLowerCase())
            : true;

          return (
            <div
              key={team.id}
              data-testid={`team-card-${team.id}`}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {team.ageGroup || 'Youth'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                      {team.settings.pitchPlayerCount}-a-side
                    </span>
                    {currentUser && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isOwner
                            ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {isOwner ? 'Your Team' : 'Shared with You'}
                      </span>
                    )}
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
                    {isOwner
                      ? team.sharedWith && team.sharedWith.length > 0
                        ? `Shared with ${team.sharedWith.length} coaches`
                        : 'Created by you'
                      : `Shared with you by ${team.ownerEmail || 'coach'}`}
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
