import React, { useState } from 'react';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Users,
  Play,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useNavigate, Link } from '@tanstack/react-router';
import { PublicNav } from '../components/PublicNav';
import { useMatchday } from '../context/MatchdayContext';
import { useToast } from '../context/ToastContext';
import { AppVersion } from '../components/AppVersion';
import { ReleaseNotesModal } from '../components/ReleaseNotesModal';

interface AgeGroupRule {
  ageGroup: string;
  format: string;
  ballSize: string;
  maxPitchSize: string;
  recommendedDuration: string;
  maxSquadSize: string;
  playingTimeRule: string;
}

const FA_RULES_TABLE: AgeGroupRule[] = [
  {
    ageGroup: 'Under 7 & Under 8',
    format: '5v5 (Mini-Soccer)',
    ballSize: 'Size 3',
    maxPitchSize: '40 × 30 yards',
    recommendedDuration: '40 mins (4 × 10m quarters or 2 × 20m halves)',
    maxSquadSize: '10 players',
    playingTimeRule: 'Equal playing time (minimum 50% per match)',
  },
  {
    ageGroup: 'Under 9 & Under 10',
    format: '7v7',
    ballSize: 'Size 3 (U9) / Size 4 (U10)',
    maxPitchSize: '60 × 40 yards',
    recommendedDuration: '50 mins (2 × 25m halves)',
    maxSquadSize: '14 players',
    playingTimeRule: 'Equal playing time (minimum 50% per match)',
  },
  {
    ageGroup: 'Under 11 & Under 12',
    format: '9v9',
    ballSize: 'Size 4',
    maxPitchSize: '80 × 50 yards',
    recommendedDuration: '60 mins (2 × 30m halves)',
    maxSquadSize: '16 players',
    playingTimeRule: 'Equal playing time (minimum 50% per match)',
  },
  {
    ageGroup: 'Under 13 & Under 14',
    format: '11v11',
    ballSize: 'Size 4 (U13) / Size 5 (U14)',
    maxPitchSize: '100 × 60 yards',
    recommendedDuration: '70 mins (2 × 35m halves)',
    maxSquadSize: '16 players',
    playingTimeRule: 'Recommended minimum 50% across season fixtures',
  },
  {
    ageGroup: 'Under 15 & Under 16',
    format: '11v11',
    ballSize: 'Size 5',
    maxPitchSize: '110 × 70 yards',
    recommendedDuration: '80 mins (2 × 40m halves)',
    maxSquadSize: '18 players',
    playingTimeRule: 'Development participation & fair opportunity focus',
  },
];

export const RulesPage: React.FC = () => {
  const { enterDemoMode } = useMatchday();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [changelogOpen, setChangelogOpen] = useState(false);

  const handleStartDemo = () => {
    enterDemoMode();
    showToast('Loaded demo squad into interactive planner!', 'info');
    navigate({ to: '/lineup', search: (prev) => prev });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <PublicNav activePage="rules" />

      {/* Header */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-20 border-b border-slate-800/80 bg-gradient-to-b from-slate-900/60 to-slate-950 text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-emerald-500/10 blur-[120px] pointer-events-none rounded-full" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 relative">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-sm shadow-emerald-500/10">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Official Grassroots Reference</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            FA Youth Football Playing Time &amp;{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400">
              Format Rules Guide
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            A comprehensive breakdown of English FA age group match durations, pitch sizes, and mandatory equal substitution recommendations for grassroots coaches.
          </p>
        </div>
      </section>

      {/* Main Rules Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full space-y-12">
        {/* Core 50% Rule Callout Box */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm uppercase tracking-wider">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>The FA 50% Playing Time Guideline</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Why Equal Minutes Are Crucial for Long-Term Development
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
            The FA Youth Development Review found that the #1 reason children quit football between the ages of 11 and 14 is unequal game time and sitting on the bench in the cold. When all squad members receive at least 50% playing time in every match, retention skyrockets and players develop well-rounded match decision skills.
          </p>
          <div className="pt-2 flex flex-wrap gap-4 text-xs font-bold">
            <Link
              to="/calculator"
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition"
            >
              <span>Calculate Quarter Splits in Free Tool</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Rules Table */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>FA Match Formats &amp; Timings by Age Category</span>
          </h2>

          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase font-bold text-slate-400">
                    <th className="py-3.5 px-4">Age Group</th>
                    <th className="py-3.5 px-3">Pitch Format</th>
                    <th className="py-3.5 px-3">Ball Size</th>
                    <th className="py-3.5 px-3">Match Length</th>
                    <th className="py-3.5 px-4">Playing Time Standard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {FA_RULES_TABLE.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-950/40">
                      <td className="py-4 px-4 font-bold text-white">{row.ageGroup}</td>
                      <td className="py-4 px-3 font-semibold text-emerald-400">{row.format}</td>
                      <td className="py-4 px-3 text-slate-300">{row.ballSize}</td>
                      <td className="py-4 px-3 text-slate-300">{row.recommendedDuration}</td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{row.playingTimeRule}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Substitution Guidelines */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center font-bold">
              1
            </div>
            <h3 className="text-base font-bold text-white">Roll-On, Roll-Off</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              All youth fixtures allow unlimited roll-on, roll-off substitutions with referee permission at stoppages. Make tactical rotations seamlessly.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
              2
            </div>
            <h3 className="text-base font-bold text-white">Rotate Goalkeepers</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Do not leave one player stuck in goal all season. Rotate keepers by half or quarter so all children build outfield foot skills.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
              3
            </div>
            <h3 className="text-base font-bold text-white">Pre-Planned Rotations</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Plan substitutions before kickoff. When matches get tense, pre-planned rotation schedules prevent coaches from forgetting bench players.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-slate-950 text-slate-500 text-xs border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-300">SubShuffle</span>
            <span>•</span>
            <span>FA Youth Rules Guide</span>
            <span>•</span>
            <AppVersion onClick={() => setChangelogOpen(true)} />
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={handleStartDemo}
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
