import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Player,
  TeamSettings,
  Fixture,
  MatchSquad,
  Team,
  TeamMember,
  PostMatchRecording,
  ClubSettings,
  AdminUser,
  BackupData,
  GoalScorer,
  LiveMatchState,
} from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default club settings for the organization
export const DEFAULT_CLUB_SETTINGS: ClubSettings = {
  clubName: 'The Rovers Football Club',
  clubShortCode: 'RFC',
  badgeInitials: 'RFC',
  badgeUrl: '',
  primaryColor: '#0284c7', // Sky Blue
  secondaryColor: '#f59e0b', // Amber
  defaultPitchPlayerCount: 7,
  minGameTimePercent: 50,
  contactEmail: 'admin@therovers.local',
  welfareOfficer: 'Club Child Welfare Officer',
  publicGuestView: true,
  updatedAt: new Date().toISOString(),
};

// Data directory for local persistence fallback
const DATA_DIR = path.resolve(__dirname, '../../data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

// Default team settings for 7-a-side youth football defaulting to 2 periods (Halves)
export const DEFAULT_SETTINGS: TeamSettings = {
  pitchPlayerCount: 7,
  matchdaySquadCap: 10,
  subCount: 3,
  matchPeriodCount: 2, // Default: 2 periods (Halves)
  periodDurationMinutes: 25, // Default: 25 min (50 min match)
  targetGameTimePercent: 50, // Default: 50%
  defaultFormation: '2-3-1',
  customFormations: [],
  currentSeason: '2026/2027',
  seasons: ['2025/2026', '2026/2027'],
  defaultSubIntervalMinutes: 10,
};

// Seed initial teams
export const SEED_TEAMS: Team[] = [
  {
    id: 'team-1',
    name: 'The Rovers FC (U10s)',
    ageGroup: 'U10',
    ownerId: 'dev-user-123',
    ownerEmail: 'coach@therovers.local',
    sharedWith: [],
    settings: {
      pitchPlayerCount: 7,
      matchdaySquadCap: 10,
      subCount: 3,
      matchPeriodCount: 2, // 2 Halves
      periodDurationMinutes: 25,
      targetGameTimePercent: 50,
      defaultFormation: '2-3-1',
      customFormations: [],
      currentSeason: '2026/2027',
      seasons: ['2025/2026', '2026/2027'],
      defaultSubIntervalMinutes: 10,
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'team-2',
    name: 'The Rovers FC (U12s)',
    ageGroup: 'U12',
    ownerId: 'dev-user-123',
    ownerEmail: 'coach@therovers.local',
    sharedWith: [],
    settings: {
      pitchPlayerCount: 9,
      matchdaySquadCap: 12,
      subCount: 3,
      matchPeriodCount: 2, // 2 Halves
      periodDurationMinutes: 30,
      targetGameTimePercent: 50,
      defaultFormation: '3-3-2',
      customFormations: [],
      currentSeason: '2026/2027',
      seasons: ['2025/2026', '2026/2027'],
      defaultSubIntervalMinutes: 10,
    },
    createdAt: new Date().toISOString(),
  },
];

// Seed 13 youth players for Team 1
export const SEED_PLAYERS: Player[] = [
  {
    id: 'p1',
    teamId: 'team-1',
    name: 'Leo Davies',
    squadNumber: 1,
    preferredPositions: ['Goalkeeper', 'Defence'],
    specificPositions: ['Goalkeeper', 'Centre Back'],
    unavailableDates: [],
    matchesPlayed: 8,
    totalMinutesPlayed: 320,
  },
  {
    id: 'p2',
    teamId: 'team-1',
    name: 'Archie Smith',
    squadNumber: 2,
    preferredPositions: ['Defence'],
    specificPositions: ['Right Back', 'Centre Back'],
    unavailableDates: [],
    matchesPlayed: 8,
    totalMinutesPlayed: 300,
  },
  {
    id: 'p3',
    teamId: 'team-1',
    name: 'Noah Taylor',
    squadNumber: 3,
    preferredPositions: ['Defence', 'Midfield'],
    specificPositions: ['Left Back', 'Left Midfield'],
    unavailableDates: [],
    matchesPlayed: 7,
    totalMinutesPlayed: 265,
  },
  {
    id: 'p4',
    teamId: 'team-1',
    name: 'Oliver Wilson',
    squadNumber: 4,
    preferredPositions: ['Defence'],
    specificPositions: ['Centre Back'],
    unavailableDates: [],
    matchesPlayed: 8,
    totalMinutesPlayed: 310,
  },
  {
    id: 'p5',
    teamId: 'team-1',
    name: 'Harry Brown',
    squadNumber: 5,
    preferredPositions: ['Midfield'],
    specificPositions: ['Centre Midfield'],
    unavailableDates: [],
    matchesPlayed: 8,
    totalMinutesPlayed: 325,
  },
  {
    id: 'p6',
    teamId: 'team-1',
    name: 'Jack Evans',
    squadNumber: 6,
    preferredPositions: ['Midfield', 'Goalkeeper'],
    specificPositions: ['Right Midfield', 'Goalkeeper'],
    unavailableDates: [],
    matchesPlayed: 8,
    totalMinutesPlayed: 290,
  },
  {
    id: 'p7',
    teamId: 'team-1',
    name: 'Charlie Thomas',
    squadNumber: 7,
    preferredPositions: ['Midfield', 'Attack'],
    specificPositions: ['Left Midfield', 'Striker'],
    unavailableDates: [],
    matchesPlayed: 7,
    totalMinutesPlayed: 275,
  },
  {
    id: 'p8',
    teamId: 'team-1',
    name: 'Alfie Roberts',
    squadNumber: 8,
    preferredPositions: ['Midfield'],
    specificPositions: ['Centre Midfield', 'Right Midfield'],
    unavailableDates: [],
    matchesPlayed: 8,
    totalMinutesPlayed: 310,
  },
  {
    id: 'p9',
    teamId: 'team-1',
    name: 'George Walker',
    squadNumber: 9,
    preferredPositions: ['Attack'],
    specificPositions: ['Striker'],
    unavailableDates: [],
    matchesPlayed: 8,
    totalMinutesPlayed: 320,
  },
  {
    id: 'p10',
    teamId: 'team-1',
    name: 'Freddie Johnson',
    squadNumber: 10,
    preferredPositions: ['Attack', 'Midfield'],
    specificPositions: ['Striker', 'Attacking Midfield'],
    unavailableDates: [],
    matchesPlayed: 8,
    totalMinutesPlayed: 300,
  },
  {
    id: 'p11',
    teamId: 'team-1',
    name: 'Oscar Wright',
    squadNumber: 11,
    preferredPositions: ['Attack', 'Midfield'],
    specificPositions: ['Left Wing', 'Striker'],
    unavailableDates: [],
    matchesPlayed: 7,
    totalMinutesPlayed: 260,
  },
  {
    id: 'p12',
    teamId: 'team-1',
    name: 'Theo Green',
    squadNumber: 12,
    preferredPositions: ['Defence'],
    specificPositions: ['Centre Back', 'Right Back'],
    unavailableDates: ['2026-10-18'],
    matchesPlayed: 6,
    totalMinutesPlayed: 220,
  },
  {
    id: 'p13',
    teamId: 'team-1',
    name: 'Lucas Hall',
    squadNumber: 13,
    preferredPositions: ['Midfield'],
    specificPositions: ['Centre Midfield'],
    unavailableDates: [],
    matchesPlayed: 6,
    totalMinutesPlayed: 230,
  },

  // Sample players for U12s Team 2 (9-a-side)
  {
    id: 'p201',
    teamId: 'team-2',
    name: 'Ethan Miller',
    squadNumber: 1,
    preferredPositions: ['Goalkeeper'],
    specificPositions: ['Goalkeeper'],
    unavailableDates: [],
    matchesPlayed: 9,
    totalMinutesPlayed: 540,
  },
  {
    id: 'p202',
    teamId: 'team-2',
    name: 'Mason Clarke',
    squadNumber: 2,
    preferredPositions: ['Defence'],
    specificPositions: ['Centre Back'],
    unavailableDates: [],
    matchesPlayed: 9,
    totalMinutesPlayed: 510,
  },
  {
    id: 'p203',
    teamId: 'team-2',
    name: 'Logan Hughes',
    squadNumber: 3,
    preferredPositions: ['Defence'],
    specificPositions: ['Left Back'],
    unavailableDates: [],
    matchesPlayed: 8,
    totalMinutesPlayed: 450,
  },
  {
    id: 'p204',
    teamId: 'team-2',
    name: 'James Foster',
    squadNumber: 4,
    preferredPositions: ['Defence'],
    specificPositions: ['Right Back'],
    unavailableDates: [],
    matchesPlayed: 9,
    totalMinutesPlayed: 500,
  },
  {
    id: 'p205',
    teamId: 'team-2',
    name: 'Daniel Brooks',
    squadNumber: 5,
    preferredPositions: ['Midfield'],
    specificPositions: ['Centre Midfield'],
    unavailableDates: [],
    matchesPlayed: 9,
    totalMinutesPlayed: 520,
  },
  {
    id: 'p206',
    teamId: 'team-2',
    name: 'Henry Cooper',
    squadNumber: 6,
    preferredPositions: ['Midfield'],
    specificPositions: ['Left Midfield'],
    unavailableDates: [],
    matchesPlayed: 8,
    totalMinutesPlayed: 440,
  },
  {
    id: 'p207',
    teamId: 'team-2',
    name: 'Samuel Bennett',
    squadNumber: 7,
    preferredPositions: ['Midfield'],
    specificPositions: ['Right Midfield'],
    unavailableDates: [],
    matchesPlayed: 9,
    totalMinutesPlayed: 530,
  },
  {
    id: 'p208',
    teamId: 'team-2',
    name: 'Benjamin Ross',
    squadNumber: 9,
    preferredPositions: ['Attack'],
    specificPositions: ['Striker'],
    unavailableDates: [],
    matchesPlayed: 9,
    totalMinutesPlayed: 540,
  },
  {
    id: 'p209',
    teamId: 'team-2',
    name: 'Alexander Ward',
    squadNumber: 10,
    preferredPositions: ['Attack', 'Midfield'],
    specificPositions: ['Striker'],
    unavailableDates: [],
    matchesPlayed: 8,
    totalMinutesPlayed: 460,
  },
  {
    id: 'p210',
    teamId: 'team-2',
    name: 'Harrison Price',
    squadNumber: 11,
    preferredPositions: ['Attack'],
    specificPositions: ['Left Forward'],
    unavailableDates: [],
    matchesPlayed: 7,
    totalMinutesPlayed: 400,
  },
  {
    id: 'p211',
    teamId: 'team-2',
    name: 'Toby Sanders',
    squadNumber: 12,
    preferredPositions: ['Midfield'],
    specificPositions: ['Centre Midfield'],
    unavailableDates: [],
    matchesPlayed: 8,
    totalMinutesPlayed: 420,
  },
  {
    id: 'p212',
    teamId: 'team-2',
    name: 'Max Campbell',
    squadNumber: 14,
    preferredPositions: ['Defence'],
    specificPositions: ['Right Back'],
    unavailableDates: [],
    matchesPlayed: 7,
    totalMinutesPlayed: 390,
  },
];

// Seed initial fixtures with 2 periods (Halves)
export const SEED_FIXTURES: Fixture[] = [
  {
    id: 'fix-1',
    teamId: 'team-1',
    season: '2026/2027',
    date: '2026-10-11',
    kickOffTime: '10:00',
    meetTime: '09:30',
    groundAddress: 'Riverside Recreation Ground, Thames Valley RG1 4PS',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Riverside+Recreation+Ground+RG1+4PS',
    captainId: 'p2',
    opponent: 'Oakridge Youth Tigers',
    venue: 'Home',
    status: 'Upcoming',
    matchSquad: {
      fixtureId: 'fix-1',
      selectedPlayerIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'],
      restedPlayerIds: ['p11', 'p12', 'p13'],
      manualOverrides: false,
      lineupsByPeriod: [
        {
          period: 1, // First Half
          onPitch: [
            { playerId: 'p1', position: 'GK' },
            { playerId: 'p2', position: 'DEF_L' },
            { playerId: 'p4', position: 'DEF_R' },
            { playerId: 'p3', position: 'MID_L' },
            { playerId: 'p5', position: 'MID_C' },
            { playerId: 'p6', position: 'MID_R' },
            { playerId: 'p9', position: 'ATT' },
          ],
          subs: ['p7', 'p8', 'p10'],
        },
        {
          period: 2, // Second Half
          onPitch: [
            { playerId: 'p6', position: 'GK' },
            { playerId: 'p2', position: 'DEF_L' },
            { playerId: 'p3', position: 'DEF_R' },
            { playerId: 'p7', position: 'MID_L' },
            { playerId: 'p8', position: 'MID_C' },
            { playerId: 'p10', position: 'MID_R' },
            { playerId: 'p9', position: 'ATT' },
          ],
          subs: ['p1', 'p4', 'p5'],
        },
      ],
    },
  },
  {
    id: 'fix-2',
    teamId: 'team-1',
    season: '2026/2027',
    date: '2026-10-04',
    kickOffTime: '11:30',
    meetTime: '11:00',
    groundAddress: 'Meadowbrook Sports Complex, Green Lane, RG4 8AE',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Meadowbrook+Sports+Complex+RG4+8AE',
    captainId: 'p3',
    playerOfTheMatchId: 'p6',
    opponent: 'Meadowbrook Athletic',
    venue: 'Away',
    status: 'Completed',
  },
  {
    id: 'fix-3',
    teamId: 'team-1',
    season: '2026/2027',
    date: '2026-10-18',
    kickOffTime: '09:30',
    meetTime: '09:00',
    groundAddress: 'Riverside Colts Arena, Mill Lane, RG7 3BB',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Riverside+Colts+Arena+RG7+3BB',
    captainId: 'p5',
    opponent: 'Riverside Colts',
    venue: 'Away',
    status: 'Draft',
  },
  {
    id: 'fix-201',
    teamId: 'team-2',
    season: '2026/2027',
    date: '2026-10-11',
    kickOffTime: '12:00',
    meetTime: '11:15',
    groundAddress: 'Westbrook Community Park, GL1 2CD',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Westbrook+Community+Park+GL1+2CD',
    opponent: 'Westbrook United U12',
    venue: 'Away',
    status: 'Upcoming',
  },
];

interface DataStore {
  teams: Team[];
  players: Player[];
  settings: TeamSettings;
  fixtures: Fixture[];
  clubSettings?: ClubSettings;
  adminUsers?: AdminUser[];
}

/**
 * Recursively strips keys with `undefined` values from an object or array.
 * This provides an additional layer of defence for Firestore document writes.
 */
export function cleanUndefined<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => cleanUndefined(item)) as unknown as T;
  }
  if (typeof value === 'object' && value.constructor === Object) {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) {
        result[k] = cleanUndefined(v);
      }
    }
    return result as T;
  }
  return value;
}

