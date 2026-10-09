import React, { useState } from 'react';
import { useDesignSystem } from '../DesignSystemContext';
import { POPULAR_KIT_PRESETS, POSITION_TOKENS, AppContextMode, ComponentDensity } from '../tokens';
import { Button } from './Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
import { Badge, PositionBadge, FairPlayBadge } from './Badge';
import { Input, Select } from './Input';
import { Switch } from './Switch';
import { Modal } from './Modal';
import { Tabs } from './Tabs';
import { PlayerToken, KitJerseyIcon } from './PlayerToken';
import { PitchCanvas } from './PitchCanvas';
import { MatchTimer } from './MatchTimer';
import { SubPill } from './SubPill';
import {
  Palette,
  Shield,
  Zap,
  Printer,
  Sparkles,
  Layers,
  Sliders,
  Users,
  Eye,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { Player, SingleSubChange } from '../../types';

export interface DesignSystemShowcaseProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_PLAYERS: Player[] = [
  {
    id: 'demo-1',
    name: 'Leo Messi',
    squadNumber: 10,
    preferredPositions: ['Attack'],
    unavailableDates: [],
    matchesPlayed: 14,
    totalMinutesPlayed: 320,
    captainCount: 6,
    playerOfTheMatchCount: 4,
  },
  {
    id: 'demo-2',
    name: 'Alisson Becker',
    squadNumber: 1,
    preferredPositions: ['Goalkeeper'],
    unavailableDates: [],
    matchesPlayed: 14,
    totalMinutesPlayed: 350,
  },
  {
    id: 'demo-3',
    name: 'Virgil Van Dijk',
    squadNumber: 4,
    preferredPositions: ['Defence'],
    unavailableDates: [],
    matchesPlayed: 12,
    totalMinutesPlayed: 280,
  },
  {
    id: 'demo-4',
    name: 'Kevin De Bruyne',
    squadNumber: 17,
    preferredPositions: ['Midfield'],
    unavailableDates: [],
    matchesPlayed: 13,
    totalMinutesPlayed: 310,
  },
];

const SAMPLE_SUB: SingleSubChange = {
  offPlayerId: 'demo-4',
  offPlayerName: 'Kevin De Bruyne',
  onPlayerId: 'demo-1',
  onPlayerName: 'Leo Messi',
  position: 'Attacking Midfield (CAM)',
  positionCategory: 'Midfield',
};

export const DesignSystemShowcase: React.FC<DesignSystemShowcaseProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    context,
    setContext,
    density,
    setDensity,
    clubhouseMode,
    setClubhouseMode,
    kitPrimary,
    kitSecondary,
    setKitColors,
    isTouchline,
    resetToDefaults,
  } = useDesignSystem();

  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'tokens' | 'primitives' | 'football' | 'dugout'>('tokens');
  const [demoSwitch, setDemoSwitch] = useState(true);
  const [demoTimerSeconds, setDemoTimerSeconds] = useState(645); // 10m 45s
  const [demoTimerRunning, setDemoTimerRunning] = useState(false);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="4xl"
      title="SubShuffle Design System & Theme Engine"
      subtitle="Context-aware tokens, dynamic club kits, accessible primitives & football compounds"
      icon={<Layers className="w-5 h-5 text-indigo-400" />}
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Tokens to Defaults</span>
          </button>
          <Button variant="primary" size="md" onClick={onClose}>
            Done & Apply
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-[var(--surface-border)]">
          <Tabs
            items={[
              { id: 'tokens', label: 'Tokens & Contexts', icon: <Palette className="w-3.5 h-3.5" /> },
              { id: 'primitives', label: 'UI Primitives', icon: <Sliders className="w-3.5 h-3.5" /> },
              { id: 'football', label: 'Football Components', icon: <Users className="w-3.5 h-3.5" /> },
              { id: 'dugout', label: 'Dugout Pitchside Mode', icon: <Zap className="w-3.5 h-3.5" /> },
            ]}
            activeId={activeShowcaseTab}
            onChange={(id) => setActiveShowcaseTab(id as any)}
          />

          {/* Quick Context Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Current Context:</span>
            <Badge
              variant={context === 'touchline' ? 'tactical' : context === 'print' ? 'neutral' : 'primary'}
              size="sm"
            >
              {context.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* TAB 1: TOKENS & CONTEXT ARCHITECTURE */}
        {activeShowcaseTab === 'tokens' && (
          <div className="space-y-6">
            {/* Context Switcher Banner */}
            <div className="p-4 rounded-2xl bg-[var(--surface-base)] border border-[var(--surface-border)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-main)]">Context Engine Simulator</h4>
                  <p className="text-xs text-[var(--text-muted)]">
                    Switch context to see typography, surfaces, contrast and density adapt in real-time
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setContext('clubhouse')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    context === 'clubhouse'
                      ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/30'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                    <Shield className="w-4 h-4" />
                    <span>Clubhouse (Default)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Clean administrative layout for squad management, fixtures and reporting.
                  </p>
                </button>

                <button
                  onClick={() => setContext('touchline')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    context === 'touchline'
                      ? 'bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/30'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <Zap className="w-4 h-4" />
                    <span>Touchline Dugout</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    High-contrast pitch green, enlarged 52px+ touch targets for pitchside/gloved use.
                  </p>
                </button>

                <button
                  onClick={() => setContext('print')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    context === 'print'
                      ? 'bg-sky-500/20 border-sky-500 ring-2 ring-sky-500/30'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                    <Printer className="w-4 h-4" />
                    <span>Print Match Sheet</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Zero-ink white canvas, crisp black borders, optimized for official team sheets.
                  </p>
                </button>
              </div>
            </div>

            {/* Club Kit Customizer */}
            <div className="p-4 rounded-2xl bg-[var(--surface-base)] border border-[var(--surface-border)] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-main)]">Dynamic Club Kit Customizer</h4>
                  <p className="text-xs text-[var(--text-muted)]">
                    Pick your club colors. All jersey icons, kit buttons, and accents update instantly via CSS Custom Properties.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <KitJerseyIcon number={9} size={40} />
                </div>
              </div>

              {/* Color Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <input
                    type="color"
                    value={kitPrimary}
                    onChange={(e) => setKitColors(e.target.value, kitSecondary)}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <div>
                    <label className="text-xs font-bold text-slate-200 block">Primary Kit Colour</label>
                    <span className="text-[11px] font-mono text-slate-400">{kitPrimary}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <input
                    type="color"
                    value={kitSecondary}
                    onChange={(e) => setKitColors(kitPrimary, e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <div>
                    <label className="text-xs font-bold text-slate-200 block">Secondary Trim Colour</label>
                    <span className="text-[11px] font-mono text-slate-400">{kitSecondary}</span>
                  </div>
                </div>
              </div>

              {/* Popular Club Presets */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 block">Club Kit Presets:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {POPULAR_KIT_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setKitColors(p.primary, p.secondary)}
                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition cursor-pointer ${
                        kitPrimary === p.primary && kitSecondary === p.secondary
                          ? 'border-sky-400 bg-slate-800 ring-2 ring-sky-400/30'
                          : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex -space-x-1.5 shrink-0">
                        <span
                          className="w-4 h-4 rounded-full border border-black/40"
                          style={{ backgroundColor: p.primary }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/40"
                          style={{ backgroundColor: p.secondary }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-200 truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Position Category Tokens */}
            <div className="p-4 rounded-2xl bg-[var(--surface-base)] border border-[var(--surface-border)] space-y-3">
              <h4 className="text-sm font-bold text-[var(--text-main)]">Football Position Semantic Tokens</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(POSITION_TOKENS).map(([cat, tok]) => (
                  <div
                    key={cat}
                    className={`p-3 rounded-xl border ${tok.bgClass} ${tok.borderClass} space-y-1`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${tok.textClass}`}>{cat}</span>
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tok.accent }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 block">{tok.accent}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: UI PRIMITIVES */}
        {activeShowcaseTab === 'primitives' && (
          <div className="space-y-6">
            {/* Buttons */}
            <div className="p-4 rounded-2xl bg-[var(--surface-base)] border border-[var(--surface-border)] space-y-3">
              <h4 className="text-sm font-bold text-[var(--text-main)]">Button Primitives & Variants</h4>
              <div className="flex flex-wrap gap-2.5 items-center">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="kit">Club Kit Button</Button>
                <Button variant="kit-secondary">Kit Trim</Button>
                <Button variant="tactical">Tactical Green</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
                <Button variant="primary" isLoading>Loading</Button>
              </div>

              {/* Sizes */}
              <div className="pt-2 border-t border-[var(--surface-border)] space-y-2">
                <span className="text-xs font-semibold text-slate-400 block">Button Sizes:</span>
                <div className="flex flex-wrap gap-2.5 items-center">
                  <Button size="xs">Extra Small (xs)</Button>
                  <Button size="sm">Small (sm)</Button>
                  <Button size="md">Medium (md)</Button>
                  <Button size="lg">Large (lg)</Button>
                  <Button size="touchline">Touchline 52px Hit Target</Button>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="p-4 rounded-2xl bg-[var(--surface-base)] border border-[var(--surface-border)] space-y-3">
              <h4 className="text-sm font-bold text-[var(--text-main)]">Badges & Position Pills</h4>
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant="neutral">Neutral</Badge>
                <Badge variant="primary" dot>Primary</Badge>
                <Badge variant="success" dot>Success</Badge>
                <Badge variant="warning" dot>Warning</Badge>
                <Badge variant="danger" dot>Danger</Badge>
                <Badge variant="kit">Club Kit</Badge>
                <Badge variant="tactical">Tactical</Badge>
              </div>

              <div className="flex flex-wrap gap-2 items-center pt-2">
                <PositionBadge position="GK" />
                <PositionBadge position="Centre Back (CB)" showCategory />
                <PositionBadge position="Central Midfield (CM)" showCategory />
                <PositionBadge position="Striker (ST)" showCategory />
              </div>

              <div className="flex flex-wrap gap-2 items-center pt-2">
                <FairPlayBadge percentage={65} targetPercentage={50} />
                <FairPlayBadge percentage={45} targetPercentage={50} />
                <FairPlayBadge percentage={30} targetPercentage={50} />
              </div>
            </div>

            {/* Form Controls */}
            <div className="p-4 rounded-2xl bg-[var(--surface-base)] border border-[var(--surface-border)] space-y-3">
              <h4 className="text-sm font-bold text-[var(--text-main)]">Form Controls</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Matchday Squad Name"
                  placeholder="e.g. Riverside Rovers U10"
                  defaultValue="Riverside United"
                  helperText="Context-styled input with high-contrast borders"
                />

                <Select label="Pitch Formation" defaultValue="7-2-3-1">
                  <option value="5-1-2-1">5-a-side: 1-2-1</option>
                  <option value="7-2-3-1">7-a-side: 2-3-1</option>
                  <option value="9-3-3-2">9-a-side: 3-3-2</option>
                  <option value="11-4-3-3">11-a-side: 4-3-3</option>
                </Select>
              </div>

              <div className="pt-2">
                <Switch
                  checked={demoSwitch}
                  onChange={setDemoSwitch}
                  label="Enforce Equal Match Minutes"
                  description="Automatically balances bench substitutions across halves"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FOOTBALL COMPONENTS */}
        {activeShowcaseTab === 'football' && (
          <div className="space-y-6">
            {/* Player Tokens */}
            <div className="p-4 rounded-2xl bg-[var(--surface-base)] border border-[var(--surface-border)] space-y-3">
              <h4 className="text-sm font-bold text-[var(--text-main)]">PlayerToken Compound Component</h4>
              <p className="text-xs text-[var(--text-muted)]">
                Adapts with club kit colours, position badges, captain armbands, and game-time progress bars.
              </p>

              {/* Bench style tokens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PlayerToken
                  player={SAMPLE_PLAYERS[0]}
                  position="Striker (ST)"
                  variant="bench"
                  isCaptain
                  isPotm
                  minutesPlayed={35}
                  gameTimePercent={70}
                  targetPercent={50}
                />
                <PlayerToken
                  player={SAMPLE_PLAYERS[1]}
                  position="Goalkeeper (GK)"
                  variant="bench"
                  minutesPlayed={25}
                  gameTimePercent={50}
                  targetPercent={50}
                />
              </div>

              {/* Pitch style tokens */}
              <div className="pt-4 border-t border-[var(--surface-border)]">
                <span className="text-xs font-semibold text-slate-400 block mb-3">
                  Pitch Node Style:
                </span>
                <div className="flex items-center justify-around p-4 rounded-2xl bg-[#0d2e15] border border-emerald-900/60">
                  <PlayerToken
                    player={SAMPLE_PLAYERS[1]}
                    position="GK"
                    variant="pitch"
                  />
                  <PlayerToken
                    player={SAMPLE_PLAYERS[2]}
                    position="CB"
                    variant="pitch"
                  />
                  <PlayerToken
                    player={SAMPLE_PLAYERS[3]}
                    position="CM"
                    variant="pitch"
                    isSelected
                  />
                  <PlayerToken
                    player={SAMPLE_PLAYERS[0]}
                    position="ST"
                    variant="pitch"
                    isCaptain
                    isPotm
                  />
                </div>
              </div>
            </div>

            {/* Substitution Change Row */}
            <div className="p-4 rounded-2xl bg-[var(--surface-base)] border border-[var(--surface-border)] space-y-3">
              <h4 className="text-sm font-bold text-[var(--text-main)]">SubPill (Substitution Guidance)</h4>
              <SubPill change={SAMPLE_SUB} minute={10} period={1} />
            </div>

            {/* Pitch Canvas Demonstration */}
            <div className="p-4 rounded-2xl bg-[var(--surface-base)] border border-[var(--surface-border)] space-y-3">
              <h4 className="text-sm font-bold text-[var(--text-main)]">PitchCanvas Tactical Board</h4>
              <PitchCanvas
                formationName="2-3-1"
                periodLabel="1st Half"
                teamSize={7}
                aspectRatio="aspect-[4/3] max-w-lg"
              >
                {/* Center sample token on pitch */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <PlayerToken
                    player={SAMPLE_PLAYERS[3]}
                    position="CM"
                    variant="pitch"
                  />
                </div>
              </PitchCanvas>
            </div>
          </div>
        )}

        {/* TAB 4: DUGOUT PITCHSIDE MODE */}
        {activeShowcaseTab === 'dugout' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-100 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <Zap className="w-4 h-4 fill-emerald-300" />
                <span>Pitchside Dugout / Touchline High-Contrast Mode</span>
              </div>
              <p className="text-xs text-emerald-200">
                Designed for direct sunlight, rain, and quick mobile interaction on the sideline with cold fingers.
                Features minimum 52px touch targets and high-visibility typography.
              </p>
            </div>

            {/* Match Timer Demo */}
            <MatchTimer
              elapsedSeconds={demoTimerSeconds}
              periodDurationMinutes={25}
              subIntervalMinutes={10}
              isRunning={demoTimerRunning}
              onStart={() => setDemoTimerRunning(true)}
              onPause={() => setDemoTimerRunning(false)}
              onReset={() => {
                setDemoTimerRunning(false);
                setDemoTimerSeconds(0);
              }}
              periodLabel="1st Half"
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
