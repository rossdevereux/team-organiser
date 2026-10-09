import { BroadPosition } from '../types';

export type AppContextMode = 'clubhouse' | 'touchline' | 'print';
export type ComponentDensity = 'compact' | 'normal' | 'touchline';
export type ClubhouseMode = 'dark' | 'light';

export interface PositionVisualToken {
  category: BroadPosition;
  accent: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  shirtFill: string;
}

export const POSITION_TOKENS: Record<BroadPosition, PositionVisualToken> = {
  Goalkeeper: {
    category: 'Goalkeeper',
    accent: '#f59e0b',
    bgClass: 'bg-amber-500/15',
    borderClass: 'border-amber-500/40',
    textClass: 'text-amber-400',
    badgeBg: 'bg-amber-500/20',
    badgeBorder: 'border-amber-500/50',
    badgeText: 'text-amber-300',
    shirtFill: '#f59e0b',
  },
  Defence: {
    category: 'Defence',
    accent: '#10b981',
    bgClass: 'bg-emerald-500/15',
    borderClass: 'border-emerald-500/40',
    textClass: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20',
    badgeBorder: 'border-emerald-500/50',
    badgeText: 'text-emerald-300',
    shirtFill: '#10b981',
  },
  Midfield: {
    category: 'Midfield',
    accent: '#0ea5e9',
    bgClass: 'bg-sky-500/15',
    borderClass: 'border-sky-500/40',
    textClass: 'text-sky-400',
    badgeBg: 'bg-sky-500/20',
    badgeBorder: 'border-sky-500/50',
    badgeText: 'text-sky-300',
    shirtFill: '#0ea5e9',
  },
  Attack: {
    category: 'Attack',
    accent: '#f43f5e',
    bgClass: 'bg-rose-500/15',
    borderClass: 'border-rose-500/40',
    textClass: 'text-rose-400',
    badgeBg: 'bg-rose-500/20',
    badgeBorder: 'border-rose-500/50',
    badgeText: 'text-rose-300',
    shirtFill: '#f43f5e',
  },
};

export interface KitPreset {
  id: string;
  name: string;
  primary: string;
  secondary: string;
}

export const POPULAR_KIT_PRESETS: KitPreset[] = [
  { id: 'royal-amber', name: 'Royal & Gold', primary: '#1e3a8a', secondary: '#f59e0b' },
  { id: 'crimson-white', name: 'Crimson & White', primary: '#dc2626', secondary: '#f8fafc' },
  { id: 'sky-navy', name: 'Sky & Deep Navy', primary: '#0284c7', secondary: '#0f172a' },
  { id: 'emerald-gold', name: 'Emerald & Amber', primary: '#059669', secondary: '#fbbf24' },
  { id: 'onyx-gold', name: 'Onyx & Yellow', primary: '#18181b', secondary: '#eab308' },
  { id: 'purple-teal', name: 'Imperial & Teal', primary: '#7c3aed', secondary: '#14b8a6' },
  { id: 'barca-stripes', name: 'Blaugrana & Gold', primary: '#831843', secondary: '#facc15' },
  { id: 'neon-pitch', name: 'Tactical Volt & Pitch', primary: '#064e3b', secondary: '#10b981' },
];

/**
 * Calculates WCAG compliant text color (dark or light) for a given background color
 */
export function getContrastTextColor(hexColor: string): '#ffffff' | '#0f172a' {
  if (!hexColor || !hexColor.startsWith('#')) return '#ffffff';
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  if (hex.length !== 6) return '#ffffff';

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Perceived relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#0f172a' : '#ffffff';
}

/**
 * Maps a position label (e.g. "CB", "Left Back", "Goalkeeper") to its BroadPosition category
 */
export function resolveBroadPosition(positionNameOrCode: string): BroadPosition {
  const norm = (positionNameOrCode || '').toUpperCase();
  if (norm.includes('GK') || norm.includes('GOAL') || norm.includes('KEEPER')) {
    return 'Goalkeeper';
  }
  if (
    norm.includes('DEF') ||
    norm.includes('BACK') ||
    norm.includes('CB') ||
    norm.includes('LB') ||
    norm.includes('RB') ||
    norm.includes('LWB') ||
    norm.includes('RWB')
  ) {
    return 'Defence';
  }
  if (
    norm.includes('MID') ||
    norm.includes('CM') ||
    norm.includes('CDM') ||
    norm.includes('CAM') ||
    norm.includes('LM') ||
    norm.includes('RM') ||
    norm.includes('LW') ||
    norm.includes('RW') ||
    norm.includes('WING')
  ) {
    return 'Midfield';
  }
  return 'Attack';
}

/**
 * Returns the position visual token for a given position code or label
 */
export function getPositionToken(positionNameOrCode: string): PositionVisualToken {
  const category = resolveBroadPosition(positionNameOrCode);
  return POSITION_TOKENS[category];
}