export class StorageManager {
  private memoryStore: DataStore;
  private isFirestoreAvailable: boolean = false;
  private firestoreInstance: any = null;
  private initPromise: Promise<void>;

  constructor(customFirestore?: any) {
    this.memoryStore = {
      teams: [...SEED_TEAMS],
      players: [...SEED_PLAYERS],
      settings: { ...DEFAULT_SETTINGS },
      fixtures: [...SEED_FIXTURES],
      clubSettings: { ...DEFAULT_CLUB_SETTINGS },
      adminUsers: [],
    };
    if (customFirestore !== undefined) {
      this.firestoreInstance = customFirestore;
      this.isFirestoreAvailable = customFirestore !== null;
      this.initPromise = Promise.resolve();
    } else {
      this.initPromise = this.initStorage();
    }
  }

  async ensureInitialized(): Promise<void> {
    await this.initPromise;
  }

  private async initStorage() {
    const useFirestore = process.env.USE_FIRESTORE === 'true' || Boolean(process.env.K_SERVICE);

    if (useFirestore) {
      try {
        const { Firestore } = await import('@google-cloud/firestore');
        const projectId = process.env.GCP_PROJECT_ID || process.env.FIRESTORE_PROJECT_ID || 'team-organiser-prod';
        this.firestoreInstance = new Firestore({
          projectId,
          ignoreUndefinedProperties: true,
        });
        this.isFirestoreAvailable = true;
        console.log(' Connected to Cloud Firestore database on project:', projectId);
        return;
      } catch (err) {
        console.warn('⚠️ Cloud Firestore not reachable, falling back to local file storage:', err);
      }
    }

    this.loadFromFile();
  }

