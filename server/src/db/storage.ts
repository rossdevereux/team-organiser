import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Player, TeamSettings, Fixture, MatchSquad, Team, PostMatchRecording } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
}

class StorageManager {
  private memoryStore: DataStore;
  private isFirestoreAvailable: boolean = false;
  private firestoreInstance: any = null;

  constructor() {
    this.memoryStore = {
      teams: SEED_TEAMS,
      players: SEED_PLAYERS,
      settings: DEFAULT_SETTINGS,
      fixtures: SEED_FIXTURES,
    };
    this.initStorage();
  }

  private async initStorage() {
    const useFirestore = process.env.USE_FIRESTORE === 'true' || Boolean(process.env.K_SERVICE);

    if (useFirestore) {
      try {
        const { Firestore } = await import('@google-cloud/firestore');
        const projectId = process.env.GCP_PROJECT_ID || process.env.FIRESTORE_PROJECT_ID || 'team-organiser-prod';
        this.firestoreInstance = new Firestore({ projectId });
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
          this.memoryStore = parsed;
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
    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        const snap = await this.firestoreInstance.collection('teams').get();
        if (!snap.empty) {
          const allTeams: Team[] = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
          return this.filterTeamsForUser(allTeams, userId, userEmail);
        }
      } catch (err) {
        console.warn('Firestore read error, falling back to memory:', err);
      }
    }
    return this.filterTeamsForUser(this.memoryStore.teams, userId, userEmail);
  }

  hasTeamAccess(team: Team, userId?: string, userEmail?: string): boolean {
    if (!userId) return true; // dev or unauthenticated fallback
    if (team.ownerId === userId) return true;
    if (userId === 'dev-user-123' && team.ownerId === 'dev-user-123') return true;
    if (userEmail && team.ownerEmail && team.ownerEmail.toLowerCase() === userEmail.toLowerCase()) return true;
    if (team.sharedWith && team.sharedWith.includes(userId)) return true;
    if (userEmail && team.sharedWith && team.sharedWith.some((e) => e.toLowerCase() === userEmail.toLowerCase())) return true;
    return false;
  }

  private filterTeamsForUser(allTeams: Team[], userId?: string, userEmail?: string): Team[] {
    // If no userId provided, return all teams (demo/dev mode)
    if (!userId) return allTeams;

    // Filter teams owned by user OR shared with user's email/id
    return allTeams.filter((t) => this.hasTeamAccess(t, userId, userEmail));
  }

  async getTeamById(id: string): Promise<Team | null> {
    const teams = await this.getTeams();
    return teams.find((t) => t.id === id) || null;
  }

  async saveTeam(team: Team): Promise<Team> {
    const existingIndex = this.memoryStore.teams.findIndex((t) => t.id === team.id);
    if (existingIndex >= 0) {
      this.memoryStore.teams[existingIndex] = team;
    } else {
      this.memoryStore.teams.push(team);
    }
    this.saveToFile();

    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        await this.firestoreInstance.collection('teams').doc(team.id).set(team);
      } catch (err) {
        console.error('Firestore save error:', err);
      }
    }
    return team;
  }

  async deleteTeam(id: string): Promise<boolean> {
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

  async shareTeam(teamId: string, emailOrUserId: string): Promise<Team | null> {
    const team = await this.getTeamById(teamId);
    if (!team) return null;

    const email = emailOrUserId.trim().toLowerCase();
    if (!team.sharedWith.includes(email)) {
      team.sharedWith.push(email);
      await this.saveTeam(team);
    }
    return team;
  }

  async addSeason(teamId: string, seasonName: string): Promise<Team | null> {
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
    const all = await this.getPlayers();
    return all.find((p) => p.id === id) || null;
  }

  async savePlayer(player: Player): Promise<Player> {
    const existingIndex = this.memoryStore.players.findIndex((p) => p.id === player.id);
    if (existingIndex >= 0) {
      this.memoryStore.players[existingIndex] = player;
    } else {
      this.memoryStore.players.push(player);
    }
    this.saveToFile();

    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        await this.firestoreInstance.collection('players').doc(player.id).set(player);
      } catch (err) {
        console.error('Firestore save error:', err);
      }
    }
    return player;
  }

  async bulkSavePlayers(players: Player[]): Promise<Player[]> {
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
          batch.set(docRef, player);
        }
        await batch.commit();
      } catch (err) {
        console.error('Firestore batch save error:', err);
      }
    }
    return players;
  }

  async deletePlayer(id: string): Promise<boolean> {
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
    if (teamId) {
      const team = await this.getTeamById(teamId);
      if (team && team.settings) {
        return team.settings;
      }
    }
    return this.memoryStore.settings;
  }

  async updateSettings(settings: TeamSettings, teamId?: string): Promise<TeamSettings> {
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
    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        let query = this.firestoreInstance.collection('fixtures');
        if (teamId) {
          query = query.where('teamId', '==', teamId);
        }
        const snap = await query.orderBy('date', 'desc').get();
        if (!snap.empty) {
          return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        }
      } catch (err) {
        console.warn('Firestore fixtures error, using memory:', err);
      }
    }

    if (teamId) {
      return this.memoryStore.fixtures.filter((f) => f.teamId === teamId);
    }
    return this.memoryStore.fixtures;
  }

  async getFixtureById(id: string): Promise<Fixture | null> {
    const fixtures = await this.getFixtures();
    return fixtures.find((f) => f.id === id) || null;
  }

  async saveFixture(fixture: Fixture): Promise<Fixture> {
    const existingIndex = this.memoryStore.fixtures.findIndex((f) => f.id === fixture.id);
    if (existingIndex >= 0) {
      this.memoryStore.fixtures[existingIndex] = fixture;
    } else {
      this.memoryStore.fixtures.unshift(fixture);
    }
    this.saveToFile();

    if (this.isFirestoreAvailable && this.firestoreInstance) {
      try {
        await this.firestoreInstance.collection('fixtures').doc(fixture.id).set(fixture);
      } catch (err) {
        console.error('Firestore save fixture error:', err);
      }
    }
    return fixture;
  }

  async updateMatchSquad(fixtureId: string, matchSquad: MatchSquad): Promise<Fixture | null> {
    const fixture = await this.getFixtureById(fixtureId);
    if (!fixture) return null;

    fixture.matchSquad = matchSquad;
    await this.saveFixture(fixture);
    return fixture;
  }

  async updatePostMatchRecording(
    fixtureId: string,
    postMatchRecording: PostMatchRecording
  ): Promise<Fixture | null> {
    const fixture = await this.getFixtureById(fixtureId);
    if (!fixture) return null;

    fixture.postMatchRecording = postMatchRecording;
    fixture.status = 'Completed';
    await this.saveFixture(fixture);
    return fixture;
  }

  async deleteFixture(id: string): Promise<boolean> {
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
}

export const storage = new StorageManager();
