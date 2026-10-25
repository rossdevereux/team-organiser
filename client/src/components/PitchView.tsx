import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchday } from '../context/MatchdayContext';
import {
  Shirt,
  ArrowLeftRight,
  X,
  Clock,
  ShieldCheck,
  Info,
  UserX,
  Lock,
  Unlock,
  Wand2,
  HeartPulse,
} from 'lucide-react';
import { BroadPosition, Player } from '../types';
import { PlayerCallOffModal } from './PlayerCallOffModal';
import { EmergencyDepartureModal } from './EmergencyDepartureModal';
import { getPlayerInitials, POSITION_CATEGORY_STYLES } from '../utils/playerUtils';
import { useToast } from '../context/ToastContext';

interface PitchViewProps {
  onOpenSquadSelector?: () => void;
  onAutoRotate?: () => void;
}

export const PitchView: React.FC<PitchViewProps> = ({ onOpenSquadSelector, onAutoRotate }) => {
  const {
    activeFixture,
    activePeriod,
    setActivePeriod,
    settings,
    activeFormation,
    availableFormations,
    changeFormation,
    autoRotateCurrentFixture,
    undoAutoRotate,
    players,
    stats,
    selectedSwapSource,
    selectSwapSource,
    handleSwap,
    isPlayerFixed,
    toggleFixedPlayerPosition,
    enterDemoMode,
    setActiveTab,
  } = useMatchday();

  const { showToast } = useToast();
  const { t } = useTranslation();

  const [dragOverPosition, setDragOverPosition] = useState<string | null>(null);
  const [inspectedPlayer, setInspectedPlayer] = useState<{
    player: Player;
    position: string;
    minutes?: number;
    percent?: number;
  } | null>(null);
  const [callOffPitchPlayer, setCallOffPitchPlayer] = useState<{
    player: Player;
    position: string;
  } | null>(null);
  const [emergencyDeparturePlayer, setEmergencyDeparturePlayer] = useState<{
    player: Player;
    position: string;
  } | null>(null);

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const statsMap = useMemo(() => new Map(stats.map((s) => [s.playerId, s])), [stats]);
  const slotMap = useMemo(
    () => new Map((activeFormation?.slots || []).map((s) => [s.code, s])),
    [activeFormation]
  );

  const currentLineup = activeFixture?.matchSquad?.lineupsByPeriod.find(
    (l) => l.period === activePeriod
  );

  if (!activeFixture || !activeFixture.matchSquad || !currentLineup) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 sm:p-12 text-center space-y-4 shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 mx-auto flex items-center justify-center">
          <Shirt className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">{t('lineup.noLineupActive')}</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {t('lineup.noLineupDesc')}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => enterDemoMode()}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
          >
            {t('lineup.launchDemoSquad')}
          </button>
          <button
            onClick={() => setActiveTab('fixtures')}
            className="px-4 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            {t('lineup.manageFixtures')}
          </button>
        </div>
      </div>
    );
  }

  const selectedPlayer = selectedSwapSource
    ? playerMap.get(selectedSwapSource.playerId)
    : null;

  const onNodeClick = (playerId: string, position: string) => {
    if (!selectedSwapSource) {
      if (inspectedPlayer?.player.id === playerId) {
        setInspectedPlayer(null);
        return;
      }
      const p = playerMap.get(playerId);
      const st = statsMap.get(playerId);
      if (p) {
        setInspectedPlayer({
          player: p,
          position,
          minutes: st?.minutesPlayed,
          percent: st?.gameTimePercent,
        });
      }
    } else {
      handleSwap({ type: 'pitch', playerId, position });
      setInspectedPlayer(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, playerId: string, position: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'pitch', playerId, position }));
    selectSwapSource({ type: 'pitch', playerId, position });
  };

  const handleDragOver = (e: React.DragEvent, pos: string) => {
    e.preventDefault();
    if (dragOverPosition !== pos) {
      setDragOverPosition(pos);
    }
  };

  const handleDragLeave = () => {
    setDragOverPosition(null);
  };

  const handleDrop = (e: React.DragEvent, targetPlayerId: string, targetPos: string) => {
    e.preventDefault();
    setDragOverPosition(null);
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (dataStr) {
        const sourceData = JSON.parse(dataStr);
        if (sourceData.playerId && sourceData.playerId !== targetPlayerId) {
          handleSwap({ type: 'pitch', playerId: targetPlayerId, position: targetPos });
          setInspectedPlayer(null);
        }
      }
    } catch (err) {
      console.error('Drag drop error:', err);
    }
  };

  const effectivePeriodCount = activeFixture?.matchPeriodCount || settings.matchPeriodCount || 2;
  const effectivePitchPlayerCount = activeFixture?.pitchPlayerCount || settings.pitchPlayerCount || 7;
  const periods = Array.from({ length: effectivePeriodCount }, (_, i) => i + 1);

  const handleAutoBalance = async () => {
    if (onAutoRotate) {
      onAutoRotate();
      return;
    }
    await autoRotateCurrentFixture();
    showToast('Squad rotations re-balanced across all periods.', 'success', {
      label: 'Undo',
      onClick: async () => {
        await undoAutoRotate();
        showToast('Restored previous lineup rotations.', 'info');
      },
    });
  };

  const handleOpenSquad = () => {
    if (onOpenSquadSelector) {
      onOpenSquadSelector();
    } else {
      window.dispatchEvent(new CustomEvent('subshuffle:open-squad-selector'));
    }
  };

  const periodDisplayName =
    effectivePeriodCount === 2
      ? activePeriod === 1
        ? 'First Half (Period 1)'
        : 'Second Half (Period 2)'
      : `Period ${activePeriod} of ${effectivePeriodCount}`;

  return (
    <div className="flex flex-col space-y-4">
      {/* Swap Active Notification Banner */}
      {selectedSwapSource && (
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-sky-950/95 border border-sky-400/50 text-xs text-sky-200 shadow-2xl backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/30 shrink-0">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="font-bold text-white uppercase text-[10px] tracking-wider block text-sky-400">
                {t('lineup.swapActive')}
              </span>
              <span className="truncate block">
                {t('lineup.tapToSwap')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              selectSwapSource(null);
              setInspectedPlayer(null);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-900/80 hover:bg-sky-800 text-sky-200 hover:text-white transition cursor-pointer min-h-[44px] shrink-0 font-semibold"
          >
            <X className="w-4 h-4" />
            <span>{t('common.cancel')}</span>
          </button>
        </div>
      )}

      {/* Relocated Pitch Controls Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
        {/* Halves / Period Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800/80 shrink-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 px-2 hidden sm:inline whitespace-nowrap">
            {effectivePeriodCount === 2 ? 'Halves:' : 'Periods:'}
          </span>
          {periods.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setActivePeriod(p)}
              className={`min-h-[36px] sm:min-h-[32px] px-3 sm:px-3.5 flex items-center rounded-lg font-semibold text-xs transition cursor-pointer whitespace-nowrap ${
                activePeriod === p
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {effectivePeriodCount === 2 ? (p === 1 ? t('lineup.firstHalf') : t('lineup.secondHalf')) : t('lineup.periodN', { period: p })}
            </button>
          ))}
        </div>

        {/* Formation, Squad Cap & Auto-Balance Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
          {/* Dynamic Formation Dropdown based on pitch player count */}
          <select
            value={settings.defaultFormation}
            onChange={(e) => changeFormation(e.target.value)}
            className="min-h-[40px] sm:min-h-[36px] h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono font-semibold focus:outline-none focus:border-sky-500 cursor-pointer shrink-0 max-w-[140px] truncate shadow-sm"
            title={`Formations for ${settings.pitchPlayerCount}-a-side`}
          >
            {availableFormations.map((f) => (
              <option key={f.id} value={f.name}>
                {f.name} {f.isCustom ? '★' : ''}
              </option>
            ))}
          </select>

          {/* Matchday Squad Selector */}
          <button
            type="button"
            onClick={handleOpenSquad}
            className="min-h-[40px] sm:min-h-[36px] h-9 px-3 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center shrink-0 shadow-sm"
            title={`Select matchday ${settings.matchdaySquadCap} players`}
          >
            {t('common.squad')} ({settings.matchdaySquadCap})
          </button>

          {/* Auto-Balance Button */}
          <button
            type="button"
            data-tour-target="auto-balance"
            onClick={handleAutoBalance}
            className="min-h-[40px] sm:min-h-[36px] h-9 px-3 sm:px-3.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0"
            title="Re-balance playing time automatically"
          >
            <Wand2 className="w-3.5 h-3.5 shrink-0" />
            <span>{t('lineup.autoRotate')}</span>
          </button>
        </div>
      </div>

      {/* 2D Football Pitch */}
      <div
        data-tour-target="pitch"
        className="relative w-full min-h-[380px] aspect-[4/5] sm:aspect-[4/4.8] max-w-2xl mx-auto rounded-3xl overflow-hidden shadow-2xl border-4 border-[var(--pitch-border)] bg-gradient-to-b from-[var(--pitch-turf-1)] via-[var(--pitch-turf-2)] to-[var(--pitch-turf-3)] select-none transition-colors duration-200"
      >
        {/* Grass Stripes Pattern */}
        <div className="absolute inset-0 opacity-20 pointer-events-none flex flex-col justify-between">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={`h-full w-full ${i % 2 === 0 ? 'bg-black/25' : 'bg-white/10'}`}
            />
          ))}
        </div>

        {/* Pitch Title Header Overlay */}
        <div className="absolute top-2 left-4 z-20 pointer-events-none">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-emerald-300 bg-slate-950/80 border border-emerald-500/30 px-2.5 py-1 rounded-full shadow-md">
            {periodDisplayName} • {activeFormation.name} ({effectivePitchPlayerCount}-a-side)
          </span>
        </div>

        {/* Pitch Boundary Markings */}
        <div className="absolute inset-4 border-2 border-[var(--pitch-line)] rounded-2xl pointer-events-none transition-colors duration-200">
          {/* Halfway Line */}
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-[var(--pitch-line)] -translate-y-1/2" />

          {/* Centre Circle */}
          <div className="absolute top-1/2 left-1/2 w-28 h-28 border-2 border-[var(--pitch-line)] rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-[var(--pitch-line)] rounded-full -translate-x-1/2 -translate-y-1/2" />

          {/* Top Penalty Box (Opponent End) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 border-b-2 border-x-2 border-[var(--pitch-line)] rounded-b-lg">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-10 border-b-2 border-x-2 border-[var(--pitch-line)]" />
            <div className="absolute bottom-4 left-1/2 w-1.5 h-1.5 bg-[var(--pitch-line)] rounded-full -translate-x-1/2" />
          </div>

          {/* Bottom Penalty Box (Home/Goalie End) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-24 border-t-2 border-x-2 border-[var(--pitch-line)] rounded-t-lg">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-10 border-t-2 border-x-2 border-[var(--pitch-line)]" />
            <div className="absolute top-4 left-1/2 w-1.5 h-1.5 bg-[var(--pitch-line)] rounded-full -translate-x-1/2" />
          </div>

          {/* Corner Arcs */}
          <div className="absolute top-0 left-0 w-6 h-6 border-b-2 border-r-2 border-[var(--pitch-line)] rounded-br-full" />
          <div className="absolute top-0 right-0 w-6 h-6 border-b-2 border-l-2 border-[var(--pitch-line)] rounded-bl-full" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-t-2 border-r-2 border-[var(--pitch-line)] rounded-tr-full" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-t-2 border-l-2 border-[var(--pitch-line)] rounded-tl-full" />
        </div>

        {/* Dynamic Pitch Nodes positioned via activeFormation */}
        {currentLineup.onPitch.map((entry, index) => {
          const player = playerMap.get(entry.playerId);
          const pStats = statsMap.get(entry.playerId);

          // Find coords from active formation slot or fallback gracefully
          const slotDef = slotMap.get(entry.position) || activeFormation.slots[index] || {
            code: entry.position,
            label: entry.position,
            category: 'Midfield' as BroadPosition,
            x: 50,
            y: 50,
          };

          const colors = POSITION_CATEGORY_STYLES[slotDef.category] || POSITION_CATEGORY_STYLES.Midfield;
          const isSelected = selectedSwapSource?.playerId === entry.playerId;
          const isInspected = inspectedPlayer?.player.id === entry.playerId && !selectedSwapSource;
          const isEligibleTarget = Boolean(selectedSwapSource && !isSelected);
          const isDragOver = dragOverPosition === entry.position;
          const isCaptain = activeFixture.captainId === entry.playerId;
          const playerName = player ? player.name : 'Unknown Player';
          const initials = getPlayerInitials(player?.name);

          return (
            <div
              key={`${entry.position}-${index}`}
              style={{
                left: `${slotDef.x}%`,
                top: `${slotDef.y}%`,
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, entry.playerId, entry.position)}
              onDragOver={(e) => handleDragOver(e, entry.position)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, entry.playerId, entry.position)}
              onClick={() => onNodeClick(entry.playerId, entry.position)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-all duration-200 select-none ${
                isSelected
                  ? 'scale-110 z-30'
                  : isInspected
                  ? 'scale-105 z-25'
                  : isEligibleTarget
                  ? 'z-20 hover:scale-105'
                  : 'hover:scale-105 z-10'
              }`}
            >
              {/* Player Node Card with Touch Target */}
              <div
                title={`${playerName} (${entry.position}) • Click to inspect & lock/unlock position`}
                className={`relative flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-2xl backdrop-blur-md border shadow-xl transition-all min-h-[52px] sm:min-h-[58px] min-w-[76px] sm:min-w-[92px] max-w-[88px] sm:max-w-[108px] ${
                  isSelected
                    ? 'ring-4 ring-sky-400 border-white bg-slate-900 shadow-sky-500/50'
                    : isInspected
                    ? 'ring-4 ring-amber-400/80 border-amber-300 bg-slate-900 shadow-amber-500/40'
                    : isDragOver
                    ? 'ring-4 ring-emerald-300 border-white bg-slate-850 shadow-emerald-400/50 scale-105'
                    : isEligibleTarget
                    ? 'ring-2 ring-emerald-400/80 border-emerald-400/60 bg-slate-950/95 shadow-lg shadow-emerald-500/20 hover:border-emerald-300'
                    : isCaptain
                    ? 'bg-slate-950/90 hover:bg-slate-900 border-amber-500/50 shadow-amber-500/10'
                    : 'bg-slate-950/85 hover:bg-slate-900 border-white/20'
                }`}
              >
                {/* Position Badge at Top */}
                <div className="absolute -top-2.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider shadow-sm flex items-center gap-1 border border-white/20 bg-slate-900 text-slate-200">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: colors.shirt }}
                  />
                  <span className="truncate max-w-[50px]">{entry.position.replace('_', ' ')}</span>
                  {isCaptain && <span className="text-amber-400 font-black ml-0.5" title="Matchday Captain">©</span>}
                  {isPlayerFixed(entry.playerId) && (
                    <span className="text-amber-400 font-black ml-0.5" title="Locked in position for all periods">
                      <Lock className="w-2.5 h-2.5 inline" />
                    </span>
                  )}
                  {activeFixture?.earlyDepartures?.some((d) => d.playerId === entry.playerId) && (
                    <span className="text-rose-400 font-black ml-0.5" title="Player departed early / injured">
                      <HeartPulse className="w-2.5 h-2.5 inline animate-pulse text-rose-400" />
                    </span>
                  )}
                </div>

                {/* Player Avatar / Squad Number Badge with Fallback Initials */}
                <div className="relative mt-1 mb-1">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-sm shadow-md border ${colors.bg} ${colors.border} ${colors.text}`}
                  >
                    {player?.squadNumber ? (
                      `#${player.squadNumber}`
                    ) : (
                      <span className="text-xs font-black tracking-tighter" title={playerName}>
                        {initials}
                      </span>
                    )}
                  </div>

                  {isCaptain && (
                    <div
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-md border border-amber-100"
                      title="Matchday Captain Armband"
                    >
                      ©
                    </div>
                  )}

                  {isSelected && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] shadow">
                      <ArrowLeftRight className="w-2.5 h-2.5" />
                    </div>
                  )}

                  {isEligibleTarget && (
                    <div
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-[9px] shadow animate-pulse"
                      title="Swap into this position"
                    >
                      ⇄
                    </div>
                  )}
                </div>

                {/* Player Name with Safe Truncation */}
                <span
                  title={playerName}
                  className="text-[10px] sm:text-[11px] font-semibold text-white tracking-tight text-center max-w-[72px] sm:max-w-[88px] truncate leading-tight block"
                >
                  {playerName}
                </span>

                {/* Total Minutes & Percentage */}
                <div className="mt-1 flex items-center gap-1 text-[9px] text-slate-300 font-mono">
                  <span>{pStats ? `${pStats.minutesPlayed}m` : '0m'}</span>
                  <span>•</span>
                  <span
                    className={
                      pStats && pStats.meetsTarget
                        ? 'text-emerald-300 font-bold'
                        : 'text-amber-300 font-bold'
                    }
                  >
                    {pStats ? `${pStats.gameTimePercent}%` : '0%'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tap-to-Inspect Card Modal/Drawer for Touch Ergonomics */}
      {inspectedPlayer && !selectedSwapSource && (() => {
        const pStats = statsMap.get(inspectedPlayer.player.id);
        const minutes = pStats?.minutesPlayed ?? inspectedPlayer.minutes ?? 0;
        const percent = pStats?.gameTimePercent ?? inspectedPlayer.percent ?? 0;
        const targetPercent = settings.targetGameTimePercent || 50;
        const meetsTarget = percent >= targetPercent;
        const slotDef = slotMap.get(inspectedPlayer.position);
        const category = slotDef?.category || (inspectedPlayer.position === 'GK' ? 'Goalkeeper' : 'Midfield');
        const catColors = POSITION_CATEGORY_STYLES[category] || POSITION_CATEGORY_STYLES.Midfield;
        const isCaptain = activeFixture.captainId === inspectedPlayer.player.id;
        const isFixed = isPlayerFixed(inspectedPlayer.player.id);
        const fixtureFixedPos = activeFixture.fixedPlayerPositions?.[inspectedPlayer.player.id];
        const isFixtureUnlocked = fixtureFixedPos?.toUpperCase() === 'UNLOCKED';
        const isFixtureLocked = Boolean(fixtureFixedPos && !isFixtureUnlocked);

        return (
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-md animate-fade-in space-y-3.5">
            {/* Header: Player Info, Stats Pill, and Close Button */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-base shadow-lg border ${catColors.bg} ${catColors.border} ${catColors.text} shrink-0`}
                >
                  {inspectedPlayer.player.squadNumber
                    ? `#${inspectedPlayer.player.squadNumber}`
                    : getPlayerInitials(inspectedPlayer.player.name)}
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-extrabold text-white tracking-tight truncate">
                      {inspectedPlayer.player.name}
                    </h4>
                    {isCaptain && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-sm">
                        CAPTAIN
                      </span>
                    )}
                    {isFixed ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>{isFixtureLocked ? 'Locked (This Match)' : 'Locked (Profile Default)'}</span>
                      </span>
                    ) : inspectedPlayer.player.isFixedPosition && isFixtureUnlocked ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                        <Unlock className="w-3 h-3 text-sky-400" />
                        <span>Unlocked for this Match</span>
                      </span>
                    ) : null}
                  </div>

                  <p className="text-xs text-slate-300 flex items-center gap-1.5 flex-wrap">
                    <span>
                      Playing{' '}
                      <strong className="text-white font-bold bg-slate-800 border border-slate-750 px-1.5 py-0.5 rounded text-[11px]">
                        {inspectedPlayer.position.replace('_', ' ')}
                      </strong>
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">
                      Preferred: <span className="text-slate-200">{inspectedPlayer.player.preferredPositions.join(', ')}</span>
                    </span>
                  </p>
                </div>
              </div>

              {/* Stats & Close X button */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs font-mono text-slate-200 shadow-inner">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold">{minutes}m</span>
                  <span className="text-slate-500">/</span>
                  <span
                    className={`font-bold ${
                      meetsTarget ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {percent}%
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectedPlayer(null)}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition flex items-center justify-center cursor-pointer border border-slate-700"
                  title="Close inspection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Actions Toolbar */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-start gap-2.5">
              <button
                type="button"
                onClick={async () => {
                  const res = await toggleFixedPlayerPosition(
                    inspectedPlayer.player.id,
                    inspectedPlayer.position
                  );
                  if (res.isFixed) {
                    showToast(
                      `🔒 ${inspectedPlayer.player.name} locked as ${res.position} for this match.`,
                      'success'
                    );
                  } else {
                    showToast(
                      `Unlocked ${inspectedPlayer.player.name} for this match. Position can now rotate freely.`,
                      'info'
                    );
                  }
                }}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl font-semibold text-xs transition cursor-pointer flex items-center gap-2 shadow-sm ${
                  isFixed
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700'
                }`}
                title={
                  isFixed
                    ? 'Click to unlock for this match. Player will rotate freely (global profile setting preserved for other fixtures).'
                    : 'Lock player in position for this match (keeps them on pitch all game without rotating out).'
                }
              >
                {isFixed ? (
                  <>
                    <Unlock className="w-4 h-4 text-amber-400" />
                    <span>Unlock for this Match</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>Lock Position (This Match)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  selectSwapSource({
                    type: 'pitch',
                    playerId: inspectedPlayer.player.id,
                    position: inspectedPlayer.position,
                  });
                }}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white font-semibold text-xs shadow-md shadow-sky-950/40 transition cursor-pointer flex items-center gap-2"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>Swap Player</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmergencyDeparturePlayer({
                    player: inspectedPlayer.player,
                    position: inspectedPlayer.position,
                  });
                  setInspectedPlayer(null);
                }}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950/40 transition cursor-pointer flex items-center gap-2"
                title="Mid-match injury or early departure: prompt replacement & rebalance remaining periods"
              >
                <HeartPulse className="w-4 h-4 text-white animate-pulse" />
                <span>Injured / Left Early</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCallOffPitchPlayer({
                    player: inspectedPlayer.player,
                    position: inspectedPlayer.position,
                  });
                  setInspectedPlayer(null);
                }}
                className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-2"
                title="Player ill or called off? Remove or replace"
              >
                <UserX className="w-4 h-4 text-slate-400" />
                <span>Pre-Match Call-Off</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Modal: Mid-Match Emergency Injury / Early Departure Rebalancer */}
      <EmergencyDepartureModal
        isOpen={Boolean(emergencyDeparturePlayer)}
        player={emergencyDeparturePlayer ? emergencyDeparturePlayer.player : null}
        currentLocation="pitch"
        currentPosition={emergencyDeparturePlayer ? emergencyDeparturePlayer.position : undefined}
        currentPeriod={activePeriod}
        onClose={() => setEmergencyDeparturePlayer(null)}
      />

      {/* Modal: Mark Pitch Player as Sick / Call-Off (Remove without replacement OR replace from rested roster) */}
      <PlayerCallOffModal
        player={callOffPitchPlayer ? callOffPitchPlayer.player : null}
        positionLabel={callOffPitchPlayer ? callOffPitchPlayer.position : undefined}
        onClose={() => setCallOffPitchPlayer(null)}
        currentLocation="pitch"
      />
    </div>
  );
};
