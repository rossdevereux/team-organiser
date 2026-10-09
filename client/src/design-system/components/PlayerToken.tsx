import React from 'react';
import { Player, BroadPosition } from '../../types';
import { getPositionToken, resolveBroadPosition } from '../tokens';
import { Shield, Sparkles, Award } from 'lucide-react';

export interface PlayerTokenProps {
  player: Player;
  position?: string;
  variant?: 'pitch' | 'bench' | 'compact' | 'roster';
  isSelected?: boolean;
  isCaptain?: boolean;
  isPotm?: boolean;
  minutesPlayed?: number;
  gameTimePercent?: number;
  targetPercent?: number;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  draggable?: boolean;
  className?: string;
}

/**
 * Custom SVG Kit Jersey with dynamic primary & secondary colors
 */
export const KitJerseyIcon: React.FC<{
  primaryColor?: string;
  secondaryColor?: string;
  number?: number;
  isGk?: boolean;
  size?: number;
  className?: string;
}> = ({
  primaryColor = 'var(--kit-primary)',
  secondaryColor = 'var(--kit-secondary)',
  number,
  isGk = false,
  size = 36,
  className = '',
}) => {
  // Goalkeepers traditionally have amber/fluorescent jerseys
  const mainFill = isGk ? '#f59e0b' : primaryColor;
  const trimFill = isGk ? '#18181b' : secondaryColor;

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center shrink-0 drop-shadow-md ${className}`}
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Sleeves */}
        <path
          d="M10 13L2 21L7 26L13 20V36H35V20L41 26L46 21L38 13L32 10H16L10 13Z"
          fill={mainFill}
          stroke={trimFill}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Collar / V-Neck Trim */}
        <path
          d="M19 10C19 15 29 15 29 10"
          stroke={trimFill}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Side Stripes / Kit Accents */}
        <line x1="13" y1="23" x2="13" y2="36" stroke={trimFill} strokeWidth="2.5" />
        <line x1="35" y1="23" x2="35" y2="36" stroke={trimFill} strokeWidth="2.5" />
      </svg>
      {number !== undefined && (
        <span
          className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-black font-mono tracking-tight pointer-events-none mt-1"
          style={{
            color: isGk ? '#18181b' : 'var(--kit-primary-contrast, #ffffff)',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          }}
        >
          {number}
        </span>
      )}
    </div>
  );
};

export const PlayerToken: React.FC<PlayerTokenProps> = ({
  player,
  position,
  variant = 'pitch',
  isSelected = false,
  isCaptain = false,
  isPotm = false,
  minutesPlayed,
  gameTimePercent,
  targetPercent = 50,
  onClick,
  onDragStart,
  draggable = false,
  className = '',
}) => {
  const broadPosition = position ? resolveBroadPosition(position) : (player.preferredPositions?.[0] || 'Midfield');
  const posToken = getPositionToken(broadPosition);
  const isGk = broadPosition === 'Goalkeeper';

  // Pitch Variant (Interactive on 2D tactical field)
  if (variant === 'pitch') {
    return (
      <div
        draggable={draggable}
        onDragStart={onDragStart}
        onClick={onClick}
        className={`group relative flex flex-col items-center cursor-pointer select-none transition-transform duration-150 ${
          isSelected ? 'scale-110 z-30' : 'hover:scale-105 z-10'
        } ${className}`}
      >
        {/* Selection / Focus Indicator Halo */}
        <div
          className={`relative p-1 rounded-2xl transition-all ${
            isSelected
              ? 'ring-4 ring-sky-400 bg-sky-950/80 shadow-xl shadow-sky-500/40 animate-pulse'
              : 'hover:ring-2 hover:ring-white/40'
          }`}
        >
          {/* Captain Armband Badge */}
          {isCaptain && (
            <div
              className="absolute -top-1.5 -left-1.5 z-20 w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-md border border-amber-300 ring-1 ring-black/40"
              title="Matchday Captain"
            >
              C
            </div>
          )}

          {/* Player of Match Star Badge */}
          {isPotm && (
            <div
              className="absolute -top-1.5 -right-1.5 z-20 w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md border border-indigo-300 ring-1 ring-black/40"
              title="Player of the Match"
            >
              <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
            </div>
          )}

          {/* Jersey SVG with club kit colours */}
          <KitJerseyIcon
            number={player.squadNumber}
            isGk={isGk}
            size={42}
          />
        </div>

        {/* Player Name & Position Pill */}
        <div className="mt-0.5 flex flex-col items-center">
          <span className="text-[11px] sm:text-xs font-bold text-white px-2 py-0.5 rounded-md bg-slate-950/85 border border-slate-700/80 whitespace-nowrap shadow-md max-w-[85px] truncate">
            {player.name}
          </span>
          {position && (
            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded mt-0.5 border ${posToken.badgeBg} ${posToken.badgeBorder} ${posToken.badgeText}`}
            >
              {position}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Bench / Card Variant
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      className={`p-3 rounded-2xl border transition-all duration-150 cursor-pointer flex flex-col justify-between space-y-2 select-none group ${
        isSelected
          ? 'ring-2 ring-sky-400 border-white bg-slate-850 shadow-lg shadow-sky-500/20'
          : isCaptain
          ? 'bg-[var(--surface-card)] hover:border-amber-400/50 border-amber-500/30'
          : 'bg-[var(--surface-card)] hover:border-slate-600 border-[var(--surface-border)]'
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <KitJerseyIcon
            number={player.squadNumber}
            isGk={isGk}
            size={34}
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[var(--text-main)] group-hover:text-sky-300 transition-colors">
                {player.name}
              </span>
              {isCaptain && (
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-400 text-slate-950">
                  C
                </span>
              )}
              {isPotm && (
                <span className="text-[9px] font-black px-1 py-0.2 rounded bg-indigo-500 text-amber-300 flex items-center">
                  ★
                </span>
              )}
            </div>
            {position && (
              <span className={`text-[10px] font-mono font-semibold ${posToken.textClass}`}>
                {position}
              </span>
            )}
          </div>
        </div>

        {/* Minutes / Game time indicator */}
        {minutesPlayed !== undefined && (
          <div className="text-right">
            <span className="text-[11px] font-mono font-bold text-[var(--text-main)]">
              {minutesPlayed}m
            </span>
            {gameTimePercent !== undefined && (
              <div className="w-12 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                <div
                  className={`h-full ${
                    gameTimePercent >= targetPercent ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.min(100, gameTimePercent)}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
