import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { auth, getAuthToken, getUserRoleFromToken, UserRole } from '../firebase';
import { queryClient } from '../queryClient';
import {
  Player,
  TeamSettings,
  Fixture,
  MatchSquad,
  Team,
  Formation,
  MatchPlayerStats,
  PostMatchRecording,
  SuggestedSubPlan,
  GoalScorer,
  LiveMatchState,
  LiveMatchSubLogEntry,
} from '../types';
import { getFormationsForTeamSize, findFormation, DEFAULT_FORMATIONS } from '../utils/formations';
import { DEMO_TEAMS, DEMO_PLAYERS, DEMO_FIXTURES, isDemoTeamId } from '../utils/demoData';

export interface SwapSource {
  type: 'pitch' | 'sub' | 'rested';
  playerId: string;
  position?: string;
}

interface MatchdayContextType {
  currentUser: User | null;
  teams: Team[];
  activeTeam: Team | null;
  activeTeamId: string;
  players: Player[];
  fixtures: Fixture[];
  activeFixture: Fixture | null;
  activeFixtureId: string;
  settings: TeamSettings;
  activePeriod: number;
  availableFormations: Formation[];
  activeFormation: Formation;
  stats: MatchPlayerStats[];
  loading: boolean;
  error: string | null;
  selectedSwapSource: SwapSource | null;
  userRole: UserRole;
  isOwner: boolean;
  isCoach: boolean;
  isViewer: boolean;
  refreshUserClaims: () => Promise<void>;
  activeTab: 'lineup' | 'matrix' | 'squad' | 'fixtures' | 'stats' | 'teams' | 'admin';
  setActiveTab: (tab: 'lineup' | 'matrix' | 'squad' | 'fixtures' | 'stats' | 'teams' | 'admin') => void;
  setActivePeriod: (period: number) => void;
  setActiveTeamId: (id: string) => void;
  setActiveFixtureId: (id: string) => void;
  selectSwapSource: (source: SwapSource | null) => void;
  handleSwap: (target: SwapSource) => void;
  replaceSquadPlayer: (outgoingPlayerId: string, incomingPlayerId: string) => Promise<void>;
  addPlayerToSquad: (playerId: string) => Promise<void>;
  removePlayerFromSquad: (playerId: string) => Promise<void>;
  autoRotateCurrentFixture: (selectedPlayerIds?: string[]) => Promise<void>;
  undoAutoRotate: () => Promise<void>;
  resetMatchSheet: () => Promise<void>;
  updateMatchSquad: (newSquad: MatchSquad) => Promise<void>;
  // Team actions
  createTeam: (teamData: Partial<Team>) => Promise<Team | null>;
  updateTeam: (team: Team) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  shareTeam: (teamId: string, email: string) => Promise<void>;
  unshareTeam: (teamId: string, memberIdOrEmail: string) => Promise<void>;
  // Formation actions
  changeFormation: (formationIdOrName: string) => Promise<void>;
  createCustomFormation: (formation: Formation) => Promise<void>;
  isOffline: boolean;
  // Player actions
  createPlayer: (playerData: Partial<Player>) => Promise<Player | null>;
  bulkCreatePlayers: (playersData: Partial<Player>[]) => Promise<Player[]>;
  updatePlayer: (player: Player) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
  togglePlayerAvailability: (playerId: string, date: string) => Promise<void>;
  // Fixture actions
  createFixture: (fixtureData: Partial<Fixture>) => Promise<Fixture | null>;
  updateFixture: (fixture: Fixture) => Promise<void>;
  deleteFixture: (id: string) => Promise<void>;
  setMatchCaptain: (fixtureId: string, captainId?: string) => Promise<void>;
  setPlayerOfTheMatch: (fixtureId: string, playerOfTheMatchId?: string) => Promise<void>;
  // Settings & Seasons
  updateSettings: (newSettings: TeamSettings) => Promise<void>;
  createSeason: (seasonName: string) => Promise<void>;
  // Post-Match & Subs
  savePostMatchRecording: (fixtureId: string, recording: PostMatchRecording) => Promise<void>;
  updateFixtureScore: (
    fixtureId: string,
    scoreData: {
      homeScore: number;
      awayScore: number;
      scorers?: GoalScorer[];
      status?: Fixture['status'];
      isLive?: boolean;
    }
  ) => Promise<void>;
  updateLiveMatchState: (
    fixtureId: string,
    liveMatchState: LiveMatchState,
    matchSquad?: MatchSquad,
    immediate?: boolean
  ) => Promise<void>;
  executeLiveSubstitution: (
    offPlayerId: string,
    onPlayerId: string,
    targetPosition?: string
  ) => Promise<void>;
  getSuggestedSubs: (fixtureId: string, interval?: number) => Promise<SuggestedSubPlan[]>;
  isPlayerFixed: (playerId: string, fixture?: Fixture) => boolean;
  getFixedPlayerPosition: (playerId: string, fixture?: Fixture) => string | undefined;
  toggleFixedPlayerPosition: (playerId: string, position?: string, fixtureId?: string) => Promise<{ isFixed: boolean; position: string }>;
  setFixtureFixedPosition: (fixtureId: string, playerId: string, positionOrStatus: string) => Promise<void>;
  refreshData: () => Promise<void>;
  enterDemoMode: () => void;
  signOutUser: () => Promise<void>;
}

const MatchdayContext = createContext<MatchdayContextType | null>(null);

const getInitialUrlState = () => {
  if (typeof window === 'undefined') return { teamId: '', fixtureId: '', tab: 'lineup' as const };
  try {
    const params = new URLSearchParams(window.location.search);
    const teamId = params.get('team') || '';
    const fixtureId = params.get('fixture') || '';
    const rawTab = params.get('tab');
    const validTabs = ['lineup', 'matrix', 'squad', 'fixtures', 'stats', 'teams', 'admin'];
    const tab = (rawTab && validTabs.includes(rawTab) ? rawTab : 'lineup') as
      | 'lineup'
      | 'matrix'
      | 'squad'
      | 'fixtures'
      | 'stats'
      | 'teams'
      | 'admin';
    return { teamId, fixtureId, tab };
  } catch (_) {
    return { teamId: '', fixtureId: '', tab: 'lineup' as const };
  }
};

