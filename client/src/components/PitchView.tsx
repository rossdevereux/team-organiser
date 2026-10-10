import React, { useState } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import { Shirt, ArrowLeftRight, X, Clock, ShieldCheck, Info } from 'lucide-react';
import { BroadPosition, Player } from '../types';

const CATEGORY_COLORS: Record<BroadPosition, { bg: string; border: string; text: string; shirt: string }> = {
  Goalkeeper: {
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/50',
    text: 'text-amber-300',
    shirt: '#f59e0b',
  },
  Defence: {
    bg: 'bg-sky-500/20',
    border: 'border-sky-500/50',
    text: 'text-sky-300',
    shirt: '#0ea5e9',
  },
  Midfield: {
    bg: 'bg-indigo-500/20',
    border: 'border-indigo-500/50',
    text: 'text-indigo-300',
    shirt: '#6366f1',
  },
  Attack: {
    bg: 'bg-rose-500/20',
    border: 'border-rose-500/50',
    text: 'text-rose-300',
    shirt: '#f43f5e',
  },
};

function getInitials(name?: string): string {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const PitchView: React.FC = () => {
  const {
    activeFixture,
    activePeriod,
    settings,
    activeFormation,
    players,
    stats,
    selectedSwapSource,
    selectSwapSource,
    handleSwap,
  } = useMatchday();

  const [dragOverPosition, setDragOverPosition] = useState<string | null>(null);
  const [inspectedPlayer, setInspectedPlayer] = useState<{
    player: Player;
    position: string;
    minutes?: number;
    percent?: number;
  } | null>(null);

  if (!activeFixture || !activeFixture.matchSquad) {
    return null;
  }

  const currentLineup = activeFixture.matchSquad.lineupsByPeriod.find(
    (l) => l.period === activePeriod
  );

  if (!currentLineup) return null;

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const statsMap = new Map(stats.map((s) => [s.playerId, s]));

  // Build coordinate lookup from active formation
  const slotMap = new Map(activeFormation.slots.map((s) => [s.code, s]));

  const selectedPlayer = selectedSwapSource
    ? playerMap.get(selectedSwapSource.playerId)
    : null;

  const onNodeClick = (playerId: string, position: string) => {
    if (!selectedSwapSource) {
      selectSwapSource({ type: 'pitch', playerId, position });
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

  const periodDisplayName =
    settings.matchPeriodCount === 2
      ? activePeriod === 1
        ? 'First Half (Period 1)'
        : 'Second Half (Period 2)'
      : `Period ${activePeriod} of ${settings.matchPeriodCount}`;

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
                Swap Mode Active
              </span>
              <span className="truncate block">
                Click any position on pitch or bench to swap{' '}
                <strong className="text-white underline font-bold">
                  {selectedPlayer ? selectedPlayer.name : 'selected player'}
                </strong>
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
            <span>Cancel</span>
          </button>
        </div>
      )}

      {/* 2D Football Pitch */}
      <div className="relative w-full aspect-[4/5] sm:aspect-[4/4.8] max-w-2xl mx-auto rounded-3xl overflow-hidden shadow-2xl border-4 border-[var(--pitch-border)] bg-gradient-to-b from-[var(--pitch-turf-1)] via-[var(--pitch-turf-2)] to-[var(--pitch-turf-3)] select-none transition-colors duration-200">
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
            {periodDisplayName} • {activeFormation.name} ({settings.pitchPlayerCount}-a-side)
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

          const colors = CATEGORY_COLORS[slotDef.category] || CATEGORY_COLORS['Midfield'];
          const isSelected = selectedSwapSource?.playerId === entry.playerId;
          const isEligibleTarget = Boolean(selectedSwapSource && !isSelected);
          const isDragOver = dragOverPosition === entry.position;
          const isCaptain = activeFixture.captainId === entry.playerId;
          const playerName = player ? player.name : 'Unknown Player';
          const initials = getInitials(player?.name);

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
                  : isEligibleTarget
                  ? 'z-20 hover:scale-105'
                  : 'hover:scale-105 z-10'
              }`}
            >
              {/* Player Node Card with Touch Target */}
              <div
                title={`${playerName} (${entry.position}) • Click to swap or inspect`}
                className={`relative flex flex-col items-center justify-center p-2 rounded-2xl backdrop-blur-md border shadow-xl transition-all min-h-[58px] ${
                  isSelected
                    ? 'ring-4 ring-sky-400 border-white bg-slate-900 shadow-sky-500/50'
                    : isDragOver
                    ? 'ring-4 ring-emerald-300 border-white bg-slate-850 shadow-emerald-400/50 scale-105'
                    : isEligibleTarget
                    ? 'ring-2 ring-emerald-400/80 border-emerald-400/60 bg-slate-950/95 shadow-lg shadow-emerald-500/20 hover:border-emerald-300'
                    : isCaptain
                    ? 'bg-slate-950/90 hover:bg-slate-900 border-amber-500/50 shadow-amber-500/10'
                    : 'bg-slate-950/85 hover:bg-slate-900 border-white/20'
                }`}
                style={{ minWidth: '92px', maxWidth: '108px' }}
              >
                {/* Position Badge at Top */}
                <div className="absolute -top-2.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider shadow-sm flex items-center gap-1 border border-white/20 bg-slate-900 text-slate-200">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: colors.shirt }}
                  />
                  <span className="truncate max-w-[50px]">{entry.position.replace('_', ' ')}</span>
                  {isCaptain && <span className="text-amber-400 font-black ml-0.5" title="Matchday Captain">©</span>}
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
                  className="text-[11px] font-semibold text-white tracking-tight text-center max-w-[88px] truncate leading-tight block"
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
      {inspectedPlayer && !selectedSwapSource && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-white font-extrabold flex items-center justify-center text-sm border border-slate-700 shrink-0">
              {inspectedPlayer.player.squadNumber
                ? `#${inspectedPlayer.player.squadNumber}`
                : getInitials(inspectedPlayer.player.name)}
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                <span>{inspectedPlayer.player.name}</span>
                {activeFixture.captainId === inspectedPlayer.player.id && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black">
                    CAPTAIN
                  </span>
                )}
              </h4>
              <p className="text-xs text-slate-400">
                Playing <strong>{inspectedPlayer.position}</strong> • Preferred:{' '}
                {inspectedPlayer.player.preferredPositions.join(', ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right font-mono text-xs text-slate-300 mr-2 hidden sm:block">
              <div>{inspectedPlayer.minutes ?? 0}m total</div>
              <div className="text-emerald-300 font-bold">{inspectedPlayer.percent ?? 0}% playing time</div>
            </div>
            <button
              type="button"
              onClick={() => {
                selectSwapSource({
                  type: 'pitch',
                  playerId: inspectedPlayer.player.id,
                  position: inspectedPlayer.position,
                });
              }}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Swap Player</span>
            </button>
            <button
              type="button"
              onClick={() => setInspectedPlayer(null)}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