  private loadFromFile() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.teams && parsed.players && parsed.fixtures) {
          this.memoryStore = {
            teams: parsed.teams,
            players: parsed.players,
            settings: parsed.settings || DEFAULT_SETTINGS,
            fixtures: parsed.fixtures,
            clubSettings: parsed.clubSettings || DEFAULT_CLUB_SETTINGS,
            adminUsers: parsed.adminUsers || [],
          };
          console.log(` Loaded ${this.memoryStore.teams.length} teams, ${this.memoryStore.players.length} players, and ${this.memoryStore.fixtures.length} fixtures from file.`);
          return;
        }
      }
      this.saveToFile();
    } catch (err) {
      console.warn('⚠️ Could not load from store file, using in-memory state:', err);
    }
  }

  private saveToFile() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_FILE, JSON.stringify(this.memoryStore, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save to local file:', err);
    }
  }

  // ================= Teams CRUD with User Isolation & Sharing =================
  async getTeams(userId?: string, userEmail?: string): Promise<Team[]> {
    await this.ensureInitialized();
    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        const snap = await this.firestoreInstance.collection('teams').get();
        if (!snap.empty) {
          const allTeams: Team[] = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
          const filtered = this.filterTeamsForUser(allTeams, userId, userEmail);
          if (filtered.length > 0) return filtered;
          // If no user teams found and unauthenticated, fall back to demo seed teams
          if (!userId) {
            return this.memoryStore.teams;
          }
          return [];
        }
      } catch (err) {
        console.warn('Firestore read error, falling back to memory:', err);
      }
    }
    const filtered = this.filterTeamsForUser(this.memoryStore.teams, userId, userEmail);
    if (filtered.length === 0 && !userId) {
      return this.memoryStore.teams;
    }
    return filtered;
  }

  hasTeamAccess(team: Team, userId?: string, userEmail?: string): boolean {
    if (!userId) return true; // unauthenticated fallback for demo mode
    if (team.ownerId && team.ownerId === userId) return true;
    if (userEmail && team.ownerEmail && team.ownerEmail.trim().toLowerCase() === userEmail.trim().toLowerCase()) return true;
    if (team.sharedWith && Array.isArray(team.sharedWith)) {
      if (userId && team.sharedWith.includes(userId)) return true;
      if (userEmail && team.sharedWith.some((e) => typeof e === 'string' && e.trim().toLowerCase() === userEmail.trim().toLowerCase())) {
        return true;
      }
    }
    if (team.sharedMembers && Array.isArray(team.sharedMembers)) {
      if (userId && team.sharedMembers.some((m) => m.userId === userId)) return true;
      if (userEmail && team.sharedMembers.some((m) => m.email && m.email.trim().toLowerCase() === userEmail.trim().toLowerCase())) {
        return true;
      }
    }
    if (userEmail && team.pendingInvites && Array.isArray(team.pendingInvites)) {
      if (team.pendingInvites.some((e) => typeof e === 'string' && e.trim().toLowerCase() === userEmail.trim().toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  private filterTeamsForUser(allTeams: Team[], userId?: string, userEmail?: string): Team[] {
    // If no userId provided, return all teams (demo/dev mode)
    if (!userId) return allTeams;

    // Filter teams owned by user OR shared with user's email/id
    return allTeams.filter((t) => this.hasTeamAccess(t, userId, userEmail));
  }

  async getTeamById(id: string): Promise<Team | null> {
    await this.ensureInitialized();
    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        const doc = await this.firestoreInstance.collection('teams').doc(id).get();
        if (doc.exists) {
          return { id: doc.id, ...doc.data() } as Team;
        }
      } catch (err) {
        console.warn('Firestore getTeamById error, using fallback:', err);
      }
    }
    return this.memoryStore.teams.find((t) => t.id === id) || null;
  }

  async saveTeam(team: Team): Promise<Team> {
    await this.ensureInitialized();
    const existingIndex = this.memoryStore.teams.findIndex((t) => t.id === team.id);
    if (existingIndex >= 0) {
      this.memoryStore.teams[existingIndex] = team;
    } else {
      this.memoryStore.teams.push(team);
    }
    this.saveToFile();

    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        await this.firestoreInstance.collection('teams').doc(team.id).set(cleanUndefined(team));
      } catch (err) {
        console.error('Firestore save error:', err);
      }
    }
    return team;
  }

  async deleteTeam(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const prevLen = this.memoryStore.teams.length;
    this.memoryStore.teams = this.memoryStore.teams.filter((t) => t.id !== id);
    // Also remove associated players and fixtures
    this.memoryStore.players = this.memoryStore.players.filter((p) => p.teamId !== id);
    this.memoryStore.fixtures = this.memoryStore.fixtures.filter((f) => f.teamId !== id);
    this.saveToFile();

    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        await this.firestoreInstance.collection('teams').doc(id).delete();
      } catch (err) {
        console.error('Firestore delete error:', err);
      }
    }
    return this.memoryStore.teams.length < prevLen;
  }

  async shareTeam(
    teamId: string,
    target: { email: string; userId?: string; role?: 'coach' | 'viewer' } | string
  ): Promise<Team | null> {
    await this.ensureInitialized();
    const team = await this.getTeamById(teamId);
    if (!team) return null;

    let email = '';
    let userId: string | undefined = undefined;
    let role: 'coach' | 'viewer' = 'coach';

    if (typeof target === 'string') {
      const trimmed = target.trim();
      if (trimmed.includes('@')) {
        email = trimmed.toLowerCase();
      } else {
        userId = trimmed;
      }
    } else {
      email = (target.email || '').trim().toLowerCase();
      userId = target.userId ? target.userId.trim() : undefined;
      role = target.role || 'coach';
    }

    if (!team.sharedWith || !Array.isArray(team.sharedWith)) {
      team.sharedWith = [];
    }
    if (!team.sharedMembers || !Array.isArray(team.sharedMembers)) {
      team.sharedMembers = [];
    }
    if (!team.pendingInvites || !Array.isArray(team.pendingInvites)) {
      team.pendingInvites = [];
    }

    if (userId) {
      // Primary: add permanent userId to sharedWith
      if (!team.sharedWith.includes(userId)) {
        team.sharedWith.push(userId);
      }
      // If email was previously in pendingInvites, remove it
      if (email) {
        team.pendingInvites = team.pendingInvites.filter((e) => e.toLowerCase() !== email);
      }
      // Upsert sharedMembers record
      const memberIdx = team.sharedMembers.findIndex(
        (m) => m.userId === userId || (email && m.email?.toLowerCase() === email)
      );
      if (memberIdx >= 0) {
        team.sharedMembers[memberIdx] = {
          userId,
          email: email || team.sharedMembers[memberIdx].email,
          role,
          addedAt: team.sharedMembers[memberIdx].addedAt || new Date().toISOString(),
        };
      } else {
        team.sharedMembers.push({
          userId,
          email: email || '',
          role,
          addedAt: new Date().toISOString(),
        });
      }
    } else if (email) {
      // Pending: user not registered yet, record in pendingInvites and sharedWith as fallback
      if (!team.pendingInvites.includes(email)) {
        team.pendingInvites.push(email);
      }
      if (!team.sharedWith.includes(email)) {
        team.sharedWith.push(email);
      }
      const memberIdx = team.sharedMembers.findIndex((m) => m.email?.toLowerCase() === email);
      if (memberIdx >= 0) {
        team.sharedMembers[memberIdx].role = role;
      } else {
        team.sharedMembers.push({
          userId: '',
          email,
          role,
          addedAt: new Date().toISOString(),
        });
      }
    }

    team.updatedAt = new Date().toISOString();
    await this.saveTeam(team);
    return team;
  }

  async unshareTeam(teamId: string, memberIdOrEmail: string): Promise<Team | null> {
    await this.ensureInitialized();
    const team = await this.getTeamById(teamId);
    if (!team) return null;

    const target = memberIdOrEmail.trim().toLowerCase();

    if (team.sharedWith && Array.isArray(team.sharedWith)) {
      team.sharedWith = team.sharedWith.filter(
        (id) => id !== memberIdOrEmail && id.toLowerCase() !== target
      );
    }
    if (team.sharedMembers && Array.isArray(team.sharedMembers)) {
      team.sharedMembers = team.sharedMembers.filter(
        (m) => m.userId !== memberIdOrEmail && m.email?.toLowerCase() !== target
      );
    }
    if (team.pendingInvites && Array.isArray(team.pendingInvites)) {
      team.pendingInvites = team.pendingInvites.filter((e) => e.toLowerCase() !== target);
    }

    team.updatedAt = new Date().toISOString();
    await this.saveTeam(team);
    return team;
  }

  async claimPendingInvites(userId: string, email: string): Promise<number> {
    if (!userId || !email) return 0;
    await this.ensureInitialized();
    const normEmail = email.trim().toLowerCase();
    let updatedCount = 0;

    const allTeams = await this.getTeams();
    for (const team of allTeams) {
      let needsSave = false;
      const hasPending = team.pendingInvites && team.pendingInvites.some((e) => e.toLowerCase() === normEmail);
      const hasEmailInShared = team.sharedWith && team.sharedWith.some((e) => e.toLowerCase() === normEmail);

      if (hasPending || hasEmailInShared) {
        if (!team.sharedWith) team.sharedWith = [];
        if (!team.sharedWith.includes(userId)) {
          team.sharedWith.push(userId);
          needsSave = true;
        }

        if (team.pendingInvites && team.pendingInvites.some((e) => e.toLowerCase() === normEmail)) {
          team.pendingInvites = team.pendingInvites.filter((e) => e.toLowerCase() !== normEmail);
          needsSave = true;
        }

        if (!team.sharedMembers) team.sharedMembers = [];
        const memberIdx = team.sharedMembers.findIndex((m) => m.email?.toLowerCase() === normEmail);
        if (memberIdx >= 0) {
          team.sharedMembers[memberIdx].userId = userId;
          needsSave = true;
        } else {
          team.sharedMembers.push({
            userId,
            email: normEmail,
            role: 'coach',
            addedAt: new Date().toISOString(),
          });
          needsSave = true;
        }

        if (needsSave) {
          team.updatedAt = new Date().toISOString();
          await this.saveTeam(team);
          updatedCount++;
        }
      }
    }

    return updatedCount;
  }

  async addSeason(teamId: string, seasonName: string): Promise<Team | null> {
    await this.ensureInitialized();
    const team = await this.getTeamById(teamId);
    if (!team) return null;

    const season = seasonName.trim();
    if (!season) return team;

    const currentSeasons = team.settings.seasons || ['2025/2026', '2026/2027'];
    if (!currentSeasons.includes(season)) {
      team.settings.seasons = [...currentSeasons, season];
    }
    team.settings.currentSeason = season;
    await this.saveTeam(team);
    return team;
  }

  // ================= Players CRUD (Scoped by teamId) =================
  async getPlayers(teamId?: string): Promise<Player[]> {
    await this.ensureInitialized();
    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        let query = this.firestoreInstance.collection('players');
        if (teamId) {
          query = query.where('teamId', '==', teamId);
        }
        const snap = await query.get();
        if (!snap.empty) {
          return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        }
        // If teamId is a seed/demo team and not in Firestore, fall back to memoryStore
        if (teamId === 'team-1' || teamId === 'team-2') {
          return this.memoryStore.players.filter((p) => p.teamId === teamId);
        }
        // If teamId was queried and returned empty, check if players collection is seeded
        if (teamId) {
          const hasAny = await this.firestoreInstance.collection('players').limit(1).get();
          if (!hasAny.empty) {
            return [];
          }
        }
      } catch (err) {
        console.warn('Firestore read error, falling back to memory:', err);
      }
    }

    if (teamId) {
      return this.memoryStore.players.filter((p) => p.teamId === teamId);
    }
    return this.memoryStore.players;
  }

  async getPlayerById(id: string): Promise<Player | null> {
    await this.ensureInitialized();
    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        const doc = await this.firestoreInstance.collection('players').doc(id).get();
        if (doc.exists) {
          return { id: doc.id, ...doc.data() } as Player;
        }
      } catch (err) {
        console.warn('Firestore getPlayerById error, using fallback:', err);
      }
    }
    const all = await this.getPlayers();
    return all.find((p) => p.id === id) || null;
  }

  async savePlayer(player: Player): Promise<Player> {
    await this.ensureInitialized();
    const existingIndex = this.memoryStore.players.findIndex((p) => p.id === player.id);
    if (existingIndex >= 0) {
      this.memoryStore.players[existingIndex] = player;
    } else {
      this.memoryStore.players.push(player);
    }
    this.saveToFile();

    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        await this.firestoreInstance.collection('players').doc(player.id).set(cleanUndefined(player));
      } catch (err) {
        console.error('Firestore save error:', err);
      }
    }
    return player;
  }

  async bulkSavePlayers(players: Player[]): Promise<Player[]> {
    await this.ensureInitialized();
    for (const player of players) {
      const existingIndex = this.memoryStore.players.findIndex((p) => p.id === player.id);
      if (existingIndex >= 0) {
        this.memoryStore.players[existingIndex] = player;
      } else {
        this.memoryStore.players.push(player);
      }
    }
    this.saveToFile();

    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        const batch = this.firestoreInstance.batch();
        for (const player of players) {
          const docRef = this.firestoreInstance.collection('players').doc(player.id);
          batch.set(docRef, cleanUndefined(player));
        }
        await batch.commit();
      } catch (err) {
        console.error('Firestore batch save error:', err);
      }
    }
    return players;
  }

  async deletePlayer(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const prevLen = this.memoryStore.players.length;
    this.memoryStore.players = this.memoryStore.players.filter((p) => p.id !== id);
    this.saveToFile();

    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        await this.firestoreInstance.collection('players').doc(id).delete();
      } catch (err) {
        console.error('Firestore delete error:', err);
      }
    }
    return this.memoryStore.players.length < prevLen;
  }

  // ================= Team Settings =================
  async getSettings(teamId?: string): Promise<TeamSettings> {
    await this.ensureInitialized();
    if (teamId) {
      const team = await this.getTeamById(teamId);
      if (team && team.settings) {
        return team.settings;
      }
    }
    return this.memoryStore.settings;
  }

  async updateSettings(settings: TeamSettings, teamId?: string): Promise<TeamSettings> {
    await this.ensureInitialized();
    if (teamId) {
      const team = await this.getTeamById(teamId);
      if (team) {
        team.settings = settings;
        await this.saveTeam(team);
        return settings;
      }
    }

    this.memoryStore.settings = settings;
    this.saveToFile();
    return settings;
  }

  // ================= Fixtures CRUD (Scoped by teamId) =================
  async getFixtures(teamId?: string): Promise<Fixture[]> {
    await this.ensureInitialized();
    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        let query = this.firestoreInstance.collection('fixtures');
        if (teamId) {
          query = query.where('teamId', '==', teamId);
        }
        // Fetch matching documents and sort in-memory to prevent composite index errors
        const snap = await query.get();
        if (!snap.empty) {
          const fixtures: Fixture[] = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
          return fixtures.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        }
        // If teamId is a seed/demo team and not in Firestore, fall back to memoryStore
        if (teamId === 'team-1' || teamId === 'team-2') {
          return this.memoryStore.fixtures
            .filter((f) => f.teamId === teamId)
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        }
        if (teamId) {
          const hasAny = await this.firestoreInstance.collection('fixtures').limit(1).get();
          if (!hasAny.empty) {
            return [];
          }
        }
      } catch (err) {
        console.warn('Firestore fixtures error, using memory:', err);
      }
    }

    const fixtures = teamId
      ? this.memoryStore.fixtures.filter((f) => f.teamId === teamId)
      : this.memoryStore.fixtures;
    return [...fixtures].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  async getFixtureById(id: string): Promise<Fixture | null> {
    await this.ensureInitialized();
    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        const doc = await this.firestoreInstance.collection('fixtures').doc(id).get();
        if (doc.exists) {
          return { id: doc.id, ...doc.data() } as Fixture;
        }
      } catch (err) {
        console.warn('Firestore getFixtureById error, using fallback:', err);
      }
    }
    const fixtures = await this.getFixtures();
    return fixtures.find((f) => f.id === id) || null;
  }

  async saveFixture(fixture: Fixture): Promise<Fixture> {
    await this.ensureInitialized();
    fixture.version = (fixture.version || 0) + 1;
    fixture.updatedAt = new Date().toISOString();
    const existingIndex = this.memoryStore.fixtures.findIndex((f) => f.id === fixture.id);
    if (existingIndex >= 0) {
      this.memoryStore.fixtures[existingIndex] = fixture;
    } else {
      this.memoryStore.fixtures.unshift(fixture);
    }
    this.saveToFile();

    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        await this.firestoreInstance.collection('fixtures').doc(fixture.id).set(cleanUndefined(fixture));
      } catch (err) {
        console.error('Firestore save fixture error:', err);
      }
    }
    return fixture;
  }

  async updateMatchSquad(fixtureId: string, matchSquad: MatchSquad): Promise<Fixture | null> {
    await this.ensureInitialized();
    const fixture = await this.getFixtureById(fixtureId);
    if (!fixture) return null;

    fixture.matchSquad = matchSquad;
    await this.saveFixture(fixture);
    return fixture;
  }

  /**
   * Applies and synchronizes fixture minutes to involved players' totalMinutesPlayed
   * and matchesPlayed counters. Tracks delta against previously credited fixture minutes
   * to guarantee idempotent execution without double-counting on re-saves.
   */
  async applyFixtureMinutes(
    fixture: Fixture
  ): Promise<{ fixture: Fixture; updatedPlayers: Player[] }> {
    await this.ensureInitialized();
    const settings = await this.getSettings(fixture.teamId);
    const pCount = fixture.matchPeriodCount || settings.matchPeriodCount || 2;
    const duration = fixture.periodDurationMinutes || settings.periodDurationMinutes || 25;
    const totalMatchMinutes = pCount * duration;

    // 1. Calculate the target credited minutes per player for this fixture
    const newMinutes: Record<string, number> = {};

    if (fixture.postMatchRecording) {
      if (fixture.postMatchRecording.trackingMode === 'full_credit') {
        const participantIds =
          fixture.matchSquad?.selectedPlayerIds ||
          Object.keys(fixture.postMatchRecording.playerMinutes || {});
        participantIds.forEach((pId) => {
          newMinutes[pId] = totalMatchMinutes;
        });
      } else if (fixture.postMatchRecording.trackingMode === 'exact') {
        const pMins = fixture.postMatchRecording.playerMinutes || {};
        for (const [pId, mins] of Object.entries(pMins)) {
          newMinutes[pId] = Math.max(0, mins);
        }
      }
    } else if (fixture.matchSquad && (fixture.status === 'Completed' || fixture.status === 'Played')) {
      fixture.matchSquad.lineupsByPeriod.forEach((lineup) => {
        lineup.onPitch.forEach((entry) => {
          newMinutes[entry.playerId] = (newMinutes[entry.playerId] || 0) + duration;
        });
      });
    }

    // 2. Compute deltas against previously credited minutes on this fixture
    const prevCredited = fixture.creditedMinutes || {};
    const allPlayerIds = new Set([
      ...Object.keys(prevCredited),
      ...Object.keys(newMinutes),
    ]);

    const updatedPlayers: Player[] = [];

    for (const playerId of allPlayerIds) {
      const prevMins = prevCredited[playerId] || 0;
      const curMins = newMinutes[playerId] || 0;
      const deltaMins = curMins - prevMins;
      const deltaMatches = (curMins > 0 ? 1 : 0) - (prevMins > 0 ? 1 : 0);

      if (deltaMins !== 0 || deltaMatches !== 0) {
        const player = await this.getPlayerById(playerId);
        if (player && player.teamId === fixture.teamId) {
          player.totalMinutesPlayed = Math.max(0, (player.totalMinutesPlayed || 0) + deltaMins);
          player.matchesPlayed = Math.max(0, (player.matchesPlayed || 0) + deltaMatches);
          await this.savePlayer(player);
          updatedPlayers.push(player);
        }
      }
    }

    // 3. Persist creditedMinutes record on the fixture
    fixture.creditedMinutes = newMinutes;
    await this.saveFixture(fixture);

    return { fixture, updatedPlayers };
  }

  async updatePostMatchRecording(
    fixtureId: string,
    postMatchRecording: PostMatchRecording
  ): Promise<{ fixture: Fixture; updatedPlayers: Player[] } | null> {
    await this.ensureInitialized();
    const fixture = await this.getFixtureById(fixtureId);
    if (!fixture) return null;

    fixture.postMatchRecording = postMatchRecording;
    fixture.status = 'Completed';
    return await this.applyFixtureMinutes(fixture);
  }

  async updateFixtureScore(
    fixtureId: string,
    scoreData: {
      homeScore: number;
      awayScore: number;
      scorers?: GoalScorer[];
      status?: Fixture['status'];
      isLive?: boolean;
    }
  ): Promise<Fixture | null> {
    await this.ensureInitialized();
    const fixture = await this.getFixtureById(fixtureId);
    if (!fixture) return null;

    fixture.homeScore = Math.max(0, Math.floor(scoreData.homeScore));
    fixture.awayScore = Math.max(0, Math.floor(scoreData.awayScore));
    fixture.scorers = Array.isArray(scoreData.scorers) ? scoreData.scorers : [];
    if (scoreData.status) {
      fixture.status = scoreData.status;
    }
    if (scoreData.isLive !== undefined) {
      fixture.isLive = scoreData.isLive;
    }
    if (fixture.status === 'Completed' || fixture.status === 'Played') {
      const res = await this.applyFixtureMinutes(fixture);
      return res.fixture;
    }
    await this.saveFixture(fixture);
    return fixture;
  }

  async updateLiveMatchState(
    fixtureId: string,
    liveMatchState: LiveMatchState
  ): Promise<Fixture | null> {
    await this.ensureInitialized();
    const fixture = await this.getFixtureById(fixtureId);
    if (!fixture) return null;

    fixture.liveMatchState = {
      ...liveMatchState,
      updatedAt: new Date().toISOString(),
    };

    if (liveMatchState.isRunning) {
      fixture.isLive = true;
      if (fixture.status === 'Upcoming' || fixture.status === 'Draft') {
        fixture.status = 'In Progress';
      }
    }

    await this.saveFixture(fixture);
    return fixture;
  }

  async deleteFixture(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const fixture = await this.getFixtureById(id);
    if (fixture && fixture.creditedMinutes) {
      for (const [pId, creditedMins] of Object.entries(fixture.creditedMinutes)) {
        if (creditedMins > 0) {
          const player = await this.getPlayerById(pId);
          if (player) {
            player.totalMinutesPlayed = Math.max(0, (player.totalMinutesPlayed || 0) - creditedMins);
            player.matchesPlayed = Math.max(0, (player.matchesPlayed || 0) - 1);
            await this.savePlayer(player);
          }
        }
      }
    }
    const prevLen = this.memoryStore.fixtures.length;
    this.memoryStore.fixtures = this.memoryStore.fixtures.filter((f) => f.id !== id);
    this.saveToFile();

    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        await this.firestoreInstance.collection('fixtures').doc(id).delete();
      } catch (err) {
        console.error('Firestore delete error:', err);
      }
    }
    return this.memoryStore.fixtures.length < prevLen;
  }

  // ================= Club Settings & Brand Identity =================
  async getClubSettings(): Promise<ClubSettings> {
    await this.ensureInitialized();
    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        const doc = await this.firestoreInstance.collection('settings').doc('club').get();
        if (doc.exists) {
          return { ...DEFAULT_CLUB_SETTINGS, ...doc.data() };
        }
      } catch (err) {
        console.warn('Firestore read club settings error, using memory:', err);
      }
    }
    return this.memoryStore.clubSettings || DEFAULT_CLUB_SETTINGS;
  }

  async updateClubSettings(updates: Partial<ClubSettings>): Promise<ClubSettings> {
    await this.ensureInitialized();
    const current = await this.getClubSettings();
    const updated: ClubSettings = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.clubSettings = updated;
    this.saveToFile();

    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        await this.firestoreInstance.collection('settings').doc('club').set(cleanUndefined(updated));
      } catch (err) {
        console.error('Firestore save club settings error:', err);
      }
    }
    return updated;
  }

  // ================= Admin Users & Custom Claims Registry =================
  async getAdminUsers(): Promise<AdminUser[]> {
    await this.ensureInitialized();
    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        const snap = await this.firestoreInstance.collection('adminUsers').get();
        if (!snap.empty) {
          return snap.docs.map((doc: any) => ({ uid: doc.id, ...doc.data() }));
        }
      } catch (err) {
        console.warn('Firestore read admin users error, using memory:', err);
      }
    }
    return this.memoryStore.adminUsers || [];
  }

  async getAdminUserByUid(uid: string): Promise<AdminUser | null> {
    await this.ensureInitialized();
    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        const doc = await this.firestoreInstance.collection('adminUsers').doc(uid).get();
        if (doc.exists) {
          return { uid: doc.id, ...doc.data() } as AdminUser;
        }
      } catch (err) {
        console.warn('Firestore read admin user error, using memory:', err);
      }
    }
    const users = this.memoryStore.adminUsers || [];
    return users.find((u) => u.uid === uid) || null;
  }

  async upsertAdminUser(user: Partial<AdminUser> & { uid: string }): Promise<AdminUser> {
    await this.ensureInitialized();
    if (!this.memoryStore.adminUsers) {
      this.memoryStore.adminUsers = [];
    }
    const idx = this.memoryStore.adminUsers.findIndex((u) => u.uid === user.uid);
    let result: AdminUser;
    if (idx >= 0) {
      result = {
        ...this.memoryStore.adminUsers[idx],
        ...user,
      };
      this.memoryStore.adminUsers[idx] = result;
    } else {
      result = {
        email: 'user@therovers.local',
        displayName: 'Club Member',
        role: 'viewer',
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString(),
        ...user,
        uid: user.uid,
      };
      this.memoryStore.adminUsers.push(result);
    }
    this.saveToFile();

    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        await this.firestoreInstance.collection('adminUsers').doc(result.uid).set(cleanUndefined(result));
      } catch (err) {
        console.error('Firestore save admin user error:', err);
      }
    }
    return result;
  }

  async deleteAdminUser(uid: string): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.memoryStore.adminUsers) return false;
    const prevLen = this.memoryStore.adminUsers.length;
    this.memoryStore.adminUsers = this.memoryStore.adminUsers.filter((u) => u.uid !== uid);
    this.saveToFile();

    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        await this.firestoreInstance.collection('adminUsers').doc(uid).delete();
      } catch (err) {
        console.error('Firestore delete admin user error:', err);
      }
    }
    return this.memoryStore.adminUsers.length < prevLen;
  }

  // ================= System Backups & Disaster Recovery =================
  async exportBackup(): Promise<BackupData> {
    await this.ensureInitialized();
    return {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      clubSettings: await this.getClubSettings(),
      teams: await this.getTeams(),
      players: await this.getPlayers(),
      fixtures: await this.getFixtures(),
      users: await this.getAdminUsers(),
    };
  }

  async restoreBackup(backup: BackupData): Promise<{ teams: number; players: number; fixtures: number }> {
    await this.ensureInitialized();
    if (!backup || !Array.isArray(backup.teams) || !Array.isArray(backup.players) || !Array.isArray(backup.fixtures)) {
      throw new Error('Invalid backup file format. Expected teams, players, and fixtures arrays.');
    }

    this.memoryStore.teams = backup.teams;
    this.memoryStore.players = backup.players;
    this.memoryStore.fixtures = backup.fixtures;
    if (backup.clubSettings) {
      this.memoryStore.clubSettings = backup.clubSettings;
    }
    if (backup.users && Array.isArray(backup.users)) {
      this.memoryStore.adminUsers = backup.users;
    }

    this.saveToFile();

    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        for (const team of backup.teams) {
          await this.firestoreInstance.collection('teams').doc(team.id).set(cleanUndefined(team));
        }
        for (const player of backup.players) {
          await this.firestoreInstance.collection('players').doc(player.id).set(cleanUndefined(player));
        }
        for (const fixture of backup.fixtures) {
          await this.firestoreInstance.collection('fixtures').doc(fixture.id).set(cleanUndefined(fixture));
        }
        if (backup.clubSettings) {
          await this.firestoreInstance.collection('settings').doc('club').set(cleanUndefined(backup.clubSettings));
        }
        if (backup.users && Array.isArray(backup.users)) {
          for (const user of backup.users) {
            await this.firestoreInstance.collection('adminUsers').doc(user.uid).set(cleanUndefined(user));
          }
        }
      } catch (err) {
        console.error('Firestore restore backup error:', err);
      }
    }

    return {
      teams: this.memoryStore.teams.length,
      players: this.memoryStore.players.length,
      fixtures: this.memoryStore.fixtures.length,
    };
  }
}

export const storage = new StorageManager();

