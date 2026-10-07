import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, getAuthToken } from '../firebase';
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
} from '../types';
import { getFormationsForTeamSize, findFormation, DEFAULT_FORMATIONS } from '../utils/formations';

interface SwapSource {
  type: 'pitch' | 'sub';
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
  activeTab: 'lineup' | 'matrix' | 'squad' | 'fixtures' | 'stats' | 'teams';
  setActiveTab: (tab: 'lineup' | 'matrix' | 'squad' | 'fixtures' | 'stats' | 'teams') => void;
  setActivePeriod: (period: number) => void;
  setActiveTeamId: (id: string) => void;
  setActiveFixtureId: (id: string) => void;
  selectSwapSource: (source: SwapSource | null) => void;
  handleSwap: (target: SwapSource) => void;
  autoRotateCurrentFixture: (selectedPlayerIds?: string[]) => Promise<void>;
  updateMatchSquad: (newSquad: MatchSquad) => Promise<void>;
  // Team actions
  createTeam: (teamData: Partial<Team>) => Promise<Team | null>;
  updateTeam: (team: Team) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  shareTeam: (teamId: string, email: string) => Promise<void>;
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
  getSuggestedSubs: (fixtureId: string, interval?: number) => Promise<SuggestedSubPlan[]>;
  refreshData: () => Promise<void>;
}

const MatchdayContext = createContext<MatchdayContextType | null>(null);

