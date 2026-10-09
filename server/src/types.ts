export type BroadPosition = 'Goalkeeper' | 'Defence' | 'Midfield' | 'Attack';

export const SPECIFIC_POSITIONS_MAP: Record<BroadPosition, string[]> = {
  Goalkeeper: ['Goalkeeper (GK)'],
  Defence: [
    'Centre Back (CB)',
    'Left Back (LB)',
    'Right Back (RB)',
    'Left Wing Back (LWB)',
    'Right Wing Back (RWB)',
  ],
  Midfield: [
    'Central Midfield (CM)',
    'Defensive Midfield (CDM)',
    'Attacking Midfield (CAM)',
    'Left Midfield (LM)',
    'Right Midfield (RM)',
    'Left Winger (LW)',
    'Right Winger (RW)',
  ],
  Attack: [
    'Striker (ST)',
    'Centre Forward (CF)',
  ],
};

export const ALL_SPECIFIC_POSITIONS = Object.values(SPECIFIC_POSITIONS_MAP).flat();

export interface PositionSlot {
  code: string; // e.g. "GK", "DEF_L", "MID_C", "ATT"
  label: string; // e.g. "Left Back", "Centre Midfield"
  category: BroadPosition;
  x: number; // percentage 0-100 on pitch
  y: number; // percentage 0-100 on pitch
}

export interface Formation {
  id: string; // e.g. "7-2-3-1" or custom ID
  name: string; // e.g. "2-3-1"
  teamSize: number; // 5, 7, 9, 11
  slots: PositionSlot[];
  isCustom?: boolean;
}

export interface TeamSettings {
  pitchPlayerCount: number; // default: 7 (5, 7, 9, 11)
  matchdaySquadCap: number; // default: 10
  subCount: number; // default: 3
  matchPeriodCount: number; // default: 2 (Halves)
  periodDurationMinutes: number; // default: 25 (50 min match)
  targetGameTimePercent: number; // default: 50%
  defaultFormation: string; // formation id or name, e.g. '2-3-1'
  customFormations?: Formation[];
  currentSeason?: string; // e.g. '2026/2027'
  seasons?: string[]; // list of seasons created for the team, e.g. ['2025/2026', '2026/2027']
  defaultSubIntervalMinutes?: number; // default rotation interval, e.g. 10
  kitPrimaryColor?: string; // Club primary kit colour (hex, e.g. '#1e3a8a')
  kitSecondaryColor?: string; // Club secondary/trim kit colour (hex, e.g. '#f59e0b')
}

export interface Team {
  id: string;
  name: string;
  ageGroup?: string; // e.g. "U10", "U12"
  ownerId: string;
  ownerEmail?: string;
  sharedWith: string[]; // emails or user IDs of co-coaches
  settings: TeamSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface Player {
  id: string;
  teamId?: string;
  name: string;
  squadNumber?: number;
  preferredPositions: BroadPosition[];
  specificPositions?: string[]; // e.g. ["Left Midfield", "Centre Back"]
  unavailableDates: string[]; // ISO 'YYYY-MM-DD'
  signOnDate?: string; // ISO 'YYYY-MM-DD' (date joined/registered)
  leaveDate?: string; // ISO 'YYYY-MM-DD' (date left/transferred)
  matchesPlayed: number;
  totalMinutesPlayed: number;
  captainCount?: number;
  playerOfTheMatchCount?: number;
}

export interface PeriodLineup {
  period: number; // 1 to N (default: 1 and 2 for Halves)
  onPitch: { playerId: string; position: string }[];
  subs: string[];
}

export interface MatchSquad {
  fixtureId: string;
  selectedPlayerIds: string[]; // Matchday squad (e.g. 10)
  restedPlayerIds: string[]; // Rotated off (e.g. 3)
  lineupsByPeriod: PeriodLineup[];
  manualOverrides: boolean;
}

export interface PostMatchRecording {
  trackingMode: 'exact' | 'full_credit'; // 'full_credit' defaults all matchday players to 100% time
  playerMinutes: Record<string, number>; // playerId -> minutes played
  recordedAt?: string;
  notes?: string;
}

export interface Fixture {
  id: string;
  teamId?: string;
  season?: string; // e.g. '2026/2027'
  date: string; // 'YYYY-MM-DD'
  kickOffTime?: string;
  meetTime?: string; // e.g. '09:30' (arrival time before kick-off)
  groundAddress?: string; // e.g. 'Riverside Sports Ground, Postcode RG1 4PS'
  mapsUrl?: string; // Clickable Google Maps URL
  captainId?: string; // Player ID of matchday captain
  playerOfTheMatchId?: string; // Player ID of Player of the Match / Sportsmanship Award
  opponent: string;
  venue: 'Home' | 'Away';
  status: 'Upcoming' | 'Completed' | 'Draft';
  matchSquad?: MatchSquad;
  postMatchRecording?: PostMatchRecording;
}

// Stats computed per player in a match
export interface MatchPlayerStats {
  playerId: string;
  player: Player;
  periodsPlayed: number[]; // e.g. [1, 2]
  minutesPlayed: number;
  gameTimePercent: number;
  playedAsGoalkeeper: boolean;
  positionsPlayed: string[];
  meetsTarget: boolean;
  isPostMatchRecorded?: boolean;
}

// Season-wide fair play statistics per player
export interface SeasonPlayerStats {
  playerId: string;
  player: Player;
  matchesPlayed: number;
  totalMinutesPlayed: number;
  avgMinutesPerMatch: number;
  seasonGameTimePercent: number;
  equityDeltaMinutes: number; // difference from squad average
  meetsTarget: boolean;
  goalkeeperAppearances?: number;
  captainAppearances?: number;
  playerOfTheMatchAwards?: number;
  positionDistribution?: Record<BroadPosition, number>;
}

// Sideline Substitution Guidance Models
export interface SingleSubChange {
  offPlayerId: string;
  offPlayerName: string;
  onPlayerId: string;
  onPlayerName: string;
  position: string;
  positionCategory: BroadPosition;
  reason?: string;
}

export interface SuggestedSubWindow {
  minute: number; // e.g. 10, 20, 35, 45
  period: number; // 1 or 2
  subChanges: SingleSubChange[];
  description: string;
}

export interface SuggestedSubPlan {
  intervalMinutes: number; // e.g. 10
  strategyName: string;
  strategyDescription: string;
  windows: SuggestedSubWindow[];
}
