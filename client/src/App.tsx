import { useState } from 'react';
import { MatchdayProvider, useMatchday } from './context/MatchdayContext';
import { Navbar } from './components/Navbar';
import { PitchView } from './components/PitchView';
import { BenchView } from './components/BenchView';
import { RotationMatrix } from './components/RotationMatrix';
import { FairPlayStats } from './components/FairPlayStats';
import { SquadManager } from './components/SquadManager';
import { FixtureManager } from './components/FixtureManager';
import { TeamManager } from './components/TeamManager';
import { WhatsAppExportModal } from './components/WhatsAppExportModal';
import { PrintMatchSheet } from './components/PrintMatchSheet';
import { SettingsModal } from './components/SettingsModal';
import { MatchdaySelectorModal } from './components/MatchdaySelectorModal';
import { CustomFormationModal } from './components/CustomFormationModal';
import { PostMatchModal } from './components/PostMatchModal';
import { SuggestedSubsModal } from './components/SuggestedSubsModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { LiveMatchModal } from './components/LiveMatchModal';
import { EditFixtureModal } from './components/EditFixtureModal';
import { DesignSystemProvider, DesignSystemShowcase, useDesignSystem } from './design-system';
import {
  Users,
  Calendar,
  Layers,
  Wand2,
  Clock,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Shield,
  Share2,
  Trophy,
  ArrowRightLeft,
  Sliders,
  CheckCircle2,
  Zap,
  WifiOff,
  Palette,
  Edit3,
  Printer,
} from 'lucide-react';

