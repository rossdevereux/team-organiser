import React from 'react';
import { useDesignSystem } from '../DesignSystemContext';

export interface PitchCanvasProps extends React.HTMLAttributes<HTMLDivElement> {
  aspectRatio?: string;
  formationName?: string;
  periodLabel?: string;
  teamSize?: number;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export const PitchCanvas: React.FC<PitchCanvasProps> = ({
  aspectRatio = 'aspect-[4/5] sm:aspect-[4/4.8]',
  formationName,
  periodLabel,
  teamSize,
  onDragOver,
  onDrop,
  className = '',
  children,
  ...props
}) => {
  const { isPrint, isTouchline } = useDesignSystem();

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`relative w-full ${aspectRatio} max-w-2xl mx-auto rounded-3xl overflow-hidden shadow-2xl border-4 select-none transition-colors duration-300 ${
        isPrint
          ? 'bg-white border-black shadow-none'
          : isTouchline
          ? 'border-emerald-500 bg-gradient-to-b from-[#064e3b] via-[#065f46] to-[#044332] shadow-emerald-950/80 ring-2 ring-emerald-400/40'
          : 'border-emerald-950/80 bg-gradient-to-b from-[var(--pitch-turf-1,#113a1a)] via-[var(--pitch-turf-2,#0d2e15)] to-[var(--pitch-turf-3,#0a2310)]'
      } ${className}`}
      {...props}
    >
      {/* Grass Stripes Pattern (Hidden in print) */}
      {!isPrint && (
        <div className="absolute inset-0 opacity-20 pointer-events-none flex flex-col justify-between">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={`h-full w-full ${i % 2 === 0 ? 'bg-black/25' : 'bg-white/10'}`}
            />
          ))}
        </div>
      )}

      {/* Pitch Header Overlay Badge */}
      {(formationName || periodLabel || teamSize) && (
        <div className="absolute top-2 left-4 z-20 pointer-events-none">
          <span
            className={`text-[10px] uppercase font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm ${
              isPrint
                ? 'bg-white text-black border-black'
                : 'text-emerald-300 bg-emerald-950/80 border-emerald-500/30'
            }`}
          >
            {periodLabel ? `${periodLabel} • ` : ''}
            {formationName ? `${formationName} ` : ''}
            {teamSize ? `(${teamSize}-a-side)` : ''}
          </span>
        </div>
      )}

      {/* Authentic Football Pitch Boundary & Line Markings */}
      <div
        className={`absolute inset-3 sm:inset-4 border-2 rounded-2xl pointer-events-none ${
          isPrint ? 'border-black' : isTouchline ? 'border-white/80' : 'border-white/40'
        }`}
      >
        {/* Halfway Line */}
        <div
          className={`absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 ${
            isPrint ? 'bg-black' : isTouchline ? 'bg-white/80' : 'bg-white/40'
          }`}
        />

        {/* Centre Circle */}
        <div
          className={`absolute top-1/2 left-1/2 w-24 h-24 sm:w-28 sm:h-28 border-2 rounded-full -translate-x-1/2 -translate-y-1/2 ${
            isPrint ? 'border-black' : isTouchline ? 'border-white/80' : 'border-white/40'
          }`}
        />
        {/* Centre Spot */}
        <div
          className={`absolute top-1/2 left-1/2 w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 ${
            isPrint ? 'bg-black' : isTouchline ? 'bg-white' : 'bg-white/70'
          }`}
        />

        {/* Top Penalty Box (Opponent End) */}
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-44 sm:w-48 h-20 sm:h-24 border-b-2 border-x-2 rounded-b-lg ${
            isPrint ? 'border-black' : isTouchline ? 'border-white/80' : 'border-white/40'
          }`}
        >
          {/* Goal Box */}
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-20 sm:w-24 h-9 sm:h-10 border-b-2 border-x-2 ${
              isPrint ? 'border-black' : isTouchline ? 'border-white/80' : 'border-white/40'
            }`}
          />
          {/* Penalty Spot */}
          <div
            className={`absolute bottom-3 left-1/2 w-1.5 h-1.5 rounded-full -translate-x-1/2 ${
              isPrint ? 'bg-black' : 'bg-white/80'
            }`}
          />
        </div>

        {/* Bottom Penalty Box (Home / Goalie End) */}
        <div
          className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-44 sm:w-48 h-20 sm:h-24 border-t-2 border-x-2 rounded-t-lg ${
            isPrint ? 'border-black' : isTouchline ? 'border-white/80' : 'border-white/40'
          }`}
        >
          {/* Goal Box */}
          <div
            className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-20 sm:w-24 h-9 sm:h-10 border-t-2 border-x-2 ${
              isPrint ? 'border-black' : isTouchline ? 'border-white/80' : 'border-white/40'
            }`}
          />
          {/* Penalty Spot */}
          <div
            className={`absolute top-3 left-1/2 w-1.5 h-1.5 rounded-full -translate-x-1/2 ${
              isPrint ? 'bg-black' : 'bg-white/80'
            }`}
          />
        </div>

        {/* Corner Arcs */}
        <div
          className={`absolute top-0 left-0 w-5 h-5 border-b-2 border-r-2 rounded-br-full ${
            isPrint ? 'border-black' : 'border-white/40'
          }`}
        />
        <div
          className={`absolute top-0 right-0 w-5 h-5 border-b-2 border-l-2 rounded-bl-full ${
            isPrint ? 'border-black' : 'border-white/40'
          }`}
        />
        <div
          className={`absolute bottom-0 left-0 w-5 h-5 border-t-2 border-r-2 rounded-tr-full ${
            isPrint ? 'border-black' : 'border-white/40'
          }`}
        />
        <div
          className={`absolute bottom-0 right-0 w-5 h-5 border-t-2 border-l-2 rounded-tl-full ${
            isPrint ? 'border-black' : 'border-white/40'
          }`}
        />
      </div>

      {/* Pitch Nodes & Children */}
      {children}
    </div>
  );
};
