import React, { useState, useMemo } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import {
  HeartHandshake,
  Clock,
  Trophy,
  Award,
} from 'lucide-react';
import { SeasonFairPlayView, SeasonPlayerStat } from './fairplay/SeasonFairPlayView';
import { MatchdayFairPlayView } from './fairplay/MatchdayFairPlayView';
import { Fixture } from '../types';

export const FairPlayStats: React.FC = () => {
  const { t } = useTranslation();
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

    const isCountableFixture = (f: Fixture) =>
      f.status === 'Completed' ||
      f.status === 'Played' ||
      Boolean(f.postMatchRecording) ||
      Boolean(f.creditedMinutes);

    const completedFixtures = relevantFixtures.filter(isCountableFixture);

    const totalAvailableMatchMinutes = completedFixtures.reduce((sum, f) => {
      const pCount = f.matchPeriodCount || settings.matchPeriodCount || 2;
      const pDur = f.periodDurationMinutes || settings.periodDurationMinutes || 25;
      return sum + pCount * pDur;
    }, 0);

    interface PlayerFixtureAgg {
      fixtureMatches: number;
      fixtureMinutes: number;
      gkCount: number;
      defPeriods: number;
      midPeriods: number;
      attPeriods: number;
      captainCount: number;
      potmCount: number;
      goalsCount: number;
    }

    const aggMap = new Map<string, PlayerFixtureAgg>();
    const getAgg = (id: string): PlayerFixtureAgg => {
      let agg = aggMap.get(id);
      if (!agg) {
        agg = { fixtureMatches: 0, fixtureMinutes: 0, gkCount: 0, defPeriods: 0, midPeriods: 0, attPeriods: 0, captainCount: 0, potmCount: 0, goalsCount: 0 };
        aggMap.set(id, agg);
      }
      return agg;
    };

    relevantFixtures.forEach((f) => {
      if (f.captainId) getAgg(f.captainId).captainCount++;
      if (f.playerOfTheMatchId) getAgg(f.playerOfTheMatchId).potmCount++;
      if (f.scorers) {
        f.scorers.forEach((s) => {
          if (s.playerId) {
            getAgg(s.playerId).goalsCount++;
          }
        });
      }

      // Position coverage & awards breakdown from match squads
      if (f.matchSquad) {
        f.matchSquad.lineupsByPeriod.forEach((lineup) => {
          lineup.onPitch.forEach((entry) => {
            const agg = getAgg(entry.playerId);
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
      }

      // Minutes & match appearance aggregation:
      // Only aggregate playing minutes for completed, played, or explicitly recorded fixtures
      if (!isCountableFixture(f)) return;

      const pCount = f.matchPeriodCount || settings.matchPeriodCount || 2;
      const duration = f.periodDurationMinutes || settings.periodDurationMinutes || 25;
      const totalMatchMinutes = pCount * duration;

      const fixturePlayerMinutes = new Map<string, number>();

      if (f.postMatchRecording) {
        if (f.postMatchRecording.trackingMode === 'full_credit') {
          const participantIds =
            f.matchSquad?.selectedPlayerIds || Object.keys(f.postMatchRecording.playerMinutes || {});
          participantIds.forEach((pId) => {
            fixturePlayerMinutes.set(pId, totalMatchMinutes);
          });
        } else if (f.postMatchRecording.trackingMode === 'exact') {
          const pMins = f.postMatchRecording.playerMinutes || {};
          for (const [pId, mins] of Object.entries(pMins)) {
            fixturePlayerMinutes.set(pId, Math.max(0, mins));
          }
        }
      } else if (f.creditedMinutes) {
        for (const [pId, mins] of Object.entries(f.creditedMinutes)) {
          fixturePlayerMinutes.set(pId, Math.max(0, mins));
        }
      } else if (f.matchSquad) {
        f.matchSquad.lineupsByPeriod.forEach((lineup) => {
          lineup.onPitch.forEach((entry) => {
            const cur = fixturePlayerMinutes.get(entry.playerId) || 0;
            fixturePlayerMinutes.set(entry.playerId, cur + duration);
          });
        });
      }

      fixturePlayerMinutes.forEach((mins, pId) => {
        const agg = getAgg(pId);
        agg.fixtureMinutes += mins;
        if (mins > 0) {
          agg.fixtureMatches++;
        }
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
        goalsCount: 0,
      };

      const totalMatches = completedFixtures.length > 0
        ? Math.max(p.matchesPlayed || 0, agg.fixtureMatches)
        : p.matchesPlayed || 0;
      const totalMinutes = completedFixtures.length > 0
        ? Math.max(p.totalMinutesPlayed || 0, agg.fixtureMinutes)
        : p.totalMinutesPlayed || 0;

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
        goalsCount: agg.goalsCount,
      };
    });

    const totalSquadMinutes = playerMetrics.reduce((acc, p) => acc + p.totalMinutes, 0);
    const avgMinutes = playerMetrics.length > 0 ? Math.round(totalSquadMinutes / playerMetrics.length) : 0;
    const tolerance = avgMinutes * 0.15;
    const targetThreshold = settings.targetGameTimePercent || 50;

    return playerMetrics.map((p) => {
      const diffFromAvg = p.totalMinutes - avgMinutes;
      const isCompliant = avgMinutes === 0 || Math.abs(diffFromAvg) <= tolerance;
      const equityPct = avgMinutes > 0 ? Math.min(100, Math.round((p.totalMinutes / avgMinutes) * 100)) : 100;
      const gameTimePercent = totalAvailableMatchMinutes > 0
        ? Math.round((p.totalMinutes / totalAvailableMatchMinutes) * 100)
        : equityPct;
      const meetsTarget = gameTimePercent >= targetThreshold;

      return {
        ...p,
        diffFromAvg,
        equityCompliant: isCompliant,
        equityPercent: equityPct,
        gameTimePercent,
        meetsTarget,
      };
    });
  }, [players, fixtures, seasonFilter, currentDefaultSeason, settings.periodDurationMinutes, settings.matchPeriodCount, settings.targetGameTimePercent]);

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
              <h2 className="text-base font-bold text-white">{t('stats.title')}</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                FA Youth Charter Compliant
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {t('stats.subtitle')}
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
              <span>{t('stats.seasonView')}</span>
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
              <span>{t('stats.matchdayView')}</span>
            </button>
          </div>

          <Link
            to="/team-dashboard"
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
            title="Open Team Dashboard: Golden Boot, POTM, The Wall & Awards"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Team Dashboard & Awards</span>
          </Link>
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
