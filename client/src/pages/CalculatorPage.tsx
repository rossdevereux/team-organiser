import React, { useState, useMemo } from 'react';
import {
  Users,
  Clock,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Info,
  Calendar,
  Share2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { PublicNav } from '../components/PublicNav';
import { useMatchday } from '../context/MatchdayContext';
import { useToast } from '../context/ToastContext';
import { AppVersion } from '../components/AppVersion';
import { ReleaseNotesModal } from '../components/ReleaseNotesModal';

interface MatchFormatOption {
  id: string;
  name: string;
  ageGroup: string;
  playersOnPitch: number;
  defaultDuration: number;
  defaultSquad: number;
}

const FORMAT_OPTIONS: MatchFormatOption[] = [
  { id: '5v5', name: '5-a-side', ageGroup: 'U7 / U8', playersOnPitch: 5, defaultDuration: 40, defaultSquad: 7 },
  { id: '7v7', name: '7-a-side', ageGroup: 'U9 / U10', playersOnPitch: 7, defaultDuration: 50, defaultSquad: 10 },
  { id: '9v9', name: '9-a-side', ageGroup: 'U11 / U12', playersOnPitch: 9, defaultDuration: 60, defaultSquad: 12 },
  { id: '11v11', name: '11-a-side', ageGroup: 'U13+', playersOnPitch: 11, defaultDuration: 70, defaultSquad: 15 },
];

export const CalculatorPage: React.FC = () => {
  const { enterDemoMode } = useMatchday();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [selectedFormatId, setSelectedFormatId] = useState<string>('7v7');
  const [matchDuration, setMatchDuration] = useState<number>(50);
  const [periodsCount, setPeriodsCount] = useState<number>(4);
  const [squadSize, setSquadSize] = useState<number>(10);
  const [copied, setCopied] = useState<boolean>(false);
  const [changelogOpen, setChangelogOpen] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const currentFormat = useMemo(
    () => FORMAT_OPTIONS.find((f) => f.id === selectedFormatId) || FORMAT_OPTIONS[1],
    [selectedFormatId]
  );

  const handleFormatChange = (format: MatchFormatOption) => {
    setSelectedFormatId(format.id);
    setMatchDuration(format.defaultDuration);
    setSquadSize(format.defaultSquad);
  };

  // Calculations
  const onPitch = currentFormat.playersOnPitch;
  const subsCount = Math.max(0, squadSize - onPitch);
  const totalPitchMinutes = onPitch * matchDuration;
  const targetMinutesPerPlayer = squadSize > 0 ? (totalPitchMinutes / squadSize) : 0;
  const targetPercentage = matchDuration > 0 ? (targetMinutesPerPlayer / matchDuration) * 100 : 0;
  const minutesPerPeriod = periodsCount > 0 ? matchDuration / periodsCount : 0;

  // Generate rotation simulation across periods
  const rotationSchedule = useMemo(() => {
    // Generate simulated players: Player 1 to Player N
    const players = Array.from({ length: squadSize }, (_, i) => ({
      id: `p-${i + 1}`,
      name: `Player ${i + 1}`,
      number: i + 1,
      periodsPlayed: [] as boolean[],
    }));

    // Round-robin assignment for equal quarters
    // Total spots across all periods = onPitch * periodsCount
    let currentPlayerIndex = 0;
    for (let period = 0; period < periodsCount; period++) {
      // Determine who plays in this period
      const activeIndices = new Set<number>();
      for (let slot = 0; slot < onPitch; slot++) {
        activeIndices.add((currentPlayerIndex + slot) % squadSize);
      }
      currentPlayerIndex = (currentPlayerIndex + onPitch) % squadSize;

      players.forEach((p, idx) => {
        p.periodsPlayed.push(activeIndices.has(idx));
      });
    }

    return players.map((p) => {
      const activePeriods = p.periodsPlayed.filter(Boolean).length;
      const totalMinutes = activePeriods * minutesPerPeriod;
      return {
        ...p,
        activePeriods,
        totalMinutes,
      };
    });
  }, [squadSize, onPitch, periodsCount, minutesPerPeriod]);

  const handleCopySummary = () => {
    const text = `📋 SubShuffle Fair Play Rotation Plan:
Format: ${currentFormat.name} (${currentFormat.ageGroup})
Match Duration: ${matchDuration} mins (${periodsCount} periods of ${minutesPerPeriod.toFixed(1)}m)
Squad Size: ${squadSize} players (${onPitch} active, ${subsCount} substitutes)
Target Game Time: ${targetMinutesPerPlayer.toFixed(1)} mins per player (${targetPercentage.toFixed(0)}% game time)
Fair Play Status: ${targetPercentage >= 50 ? '✅ Compliant with FA 50% Rule' : '⚠️ Below 50% Rule'}

Calculate rotations free: https://subshuffle.app/calculator`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      showToast('Copied rotation plan to clipboard for WhatsApp!', 'success');
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleLaunchPlanner = () => {
    enterDemoMode();
    showToast('Loaded into interactive tactical planner!', 'info');
    navigate({ to: '/lineup', search: (prev) => prev });
  };

  const faqs = [
    {
      q: 'What is the FA 50% equal playing time recommendation?',
      a: 'The English FA strictly encourages that every child from U7 up to U14 receives a minimum of 50% playing time in every match across a season. Equal game time builds long-term confidence, ball-mastery, and player retention.',
    },
    {
      q: 'How does SubShuffle handle odd squad numbers and quarter splits?',
      a: 'When squad sizes do not divide evenly into match quarters, SubShuffle calculates rolling substitution matrices so variance between player minutes is kept under 2 to 3 minutes, rotating bench players systematically at predetermined breaks.',
    },
    {
      q: 'Should goalkeepers rotate or play full matches?',
      a: 'Grassroots coaches are recommended to rotate goalkeepers in halves or across alternating fixtures so all children experience outfield ball touches while learning goalkeeping basics in a low-pressure environment.',
    },
    {
      q: 'Can I export this rotation schedule to our WhatsApp parents group?',
      a: 'Yes! Click the "Copy WhatsApp Summary" button to immediately paste clean, formatted lineups and playing time targets into your team WhatsApp chat.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <PublicNav activePage="calculator" />

      {/* Hero Header */}
      <section className="relative overflow-hidden pt-10 pb-12 sm:pt-14 sm:pb-16 border-b border-slate-800/80 bg-gradient-to-b from-slate-900/60 to-slate-950">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-emerald-500/10 blur-[120px] pointer-events-none rounded-full" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4 relative">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-sm shadow-emerald-500/10">
            <RotateCcw className="w-4 h-4 text-emerald-400" />
            <span>Free Grassroots Tool</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Youth Football Equal Playing Time &amp;{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400">
              Substitution Calculator
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Calculate fair pitch splits, quarter substitutions, and target player minutes for FA 5v5, 7v7, 9v9, and 11v11 youth fixtures.
          </p>
        </div>
      </section>

      {/* Main Interactive Tool Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Inputs */}
          <div className="lg:col-span-6 space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/90 shadow-xl space-y-6 backdrop-blur-xl">
              <h2 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Match Parameters</span>
              </h2>

              {/* 1. Format Selection */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Pitch Format &amp; Age Group
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {FORMAT_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => handleFormatChange(f)}
                      className={`p-3 rounded-2xl text-left border transition cursor-pointer flex flex-col justify-between ${
                        selectedFormatId === f.id
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/10'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-extrabold text-sm text-white">{f.name}</span>
                      <span className="text-[10px] font-semibold opacity-80 mt-1">{f.ageGroup}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Match Duration */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-300 uppercase tracking-wider">
                    Total Match Duration
                  </label>
                  <span className="font-mono text-emerald-400 font-bold text-sm">
                    {matchDuration} Minutes
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[30, 40, 50, 60, 70, 80].map((dur) => (
                    <button
                      key={dur}
                      onClick={() => setMatchDuration(dur)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        matchDuration === dur
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {dur}m
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Periods / Quarters */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-300 uppercase tracking-wider">
                    Match Breakdown
                  </label>
                  <span className="font-mono text-sky-400 font-bold text-xs">
                    {periodsCount} Periods • {minutesPerPeriod.toFixed(1)} mins each
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { count: 2, label: '2 Halves' },
                    { count: 3, label: '3 Thirds' },
                    { count: 4, label: '4 Quarters' },
                  ].map((p) => (
                    <button
                      key={p.count}
                      onClick={() => setPeriodsCount(p.count)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                        periodsCount === p.count
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Squad Size Stepper */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-300 uppercase tracking-wider">
                    Attending Squad Size
                  </label>
                  <span className="font-mono text-white font-bold text-sm">
                    {squadSize} Players ({onPitch} Pitch + {subsCount} Subs)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSquadSize(Math.max(onPitch, squadSize - 1))}
                    disabled={squadSize <= onPitch}
                    className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed font-bold text-lg flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min={onPitch}
                    max={onPitch + 8}
                    value={squadSize}
                    onChange={(e) => setSquadSize(Number(e.target.value))}
                    className="flex-1 accent-emerald-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
                  />
                  <button
                    onClick={() => setSquadSize(Math.min(onPitch + 10, squadSize + 1))}
                    className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white font-bold text-lg flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Calculated Results & Live Schedule */}
          <div className="lg:col-span-6 space-y-6">
            {/* High-Level Fair Play Stats Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/40 shadow-2xl shadow-emerald-500/10 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Target Equal Pitch Time
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    targetPercentage >= 50
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {targetPercentage >= 50 ? '✅ FA 50% Rule Met' : '⚠️ Below 50% Target'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Target Time / Player</p>
                  <p className="text-3xl font-black text-emerald-400 font-mono mt-1">
                    {targetMinutesPerPlayer.toFixed(1)}m
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    out of {matchDuration} minutes
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Game Time Share</p>
                  <p className="text-3xl font-black text-sky-400 font-mono mt-1">
                    {targetPercentage.toFixed(0)}%
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    {onPitch} on pitch • {subsCount} on bench
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleCopySummary}
                  className="flex-1 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-700 hover:border-slate-600 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy WhatsApp Summary'}</span>
                </button>

                <button
                  onClick={handleLaunchPlanner}
                  className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 transition transform hover:-translate-y-0.5"
                >
                  <span>Open Full Tactical Pitch</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Simulated Rotation Matrix Table */}
            <div className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <span className="font-bold text-slate-300">Period-by-Period Rotation Grid</span>
                <span className="text-[10px] font-mono text-slate-400">
                  {periodsCount} intervals × {minutesPerPeriod.toFixed(1)} mins
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                      <th className="py-2 px-2">Player</th>
                      {Array.from({ length: periodsCount }, (_, i) => (
                        <th key={i} className="py-2 px-1 text-center font-mono">
                          P{i + 1}
                        </th>
                      ))}
                      <th className="py-2 px-2 text-right">Total Min</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {rotationSchedule.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-950/40">
                        <td className="py-2 px-2 font-sans font-semibold text-slate-200">
                          {p.name}
                        </td>
                        {p.periodsPlayed.map((active, idx) => (
                          <td key={idx} className="py-2 px-1 text-center">
                            {active ? (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                                Play
                              </span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold text-[10px]">
                                Sub
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="py-2 px-2 text-right font-bold text-emerald-400">
                          {p.totalMinutes.toFixed(1)}m
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Grassroots FAQ Section */}
        <section className="pt-8 border-t border-slate-800/80 space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-white tracking-tight">
              Grassroots Substitution &amp; Playing Time FAQs
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Answers for grassroots youth managers, club welfare officers, and parent coaches.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-white hover:text-emerald-400 transition cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 shrink-0 text-slate-400" /> : <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-slate-950 text-slate-500 text-xs border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-300">SubShuffle</span>
            <span>•</span>
            <span>Youth Football Substitution Calculator</span>
            <span>•</span>
            <AppVersion onClick={() => setChangelogOpen(true)} />
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={handleLaunchPlanner}
              className="hover:text-emerald-400 transition cursor-pointer"
            >
              Interactive Planner
            </button>
          </div>
        </div>
      </footer>

      <ReleaseNotesModal
        isOpen={changelogOpen}
        onClose={() => setChangelogOpen(false)}
      />
    </div>
  );
};