function DashboardContent() {
  const {
    activeTeam,
    activeFixture,
    activeTab,
    activePeriod,
    settings,
    loading,
    error,
    isOffline,
    currentUser,
    autoRotateCurrentFixture,
    setActiveTab,
  } = useMatchday();

  const { context, setContext } = useDesignSystem();

  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [squadSelectorOpen, setSquadSelectorOpen] = useState(false);
  const [customFormationOpen, setCustomFormationOpen] = useState(false);
  const [postMatchOpen, setPostMatchOpen] = useState(false);
  const [suggestedSubsOpen, setSuggestedSubsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [liveMatchOpen, setLiveMatchOpen] = useState(false);
  const [showcaseOpen, setShowcaseOpen] = useState(false);
  const [editActiveFixtureOpen, setEditActiveFixtureOpen] = useState(false);

  if (loading && !activeTeam) {
    return (
      <div className="min-h-screen bg-[var(--surface-base,#020617)] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center animate-spin shadow-lg shadow-sky-500/20">
          <RefreshCw className="w-6 h-6 text-white" />
        </div>
        <p className="text-sm font-semibold text-slate-300">Loading SubShuffle Workspace...</p>
      </div>
    );
  }

  const periodLabel =
    settings.matchPeriodCount === 2
      ? activePeriod === 1
        ? '1st Half'
        : '2nd Half'
      : `Period ${activePeriod}`;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[var(--surface-base)] text-[var(--text-main)] flex flex-col selection:bg-[var(--kit-primary)] selection:text-white transition-colors duration-200">
      {/* High-Contrast Print Mode Sticky Banner */}
      {context === 'print' && (
        <div className="sticky top-0 z-50 bg-amber-400 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md print:hidden border-b border-amber-500">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-slate-950 shrink-0" />
            <span>High-Contrast Print Preview Mode Active</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPrintOpen(true)}
              className="px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-900 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              Open PDF Sheet
            </button>
            <button
              onClick={() => setContext('clubhouse')}
              className="px-3 py-1 rounded-lg bg-white/80 hover:bg-white text-slate-950 text-xs font-bold border border-slate-900/20 shadow-sm transition cursor-pointer"
            >
              ✕ Exit Print Mode
            </button>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <Navbar
        onOpenWhatsApp={() => setWhatsAppOpen(true)}
        onOpenPrint={() => setPrintOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenSquadSelector={() => setSquadSelectorOpen(true)}
        onOpenCustomFormation={() => setCustomFormationOpen(true)}
        onOpenLiveMatch={() => setLiveMatchOpen(true)}
        onOpenShowcase={() => setShowcaseOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Offline Pitch Mode Alert */}
        {isOffline && (
          <div className="px-4 py-2.5 rounded-2xl bg-amber-950/70 border border-amber-500/40 text-xs flex items-center justify-between text-amber-200 shadow-lg">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Pitch Mode Active:</strong> You are currently offline. Changes are saved locally on your device and will sync when reconnected!
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 ml-2">
              Local Cache
            </span>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => window.location.reload()}
              className="font-bold underline hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Auth / Sharing Notice for Logged-In Status */}
        {currentUser && (
          <div className="px-4 py-2.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-300">
              <Shield className="w-3.5 h-3.5" />
              <span>
                Logged in as <strong>{currentUser.displayName || currentUser.email}</strong>. Data is isolated to your account and shared coaches.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('teams')}
              className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold underline"
            >
              Manage Teams & Sharing
            </button>
          </div>
        )}

        {/* Hero Match Context Bar */}
        {activeFixture ? (
          <div className="relative overflow-hidden rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4 sm:p-6 shadow-xl transition-all duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {activeTeam ? activeTeam.name : 'Team'}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {activeFixture.venue} Fixture • {activeFixture.date} ({activeFixture.kickOffTime || '10:00'})
                  </span>
                  {activeFixture.season && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1">
                      <Trophy className="w-2.5 h-2.5 text-amber-400" />
                      <span>{activeFixture.season}</span>
                    </span>
                  )}
                  {activeFixture.postMatchRecording && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                      <span>
                        {activeFixture.postMatchRecording.trackingMode === 'full_credit'
                          ? '100% Credit Recorded'
                          : 'Exact Min Recorded'}
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-[var(--text-main)] tracking-tight">
                    {activeTeam ? activeTeam.name : 'Team'} vs {activeFixture.opponent}
                  </h1>
                  <button
                    onClick={() => setEditActiveFixtureOpen(true)}
                    className="p-1.5 rounded-xl bg-[var(--surface-base)] hover:bg-indigo-600/20 text-slate-400 hover:text-indigo-300 border border-[var(--surface-border)] transition cursor-pointer"
                    title="Edit fixture logistics & details"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Match Highlights Pill & Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs font-mono">
                <button
                  onClick={() => setSquadSelectorOpen(true)}
                  className="h-9 whitespace-nowrap shrink-0 flex items-center gap-1.5 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold transition cursor-pointer font-sans"
                  title="Edit matchday squad sheet (move players between rested and squad)"
                >
                  <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Squad ({activeFixture.matchSquad?.selectedPlayerIds.length || 0})</span>
                </button>
                <div className="h-9 px-3 rounded-xl bg-[var(--surface-base)] border border-[var(--surface-border)] flex items-center gap-1.5 text-[var(--text-main)] whitespace-nowrap shrink-0">
                  <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>
                    {periodLabel} of {settings.matchPeriodCount === 2 ? '2 Halves' : `${settings.matchPeriodCount} Periods`} ({settings.periodDurationMinutes}m)
                  </span>
                </div>

                <div className="h-9 px-3 rounded-xl bg-[var(--surface-base)] border border-[var(--surface-border)] flex items-center gap-1.5 text-[var(--text-main)] whitespace-nowrap shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Target: {settings.targetGameTimePercent}%+</span>
                </div>

                <button
                  onClick={() => setLiveMatchOpen(true)}
                  className="h-9 whitespace-nowrap shrink-0 flex items-center gap-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 text-amber-300 border border-amber-500/40 font-bold transition cursor-pointer font-sans shadow-md shadow-amber-500/10"
                  title="Pitchside stopwatch, sub buzzer and 1-tap sideline subs"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse shrink-0" />
                  <span>Live Match</span>
                </button>

                <button
                  onClick={() => autoRotateCurrentFixture()}
                  className="h-9 whitespace-nowrap shrink-0 flex items-center gap-1.5 px-3 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 font-semibold transition cursor-pointer font-sans"
                  title="Auto-balance squad across match periods"
                >
                  <Wand2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Re-Balance</span>
                </button>

                <button
                  onClick={() => setSuggestedSubsOpen(true)}
                  className="h-9 whitespace-nowrap shrink-0 flex items-center gap-1.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold transition cursor-pointer font-sans"
                  title="View position-matched rotation substitution schedule"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Suggested Subs</span>
                </button>

                <button
                  onClick={() => setPostMatchOpen(true)}
                  className="h-9 whitespace-nowrap shrink-0 flex items-center gap-1.5 px-3 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 font-semibold transition cursor-pointer font-sans"
                  title="Record post-match playing minutes or default 100% full credit"
                >
                  <Sliders className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>{activeFixture.postMatchRecording ? 'Post-Match' : 'Record Time'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
            <h3 className="text-sm font-semibold text-slate-300">No fixtures scheduled for {activeTeam?.name} yet</h3>
            <button
              onClick={() => setActiveTab('fixtures')}
              className="text-xs text-sky-400 hover:text-white underline font-semibold"
            >
              Create your first match in the Fixtures tab
            </button>
          </div>
        )}

        {/* Tab 1: Lineup (Pitch + Bench) */}
        {activeTab === 'lineup' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              <PitchView />
            </div>

            <div className="lg:col-span-5 xl:col-span-4 space-y-4">
              <BenchView />
            </div>
          </div>
        )}

        {/* Tab 2: 2-Half / N-Period Rotation Matrix */}
        {activeTab === 'matrix' && <RotationMatrix />}

        {/* Tab 3: Fair Play Stats & Compliance */}
        {activeTab === 'stats' && <FairPlayStats />}

        {/* Tab 4: Squad Roster */}
        {activeTab === 'squad' && <SquadManager />}

        {/* Tab 5: Fixtures */}
        {activeTab === 'fixtures' && <FixtureManager />}

        {/* Tab 6: Teams & Sharing */}
        {activeTab === 'teams' && <TeamManager />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 bg-slate-950 text-slate-500 text-xs mt-12 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">SubShuffle</span>
            <span>•</span>
            <span>{activeTeam?.name} ({settings.pitchPlayerCount}-a-side)</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setWhatsAppOpen(true)}
              className="hover:text-emerald-400 transition cursor-pointer"
            >
              WhatsApp Announcement
            </button>
            <button
              onClick={() => setPrintOpen(true)}
              className="hover:text-sky-400 transition cursor-pointer"
            >
              Print Pitch Sheet
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className="hover:text-indigo-400 transition cursor-pointer flex items-center gap-1"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Teams & Sharing</span>
            </button>
            <button
              onClick={() => setShowcaseOpen(true)}
              className="hover:text-indigo-400 transition cursor-pointer flex items-center gap-1 font-semibold text-indigo-300"
              title="Open design tokens, club kit customizer, and component styleguide"
            >
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              <span>Design System & Kits</span>
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="hover:text-white transition cursor-pointer"
            >
              League Settings
            </button>
            <button
              onClick={() => setPrivacyOpen(true)}
              className="hover:text-emerald-400 transition cursor-pointer flex items-center gap-1 font-semibold"
              title="View youth football GDPR compliance rules and privacy policy"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Privacy & GDPR</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <DesignSystemShowcase
        isOpen={showcaseOpen}
        onClose={() => setShowcaseOpen(false)}
      />

      <WhatsAppExportModal
        isOpen={whatsAppOpen}
        onClose={() => setWhatsAppOpen(false)}
      />

      <PrintMatchSheet
        isOpen={printOpen}
        onClose={() => setPrintOpen(false)}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenCustomFormation={() => setCustomFormationOpen(true)}
      />

      <MatchdaySelectorModal
        isOpen={squadSelectorOpen}
        onClose={() => setSquadSelectorOpen(false)}
      />

      <CustomFormationModal
        isOpen={customFormationOpen}
        onClose={() => setCustomFormationOpen(false)}
      />

      <PostMatchModal
        fixture={activeFixture}
        isOpen={postMatchOpen}
        onClose={() => setPostMatchOpen(false)}
      />

      <SuggestedSubsModal
        fixture={activeFixture}
        isOpen={suggestedSubsOpen}
        onClose={() => setSuggestedSubsOpen(false)}
      />

      <PrivacyPolicyModal
        isOpen={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
      />

      <LiveMatchModal
        isOpen={liveMatchOpen}
        onClose={() => setLiveMatchOpen(false)}
      />

      {/* Edit Fixture Modal */}
      <EditFixtureModal
        fixture={activeFixture}
        isOpen={editActiveFixtureOpen}
        onClose={() => setEditActiveFixtureOpen(false)}
      />
    </div>
  );
}

function DesignSystemWrapper() {
  const { settings } = useMatchday();

  return (
    <DesignSystemProvider
      teamKitPrimary={settings.kitPrimaryColor}
      teamKitSecondary={settings.kitSecondaryColor}
    >
      <DashboardContent />
    </DesignSystemProvider>
  );
}

export default function App() {
  return (
    <MatchdayProvider>
      <DesignSystemWrapper />
    </MatchdayProvider>
  );
}