export const MatchdayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [activeFixtureId, setActiveFixtureId] = useState<string>('');
  const [activePeriod, setActivePeriod] = useState<number>(1);
  const [selectedSwapSource, setSelectedSwapSource] = useState<SwapSource | null>(null);
  const [activeTab, setActiveTab] = useState<
    'lineup' | 'matrix' | 'squad' | 'fixtures' | 'stats' | 'teams'
  >('lineup');
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  // Monitor Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Helper to build headers with auth token or dev fallback
  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (currentUser) {
      const token = await getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      headers['x-user-id'] = currentUser.uid;
      if (currentUser.email) {
        headers['x-user-email'] = currentUser.email;
      }
      if (currentUser.displayName) {
        headers['x-user-name'] = currentUser.displayName;
      }
    } else {
      // Local dev / demo fallback
      headers['x-user-id'] = 'dev-user-123';
      headers['x-user-email'] = 'coach@therovers.local';
    }

    return headers;
  }, [currentUser]);

  // Fetch teams list with offline cache fallback
  const refreshTeams = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/teams', { headers });
      if (res.ok) {
        const data: Team[] = await res.json();
        setTeams(data);
        try {
          localStorage.setItem('subshuffle_cached_teams', JSON.stringify(data));
        } catch (_) {}
        if (data.length > 0 && (!activeTeamId || !data.some((t) => t.id === activeTeamId))) {
          setActiveTeamId(data[0].id);
        }
        return;
      }
    } catch (err) {
      console.warn('Network error fetching teams, trying offline cache:', err);
    }

    // Offline cache fallback
    try {
      const cached = localStorage.getItem('subshuffle_cached_teams') || localStorage.getItem('squadrotate_cached_teams');
      if (cached) {
        const data: Team[] = JSON.parse(cached);
        setTeams(data);
        if (data.length > 0 && (!activeTeamId || !data.some((t) => t.id === activeTeamId))) {
          setActiveTeamId(data[0].id);
        }
      }
    } catch (e) {
      console.error('Failed reading cached teams:', e);
    }
  }, [getAuthHeaders, activeTeamId]);

  // Active Team object
  const activeTeam = useMemo(() => {
    return teams.find((t) => t.id === activeTeamId) || teams[0] || null;
  }, [teams, activeTeamId]);

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

  // Load team-scoped players & fixtures with offline cache fallback
  const refreshTeamData = useCallback(async () => {
    if (!activeTeamId) return;
    try {
      setLoading(true);
      setError(null);
      const headers = await getAuthHeaders();

      const [pRes, fRes] = await Promise.all([
        fetch(`/api/players?teamId=${activeTeamId}`, { headers }),
        fetch(`/api/fixtures?teamId=${activeTeamId}`, { headers }),
      ]);

      if (pRes.ok) {
        const pData: Player[] = await pRes.json();
        setPlayers(pData);
        try {
          localStorage.setItem(`subshuffle_cached_players_${activeTeamId}`, JSON.stringify(pData));
        } catch (_) {}
      }

      if (fRes.ok) {
        const fData: Fixture[] = await fRes.json();
        setFixtures(fData);
        try {
          localStorage.setItem(`subshuffle_cached_fixtures_${activeTeamId}`, JSON.stringify(fData));
        } catch (_) {}
        if (fData.length > 0) {
          if (!activeFixtureId || !fData.some((f) => f.id === activeFixtureId)) {
            const upcoming = fData.find((f) => f.status === 'Upcoming') || fData[0];
            setActiveFixtureId(upcoming.id);
          }
        } else {
          setActiveFixtureId('');
        }
      }
    } catch (err: unknown) {
      console.warn('Network error loading team data, trying offline cache:', err);
      try {
        const cachedP =
          localStorage.getItem(`subshuffle_cached_players_${activeTeamId}`) ||
          localStorage.getItem(`squadrotate_cached_players_${activeTeamId}`);
        if (cachedP) setPlayers(JSON.parse(cachedP));
        const cachedF =
          localStorage.getItem(`subshuffle_cached_fixtures_${activeTeamId}`) ||
          localStorage.getItem(`squadrotate_cached_fixtures_${activeTeamId}`);
        if (cachedF) {
          const fData: Fixture[] = JSON.parse(cachedF);
          setFixtures(fData);
          if (fData.length > 0 && (!activeFixtureId || !fData.some((f) => f.id === activeFixtureId))) {
            setActiveFixtureId(fData[0].id);
          }
        }
      } catch (cacheErr) {
        console.error('Failed reading cached players/fixtures:', cacheErr);
      }
      setError(err instanceof Error ? err.message : 'Offline pitch mode active');
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
    const pitchCount = settings.pitchPlayerCount || 7;
    return getFormationsForTeamSize(pitchCount, settings.customFormations || []);
  }, [settings.pitchPlayerCount, settings.customFormations]);

  // Active formation definition
  const activeFormation = useMemo(() => {
    const pitchCount = settings.pitchPlayerCount || 7;
    return findFormation(
      settings.defaultFormation || '2-3-1',
      pitchCount,
      settings.customFormations || []
    );
  }, [settings.defaultFormation, settings.pitchPlayerCount, settings.customFormations]);

  // Compute fair play match statistics
  const stats = useMemo(() => {
    if (!activeFixture || !activeFixture.matchSquad) return [];
    const totalMatchMinutes = settings.matchPeriodCount * settings.periodDurationMinutes;
    const playerMap = new Map(players.map((p) => [p.id, p]));

    return activeFixture.matchSquad.selectedPlayerIds.map((playerId) => {
      const player = playerMap.get(playerId) || {
        id: playerId,
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

      let minutesPlayed = periodsPlayed.length * settings.periodDurationMinutes;
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

  // Update MatchSquad on server
  const updateMatchSquad = async (newSquad: MatchSquad) => {
    if (!activeFixture) return;
    try {
      setFixtures((prev) =>
        prev.map((f) => (f.id === activeFixture.id ? { ...f, matchSquad: newSquad } : f))
      );

      const headers = await getAuthHeaders();
      const res = await fetch(`/api/fixtures/${activeFixture.id}/squad`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(newSquad),
      });

      if (!res.ok) {
        throw new Error('Failed to save match squad');
      }
    } catch (err) {
      console.error('Error saving match squad:', err);
      refreshData();
    }
  };

  // Auto rotate current fixture
  const autoRotateCurrentFixture = async (selectedPlayerIds?: string[]) => {
    if (!activeFixture) return;
    try {
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

  // Swap players on pitch/sub
  const handleSwap = (target: SwapSource) => {
    if (!selectedSwapSource || !activeFixture || !activeFixture.matchSquad) return;
    if (selectedSwapSource.playerId === target.playerId) {
      setSelectedSwapSource(null);
      return;
    }

    const currentSquad = activeFixture.matchSquad;
    const periodIdx = currentSquad.lineupsByPeriod.findIndex((l) => l.period === activePeriod);
    if (periodIdx === -1) return;

    const currentLineup = { ...currentSquad.lineupsByPeriod[periodIdx] };
    const onPitch = [...currentLineup.onPitch];
    const subs = [...currentLineup.subs];
    const source = selectedSwapSource;

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

  // Formation Change
  const changeFormation = async (formationIdOrName: string) => {
    if (!activeTeam) return;
    const newSettings: TeamSettings = { ...settings, defaultFormation: formationIdOrName };
    const updatedTeam = { ...activeTeam, settings: newSettings };
    await updateTeam(updatedTeam);

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
        activeTab,
        setActiveTab,
        setActivePeriod,
        setActiveTeamId,
        setActiveFixtureId,
        selectSwapSource: setSelectedSwapSource,
        handleSwap,
        autoRotateCurrentFixture,
        updateMatchSquad,
        createTeam,
        updateTeam,
        deleteTeam,
        shareTeam,
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
        getSuggestedSubs,
        refreshData,
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