export const MatchdayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const mockRaw = localStorage.getItem('subshuffle_mock_user');
      if (mockRaw) {
        try {
          return JSON.parse(mockRaw) as User;
        } catch (_) {}
      }
    }
    return null;
  });
  const [userRole, setUserRole] = useState<UserRole>('coach');
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamIdState] = useState<string>(() => getInitialUrlState().teamId);
  const [players, setPlayers] = useState<Player[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [activeFixtureId, setActiveFixtureId] = useState<string>(() => getInitialUrlState().fixtureId);
  const [activePeriodState, setActivePeriodState] = useState<number>(1);
  const [selectedSwapSource, setSelectedSwapSource] = useState<SwapSource | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false));
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Switch active team with immediate data isolation and zero leakage
  const setActiveTeamId = useCallback((newTeamId: string) => {
    setActiveTeamIdState(newTeamId);
    setSelectedSwapSource(null);
    setActivePeriodState(1);

    if (!newTeamId) {
      setPlayers([]);
      setFixtures([]);
      setActiveFixtureId('');
      return;
    }

    if (isDemoTeamId(newTeamId)) {
      const demoP = DEMO_PLAYERS.filter((p) => p.teamId === newTeamId);
      const demoF = DEMO_FIXTURES.filter((f) => f.teamId === newTeamId);
      setPlayers(demoP);
      setFixtures(demoF);
      setActiveFixtureId(demoF[0]?.id || '');
    } else {
      try {
        const cachedP = localStorage.getItem(`subshuffle_cached_players_${newTeamId}`);
        setPlayers(cachedP ? JSON.parse(cachedP) : []);
        const cachedF = localStorage.getItem(`subshuffle_cached_fixtures_${newTeamId}`);
        if (cachedF) {
          const parsedF: Fixture[] = JSON.parse(cachedF);
          setFixtures(parsedF);
          setActiveFixtureId(parsedF[0]?.id || '');
        } else {
          setFixtures([]);
          setActiveFixtureId('');
        }
      } catch (_) {
        setPlayers([]);
        setFixtures([]);
        setActiveFixtureId('');
      }
    }
  }, []);

  // Derive activeTab directly from TanStack Router URL pathname
  const activeTab = useMemo<
    'lineup' | 'matrix' | 'squad' | 'fixtures' | 'stats' | 'teams' | 'admin'
  >(() => {
    const segment = location.pathname.replace(/^\//, '').split('/')[0] || '';
    if (['lineup', 'matrix', 'squad', 'fixtures', 'stats', 'teams', 'admin'].includes(segment)) {
      return segment as any;
    }
    return 'lineup';
  }, [location.pathname]);

  const setActiveTab = useCallback(
    (tab: 'lineup' | 'matrix' | 'squad' | 'fixtures' | 'stats' | 'teams' | 'admin') => {
      navigate({
        to: `/${tab}`,
        search: (prev: any) => prev,
      });
    },
    [navigate]
  );

  // Evaluate user roles and custom claims
  const evaluateRole = useCallback(async (user: User | null, forceRefresh: boolean = false) => {
    if (!user) {
      setUserRole('viewer');
      return;
    }
    const role = await getUserRoleFromToken(user, forceRefresh);
    setUserRole(role);
  }, []);

  // Monitor online / offline network state
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor Firebase Auth state & custom claims
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      let resolvedUser = user;
      if (!resolvedUser && typeof window !== 'undefined') {
        const mockRaw = localStorage.getItem('subshuffle_mock_user');
        if (mockRaw) {
          try {
            resolvedUser = JSON.parse(mockRaw) as User;
          } catch (_) {}
        }
      }
      setCurrentUser(resolvedUser);
      evaluateRole(resolvedUser);
      // Reset in-memory team and match state whenever auth transitions to prevent state leakage
      setSelectedSwapSource(null);
      setTeams([]);
      setActiveTeamId('');
      setPlayers([]);
      setFixtures([]);
      setActiveFixtureId('');
    });
    return () => unsub();
  }, [evaluateRole]);

  const refreshUserClaims = useCallback(async () => {
    if (auth.currentUser) {
      await evaluateRole(auth.currentUser, true);
    }
  }, [evaluateRole]);

  // Keep URL updated with team and fixture query params for bookmarking and sharing
  useEffect(() => {
    if (typeof window === 'undefined' || window.location.pathname === '/') return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (activeTeamId) params.set('team', activeTeamId);
      if (activeFixtureId) {
        params.set('fixture', activeFixtureId);
      } else {
        params.delete('fixture');
      }

      const newQuery = params.toString() ? `?${params.toString()}` : '';
      if (window.location.search !== newQuery) {
        window.history.replaceState(null, '', `${window.location.pathname}${newQuery}`);
      }
    } catch (e) {
      console.warn('Failed to update URL search params:', e);
    }
  }, [activeTeamId, activeFixtureId, location.pathname]);

  // Helper to build headers with auth token or dev fallback
  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (currentUser) {
      const token = await getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['Authorization'] = 'Bearer mock-token';
      }
      headers['x-user-id'] = currentUser.uid;
      if (currentUser.email) {
        headers['x-user-email'] = currentUser.email;
      }
      if (currentUser.displayName) {
        headers['x-user-name'] = currentUser.displayName;
      }
      if (userRole) {
        headers['x-user-role'] = userRole;
      }
    } else {
      // Local dev / demo fallback
      headers['x-user-id'] = 'dev-user-123';
      headers['x-user-email'] = 'coach@therovers.local';
      headers['x-user-role'] = 'coach';
    }

    return headers;
  }, [currentUser, userRole]);

  // Dedicated clean Demo Mode launcher
  const enterDemoMode = useCallback(() => {
    sessionStorage.setItem('subshuffle_demo_entered', 'true');
    localStorage.setItem('subshuffle_has_visited', 'true');

    setSelectedSwapSource(null);
    setError(null);

    const demoTeam = DEMO_TEAMS[0];
    const demoPlayers = DEMO_PLAYERS.filter((p) => p.teamId === demoTeam.id);
    const demoFixtures = DEMO_FIXTURES.filter((f) => f.teamId === demoTeam.id);
    const firstFixture = demoFixtures[0];

    setTeams(DEMO_TEAMS);
    setActiveTeamId(demoTeam.id);
    setPlayers(demoPlayers);
    setFixtures(demoFixtures);
    setActiveFixtureId(firstFixture ? firstFixture.id : '');
    setActivePeriodState(1);
    setLoading(false);

    try {
      localStorage.setItem('subshuffle_cached_teams', JSON.stringify(DEMO_TEAMS));
      localStorage.setItem(`subshuffle_cached_players_${demoTeam.id}`, JSON.stringify(demoPlayers));
      localStorage.setItem(`subshuffle_cached_fixtures_${demoTeam.id}`, JSON.stringify(demoFixtures));
    } catch (_) {}

    navigate({
      to: '/lineup',
      search: () => ({ team: demoTeam.id, fixture: firstFixture ? firstFixture.id : undefined }),
    });
  }, [navigate]);

  // Clean sign-out handler wiping private memory and cached data
  const signOutUser = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Failed to sign out from Firebase:', e);
    }

    setCurrentUser(null);
    setUserRole('viewer');

    setSelectedSwapSource(null);
    setError(null);
    setTeams([]);
    setActiveTeamId('');
    setPlayers([]);
    setFixtures([]);
    setActiveFixtureId('');

    try {
      localStorage.removeItem('subshuffle_cached_teams');
      localStorage.removeItem('squadrotate_cached_teams');
      localStorage.removeItem('subshuffle_role_override');
      localStorage.removeItem('subshuffle_mock_user');
      sessionStorage.removeItem('subshuffle_demo_entered');
      if (currentUser) {
        localStorage.removeItem(`subshuffle_cached_teams_${currentUser.uid}`);
      }

      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith('subshuffle_cached_players_') ||
            k.startsWith('subshuffle_cached_fixtures_') ||
            k.startsWith('squadrotate_cached_players_') ||
            k.startsWith('squadrotate_cached_fixtures_'))
        ) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (_) {}

    try {
      window.history.replaceState(null, '', '/');
    } catch (_) {}

    navigate({
      to: '/',
      search: () => ({}),
    });
  }, [navigate, currentUser]);

  // Fetch teams list with offline cache and built-in demo fallback
  const refreshTeams = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/teams', { headers });
      if (res.ok) {
        const data: Team[] = await res.json();
        setTeams(data);
        if (currentUser) {
          try {
            localStorage.setItem(`subshuffle_cached_teams_${currentUser.uid}`, JSON.stringify(data));
            localStorage.removeItem('subshuffle_cached_teams');
            localStorage.removeItem('squadrotate_cached_teams');
          } catch (_) {}
        } else {
          try {
            localStorage.setItem('subshuffle_cached_teams', JSON.stringify(data));
          } catch (_) {}
        }

        const urlTeam = new URLSearchParams(window.location.search).get('team');
        const matched = data.find((t) => t.id === urlTeam);
        if (matched) {
          setActiveTeamId(matched.id);
        } else if (data.length > 0 && (!activeTeamId || !data.some((t) => t.id === activeTeamId))) {
          setActiveTeamId(data[0].id);
        } else if (data.length === 0) {
          setActiveTeamId('');
          setPlayers([]);
          setFixtures([]);
          setActiveFixtureId('');
        }
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Network error fetching teams, trying offline cache:', err);
    }

    // Offline cache fallback ONLY on network error
    try {
      const cacheKey = currentUser
        ? `subshuffle_cached_teams_${currentUser.uid}`
        : 'subshuffle_cached_teams';
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const data: Team[] = JSON.parse(cached);
        setTeams(data);
        const urlTeam = new URLSearchParams(window.location.search).get('team');
        const matched = data.find((t) => t.id === urlTeam);
        if (matched) {
          setActiveTeamId(matched.id);
        } else if (data.length > 0 && (!activeTeamId || !data.some((t) => t.id === activeTeamId))) {
          setActiveTeamId(data[0].id);
        } else if (data.length === 0) {
          setActiveTeamId('');
          setPlayers([]);
          setFixtures([]);
          setActiveFixtureId('');
        }
        setLoading(false);
        return;
      }
    } catch (e) {
      console.error('Failed reading cached teams:', e);
    }

    // Unauthenticated / Demo Fallback: Never leave teams empty for guest or demo users
    if (!currentUser) {
      setTeams(DEMO_TEAMS);
      const urlTeam = new URLSearchParams(window.location.search).get('team');
      const matched = DEMO_TEAMS.find((t) => t.id === urlTeam);
      setActiveTeamId(matched ? matched.id : DEMO_TEAMS[0].id);
      setLoading(false);
    } else {
      setTeams([]);
      setActiveTeamId('');
      setPlayers([]);
      setFixtures([]);
      setActiveFixtureId('');
      setLoading(false);
    }
  }, [getAuthHeaders, activeTeamId, currentUser]);

  // Active Team object
  const activeTeam = useMemo(() => {
    return teams.find((t) => t.id === activeTeamId) || teams[0] || (currentUser ? null : DEMO_TEAMS[0]);
  }, [teams, activeTeamId, currentUser]);

  // Team settings (falls back to defaults if not present)
  const settings: TeamSettings = useMemo(() => {
    if (activeTeam && activeTeam.settings) {
      return activeTeam.settings;
    }
    return {
      pitchPlayerCount: 7,
      matchdaySquadCap: 10,
      subCount: 3,
      matchPeriodCount: 2, // 2 Halves
      periodDurationMinutes: 25,
      targetGameTimePercent: 50,
      defaultFormation: '2-3-1',
      customFormations: [],
    };
  }, [activeTeam]);

  // Load team-scoped players & fixtures with offline cache and demo fallback
  const refreshTeamData = useCallback(async () => {
    if (!activeTeamId) {
      setPlayers([]);
      setFixtures([]);
      setActiveFixtureId('');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const headers = await getAuthHeaders();

      const [pRes, fRes] = await Promise.all([
        fetch(`/api/players?teamId=${activeTeamId}`, { headers }),
        fetch(`/api/fixtures?teamId=${activeTeamId}`, { headers }),
      ]);

      let hasPlayers = false;
      let hasFixtures = false;

      if (pRes.ok) {
        const pData: Player[] = await pRes.json();
        if (pData.length === 0 && isDemoTeamId(activeTeamId)) {
          const demoP = DEMO_PLAYERS.filter((p) => p.teamId === activeTeamId);
          setPlayers(demoP);
        } else {
          setPlayers(pData);
          try {
            localStorage.setItem(`subshuffle_cached_players_${activeTeamId}`, JSON.stringify(pData));
          } catch (_) {}
        }
      }

      if (fRes.ok) {
        const fData: Fixture[] = await fRes.json();
        if (fData.length === 0 && isDemoTeamId(activeTeamId)) {
          const demoF = DEMO_FIXTURES.filter((f) => f.teamId === activeTeamId);
          setFixtures(demoF);
          if (demoF.length > 0 && (!activeFixtureId || !demoF.some((f) => f.id === activeFixtureId))) {
            setActiveFixtureId(demoF[0].id);
          }
        } else {
          setFixtures(fData);
          try {
            localStorage.setItem(`subshuffle_cached_fixtures_${activeTeamId}`, JSON.stringify(fData));
          } catch (_) {}
          const urlFixture = new URLSearchParams(window.location.search).get('fixture');
          const matched = fData.find((f) => f.id === urlFixture);
          if (matched) {
            setActiveFixtureId(matched.id);
          } else if (fData.length > 0 && (!activeFixtureId || !fData.some((f) => f.id === activeFixtureId))) {
            const upcoming = fData.find((f) => f.status === 'Upcoming') || fData[0];
            setActiveFixtureId(upcoming.id);
          } else if (fData.length === 0) {
            setActiveFixtureId('');
          }
        }
      }
    } catch (err: unknown) {
      console.warn('Network error loading team data, trying offline cache:', err);
      let hasCachedP = false;
      let hasCachedF = false;
      try {
        const cachedP =
          localStorage.getItem(`subshuffle_cached_players_${activeTeamId}`) ||
          localStorage.getItem(`squadrotate_cached_players_${activeTeamId}`);
        if (cachedP) {
          const pData = JSON.parse(cachedP);
          if (pData.length > 0) {
            setPlayers(pData);
            hasCachedP = true;
          }
        }
        const cachedF =
          localStorage.getItem(`subshuffle_cached_fixtures_${activeTeamId}`) ||
          localStorage.getItem(`squadrotate_cached_fixtures_${activeTeamId}`);
        if (cachedF) {
          const fData: Fixture[] = JSON.parse(cachedF);
          if (fData.length > 0) {
            setFixtures(fData);
            hasCachedF = true;
            if (!activeFixtureId || !fData.some((f) => f.id === activeFixtureId)) {
              setActiveFixtureId(fData[0].id);
            }
          }
        }
      } catch (cacheErr) {
        console.error('Failed reading cached players/fixtures:', cacheErr);
      }

      // If offline cache was also empty for demo team, fall back to built-in demo dataset
      if (isDemoTeamId(activeTeamId)) {
        if (!hasCachedP) {
          setPlayers(DEMO_PLAYERS.filter((p) => p.teamId === activeTeamId));
        }
        if (!hasCachedF) {
          const demoF = DEMO_FIXTURES.filter((f) => f.teamId === activeTeamId);
          setFixtures(demoF);
          if (demoF.length > 0 && (!activeFixtureId || !demoF.some((f) => f.id === activeFixtureId))) {
            setActiveFixtureId(demoF[0].id);
          }
        }
      } else {
        setError(err instanceof Error ? err.message : 'Offline pitch mode active');
      }
    } finally {
      setLoading(false);
    }
  }, [activeTeamId, activeFixtureId, getAuthHeaders]);

  // Load teams when auth changes
  useEffect(() => {
    refreshTeams();
  }, [refreshTeams, currentUser]);

  // Load players & fixtures whenever active team changes
  useEffect(() => {
    if (activeTeamId) {
      refreshTeamData();
    }
  }, [activeTeamId, refreshTeamData]);

  const refreshData = useCallback(async () => {
    await refreshTeams();
    await refreshTeamData();
  }, [refreshTeams, refreshTeamData]);

  // Active fixture
  const activeFixture = useMemo(() => {
    return fixtures.find((f) => f.id === activeFixtureId) || fixtures[0] || null;
  }, [fixtures, activeFixtureId]);

  // Available formations for the current team size (5, 7, 9, 11 + customs)
  const availableFormations = useMemo(() => {
    const pitchCount = activeFixture?.pitchPlayerCount || settings.pitchPlayerCount || 7;
    return getFormationsForTeamSize(pitchCount, settings.customFormations || []);
  }, [activeFixture?.pitchPlayerCount, settings.pitchPlayerCount, settings.customFormations]);

  // Active formation definition
  const activeFormation = useMemo(() => {
    const pitchCount = activeFixture?.pitchPlayerCount || settings.pitchPlayerCount || 7;
    return findFormation(
      activeFixture?.formation || settings.defaultFormation || '2-3-1',
      pitchCount,
      settings.customFormations || []
    );
  }, [activeFixture?.formation, activeFixture?.pitchPlayerCount, settings.defaultFormation, settings.pitchPlayerCount, settings.customFormations]);

  // Derive safe clamped activePeriod during render (rerender-derived-state-no-effect)
  const currentPeriodCount = activeFixture?.matchPeriodCount || settings.matchPeriodCount || 2;
  const activePeriod = activePeriodState > currentPeriodCount ? 1 : activePeriodState;
  const setActivePeriod = useCallback((p: number) => {
    setActivePeriodState(p);
  }, []);

  // Sync activePeriod to persisted live match state when fixture loads or updates
  const fixtureLivePeriod = activeFixture?.liveMatchState?.currentPeriod;
  useEffect(() => {
    if (fixtureLivePeriod && fixtureLivePeriod >= 1 && fixtureLivePeriod <= currentPeriodCount) {
      setActivePeriodState(fixtureLivePeriod);
    }
  }, [activeFixture?.id, fixtureLivePeriod, currentPeriodCount]);

  // Compute fair play match statistics
  const stats = useMemo(() => {
    if (!activeFixture || !activeFixture.matchSquad) return [];
    const periodCount = activeFixture.matchPeriodCount || settings.matchPeriodCount || 2;
    const duration = activeFixture.periodDurationMinutes || settings.periodDurationMinutes || 25;
    const totalMatchMinutes = periodCount * duration;
    const playerMap = new Map(players.map((p) => [p.id, p]));

    return activeFixture.matchSquad.selectedPlayerIds.map((playerId) => {
      const player = playerMap.get(playerId) || {
        id: playerId,
        teamId: activeFixture.teamId || '',
        name: 'Player',
        preferredPositions: ['Midfield'],
        unavailableDates: [],
        matchesPlayed: 0,
        totalMinutesPlayed: 0,
      };

      const periodsPlayed: number[] = [];
      let playedAsGoalkeeper = false;
      const positionsPlayed: string[] = [];

      activeFixture.matchSquad!.lineupsByPeriod.forEach((lineup) => {
        const pitchEntry = lineup.onPitch.find((item) => item.playerId === playerId);
        if (pitchEntry) {
          periodsPlayed.push(lineup.period);
          positionsPlayed.push(pitchEntry.position);
          if (pitchEntry.position === 'GK') {
            playedAsGoalkeeper = true;
          }
        }
      });

      let minutesPlayed = periodsPlayed.length * duration;
      let isPostMatchRecorded = false;

      if (activeFixture.postMatchRecording) {
        isPostMatchRecorded = true;
        if (activeFixture.postMatchRecording.trackingMode === 'full_credit') {
          minutesPlayed = totalMatchMinutes;
        } else if (activeFixture.postMatchRecording.trackingMode === 'exact') {
          if (
            activeFixture.postMatchRecording.playerMinutes &&
            typeof activeFixture.postMatchRecording.playerMinutes[playerId] === 'number'
          ) {
            minutesPlayed = activeFixture.postMatchRecording.playerMinutes[playerId];
          }
        }
      }

      const gameTimePercent =
        totalMatchMinutes > 0 ? Math.round((minutesPlayed / totalMatchMinutes) * 100) : 0;
      const meetsTarget = gameTimePercent >= settings.targetGameTimePercent;

      return {
        playerId,
        player,
        periodsPlayed,
        minutesPlayed,
        gameTimePercent,
        playedAsGoalkeeper,
        positionsPlayed,
        meetsTarget,
        isPostMatchRecorded,
      };
    });
  }, [activeFixture, players, settings]);

  const squadDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSquadUpdateRef = useRef<{ fixtureId: string; squad: MatchSquad } | null>(null);

  // Helper to commit pending squad changes to the server
  const commitSquadUpdate = useCallback(
    async (fixtureId: string, squad: MatchSquad) => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/fixtures/${fixtureId}/squad`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(squad),
        });
        if (!res.ok) {
          throw new Error('Failed to save match squad');
        }
      } catch (err) {
        console.error('Error saving match squad:', err);
      }
    },
    [getAuthHeaders]
  );

  // Update MatchSquad on server with 800ms debounce to collapse rapid swaps into 1 Firestore write
  const updateMatchSquad = useCallback(
    async (newSquad: MatchSquad, immediate = false) => {
      if (!activeFixture) return;
      const fixtureId = activeFixture.id;

      // 1. Optimistic React state update (0ms UI latency)
      setFixtures((prev) =>
        prev.map((f) => (f.id === fixtureId ? { ...f, matchSquad: newSquad } : f))
      );

      // 2. Immediate offline cache update
      try {
        const cached = localStorage.getItem(`subshuffle_cached_fixtures_${activeTeamId}`);
        if (cached) {
          const list = JSON.parse(cached);
          const updated = list.map((f: Fixture) =>
            f.id === fixtureId ? { ...f, matchSquad: newSquad } : f
          );
          localStorage.setItem(`subshuffle_cached_fixtures_${activeTeamId}`, JSON.stringify(updated));
        }
      } catch (_) {}

      // 3. Debounced server persistence to collapse multiple swaps into 1 Firestore write
      pendingSquadUpdateRef.current = { fixtureId, squad: newSquad };

      if (squadDebounceTimerRef.current) {
        clearTimeout(squadDebounceTimerRef.current);
        squadDebounceTimerRef.current = null;
      }

      if (immediate) {
        pendingSquadUpdateRef.current = null;
        await commitSquadUpdate(fixtureId, newSquad);
      } else {
        squadDebounceTimerRef.current = setTimeout(async () => {
          if (pendingSquadUpdateRef.current) {
            const { fixtureId: fId, squad } = pendingSquadUpdateRef.current;
            pendingSquadUpdateRef.current = null;
            await commitSquadUpdate(fId, squad);
          }
        }, 800);
      }
    },
    [activeFixture, activeTeamId, commitSquadUpdate]
  );

  // Flush any pending squad updates on unmount or before window unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingSquadUpdateRef.current) {
        const { fixtureId, squad } = pendingSquadUpdateRef.current;
        const blob = new Blob([JSON.stringify(squad)], { type: 'application/json' });
        navigator.sendBeacon(`/api/fixtures/${fixtureId}/squad`, blob);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (squadDebounceTimerRef.current) {
        clearTimeout(squadDebounceTimerRef.current);
      }
      if (pendingSquadUpdateRef.current) {
        const { fixtureId, squad } = pendingSquadUpdateRef.current;
        commitSquadUpdate(fixtureId, squad);
      }
    };
  }, [commitSquadUpdate]);

  const [previousLineupsMap, setPreviousLineupsMap] = useState<Record<string, MatchSquad>>({});

  // Auto rotate current fixture with undo snapshot history
  const autoRotateCurrentFixture = async (selectedPlayerIds?: string[]) => {
    if (!activeFixture) return;
    try {
      if (activeFixture.matchSquad) {
        setPreviousLineupsMap((prev) => ({
          ...prev,
          [activeFixture.id]: JSON.parse(JSON.stringify(activeFixture.matchSquad)),
        }));
      }
      setLoading(true);
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/fixtures/${activeFixture.id}/auto-rotate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ selectedPlayerIds }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.fixture) {
          setFixtures((prev) =>
            prev.map((f) => (f.id === activeFixture.id ? data.fixture : f))
          );
        }
      }
    } catch (err) {
      console.error('Error running auto-rotate:', err);
    } finally {
      setLoading(false);
    }
  };

  const undoAutoRotate = async () => {
    if (!activeFixture || !previousLineupsMap[activeFixture.id]) return;
    const prevSquad = previousLineupsMap[activeFixture.id];
    await updateMatchSquad(prevSquad);
  };

  const resetMatchSheet = async () => {
    if (!activeFixture || !activeFixture.matchSquad) return;
    const periodCount = activeFixture.matchPeriodCount || settings.matchPeriodCount || 2;
    const emptyLineups = Array.from({ length: periodCount }, (_, i) => ({
      period: i + 1,
      onPitch: [],
      subs: [...activeFixture.matchSquad!.selectedPlayerIds],
    }));
    const updatedSquad: MatchSquad = {
      ...activeFixture.matchSquad,
      lineupsByPeriod: emptyLineups,
      manualOverrides: true,
    };
    await updateMatchSquad(updatedSquad);
  };

  // Replace a player in the matchday squad (e.g. sick / call-off replaced by rested player)
  const replaceSquadPlayer = async (outgoingPlayerId: string, incomingPlayerId: string) => {
    if (!activeFixture || !activeFixture.matchSquad) return;
    const currentSquad = activeFixture.matchSquad;

    // 1. Update selectedPlayerIds: replace outgoing with incoming
    const updatedSelected = currentSquad.selectedPlayerIds.map((id) =>
      id === outgoingPlayerId ? incomingPlayerId : id
    );
    if (!updatedSelected.includes(incomingPlayerId)) {
      updatedSelected.push(incomingPlayerId);
    }

    // 2. Update restedPlayerIds: remove incoming, add outgoing
    const currentRested = currentSquad.restedPlayerIds || [];
    const updatedRested = currentRested
      .filter((id) => id !== incomingPlayerId)
      .concat(outgoingPlayerId);

    // 3. Update lineupsByPeriod across all periods (preserving pitch positions and bench slots)
    const updatedLineups = currentSquad.lineupsByPeriod.map((lineup) => ({
      ...lineup,
      onPitch: lineup.onPitch.map((p) =>
        p.playerId === outgoingPlayerId ? { ...p, playerId: incomingPlayerId } : p
      ),
      subs: lineup.subs.map((id) => (id === outgoingPlayerId ? incomingPlayerId : id)),
    }));

    const updatedSquad: MatchSquad = {
      ...currentSquad,
      selectedPlayerIds: updatedSelected,
      restedPlayerIds: updatedRested,
      lineupsByPeriod: updatedLineups,
      manualOverrides: true,
    };

    // If outgoing was captain, transfer captaincy to incoming
    if (activeFixture.captainId === outgoingPlayerId) {
      await setMatchCaptain(activeFixture.id, incomingPlayerId);
    }

    setSelectedSwapSource(null);
    await updateMatchSquad(updatedSquad);
  };

  // Add a player directly to squad (e.g. from rested to bench)
  const addPlayerToSquad = async (playerId: string) => {
    if (!activeFixture || !activeFixture.matchSquad) return;
    const currentSquad = activeFixture.matchSquad;
    if (currentSquad.selectedPlayerIds.includes(playerId)) return;

    const updatedSelected = [...currentSquad.selectedPlayerIds, playerId];
    const updatedRested = (currentSquad.restedPlayerIds || []).filter((id) => id !== playerId);

    // Add to all periods as substitute if not already present
    const updatedLineups = currentSquad.lineupsByPeriod.map((lineup) => {
      const isOnPitch = lineup.onPitch.some((p) => p.playerId === playerId);
      const isSub = lineup.subs.includes(playerId);
      if (!isOnPitch && !isSub) {
        return {
          ...lineup,
          subs: [...lineup.subs, playerId],
        };
      }
      return lineup;
    });

    const updatedSquad: MatchSquad = {
      ...currentSquad,
      selectedPlayerIds: updatedSelected,
      restedPlayerIds: updatedRested,
      lineupsByPeriod: updatedLineups,
      manualOverrides: true,
    };

    setSelectedSwapSource(null);
    await updateMatchSquad(updatedSquad);
  };

  // Remove a player from squad (move to rested)
  const removePlayerFromSquad = async (playerId: string) => {
    if (!activeFixture || !activeFixture.matchSquad) return;
    const currentSquad = activeFixture.matchSquad;
    if (!currentSquad.selectedPlayerIds.includes(playerId)) return;

    const updatedSelected = currentSquad.selectedPlayerIds.filter((id) => id !== playerId);
    const updatedRested = Array.from(new Set([...(currentSquad.restedPlayerIds || []), playerId]));

    // Remove from pitch and bench across all periods
    // If the removed player was on the pitch in a period and there is a bench substitute available,
    // promote the first available substitute to take the pitch position so the team stays full!
    const updatedLineups = currentSquad.lineupsByPeriod.map((l) => {
      const wasOnPitch = l.onPitch.find((p) => p.playerId === playerId);
      let newOnPitch = l.onPitch.filter((p) => p.playerId !== playerId);
      let newSubs = l.subs.filter((id) => id !== playerId);

      if (wasOnPitch && newSubs.length > 0) {
        const promotedSubId = newSubs.shift()!;
        newOnPitch.push({
          playerId: promotedSubId,
          position: wasOnPitch.position,
        });
      }

      return {
        ...l,
        onPitch: newOnPitch,
        subs: newSubs,
      };
    });

    const updatedSquad: MatchSquad = {
      ...currentSquad,
      selectedPlayerIds: updatedSelected,
      restedPlayerIds: updatedRested,
      lineupsByPeriod: updatedLineups,
      manualOverrides: true,
    };

    if (activeFixture.captainId === playerId) {
      await setMatchCaptain(activeFixture.id, undefined);
    }

    setSelectedSwapSource(null);
    await updateMatchSquad(updatedSquad);
  };

  // Swap players on pitch/sub/rested
  const handleSwap = (target: SwapSource) => {
    if (!selectedSwapSource || !activeFixture || !activeFixture.matchSquad) return;
    if (selectedSwapSource.playerId === target.playerId) {
      setSelectedSwapSource(null);
      return;
    }

    const source = selectedSwapSource;

    // Rested <-> Pitch or Sub
    if (source.type === 'rested' && (target.type === 'pitch' || target.type === 'sub')) {
      replaceSquadPlayer(target.playerId, source.playerId);
      return;
    }

    // Pitch or Sub <-> Rested
    if ((source.type === 'pitch' || source.type === 'sub') && target.type === 'rested') {
      replaceSquadPlayer(source.playerId, target.playerId);
      return;
    }

    const currentSquad = activeFixture.matchSquad;
    const periodIdx = currentSquad.lineupsByPeriod.findIndex((l) => l.period === activePeriod);
    if (periodIdx === -1) return;

    const currentLineup = { ...currentSquad.lineupsByPeriod[periodIdx] };
    const onPitch = [...currentLineup.onPitch];
    const subs = [...currentLineup.subs];

    // Pitch <-> Pitch
    if (source.type === 'pitch' && target.type === 'pitch') {
      const idxA = onPitch.findIndex((p) => p.playerId === source.playerId);
      const idxB = onPitch.findIndex((p) => p.playerId === target.playerId);
      if (idxA !== -1 && idxB !== -1) {
        const posA = onPitch[idxA].position;
        const posB = onPitch[idxB].position;
        onPitch[idxA].position = posB;
        onPitch[idxB].position = posA;
      }
    }
    // Pitch <-> Sub
    else if (source.type === 'pitch' && target.type === 'sub') {
      const pitchIdx = onPitch.findIndex((p) => p.playerId === source.playerId);
      const subIdx = subs.findIndex((id) => id === target.playerId);
      if (pitchIdx !== -1 && subIdx !== -1) {
        const existingPos = onPitch[pitchIdx].position;
        onPitch[pitchIdx] = { playerId: target.playerId, position: existingPos };
        subs[subIdx] = source.playerId;
      }
    }
    // Sub <-> Pitch
    else if (source.type === 'sub' && target.type === 'pitch') {
      const subIdx = subs.findIndex((id) => id === source.playerId);
      const pitchIdx = onPitch.findIndex((p) => p.playerId === target.playerId);
      if (subIdx !== -1 && pitchIdx !== -1) {
        const existingPos = onPitch[pitchIdx].position;
        onPitch[pitchIdx] = { playerId: source.playerId, position: existingPos };
        subs[subIdx] = target.playerId;
      }
    }

    const updatedLineups = [...currentSquad.lineupsByPeriod];
    updatedLineups[periodIdx] = {
      period: activePeriod,
      onPitch,
      subs,
    };

    const updatedSquad: MatchSquad = {
      ...currentSquad,
      manualOverrides: true,
      lineupsByPeriod: updatedLineups,
    };

    setSelectedSwapSource(null);
    updateMatchSquad(updatedSquad);
  };

  // Team Management
  const createTeam = async (teamData: Partial<Team>): Promise<Team | null> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers,
        body: JSON.stringify(teamData),
      });

      if (res.ok) {
        const created: Team = await res.json();
        setTeams((prev) => [...prev, created]);
        setActiveTeamId(created.id);
        return created;
      }
    } catch (err) {
      console.error('Failed to create team:', err);
    }
    return null;
  };

  const updateTeam = async (updatedTeam: Team) => {
    try {
      setTeams((prev) => prev.map((t) => (t.id === updatedTeam.id ? updatedTeam : t)));
      const headers = await getAuthHeaders();
      await fetch(`/api/teams/${updatedTeam.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatedTeam),
      });
    } catch (err) {
      console.error('Failed to update team:', err);
    }
  };

  const deleteTeam = async (id: string) => {
    try {
      setTeams((prev) => prev.filter((t) => t.id !== id));
      const headers = await getAuthHeaders();
      await fetch(`/api/teams/${id}`, { method: 'DELETE', headers });
      if (activeTeamId === id) {
        const remaining = teams.filter((t) => t.id !== id);
        if (remaining.length > 0) {
          setActiveTeamId(remaining[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to delete team:', err);
    }
  };

  const shareTeam = async (teamId: string, email: string) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/teams/${teamId}/share`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.team) {
          setTeams((prev) => prev.map((t) => (t.id === teamId ? data.team : t)));
        }
      }
    } catch (err) {
      console.error('Failed to share team:', err);
    }
  };

  const unshareTeam = async (teamId: string, memberIdOrEmail: string) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/teams/${teamId}/share/${encodeURIComponent(memberIdOrEmail)}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.team) {
          setTeams((prev) => prev.map((t) => (t.id === teamId ? data.team : t)));
        }
      }
    } catch (err) {
      console.error('Failed to unshare team:', err);
    }
  };

  // Formation Change
  const changeFormation = async (formationIdOrName: string) => {
    if (activeFixture) {
      await updateFixture({ ...activeFixture, formation: formationIdOrName });
    }
    if (activeTeam) {
      const newSettings: TeamSettings = { ...settings, defaultFormation: formationIdOrName };
      const updatedTeam = { ...activeTeam, settings: newSettings };
      await updateTeam(updatedTeam);
    }

    if (activeFixture && activeFixture.matchSquad) {
      await autoRotateCurrentFixture(activeFixture.matchSquad.selectedPlayerIds);
    }
  };

  const createCustomFormation = async (formation: Formation) => {
    if (!activeTeam) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/teams/${activeTeam.id}/formations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(formation),
      });
      if (res.ok) {
        const created: Formation = await res.json();
        const currentCustoms = settings.customFormations || [];
        const newSettings = {
          ...settings,
          defaultFormation: created.id,
          customFormations: [...currentCustoms, created],
        };
        await updateSettings(newSettings);
      }
    } catch (err) {
      console.error('Failed to create custom formation:', err);
    }
  };

  // Settings update
  const updateSettings = async (newSettings: TeamSettings) => {
    if (!activeTeam) return;
    const updatedTeam = { ...activeTeam, settings: newSettings };
    await updateTeam(updatedTeam);
  };

  // Player CRUD
  const createPlayer = async (playerData: Partial<Player>): Promise<Player | null> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/players', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...playerData, teamId: activeTeamId }),
      });
      if (res.ok) {
        const created: Player = await res.json();
        setPlayers((prev) => [...prev, created]);
        return created;
      }
    } catch (err) {
      console.error('Failed to create player:', err);
    }
    return null;
  };

  const bulkCreatePlayers = async (playersData: Partial<Player>[]): Promise<Player[]> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/players/bulk', {
        method: 'POST',
        headers,
        body: JSON.stringify({ players: playersData, teamId: activeTeamId }),
      });
      if (res.ok) {
        const created: Player[] = await res.json();
        setPlayers((prev) => [...prev, ...created]);
        return created;
      }
    } catch (err) {
      console.error('Failed to bulk create players:', err);
    }
    return [];
  };

  const updatePlayer = async (player: Player) => {
    try {
      setPlayers((prev) => prev.map((p) => (p.id === player.id ? player : p)));
      const headers = await getAuthHeaders();
      await fetch(`/api/players/${player.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(player),
      });
    } catch (err) {
      console.error('Failed to update player:', err);
    }
  };

  const deletePlayer = async (id: string) => {
    try {
      setPlayers((prev) => prev.filter((p) => p.id !== id));
      const headers = await getAuthHeaders();
      await fetch(`/api/players/${id}`, { method: 'DELETE', headers });
    } catch (err) {
      console.error('Failed to delete player:', err);
    }
  };

  const togglePlayerAvailability = async (playerId: string, date: string) => {
    const player = players.find((p) => p.id === playerId);
    if (!player) return;

    const unavailable = player.unavailableDates || [];
    const isUnavailable = unavailable.includes(date);
    const newDates = isUnavailable
      ? unavailable.filter((d) => d !== date)
      : [...unavailable, date];

    const updated = { ...player, unavailableDates: newDates };
    await updatePlayer(updated);
  };

  // Fixture CRUD
  const createFixture = async (fixtureData: Partial<Fixture>): Promise<Fixture | null> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/fixtures', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...fixtureData, teamId: activeTeamId }),
      });
      if (res.ok) {
        const created: Fixture = await res.json();
        setFixtures((prev) => [created, ...prev]);
        setActiveFixtureId(created.id);
        // Automatically generate initial fair rotation
        await fetch(`/api/fixtures/${created.id}/auto-rotate`, { method: 'POST', headers });
        await refreshTeamData();
        return created;
      }
    } catch (err) {
      console.error('Failed to create fixture:', err);
    }
    return null;
  };

  const updateFixture = async (fixture: Fixture) => {
    try {
      setFixtures((prev) => prev.map((f) => (f.id === fixture.id ? fixture : f)));
      const headers = await getAuthHeaders();
      await fetch(`/api/fixtures/${fixture.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(fixture),
      });
    } catch (err) {
      console.error('Failed to update fixture:', err);
    }
  };

  const deleteFixture = async (id: string) => {
    try {
      setFixtures((prev) => prev.filter((f) => f.id !== id));
      const headers = await getAuthHeaders();
      await fetch(`/api/fixtures/${id}`, { method: 'DELETE', headers });
      if (activeFixtureId === id) {
        const remaining = fixtures.filter((f) => f.id !== id);
        if (remaining.length > 0) {
          setActiveFixtureId(remaining[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to delete fixture:', err);
    }
  };

  const createSeason = async (seasonName: string) => {
    if (!activeTeamId || !seasonName.trim()) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/teams/${activeTeamId}/seasons`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ season: seasonName.trim() }),
      });
      if (res.ok) {
        const updatedTeam: Team = await res.json();
        setTeams((prev) => prev.map((t) => (t.id === updatedTeam.id ? updatedTeam : t)));
      }
    } catch (err) {
      console.error('Failed to create season:', err);
    }
  };

  const savePostMatchRecording = async (fixtureId: string, recording: PostMatchRecording) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/fixtures/${fixtureId}/post-match`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(recording),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.fixture) {
          setFixtures((prev) => prev.map((f) => (f.id === fixtureId ? data.fixture : f)));
        }
      }
    } catch (err) {
      console.error('Failed to save post-match recording:', err);
    }
  };

  const updateFixtureScore = async (
    fixtureId: string,
    scoreData: {
      homeScore: number;
      awayScore: number;
      scorers?: GoalScorer[];
      status?: Fixture['status'];
      isLive?: boolean;
    }
  ) => {
    try {
      // Optimistic update locally
      setFixtures((prev) =>
        prev.map((f) => {
          if (f.id === fixtureId) {
            return {
              ...f,
              homeScore: scoreData.homeScore,
              awayScore: scoreData.awayScore,
              scorers: scoreData.scorers || [],
              status: scoreData.status || (scoreData.isLive ? 'In Progress' : f.status),
              isLive: scoreData.isLive !== undefined ? scoreData.isLive : f.isLive,
            };
          }
          return f;
        })
      );

      const headers = await getAuthHeaders();
      const res = await fetch(`/api/fixtures/${fixtureId}/score`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(scoreData),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.fixture) {
          setFixtures((prev) => prev.map((f) => (f.id === fixtureId ? data.fixture : f)));
        }
      }
    } catch (err) {
      console.error('Failed to update fixture score:', err);
    }
  };

  const updateLiveMatchState = useCallback(
    async (
      fixtureId: string,
      liveMatchState: LiveMatchState,
      matchSquad?: MatchSquad,
      immediate = true
    ) => {
      try {
        const enrichedState: LiveMatchState = {
          ...liveMatchState,
          updatedAt: new Date().toISOString(),
        };

        // 1. Optimistic React state update (0ms UI latency)
        setFixtures((prev) =>
          prev.map((f) => {
            if (f.id === fixtureId) {
              return {
                ...f,
                liveMatchState: enrichedState,
                ...(matchSquad ? { matchSquad } : {}),
                ...(enrichedState.isRunning
                  ? {
                      isLive: true,
                      status: f.status === 'Upcoming' || f.status === 'Draft' ? 'In Progress' : f.status,
                    }
                  : {}),
              };
            }
            return f;
          })
        );

        // 2. Immediate offline cache update
        try {
          const cached = localStorage.getItem(`subshuffle_cached_fixtures_${activeTeamId}`);
          if (cached) {
            const list = JSON.parse(cached);
            const updated = list.map((f: Fixture) => {
              if (f.id === fixtureId) {
                return {
                  ...f,
                  liveMatchState: enrichedState,
                  ...(matchSquad ? { matchSquad } : {}),
                  ...(enrichedState.isRunning
                    ? {
                        isLive: true,
                        status: f.status === 'Upcoming' || f.status === 'Draft' ? 'In Progress' : f.status,
                      }
                    : {}),
                };
              }
              return f;
            });
            localStorage.setItem(`subshuffle_cached_fixtures_${activeTeamId}`, JSON.stringify(updated));
          }
        } catch (_) {}

        // 3. Persist to server API
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/fixtures/${fixtureId}/live-state`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            liveMatchState: enrichedState,
            matchSquad,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.fixture) {
            setFixtures((prev) => prev.map((f) => (f.id === fixtureId ? data.fixture : f)));
          }
        }
      } catch (err) {
        console.error('Failed to update live match state:', err);
      }
    },
    [activeTeamId, getAuthHeaders]
  );

  const executeLiveSubstitution = useCallback(
    async (offPlayerId: string, onPlayerId: string, targetPosition?: string) => {
      if (!activeFixture || !activeFixture.matchSquad) return;
      const currentSquad = activeFixture.matchSquad;
      const periodIdx = currentSquad.lineupsByPeriod.findIndex((l) => l.period === activePeriod);
      if (periodIdx === -1) return;

      const currentLineup = currentSquad.lineupsByPeriod[periodIdx];
      const pitchIdx = currentLineup.onPitch.findIndex((p) => p.playerId === offPlayerId);
      const subIdx = currentLineup.subs.findIndex((id) => id === onPlayerId);

      if (pitchIdx === -1 || subIdx === -1) {
        console.warn('executeLiveSubstitution: offPlayer or onPlayer not found in active period');
        return;
      }

      const assignedPos = targetPosition || currentLineup.onPitch[pitchIdx].position;
      const newOnPitch = [...currentLineup.onPitch];
      newOnPitch[pitchIdx] = { playerId: onPlayerId, position: assignedPos };

      const newSubs = [...currentLineup.subs];
      newSubs[subIdx] = offPlayerId;

      const updatedLineups = [...currentSquad.lineupsByPeriod];
      updatedLineups[periodIdx] = {
        period: activePeriod,
        onPitch: newOnPitch,
        subs: newSubs,
      };

      const updatedSquad: MatchSquad = {
        ...currentSquad,
        manualOverrides: true,
        lineupsByPeriod: updatedLineups,
      };

      const offPlayer = players.find((p) => p.id === offPlayerId);
      const onPlayer = players.find((p) => p.id === onPlayerId);
      const offName = offPlayer?.name || 'Player';
      const onName = onPlayer?.name || 'Player';

      const currentLive = activeFixture.liveMatchState;
      let currentElapsed = currentLive?.elapsedSeconds || 0;
      if (currentLive?.isRunning && currentLive.startedAt) {
        currentElapsed += Math.max(0, Math.floor((Date.now() - new Date(currentLive.startedAt).getTime()) / 1000));
      }

      const min = Math.floor(currentElapsed / 60);
      const sec = currentElapsed % 60;
      const formattedTime = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

      const newLogEntry: LiveMatchSubLogEntry = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        minute: min + 1,
        time: formattedTime,
        period: activePeriod,
        offPlayerId,
        offPlayerName: offName,
        onPlayerId,
        onPlayerName: onName,
        position: assignedPos,
        text: `OFF: ${offName} ➡️ ON: ${onName}${assignedPos ? ` (${assignedPos})` : ''}`,
        timestamp: new Date().toISOString(),
      };

      const updatedLiveState: LiveMatchState = {
        isRunning: currentLive?.isRunning ?? false,
        currentPeriod: activePeriod,
        startedAt: currentLive?.startedAt,
        elapsedSeconds: currentLive?.elapsedSeconds || 0,
        periodTimers: currentLive?.periodTimers || {},
        subLog: [newLogEntry, ...(currentLive?.subLog || [])],
      };

      await updateLiveMatchState(activeFixture.id, updatedLiveState, updatedSquad, true);
    },
    [activeFixture, activePeriod, players, updateLiveMatchState]
  );

  // Synchronise live match status across coaches & devices
  useEffect(() => {
    if (!activeFixture || (!activeFixture.isLive && !activeFixture.liveMatchState?.isRunning)) {
      return;
    }
    const fixtureId = activeFixture.id;
    let isCancelled = false;

    const pollInterval = setInterval(async () => {
      if (document.hidden || !navigator.onLine) return;
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/fixtures/${fixtureId}`, { headers });
        if (res.ok && !isCancelled) {
          const remoteFixture: Fixture = await res.json();
          setFixtures((prev) =>
            prev.map((f) => {
              if (f.id !== fixtureId) return f;
              const remoteUpdated = remoteFixture.liveMatchState?.updatedAt;
              const localUpdated = f.liveMatchState?.updatedAt;
              if (!localUpdated || (remoteUpdated && remoteUpdated > localUpdated)) {
                return remoteFixture;
              }
              if (
                remoteFixture.homeScore !== f.homeScore ||
                remoteFixture.awayScore !== f.awayScore ||
                remoteFixture.status !== f.status
              ) {
                return {
                  ...f,
                  homeScore: remoteFixture.homeScore,
                  awayScore: remoteFixture.awayScore,
                  status: remoteFixture.status,
                  isLive: remoteFixture.isLive,
                };
              }
              return f;
            })
          );
        }
      } catch (_) {}
    }, 4000);

    return () => {
      isCancelled = true;
      clearInterval(pollInterval);
    };
  }, [activeFixture?.id, activeFixture?.isLive, activeFixture?.liveMatchState?.isRunning, getAuthHeaders]);

  const getSuggestedSubs = async (
    fixtureId: string,
    interval: number = 10
  ): Promise<SuggestedSubPlan[]> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/fixtures/${fixtureId}/suggested-subs?interval=${interval}`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        return data.plans || [];
      }
    } catch (err) {
      console.error('Failed to fetch suggested substitutions:', err);
    }
    return [];
  };

  const setMatchCaptain = async (fixtureId: string, captainId?: string) => {
    try {
      setFixtures((prev) =>
        prev.map((f) => (f.id === fixtureId ? { ...f, captainId } : f))
      );
      const headers = await getAuthHeaders();
      await fetch(`/api/fixtures/${fixtureId}/captain`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ captainId }),
      });
    } catch (err) {
      console.error('Failed to set match captain:', err);
    }
  };

  const setPlayerOfTheMatch = async (fixtureId: string, playerOfTheMatchId?: string) => {
    try {
      setFixtures((prev) =>
        prev.map((f) => (f.id === fixtureId ? { ...f, playerOfTheMatchId } : f))
      );
      const headers = await getAuthHeaders();
      await fetch(`/api/fixtures/${fixtureId}/player-of-the-match`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ playerOfTheMatchId }),
      });
    } catch (err) {
      console.error('Failed to set player of the match:', err);
    }
  };

  const isPlayerFixed = useCallback(
    (playerId: string, targetFixture?: Fixture): boolean => {
      const fix = targetFixture || activeFixture;
      const fixPos =
        fix?.fixedPlayerPositions?.[playerId] ||
        fix?.matchSquad?.fixedPlayerPositions?.[playerId];

      if (fixPos) {
        const u = fixPos.toUpperCase().trim();
        if (u === 'UNLOCKED' || u === 'NONE' || u === 'ROTATE' || u === 'OFF' || u === 'FALSE') {
          return false;
        }
        return true;
      }

      const pl = players.find((p) => p.id === playerId);
      return Boolean(pl?.isFixedPosition);
    },
    [activeFixture, players]
  );

  const getFixedPlayerPosition = useCallback(
    (playerId: string, targetFixture?: Fixture): string | undefined => {
      const fix = targetFixture || activeFixture;
      const fixPos =
        fix?.fixedPlayerPositions?.[playerId] ||
        fix?.matchSquad?.fixedPlayerPositions?.[playerId];

      if (fixPos) {
        const u = fixPos.toUpperCase().trim();
        if (u === 'UNLOCKED' || u === 'NONE' || u === 'ROTATE' || u === 'OFF' || u === 'FALSE') {
          return undefined;
        }
        return fixPos;
      }

      const pl = players.find((p) => p.id === playerId);
      if (pl?.isFixedPosition) {
        return (
          pl.fixedPosition ||
          (pl.preferredPositions.includes('Goalkeeper') ? 'GK' : pl.preferredPositions[0] || 'GK')
        );
      }
      return undefined;
    },
    [activeFixture, players]
  );

  const toggleFixedPlayerPosition = useCallback(
    async (
      playerId: string,
      targetPosition?: string,
      targetFixtureId?: string
    ): Promise<{ isFixed: boolean; position: string }> => {
      const fixId = targetFixtureId || activeFixture?.id;
      const fix = fixtures.find((f) => f.id === fixId) || activeFixture;
      if (!fix || !fix.matchSquad) {
        return { isFixed: false, position: '' };
      }

      const player = players.find((p) => p.id === playerId);
      const currentlyFixed = isPlayerFixed(playerId, fix);
      const isGloballyFixed = Boolean(player?.isFixedPosition);

      const newFixed: Record<string, string> = {
        ...(fix.fixedPlayerPositions || {}),
        ...(fix.matchSquad.fixedPlayerPositions || {}),
      };

      if (currentlyFixed) {
        if (isGloballyFixed) {
          newFixed[playerId] = 'UNLOCKED';
        } else {
          delete newFixed[playerId];
        }
        const updatedFixed = Object.keys(newFixed).length > 0 ? newFixed : undefined;

        const updatedSquad: MatchSquad = {
          ...fix.matchSquad,
          fixedPlayerPositions: updatedFixed,
        };

        const updatedFixture: Fixture = {
          ...fix,
          fixedPlayerPositions: updatedFixed,
          matchSquad: updatedSquad,
        };

        setFixtures((prev) =>
          prev.map((f) => (f.id === fix.id ? updatedFixture : f))
        );

        await updateMatchSquad(updatedSquad, true);

        try {
          const headers = await getAuthHeaders();
          await fetch(`/api/fixtures/${fix.id}/fixed-positions`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ fixedPlayerPositions: updatedFixed }),
          });
        } catch (err) {
          console.error('Failed to update fixed positions:', err);
        }

        return { isFixed: false, position: '' };
      } else {
        const currentPeriodLineup = fix.matchSquad.lineupsByPeriod.find(
          (l) => l.period === activePeriod
        );
        const onPitchEntry = currentPeriodLineup?.onPitch.find((e) => e.playerId === playerId);

        const positionToLock =
          targetPosition ||
          onPitchEntry?.position ||
          player?.fixedPosition ||
          (player?.preferredPositions.includes('Goalkeeper') ? 'GK' : 'GK');

        newFixed[playerId] = positionToLock;

        // Synchronize all periods so the player is placed on pitch in positionToLock
        const updatedLineups = fix.matchSquad.lineupsByPeriod.map((lineup) => {
          const pitch = [...lineup.onPitch];
          const subs = [...lineup.subs];

          const existingPitchIdx = pitch.findIndex((e) => e.playerId === playerId);
          const occupyingSlotIdx = pitch.findIndex((e) => e.position === positionToLock);

          if (existingPitchIdx !== -1) {
            if (occupyingSlotIdx !== -1 && occupyingSlotIdx !== existingPitchIdx) {
              const displaced = pitch[occupyingSlotIdx];
              pitch[occupyingSlotIdx] = { playerId, position: positionToLock };
              pitch[existingPitchIdx] = {
                playerId: displaced.playerId,
                position: pitch[existingPitchIdx].position,
              };
            } else {
              pitch[existingPitchIdx] = { playerId, position: positionToLock };
            }
          } else {
            const subIdx = subs.indexOf(playerId);
            if (subIdx !== -1) {
              subs.splice(subIdx, 1);
            }
            if (occupyingSlotIdx !== -1) {
              const displaced = pitch[occupyingSlotIdx];
              pitch[occupyingSlotIdx] = { playerId, position: positionToLock };
              if (!subs.includes(displaced.playerId)) {
                subs.push(displaced.playerId);
              }
            } else {
              pitch.push({ playerId, position: positionToLock });
            }
          }

          return {
            ...lineup,
            onPitch: pitch,
            subs,
          };
        });

        const updatedSquad: MatchSquad = {
          ...fix.matchSquad,
          lineupsByPeriod: updatedLineups,
          fixedPlayerPositions: newFixed,
        };

        const updatedFixture: Fixture = {
          ...fix,
          fixedPlayerPositions: newFixed,
          matchSquad: updatedSquad,
        };

        setFixtures((prev) =>
          prev.map((f) => (f.id === fix.id ? updatedFixture : f))
        );

        await updateMatchSquad(updatedSquad, true);

        try {
          const headers = await getAuthHeaders();
          await fetch(`/api/fixtures/${fix.id}/fixed-positions`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ fixedPlayerPositions: newFixed }),
          });
        } catch (err) {
          console.error('Failed to update fixed positions:', err);
        }

        return { isFixed: true, position: positionToLock };
      }
    },
    [activeFixture, fixtures, activePeriod, isPlayerFixed, players, updateMatchSquad, getAuthHeaders]
  );

  const setFixtureFixedPosition = useCallback(
    async (fixtureId: string, playerId: string, positionOrStatus: string): Promise<void> => {
      const fix = fixtures.find((f) => f.id === fixtureId) || (activeFixture?.id === fixtureId ? activeFixture : null);
      if (!fix) return;

      const newFixed: Record<string, string> = {
        ...(fix.fixedPlayerPositions || {}),
        ...(fix.matchSquad?.fixedPlayerPositions || {}),
      };

      const u = positionOrStatus.trim().toUpperCase();
      if (u === 'DEFAULT') {
        delete newFixed[playerId];
      } else {
        newFixed[playerId] = positionOrStatus.trim();
      }

      const updatedFixed = Object.keys(newFixed).length > 0 ? newFixed : undefined;

      const updatedSquad: MatchSquad | undefined = fix.matchSquad
        ? {
            ...fix.matchSquad,
            fixedPlayerPositions: updatedFixed,
          }
        : undefined;

      const updatedFixture: Fixture = {
        ...fix,
        fixedPlayerPositions: updatedFixed,
        matchSquad: updatedSquad,
      };

      setFixtures((prev) =>
        prev.map((f) => (f.id === fix.id ? updatedFixture : f))
      );

      try {
        const headers = await getAuthHeaders();
        await fetch(`/api/fixtures/${fix.id}/fixed-positions`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ fixedPlayerPositions: updatedFixed }),
        });
      } catch (err) {
        console.error('Failed to update fixture fixed positions:', err);
      }
    },
    [fixtures, activeFixture, getAuthHeaders]
  );

  return (
    <MatchdayContext.Provider
      value={{
        currentUser,
        teams,
        activeTeam,
        activeTeamId,
        players,
        fixtures,
        activeFixture,
        activeFixtureId,
        settings,
        activePeriod,
        availableFormations,
        activeFormation,
        stats,
        isOffline,
        loading,
        error,
        selectedSwapSource,
        userRole,
        isOwner: userRole === 'owner',
        isCoach: userRole === 'coach',
        isViewer: userRole === 'viewer',
        refreshUserClaims,
        activeTab,
        setActiveTab,
        setActivePeriod,
        setActiveTeamId,
        setActiveFixtureId,
        selectSwapSource: setSelectedSwapSource,
        handleSwap,
        replaceSquadPlayer,
        addPlayerToSquad,
        removePlayerFromSquad,
        autoRotateCurrentFixture,
        undoAutoRotate,
        resetMatchSheet,
        updateMatchSquad,
        createTeam,
        updateTeam,
        deleteTeam,
        shareTeam,
        unshareTeam,
        changeFormation,
        createCustomFormation,
        createPlayer,
        bulkCreatePlayers,
        updatePlayer,
        deletePlayer,
        togglePlayerAvailability,
        createFixture,
        updateFixture,
        deleteFixture,
        setMatchCaptain,
        setPlayerOfTheMatch,
        updateSettings,
        createSeason,
        savePostMatchRecording,
        updateFixtureScore,
        updateLiveMatchState,
        executeLiveSubstitution,
        getSuggestedSubs,
        isPlayerFixed,
        getFixedPlayerPosition,
        toggleFixedPlayerPosition,
        setFixtureFixedPosition,
        refreshData,
        enterDemoMode,
        signOutUser,
      }}
    >
      {children}
    </MatchdayContext.Provider>
  );
};

export const useMatchday = () => {
  const context = useContext(MatchdayContext);
  if (!context) {
    throw new Error('useMatchday must be used within a MatchdayProvider');
  }
  return context;
};
