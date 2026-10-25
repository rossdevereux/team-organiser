import React, { useState, useMemo } from 'react';
import {
  X,
  Users,
  Shield,
  Calendar,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Plus,
  Trash2,
  Upload,
  Clock,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { useMatchday } from '../../context/MatchdayContext';
import { useOnboarding } from './OnboardingContext';
import { useToast } from '../../context/ToastContext';
import { BroadPosition, Player } from '../../types';
import { getNextSaturdayDateString } from '../../utils/dateUtils';
import { DEMO_PLAYERS } from '../../utils/demoData';

interface FormatPreset {
  id: string;
  name: string;
  ageGroup: string;
  pitchPlayerCount: number;
  matchdaySquadCap: number;
  subCount: number;
  periodCount: number;
  periodDurationMinutes: number;
  formation: string;
  recommended?: boolean;
  description: string;
}

const FA_FORMAT_PRESETS: FormatPreset[] = [
  {
    id: '5v5',
    name: '5v5 Youth',
    ageGroup: 'U7/U8',
    pitchPlayerCount: 5,
    matchdaySquadCap: 8,
    subCount: 3,
    periodCount: 2,
    periodDurationMinutes: 20,
    formation: '1-2-1',
    description: '5 pitch players, 2 × 20 min halves (40m match).',
  },
  {
    id: '7v7',
    name: '7v7 Mini-Soccer',
    ageGroup: 'U9/U10',
    pitchPlayerCount: 7,
    matchdaySquadCap: 10,
    subCount: 3,
    periodCount: 2,
    periodDurationMinutes: 25,
    formation: '2-3-1',
    recommended: true,
    description: '7 pitch players, 2 × 25 min halves (50m match). Standard FA grassroots format.',
  },
  {
    id: '9v9',
    name: '9v9 Junior',
    ageGroup: 'U11/U12',
    pitchPlayerCount: 9,
    matchdaySquadCap: 12,
    subCount: 3,
    periodCount: 2,
    periodDurationMinutes: 30,
    formation: '3-3-2',
    description: '9 pitch players, 2 × 30 min halves (60m match). Offside rule applies.',
  },
];

interface QuickPlayerInput {
  name: string;
  squadNumber: number;
  preferredPosition: BroadPosition;
}

export const OnboardingWizardModal: React.FC = () => {
  const { isWizardOpen, closeWizard, completeWizard } = useOnboarding();
  const {
    activeTeam,
    createTeam,
    updateSettings,
    bulkCreatePlayers,
    createFixture,
    autoRotateCurrentFixture,
    setActiveTeamId,
    setActiveFixtureId,
  } = useMatchday();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Team & Format
  const [teamName, setTeamName] = useState(activeTeam?.name || 'The Rovers U10s');
  const [selectedFormat, setSelectedFormat] = useState<FormatPreset>(FA_FORMAT_PRESETS[1]); // 7v7 default
  const [equalTimeTarget, setEqualTimeTarget] = useState<number>(50);

  // Step 2: Squad
  const [squadPathway, setSquadPathway] = useState<'demo' | 'quick' | 'csv'>('demo');
  const [rosterPlayers, setRosterPlayers] = useState<QuickPlayerInput[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNumber, setNewPlayerNumber] = useState<number>(rosterPlayers.length + 1);
  const [newPlayerPos, setNewPlayerPos] = useState<BroadPosition>('Midfield');

  // Step 3: First Fixture
  const [opponentName, setOpponentName] = useState('Riverside Juniors');
  const [fixtureDate, setFixtureDate] = useState(getNextSaturdayDateString());
  const [venue, setVenue] = useState<'Home' | 'Away'>('Home');
  const [kickOffTime, setKickOffTime] = useState('10:00');

  // Auto-populate demo squad when demo pathway selected or on initial modal load
  React.useEffect(() => {
    if (isWizardOpen && rosterPlayers.length === 0) {
      loadDemoPlayers();
    }
  }, [isWizardOpen]);

  const loadDemoPlayers = () => {
    const demo = DEMO_PLAYERS.slice(0, selectedFormat.matchdaySquadCap).map((p, idx) => ({
      name: p.name,
      squadNumber: p.squadNumber || idx + 1,
      preferredPosition: (p.preferredPositions?.[0] as BroadPosition) || 'Midfield',
    }));
    setRosterPlayers(demo);
    setNewPlayerNumber(demo.length + 1);
  };

  const handleAddQuickPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    const added: QuickPlayerInput = {
      name: newPlayerName.trim(),
      squadNumber: Number(newPlayerNumber) || rosterPlayers.length + 1,
      preferredPosition: newPlayerPos,
    };

    setRosterPlayers((prev) => [...prev, added]);
    setNewPlayerName('');
    setNewPlayerNumber(rosterPlayers.length + 2);
  };

  const handleRemovePlayer = (index: number) => {
    setRosterPlayers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      const hasHeader = lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('player');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      const parsed: QuickPlayerInput[] = [];
      dataLines.forEach((line, idx) => {
        const parts = line.split(/[,\t]/).map((c) => c.replace(/^"|"$/g, '').trim());
        if (!parts[0]) return;
        const name = parts[0];
        const num = parts[1] && !isNaN(Number(parts[1])) ? parseInt(parts[1], 10) : idx + 1;
        const rawPos = parts[2]?.toLowerCase() || '';
        let pos: BroadPosition = 'Midfield';
        if (rawPos.includes('goal') || rawPos === 'gk') pos = 'Goalkeeper';
        else if (rawPos.includes('def') || rawPos === 'cb' || rawPos === 'rb' || rawPos === 'lb') pos = 'Defence';
        else if (rawPos.includes('att') || rawPos.includes('fwd') || rawPos === 'st') pos = 'Attack';

        parsed.push({ name, squadNumber: num, preferredPosition: pos });
      });

      if (parsed.length > 0) {
        setRosterPlayers((prev) => [...prev, ...parsed]);
        showToast(`Imported ${parsed.length} players from CSV.`, 'success');
      }
    };
    reader.readAsText(file);
  };

  const handleFinishWizard = async () => {
    setIsSubmitting(true);
    try {
      // 1. Create or update team
      let teamId = activeTeam?.id;
      if (!teamId || activeTeam?.id === 'team-1' || activeTeam?.id === 'team-2') {
        const newTeam = await createTeam({
          name: teamName.trim() || 'My Youth Team',
          ageGroup: selectedFormat.ageGroup,
          settings: {
            pitchPlayerCount: selectedFormat.pitchPlayerCount,
            matchdaySquadCap: selectedFormat.matchdaySquadCap,
            subCount: selectedFormat.subCount,
            matchPeriodCount: selectedFormat.periodCount,
            periodDurationMinutes: selectedFormat.periodDurationMinutes,
            targetGameTimePercent: equalTimeTarget,
            defaultFormation: selectedFormat.formation,
            subTimingMode: 'at_breaks',
            preserveLineupAcrossBreaks: false,
            defaultSubIntervalMinutes: 10,
            midPeriodSubIntervalMinutes: selectedFormat.periodDurationMinutes / 2,
            currentSeason: '2026/2027',
            seasons: ['2026/2027'],
          },
        });
        if (newTeam) {
          teamId = newTeam.id;
          setActiveTeamId(newTeam.id);
        }
      } else {
        await updateSettings({
          pitchPlayerCount: selectedFormat.pitchPlayerCount,
          matchdaySquadCap: selectedFormat.matchdaySquadCap,
          subCount: selectedFormat.subCount,
          matchPeriodCount: selectedFormat.periodCount,
          periodDurationMinutes: selectedFormat.periodDurationMinutes,
          targetGameTimePercent: equalTimeTarget,
          defaultFormation: selectedFormat.formation,
        });
      }

      // 2. Add players if any were configured
      let createdPlayerIds: string[] = [];
      if (teamId && rosterPlayers.length > 0) {
        const playersToCreate = rosterPlayers.map((p) => ({
          teamId,
          name: p.name,
          squadNumber: p.squadNumber,
          preferredPositions: [p.preferredPosition],
          specificPositions: [],
          unavailableDates: [],
        }));
        const created = await bulkCreatePlayers(playersToCreate);
        createdPlayerIds = created.map((p) => p.id);
      }

      // 3. Create the first match fixture
      if (teamId) {
        const squadIds = createdPlayerIds.slice(0, selectedFormat.matchdaySquadCap);
        const newFixture = await createFixture({
          teamId,
          opponent: opponentName.trim() || 'Rival FC',
          date: fixtureDate,
          venue,
          kickOffTime,
          status: 'Upcoming',
          pitchPlayerCount: selectedFormat.pitchPlayerCount,
          matchPeriodCount: selectedFormat.periodCount,
          periodDurationMinutes: selectedFormat.periodDurationMinutes,
          formation: selectedFormat.formation,
          matchSquad: {
            fixtureId: '',
            selectedPlayerIds: squadIds,
            restedPlayerIds: [],
            manualOverrides: false,
            lineupsByPeriod: Array.from({ length: selectedFormat.periodCount }, (_, i) => ({
              period: i + 1,
              positions: [],
              onPitch: [],
              subs: [],
            })),
          },
        });

        if (newFixture) {
          setActiveFixtureId(newFixture.id);
        }
      }

      // 4. Run automatic rotation to produce initial fair lineup
      try {
        await autoRotateCurrentFixture();
      } catch (err) {
        console.warn('Auto rotate error during onboarding:', err);
      }

      showToast('🎉 Setup complete! Welcome to your matchday workspace.', 'success');
      await completeWizard(['team_created', 'players_added', 'fixture_created']);
    } catch (err: any) {
      console.error('Wizard setup failed:', err);
      showToast('Failed to complete onboarding setup: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isWizardOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-wizard-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl shadow-2xl shadow-sky-950/50 overflow-hidden flex flex-col my-auto text-slate-100">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400" />

        {/* Modal Top Bar */}
        <div className="px-5 sm:px-7 pt-6 pb-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20 text-white shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-400">
                <span>SubShuffle Setup Wizard</span>
                <span>•</span>
                <span>Step {step} of 3</span>
              </div>
              <h2 id="onboarding-wizard-title" className="text-lg sm:text-xl font-black text-white tracking-tight">
                {step === 1 && 'Club & Match Format Setup'}
                {step === 2 && 'Squad Roster Kick-Start'}
                {step === 3 && 'First Weekend Match Details'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => closeWizard(true)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-200 hover:underline px-2 py-1 cursor-pointer transition"
              title="Dismiss wizard and explore on your own"
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={() => closeWizard(true)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Close setup wizard"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="px-5 sm:px-7 py-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-xs font-medium text-slate-400">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
                step >= 1 ? 'bg-sky-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
              }`}
            >
              1
            </span>
            <span className={step === 1 ? 'text-white font-bold' : ''}>Format</span>
          </div>

          <div className="w-10 sm:w-16 h-0.5 bg-slate-800">
            <div
              className={`h-full bg-sky-500 transition-all duration-300 ${
                step >= 2 ? 'w-full' : 'w-0'
              }`}
            />
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
                step >= 2 ? 'bg-sky-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
              }`}
            >
              2
            </span>
            <span className={step === 2 ? 'text-white font-bold' : ''}>Squad</span>
          </div>

          <div className="w-10 sm:w-16 h-0.5 bg-slate-800">
            <div
              className={`h-full bg-sky-500 transition-all duration-300 ${
                step >= 3 ? 'w-full' : 'w-0'
              }`}
            />
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
                step >= 3 ? 'bg-sky-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
              }`}
            >
              3
            </span>
            <span className={step === 3 ? 'text-white font-bold' : ''}>Fixture</span>
          </div>
        </div>

        {/* Modal Step Content Body */}
        <div className="p-5 sm:p-7 space-y-6 max-h-[68vh] overflow-y-auto">
          {/* STEP 1: Club & Match Format */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Team Name Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Team Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. The Rovers U10s"
                    className="w-full h-11 px-4 rounded-xl bg-slate-950 border border-slate-700 focus:border-sky-500 focus:outline-none text-sm text-white placeholder-slate-500 font-medium"
                    required
                  />
                </div>
              </div>

              {/* 1-Tap FA Format Presets */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                    FA Youth Match Format
                  </label>
                  <span className="text-[11px] text-sky-400 font-semibold">
                    1-Tap FA Youth Presets
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {FA_FORMAT_PRESETS.map((preset) => {
                    const isSelected = selectedFormat.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedFormat(preset)}
                        className={`relative p-3.5 sm:p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-sky-950/40 border-sky-500 shadow-md shadow-sky-500/10 ring-1 ring-sky-500'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        {preset.recommended && (
                          <span className="absolute -top-2 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 shadow-sm">
                            FA Default
                          </span>
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-base font-extrabold text-white">
                              {preset.name}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                            )}
                          </div>
                          <span className="inline-block text-[11px] font-mono text-slate-400">
                            Age {preset.ageGroup}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                          {preset.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 50%+ Equal Game Time Rule Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-950 border border-emerald-500/30 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">FA 50%+ Equal Minutes Rule</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                      {equalTimeTarget}% Target
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    FA youth football guidelines require every player receives at least 50% game time. SubShuffle automatically balances substitutions mathematically across all periods.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Squad Roster Kick-Start */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Pathway Selector */}
              <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setSquadPathway('demo');
                    if (rosterPlayers.length === 0) loadDemoPlayers();
                  }}
                  className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    squadPathway === 'demo'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="truncate">Demo Squad</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSquadPathway('quick')}
                  className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    squadPathway === 'quick'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="truncate">Quick Add</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSquadPathway('csv')}
                  className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    squadPathway === 'csv'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span className="truncate">CSV File</span>
                </button>
              </div>

              {/* Pathway 1: Demo Squad */}
              {squadPathway === 'demo' && (
                <div className="p-3.5 rounded-2xl bg-sky-950/20 border border-sky-500/30 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="text-slate-200">
                      Standard FA-balanced squad loaded with {rosterPlayers.length} youth players.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={loadDemoPlayers}
                    className="px-2.5 py-1 rounded-lg bg-sky-600/30 text-sky-300 hover:bg-sky-600/50 text-[11px] font-bold shrink-0 cursor-pointer"
                  >
                    Reset Demo
                  </button>
                </div>
              )}

              {/* Pathway 2: Quick Add Form */}
              {squadPathway === 'quick' && (
                <form
                  onSubmit={handleAddQuickPlayer}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        placeholder="Player full name"
                        className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-sky-500 placeholder-slate-500"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={newPlayerNumber}
                        onChange={(e) => setNewPlayerNumber(Number(e.target.value))}
                        placeholder="No."
                        className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-sky-500 font-mono"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <select
                        value={newPlayerPos}
                        onChange={(e) => setNewPlayerPos(e.target.value as BroadPosition)}
                        className="w-full h-10 px-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                      >
                        <option value="Goalkeeper">Goalkeeper</option>
                        <option value="Defence">Defence</option>
                        <option value="Midfield">Midfield</option>
                        <option value="Attack">Attack</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!newPlayerName.trim()}
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Player</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Pathway 3: CSV Import */}
              {squadPathway === 'csv' && (
                <div className="p-5 rounded-2xl bg-slate-950 border border-dashed border-slate-700 text-center space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-200">
                      Upload club squad CSV or spreadsheet
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Headers: Name, Number, PreferredPosition (e.g. "Leo Davies, 1, Goalkeeper")
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer shadow-md">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose CSV File</span>
                    <input
                      type="file"
                      accept=".csv,text/csv,text/plain"
                      onChange={handleCsvFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Roster Live List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Current Squad List</span>
                  <span className="font-mono text-sky-400">
                    {rosterPlayers.length} / {selectedFormat.matchdaySquadCap} players
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {rosterPlayers.map((player, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-300 font-mono font-bold flex items-center justify-center text-[11px] shrink-0">
                          {player.squadNumber}
                        </span>
                        <span className="font-semibold text-white truncate">{player.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono shrink-0">
                          {player.preferredPosition.slice(0, 3)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePlayer(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition cursor-pointer"
                        title="Remove player"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: First Fixture */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Opponent Club
                  </label>
                  <input
                    type="text"
                    value={opponentName}
                    onChange={(e) => setOpponentName(e.target.value)}
                    placeholder="e.g. Riverside Juniors"
                    className="w-full h-11 px-4 rounded-xl bg-slate-950 border border-slate-700 focus:border-sky-500 focus:outline-none text-sm text-white font-medium"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Match Date
                  </label>
                  <input
                    type="date"
                    value={fixtureDate}
                    onChange={(e) => setFixtureDate(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-slate-950 border border-slate-700 focus:border-sky-500 focus:outline-none text-sm text-white font-medium font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Venue
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setVenue('Home')}
                      className={`h-11 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        venue === 'Home'
                          ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      Home 🏠
                    </button>
                    <button
                      type="button"
                      onClick={() => setVenue('Away')}
                      className={`h-11 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        venue === 'Away'
                          ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      Away 🚌
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Kick-Off Time
                  </label>
                  <input
                    type="time"
                    value={kickOffTime}
                    onChange={(e) => setKickOffTime(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-slate-950 border border-slate-700 focus:border-sky-500 focus:outline-none text-sm text-white font-medium font-mono"
                  />
                </div>
              </div>

              {/* Summary Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-tr from-slate-950 via-slate-950 to-sky-950/30 border border-sky-500/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Matchday Ready Preview</span>
                </div>
                <div className="text-sm font-black text-white">
                  {venue} vs {opponentName || 'Opponent'}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 font-mono">
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                    {selectedFormat.name}
                  </span>
                  <span>•</span>
                  <span>{selectedFormat.periodCount} × {selectedFormat.periodDurationMinutes}m halves</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">{rosterPlayers.length} players squad</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="px-5 sm:px-7 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as any)}
              disabled={isSubmitting}
              className="min-h-[42px] px-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as any)}
                className="min-h-[42px] px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white flex items-center gap-2 shadow-md shadow-sky-600/20 transition cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishWizard}
                disabled={isSubmitting}
                className="min-h-[42px] px-6 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-xs font-extrabold text-slate-950 flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 fill-slate-950" />
                <span>{isSubmitting ? 'Building Workspace...' : '✨ Launch Magic Lineup!'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
