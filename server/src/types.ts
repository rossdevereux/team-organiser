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

export type SubstitutionTimingMode = 'at_breaks' | 'in_game_rolling' | 'hybrid';

export interface PlannedInGameSub {
  period: number;
  targetMinute: number; // in-period minute, e.g. 12 or 12.5
  matchMinute: number;  // cumulative match minute, e.g. 12 or 37
  playerOutId: string;
  playerOutName?: string;
  playerInId: string;
  playerInName?: string;
  position: string;
  reason?: string;
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
  subTimingMode?: SubstitutionTimingMode; // default: 'at_breaks'
  preserveLineupAcrossBreaks?: boolean; // default: false
  midPeriodSubIntervalMinutes?: number; // e.g. 12.5 (trigger sub prompts mid-half)
}

export interface TeamMember {
  userId: string;
  email: string;
  role?: 'coach' | 'viewer';
  addedAt?: string;
}

export interface Team {
  id: string;
  name: string;
  ageGroup?: string; // e.g. "U10", "U12"
  ownerId: string;
  ownerEmail?: string;
  sharedWith: string[]; // user IDs (and fallback legacy emails) of co-coaches
  sharedMembers?: TeamMember[]; // structured metadata pairing userId and email for UI display
  pendingInvites?: string[]; // email addresses of invited coaches who haven't registered yet
  settings: TeamSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface Player {
  id: string;
  teamId: string;
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
  plannedInGameSubs?: PlannedInGameSub[];
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

export interface LiveMatchSubLogEntry {
  id?: string;
  minute: number; // match minute (e.g. 14)
  time: string; // e.g. "14:22"
  period: number; // 1, 2, etc.
  offPlayerId: string;
  offPlayerName: string;
  onPlayerId: string;
  onPlayerName: string;
  position?: string;
  text: string;
  timestamp: string; // ISO timestamp
}

export interface LiveMatchPeriodTimer {
  elapsedSeconds: number;
  isRunning: boolean;
  startedAt?: string; // ISO string when timer was started
  stoppageSeconds?: number; // Optional added injury/stoppage time in seconds
}

export interface LiveMatchState {
  isRunning: boolean;
  currentPeriod: number;
  startedAt?: string; // ISO string when current running segment began
  elapsedSeconds: number; // Accumulated elapsed seconds in current period prior to startedAt
  periodTimers?: Record<number, LiveMatchPeriodTimer>;
  subLog?: LiveMatchSubLogEntry[];
  periodDurationMinutes?: number;
  subIntervalMinutes?: number;
  updatedAt?: string;
}

export interface Fixture {
  id: string;
  teamId: string;
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
  subTimingMode?: SubstitutionTimingMode; // Optional override for fixture
  preserveLineupAcrossBreaks?: boolean; // Optional override for fixture
  midPeriodSubIntervalMinutes?: number; // Optional override for fixture
  matchSquad?: MatchSquad;
  postMatchRecording?: PostMatchRecording;
  homeScore?: number;
  awayScore?: number;
  scorers?: GoalScorer[];
  isLive?: boolean;
  liveMatchState?: LiveMatchState;
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
export type SubsPerWindowOption = 'auto' | 'all_bench' | number;

export interface SuggestedSubsOptions {
  subsPerWindow?: SubsPerWindowOption;
  ensureEveryoneSubbedOnce?: boolean;
}

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
export type SubscriptionTier = 'free_trial' | 'coach_monthly' | 'coach_annual' | 'club_unlimited' | 'free_for_life';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'lifetime';

export interface UserSubscription {
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  trialStartedAt: string; // ISO 8601
  trialEndsAt: string;    // ISO 8601 (Signup + 30 days)
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string; // ISO 8601
  cancelAtPeriodEnd?: boolean;
  lastWebhookCreated?: number; // Unix timestamp (seconds) of the latest applied Stripe webhook event
}

export interface StripeEventRecord {
  eventId: string;     // e.g. "evt_1O..."
  type: string;        // e.g. "invoice.payment_succeeded"
  processedAt: string; // ISO 8601
  expireAt: string;    // ISO 8601 (processedAt + 30 days)
}

export interface PaymentRecord {
  id: string;                    // Stripe Invoice ID (in_...) or Charge ID (ch_...)
  userId: string;                // Firebase Auth UID
  customerEmail: string;
  amountPaid: number;            // In pence/cents (e.g. 150 for £1.50, 1500 for £15.00)
  currency: string;              // e.g. "gbp"
  status: 'paid' | 'failed' | 'refunded';
  description: string;           // e.g. "SubShuffle Coach Monthly", "SubShuffle Coach Annual"
  paidAt: string;                // ISO 8601
  hostedInvoiceUrl?: string;     // Link to view/print Stripe invoice
  invoicePdfUrl?: string;        // Direct PDF receipt download link
  paymentMethod: {
    brand?: string;              // "visa", "mastercard", "amex"
    last4?: string;              // "4242"
  };
  expireAt: string;              // ISO 8601 (paidAt + 24 months)
}

// Role-Based Access Control (RBAC) & Custom Claims Models
export type UserRole = 'owner' | 'coach' | 'viewer';

export interface UserOnboardingState {
  hasCompletedWizard: boolean;
  wizardDismissedAt?: string;
  completedSteps: ('team_created' | 'players_added' | 'fixture_created' | 'rotation_generated')[];
  hasSeenTour: boolean;
}

export const DEFAULT_ONBOARDING_STATE: UserOnboardingState = {
  hasCompletedWizard: false,
  completedSteps: [],
  hasSeenTour: false,
};

export interface AdminUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  subscription?: UserSubscription;
  onboarding?: UserOnboardingState;
  disabled?: boolean;
  creationTime?: string;
  lastSignInTime?: string;
}

export interface ClubSettings {
  clubName: string;
  clubShortCode: string;
  badgeInitials?: string;
  badgeUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  defaultPitchPlayerCount: number;
  minGameTimePercent: number;
  contactEmail?: string;
  welfareOfficer?: string;
  publicGuestView: boolean;
  updatedAt?: string;
}

export interface BackupData {
  exportedAt: string;
  version: string;
  clubSettings?: ClubSettings;
  teams: Team[];
  players: Player[];
  fixtures: Fixture[];
  users?: AdminUser[];
}

// ================= Team Dashboard & Season Analytics Models =================

export interface ScorerLeaderboardItem {
  playerId: string;
  playerName: string;
  squadNumber?: number;
  goals: number;
  matchesPlayed: number;
  goalsPerMatch: number;
  hatTricks: number;
  matchGoals: {
    fixtureId: string;
    date: string;
    opponent: string;
    goals: number;
  }[];
}

export interface PotmLeaderboardItem {
  playerId: string;
  playerName: string;
  squadNumber?: number;
  awardsCount: number;
  matchesPlayed?: number;
  latestAward?: {
    fixtureId: string;
    date: string;
    opponent: string;
  };
}

export interface DefensiveWallItem {
  playerId: string;
  playerName: string;
  squadNumber?: number;
  cleanSheets: number;
  defensiveMinutes: number;
  gkMinutes: number;
  outfieldDefMinutes: number;
  matchesPlayed: number;
  cleanSheetRate: number; // percentage (cleanSheets / matchesPlayed)
}

export interface PlayerVersatilityItem {
  playerId: string;
  playerName: string;
  squadNumber?: number;
  totalMinutes: number;
  minutesByPosition: Record<BroadPosition, number>;
  periodsByPosition: Record<BroadPosition, number>;
  categoriesCount: number; // 1 to 4
  versatilityLevel: 'Specialist' | 'Developing' | 'Versatile' | 'Total Footballer';
}

export interface TeamMilestoneBadge {
  id: string;
  title: string;
  description: string;
  category: 'appearance' | 'defensive' | 'attacking' | 'attendance' | 'versatility';
  icon: string; // e.g. 'medal', 'shield', 'goal', 'hands', 'streak', 'star'
  achievedAt?: string;
  playerName?: string;
  playerId?: string;
  count?: number;
}

export interface TeamDashboardSummary {
  teamId: string;
  season: string;
  generatedAt: string;
  overview: {
    matchesPlayed: number;
    record: {
      wins: number;
      draws: number;
      losses: number;
    };
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    cleanSheets: number;
    squadEquityScore: number; // percentage of players hitting 50%+ target
    squadAttendanceRate: number; // percentage across squad
    totalSquadMembers: number;
    totalAvailableMinutes: number;
  };
  scorersLeaderboard: ScorerLeaderboardItem[];
  potmLeaderboard: PotmLeaderboardItem[];
  defensiveWall: DefensiveWallItem[];
  versatilityHeatmap: {
    teamMinutesByPosition: Record<BroadPosition, number>;
    players: PlayerVersatilityItem[];
    designatedGkCoveragePercent: number;
  };
  milestones: TeamMilestoneBadge[];
}

// ================= In-App Support & Jira Service Management Models =================

export type SupportTicketCategory = 'bug' | 'feature' | 'question';

export interface SupportTelemetry {
  userEmail: string;
  userId: string;
  activeTeamId?: string;
  activeFixtureId?: string;
  currentPath: string;
  viewport: string;
  userAgent: string;
  appVersion: string;
  onlineStatus: boolean;
  timestamp: string;
}

export interface SupportTicketRequest {
  category: SupportTicketCategory;
  summary: string;
  description: string;
  telemetry?: Partial<SupportTelemetry>;
}

export interface SupportTicketResponse {
  success: boolean;
  ticketKey: string;
  issueTypeId: string;
  simulated?: boolean;
}
