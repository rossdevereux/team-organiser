import React, { useState } from 'react';
import {
  RotateCcw,
  Zap,
  Users,
  Printer,
  MessageSquare,
  Trophy,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Play,
  Heart,
  Smartphone,
  Lock,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { PublicNav } from '../components/PublicNav';
import { useMatchday } from '../context/MatchdayContext';
import { useToast } from '../context/ToastContext';
import { AppVersion } from '../components/AppVersion';
import { ReleaseNotesModal } from '../components/ReleaseNotesModal';

export const FeaturesPage: React.FC = () => {
  const { enterDemoMode } = useMatchday();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [changelogOpen, setChangelogOpen] = useState(false);

  const handleStartDemo = () => {
    enterDemoMode();
    showToast('Loaded demo squad into interactive planner!', 'info');
    navigate({ to: '/lineup', search: (prev) => prev });
  };

  const featureCards = [
    {
      icon: RotateCcw,
      title: 'Automated Equal Playing Time',
      badge: 'Core Engine',
      description:
        'Eliminate stopwatch stress. The SubShuffle algorithm balances match minutes across halves or quarters so every child hits their fair play target.',
    },
    {
      icon: Zap,
      title: 'Interactive 2D Pitch Lineups',
      badge: 'Tactical Board',
      description:
        'Visualise formations across 5v5, 7v7, 9v9, and 11v11 formats. Drag and drop players between positions with live visual rotation cues.',
    },
    {
      icon: MessageSquare,
      title: 'WhatsApp Squad Card Export',
      badge: 'Parent Comms',
      description:
        'Share clean, readable matchday squads, starting lineups, and substitution plans directly to parents in your team WhatsApp chat with one click.',
    },
    {
      icon: Trophy,
      title: 'Live Scores & Goal Scorers',
      badge: 'Matchday Results',
      description:
        'Track live match scores and record goal scorers with stoppage minute tags and own-goal flags, feeding season statistics automatically.',
    },
    {
      icon: Lock,
      title: 'Per-Fixture Position Locks',
      badge: 'Tactical Flexibility',
      description:
        'Lock goalkeepers or defenders in position for a specific match while ensuring the rest of the squad rotates fairly according to the equal game time rules.',
    },
    {
      icon: Printer,
      title: 'Printable Pitch Sheets',
      badge: 'Pitchside Ready',
      description:
        'Generate high-contrast, waterproof-friendly PDF team sheets and clipboard layouts designed for damp Sunday mornings.',
    },
    {
      icon: Smartphone,
      title: '100% Offline Progressive Web App',
      badge: 'No Signal Needed',
      description:
        'Never worry about patchy pitchside 4G. SubShuffle installs as a native app on iOS and Android and operates completely offline.',
    },
    {
      icon: ShieldCheck,
      title: 'Team Directory & Role Security',
      badge: 'Club Ready',
      description:
        'Strict permissions ensure club admins, team managers, and volunteer coaches only see their assigned squads and fixtures.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <PublicNav activePage="features" />

      {/* Header */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-20 border-b border-slate-800/80 bg-gradient-to-b from-slate-900/60 to-slate-950 text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-sky-500/10 blur-[120px] pointer-events-none rounded-full" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 relative">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-bold shadow-sm shadow-sky-500/10">
            <Zap className="w-4 h-4 text-sky-400" />
            <span>Built for Grassroots Coaches</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Everything You Need for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400">
              Matchday Fair Play
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            From equal minute calculations to tactical 2D pitch boards and instant WhatsApp exports, SubShuffle takes the stress out of youth football management.
          </p>

          <div className="pt-2 flex justify-center">
            <button
              onClick={handleStartDemo}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Try Live Interactive Demo</span>
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featureCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 shadow-xl space-y-3 flex flex-col justify-between transition hover:-translate-y-1"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      {card.badge}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white">{card.title}</h2>
                  <p className="text-xs text-slate-300 leading-relaxed">{card.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-slate-950 text-slate-500 text-xs border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-300">SubShuffle</span>
            <span>•</span>
            <span>Features Overview</span>
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
