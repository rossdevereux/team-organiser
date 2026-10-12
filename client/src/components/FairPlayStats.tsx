import React, { useState, useMemo } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import {
  HeartHandshake,
  Clock,
  Trophy,
} from 'lucide-react';
import { SeasonFairPlayView, SeasonPlayerStat } from './fairplay/SeasonFairPlayView';
import { MatchdayFairPlayView } from './fairplay/MatchdayFairPlayView';

export const FairPlayStats: React.FC = () => {
  const { stats, settings, activeFixture, fixtures, players } = useMatchday();

  // Mode: 'match' or 'season'
  const [viewMode, setViewMode] = useState<'match' | 'season'>('season');
  const [seasonFilter, setSeasonFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'minutes-desc' | 'minutes-asc' | 'matches-desc' | 'name'>('minutes-desc');

  const currentDefaultSeason = settings.currentSeason || '2026/2027';

  // Discover distinct seasons across fixtures
  const availableSeasons = useMemo(() => {
    const list = Array.from(new Set(fixtures.map((f) => f.season || currentDefaultSeason).filter(Boolean)));
    if (!list.includes(currentDefaultSeason)) {
      list.unshift(currentDefaultSeason);
    }
    return list;
  }, [fixtures, currentDefaultSeason]);

  // ================= Season-Long Stats Calculation =================
  const seasonStats: SeasonPlayerStat[] = useMemo(() => {
    if (players.length === 0) return [];

    const relevantFixtures = fixtures.filter((f) => {
      if (seasonFilter === 'ALL') return true;
      return (f.season || currentDefaultSeason) === seasonFilter;
    });

    const completedFixtures = relevantFixtures.filter((f) => f.status === 'Completed' || Boolean(f.matchSquad));

    interface PlayerFixtureAgg {
      fixtureMatches: number;
      fixtureMinutes: number;
      gkCount: number;
      defPeriods: number;
      midPeriods: number;
      attPeriods: number;
      captainCount: number;
      potmCount: number;
    }

    const aggMap = new Map<string, PlayerFixtureAgg>();
    const getAgg = (id: string): PlayerFixtureAgg => {
      let agg = aggMap.get(id);
      if (!agg) {
        agg = { fixtureMatches: 0, fixtureMinutes: 0, gkCount: 0, defPeriods: 0, midPeriods: 0, attPeriods: 0, captainCount: 0, potmCount: 0 };
        aggMap.set(id, agg);
      }
      return agg;
    };

    relevantFixtures.forEach((f) => {
      if (f.captainId) getAgg(f.captainId).captainCount++;
      if (f.playerOfTheMatchId) getAgg(f.playerOfTheMatchId).potmCount++;
      if (!f.matchSquad) return;

      const duration = f.periodDurationMinutes || settings.periodDurationMinutes || 25;
      const matchParticipantIds = new Set<string>();

      f.matchSquad.lineupsByPeriod.forEach((lineup) => {
        lineup.onPitch.forEach((entry) => {
          matchParticipantIds.add(entry.playerId);
          const agg = getAgg(entry.playerId);
          agg.fixtureMinutes += duration;
          const pos = entry.position.toUpperCase();
          if (pos === 'GK') {
            agg.gkCount++;
          } else if (
            pos.startsWith('DEF') ||
            pos === 'CB' ||
            pos === 'LB' ||
            pos === 'RB' ||
            pos === 'LWB' ||
            pos === 'RWB'
          ) {
            agg.defPeriods++;
          } else if (
            pos.startsWith('MID') ||
            pos === 'CM' ||
            pos === 'LM' ||
            pos === 'RM' ||
            pos === 'CDM' ||
            pos === 'CAM'
          ) {
            agg.midPeriods++;
          } else if (
            pos.startsWith('ATT') ||
            pos === 'FW' ||
            pos === 'ST' ||
            pos === 'CF' ||
            pos === 'LW' ||
            pos === 'RW'
          ) {
            agg.attPeriods++;
          }
        });
      });

      matchParticipantIds.forEach((pId) => {
        getAgg(pId).fixtureMatches++;
      });
    });

    const playerMetrics = players.map((p) => {
      const agg = aggMap.get(p.id) || {
        fixtureMatches: 0,
        fixtureMinutes: 0,
        gkCount: 0,
        defPeriods: 0,
        midPeriods: 0,
        attPeriods: 0,
        captainCount: 0,
        potmCount: 0,
      };

      const totalMatches = completedFixtures.length > 0 ? agg.fixtureMatches : p.matchesPlayed || 0;
      const totalMinutes = completedFixtures.length > 0 ? agg.fixtureMinutes : p.totalMinutesPlayed || 0;

      let thirdsCount = 0;
      if (agg.defPeriods > 0) thirdsCount++;
      if (agg.midPeriods > 0) thirdsCount++;
      if (agg.attPeriods > 0) thirdsCount++;
      if (agg.gkCount > 0) thirdsCount++;

      return {
        player: p,
        playerId: p.id,
        totalMatches,
        totalMinutes,
        gkCount: agg.gkCount,
        defPeriods: agg.defPeriods,
        midPeriods: agg.midPeriods,
        attPeriods: agg.attPeriods,
        thirdsPlayedCount: thirdsCount,
        captainCount: agg.captainCount,
        potmCount: agg.potmCount,
      };
    });

    const totalSquadMinutes = playerMetrics.reduce((acc, p) => acc + p.totalMinutes, 0);
    const avgMinutes = playerMetrics.length > 0 ? Math.round(totalSquadMinutes / playerMetrics.length) : 0;
    const tolerance = avgMinutes * 0.15;

    return playerMetrics.map((p) => {
      const diffFromAvg = p.totalMinutes - avgMinutes;
      const isCompliant = avgMinutes === 0 || Math.abs(diffFromAvg) <= tolerance;
      const equityPct = avgMinutes > 0 ? Math.min(100, Math.round((p.totalMinutes / avgMinutes) * 100)) : 100;
      return {
        ...p,
        diffFromAvg,
        equityCompliant: isCompliant,
        equityPercent: equityPct,
      };
    });
  }, [players, fixtures, seasonFilter, currentDefaultSeason, settings.periodDurationMinutes]);

  const { squadAvgMinutes, gkRotationShareCount } = useMemo(() => {
    if (seasonStats.length === 0) {
      return { squadAvgMinutes: 0, gkRotationShareCount: 0 };
    }
    const totalMinutes = seasonStats.reduce((acc, s) => acc + s.totalMinutes, 0);
    const gkCount = seasonStats.filter((s) => s.gkCount > 0).length;

    return {
      squadAvgMinutes: Math.round(totalMinutes / seasonStats.length),
      gkRotationShareCount: gkCount,
    };
  }, [seasonStats]);

  const equityCompliantCount = useMemo(() => {
    if (seasonStats.length === 0 || squadAvgMinutes === 0) return seasonStats.length;
    const tolerance = squadAvgMinutes * 0.15;
    return seasonStats.filter((s) => Math.abs(s.totalMinutes - squadAvgMinutes) <= tolerance).length;
  }, [seasonStats, squadAvgMinutes]);

  const equityRate = seasonStats.length > 0 ? Math.round((equityCompliantCount / seasonStats.length) * 100) : 100;

  const sortedSeasonStats = useMemo(() => {
    const list = [...seasonStats];
    if (sortBy === 'minutes-desc') list.sort((a, b) => b.totalMinutes - a.totalMinutes);
    else if (sortBy === 'minutes-asc') list.sort((a, b) => a.totalMinutes - b.totalMinutes);
    else if (sortBy === 'matches-desc') list.sort((a, b) => b.totalMatches - a.totalMatches);
    else if (sortBy === 'name') list.sort((a, b) => a.player.name.localeCompare(b.player.name));
    return list;
  }, [seasonStats, sortBy]);

  // ================= Matchday Stats Calculation =================
  const totalMatchPlayers = stats.length;
  const compliantMatchPlayers = stats.filter((s) => s.meetsTarget).length;
  const matchComplianceRate = totalMatchPlayers > 0 ? Math.round((compliantMatchPlayers / totalMatchPlayers) * 100) : 0;
  const avgMatchMinutes = totalMatchPlayers > 0 ? Math.round(stats.reduce((acc, s) => acc + s.minutesPlayed, 0) / totalMatchPlayers) : 0;
  const avgMatchPercent = totalMatchPlayers > 0 ? Math.round(stats.reduce((acc, s) => acc + s.gameTimePercent, 0) / totalMatchPlayers) : 0;
  const goalkeepers = stats.filter((s) => s.playedAsGoalkeeper);

  return (
    <div className="space-y-6">
      {/* View Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-sky-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Equal Playing Time & Fair Play Analytics</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                FA Youth Charter Compliant
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Track game time equity across individual matchdays and cumulative season long rotations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('season')}
              className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'season'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Season-Long Fair Play</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('match')}
              className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'match'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Matchday Lineup</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'season' && (
        <SeasonFairPlayView
          seasonStats={sortedSeasonStats}
          availableSeasons={availableSeasons}
          seasonFilter={seasonFilter}
          onSeasonFilterChange={setSeasonFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          equityRate={equityRate}
          equityCompliantCount={equityCompliantCount}
          squadAvgMinutes={squadAvgMinutes}
          overallTarget={settings.targetGameTimePercent}
          gkRotationShareCount={gkRotationShareCount}
        />
      )}

      {viewMode === 'match' && (
        <MatchdayFairPlayView
          activeFixture={activeFixture}
          stats={stats}
          settings={settings}
          matchComplianceRate={matchComplianceRate}
          compliantMatchPlayers={compliantMatchPlayers}
          totalMatchPlayers={totalMatchPlayers}
          avgMatchPercent={avgMatchPercent}
          avgMatchMinutes={avgMatchMinutes}
          goalkeepers={goalkeepers}
        />
      )}
    </div>
  );
};
