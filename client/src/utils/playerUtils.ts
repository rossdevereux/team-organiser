import { BroadPosition, Player } from '../types';

/**
 * Extracts 1-2 uppercase initials from a player's name.
 */
export function getPlayerInitials(name?: string): string {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Consistent sorting: players with squad numbers first (ascending), then alphabetically by name.
 */
export function sortPlayersByNumberAndName(a: Player, b: Player): number {
  if (a.squadNumber !== undefined && b.squadNumber !== undefined) {
    return a.squadNumber - b.squadNumber;
  }
  if (a.squadNumber !== undefined) return -1;
  if (b.squadNumber !== undefined) return 1;
  return a.name.localeCompare(b.name);
}

/**
 * Visual styling theme per broad position category.
 */
export interface PositionStyle {
  bg: string;
  border: string;
  text: string;
  shirt: string;
}

export const POSITION_CATEGORY_STYLES: Record<BroadPosition, PositionStyle> = {
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

export function getPositionCategoryStyle(category?: string): PositionStyle {
  if (category && category in POSITION_CATEGORY_STYLES) {
    return POSITION_CATEGORY_STYLES[category as BroadPosition];
  }
  return POSITION_CATEGORY_STYLES.Midfield;
}
