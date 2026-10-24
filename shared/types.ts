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
  isFixedPosition?: boolean; // When true, player remains in their fixed position all match without being rotated out
  fixedPosition?: string; // Position slot code or category to fix (e.g. "GK", "CB", "DEF_L")
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
  fixedPlayerPositions?: Record<string, string>; // playerId -> position code (e.g. { "p1": "GK" })
}

export interface PostMatchRecording {
  trackingMode: 'exact' | 'full_credit'; // 'full_credit' defaults all matchday players to 100% time
  playerMinutes: Record<string, number>; // playerId -> minutes played
  recordedAt?: string;
  notes?: string;
}

export interface GoalScorer {
  id?: string;
  playerId?: string; // Optional if opposition or unassigned player
  playerName?: string; // Player display name
  team: 'home' | 'away'; // 'home' or 'away'
  minute?: string | number; // e.g. 15, "45+2"
  isOwnGoal?: boolean;
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
  status: 'Upcoming' | 'In Progress' | 'Completed' | 'Played' | 'Draft' | 'Cancelled' | 'Postponed';
  matchdaySquadCap?: number; // Override standard team sheet / squad size (e.g. for friendlies/tournaments)
  pitchPlayerCount?: number; // Override pitch player count (e.g. 5, 7, 9, 11) for this fixture
  matchPeriodCount?: number; // Override number of periods (e.g. 2, 3, 4) for this fixture
  periodDurationMinutes?: number; // Override period duration (e.g. 15, 20, 25, 30) for this fixture
  formation?: string; // Optional formation override for this fixture
  fixedPlayerPositions?: Record<string, string>; // playerId -> position code (e.g. { "p1": "GK" })
  matchSquad?: MatchSquad;
  postMatchRecording?: PostMatchRecording;
  homeScore?: number;
  awayScore?: number;
  scorers?: GoalScorer[];
  isLive?: boolean;
  earlyDepartures?: EarlyDeparture[];
  creditedMinutes?: Record<string, number>; // playerId -> minutes credited to player totals
  version?: number; // Monotonic revision number for ETag & cache invalidation
  updatedAt?: string; // ISO timestamp of last fixture mutation
}

export interface EarlyDeparture {
  playerId: string;
  playerName: string;
  period: number; // 1-indexed period during which departure occurred
  minute: number; // Period elapsed minute at time of departure
  matchMinute: number; // Cumulative match minute (e.g. 39)
  reason: 'injured' | 'left_early' | 'unwell';
  replacedByPlayerId?: string; // ID of bench sub stepping onto pitch
  replacedByPlayerName?: string; // Display name of incoming bench sub
  departedAt: string; // ISO timestamp
  proRatedMinutes: number; // Exact cumulative match minutes credited to player
}

export interface LiveStatusResponse {
  status: 'live' | 'upcoming' | 'completed' | 'paused';
  period: number;
  homeScore: number;
  awayScore: number;
  periodStartedAt: number | null;
  version: number;
  updatedAt: string;
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

// Subscription & Monetisation Models
export type SubscriptionTier = 'free_trial' | 'coach_monthly' | 'coach_annual' | 'club_unlimited';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';

export interface UserSubscription {
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  trialStartedAt: string; // ISO 8601
  trialEndsAt: string;    // ISO 8601 (Signup + 30 days)
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string; // ISO 8601
  cancelAtPeriodEnd?: boolean;
}
