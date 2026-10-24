import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import {
  Trophy,
  Shield,
  Star,
  Award,
  Users,
  Target,
  Flame,
  Printer,
  RefreshCw,
  Search,
  Clock,
  Sparkles,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  TeamDashboardSummary,
  ScorerLeaderboardItem,
  PotmLeaderboardItem,
  DefensiveWallItem,
  PlayerVersatilityItem,
} from '../types';
import { fetchTeamDashboardSummary } from '../utils/dashboardApi';
import { PrintPresentationCard } from './PrintPresentationCard';

export const TeamDashboardView: React.FC = () => {
  const { t } = useTranslation();
  const { activeTeam, activeTeamId, fixtures, settings, currentUser } = useMatchday();

  const currentDefaultSeason = settings.currentSeason || '2026/2027';

  // Discover distinct seasons across fixtures
  const availableSeasons = useMemo(() => {
    const list = Array.from(
      new Set(fixtures.map((f) => f.season || currentDefaultSeason).filter(Boolean))
    );
    if (!list.includes(currentDefaultSeason)) {
      list.unshift(currentDefaultSeason);
    }
    return list;
  }, [fixtures, currentDefaultSeason]);

  const [seasonFilter, setSeasonFilter] = useState<string>('ALL');
  const [summary, setSummary] = useState<TeamDashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<'scorers' | 'potm' | 'defenders'>(
    'scorers'
  );

  const loadSummary = useCallback(async () => {
    if (!activeTeamId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTeamDashboardSummary(activeTeamId, seasonFilter, currentUser?.uid);
      setSummary(data);
    } catch (err: any) {
      console.error('Failed to load dashboard summary:', err);
      setError(err?.message || 'Failed to load season metrics.');
    } finally {
      setLoading(false);
    }
  }, [activeTeamId, seasonFilter, currentUser?.uid]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Filtered lists based on search
  const filteredScorers = useMemo<ScorerLeaderboardItem[]>(() => {
    if (!summary) return [];
    if (!searchQuery.trim()) return summary.scorersLeaderboard;
    const q = searchQuery.toLowerCase();
    return summary.scorersLeaderboard.filter((s) => s.playerName.toLowerCase().includes(q));
  }, [summary, searchQuery]);

  const filteredPotm = useMemo<PotmLeaderboardItem[]>(() => {
    if (!summary) return [];
    if (!searchQuery.trim()) return summary.potmLeaderboard;
    const q = searchQuery.toLowerCase();
    return summary.potmLeaderboard.filter((p) => p.playerName.toLowerCase().includes(q));
  }, [summary, searchQuery]);

  const filteredWall = useMemo<DefensiveWallItem[]>(() => {
    if (!summary) return [];
    if (!searchQuery.trim()) return summary.defensiveWall;
    const q = searchQuery.toLowerCase();
    return summary.defensiveWall.filter((w) => w.playerName.toLowerCase().includes(q));
  }, [summary, searchQuery]);

  const filteredVersatility = useMemo<PlayerVersatilityItem[]>(() => {
    if (!summary) return [];
    if (!searchQuery.trim()) return summary.versatilityHeatmap.players;
    const q = searchQuery.toLowerCase();
    return summary.versatilityHeatmap.players.filter((v) => v.playerName.toLowerCase().includes(q));
  }, [summary, searchQuery]);

  const matchesPlayed = summary?.overview.matchesPlayed ?? 0;
  const wins = summary?.overview.record.wins ?? 0;
  const draws = summary?.overview.record.draws ?? 0;
  const losses = summary?.overview.record.losses ?? 0;
  const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;
  const cleanSheets = summary?.overview.cleanSheets ?? 0;
  const cleanSheetRate = matchesPlayed > 0 ? Math.round((cleanSheets / matchesPlayed) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Controls & Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20">
            <Trophy className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white">
                {activeTeam ? `${activeTeam.name} Dashboard` : 'Team Dashboard'}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Season Analytics & Awards</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Track Golden Boot, Player of the Match, defensive contributions, versatility, and milestone awards.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Season Filter Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">
                All Seasons
              </option>
              {availableSeasons.map((s) => (
                <option key={s} value={s} className="bg-slate-900 text-white">
                  Season {s}
                </option>
              ))}
            </select>
          </div>

          {/* Quick link to Fair Play Minutes */}
          <Link
            to="/stats"
            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5"
            title="View Fair Play playing time equity stats"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fair Play Minutes</span>
          </Link>

          {/* Print Presentation Day Card */}
          {summary && (
            <button
              type="button"
              onClick={() => setPrintModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer"
              title="Print official season awards sheet and presentation day summary"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Awards Sheet</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadSummary}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer disabled:opacity-50"
            title="Refresh season statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && !summary && (
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Aggregating season dashboard stats...</p>
        </div>
      )}

      {error && !summary && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadSummary} className="font-bold underline hover:text-white">
            Retry
          </button>
        </div>
      )}

      {summary && (
        <>
          {/* 1. Overview KPI Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Record W/D/L */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                <span>Record (W-D-L)</span>
                <Trophy className="w-3 h-3 text-amber-400" />
              </div>
              <div className="text-xl font-black text-white font-mono">
                {wins} - {draws} - {losses}
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold">
                {winRate}% Win Rate ({matchesPlayed} matches)
              </div>
            </div>

            {/* Goals Scored / Conceded */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                <span>Goals For / Against</span>
                <Target className="w-3 h-3 text-sky-400" />
              </div>
              <div className="text-xl font-black text-white font-mono">
                {summary.overview.goalsFor} : {summary.overview.goalsAgainst}
              </div>
              <div className="text-[11px] text-sky-400 font-semibold font-mono">
                {summary.overview.goalDifference > 0 ? `+${summary.overview.goalDifference}` : summary.overview.goalDifference} Goal Diff
              </div>
            </div>

            {/* Clean Sheets */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                <span>Clean Sheets</span>
                <Shield className="w-3 h-3 text-indigo-400" />
              </div>
              <div className="text-xl font-black text-indigo-300 font-mono">
                {cleanSheets}
              </div>
              <div className="text-[11px] text-indigo-400 font-semibold">
                {cleanSheetRate}% Shutout Rate
              </div>
            </div>

            {/* Squad Equity Rate */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                <span>Squad Equity</span>
                <Users className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="text-xl font-black text-emerald-400 font-mono">
                {summary.overview.squadEquityScore}%
              </div>
              <div className="text-[11px] text-emerald-500 font-semibold">
                Target Compliance
              </div>
            </div>

            {/* Attendance Rate */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                <span>Attendance</span>
                <Clock className="w-3 h-3 text-purple-400" />
              </div>
              <div className="text-xl font-black text-purple-300 font-mono">
                {summary.overview.squadAttendanceRate}%
              </div>
              <div className="text-[11px] text-purple-400 font-semibold">
                Avg Squad Turnout
              </div>
            </div>

            {/* Designated GK Coverage */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                <span>Keeper Coverage</span>
                <Shield className="w-3 h-3 text-teal-400" />
              </div>
              <div className="text-xl font-black text-teal-300 font-mono">
                {summary.versatilityHeatmap.designatedGkCoveragePercent}%
              </div>
              <div className="text-[11px] text-teal-400 font-semibold">
                Designated Goalkeeper
              </div>
            </div>
          </div>

          {/* 2. Milestones & Achievement Badges Ribbon */}
          {summary.milestones.length > 0 && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900/80 via-indigo-950/30 to-slate-900/80 border border-indigo-500/20 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Season Milestones & Achievements ({summary.milestones.length})
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400">
                  Auto-calculated from match records & awards
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {summary.milestones.map((badge) => (
                  <div
                    key={badge.id}
                    className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-850 hover:border-indigo-500/40 transition flex items-start gap-3 shadow-sm group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover:scale-105 transition-transform flex items-center justify-center text-xl shrink-0 border border-slate-700/60">
                      {badge.icon}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-white truncate">{badge.title}</span>
                        {badge.count && (
                          <span className="text-[10px] font-mono font-bold text-amber-400 shrink-0">
                            #{badge.count}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        {badge.description}
                      </p>
                      {badge.playerName && (
                        <div className="text-[10px] font-semibold text-indigo-400 pt-0.5">
                          Awarded to: {badge.playerName}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Leaderboards Section (Tabs: Scorers, POTM, Defensive Wall) */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl overflow-hidden">
            {/* Header with Search and Tab Switcher */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              {/* Leaderboard Tabs */}
              <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveLeaderboardTab('scorers')}
                  className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    activeLeaderboardTab === 'scorers'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Golden Boot ({summary.scorersLeaderboard.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLeaderboardTab('potm')}
                  className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    activeLeaderboardTab === 'potm'
                      ? 'bg-purple-500 text-white shadow-md font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>Player of the Match ({summary.potmLeaderboard.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLeaderboardTab('defenders')}
                  className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    activeLeaderboardTab === 'defenders'
                      ? 'bg-sky-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>The Wall ({summary.defensiveWall.length})</span>
                </button>
              </div>

              {/* Player Search Bar */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by player name..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* TAB CONTENT: Golden Boot Scorers */}
            {activeLeaderboardTab === 'scorers' && (
              <div className="p-4 sm:p-5">
                {filteredScorers.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs space-y-1">
                    <Target className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-400">No goal scorers recorded yet</p>
                    <p>Goals logged in completed match sheets will appear on the leaderboard.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                          <th className="py-2.5 px-3">Rank</th>
                          <th className="py-2.5 px-3">Player</th>
                          <th className="py-2.5 px-3 text-center">Matches</th>
                          <th className="py-2.5 px-3 text-center">Goals</th>
                          <th className="py-2.5 px-3 text-center">Goals / Match</th>
                          <th className="py-2.5 px-3 text-right">Special Feats</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {filteredScorers.map((item, index) => {
                          const rank = index + 1;
                          return (
                            <tr
                              key={item.playerId}
                              className="hover:bg-slate-850/50 transition-colors group"
                            >
                              <td className="py-3 px-3">
                                {rank === 1 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20">
                                    1
                                  </span>
                                ) : rank === 2 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-950 font-black text-xs shadow-md">
                                    2
                                  </span>
                                ) : rank === 3 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs shadow-md">
                                    3
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono pl-2">{rank}</span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-200">
                                    {item.squadNumber ? `#${item.squadNumber}` : item.playerName.slice(0, 2).toUpperCase()}
                                  </div>
                                  <span className="font-bold text-white text-xs group-hover:text-amber-400 transition-colors">
                                    {item.playerName}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center text-slate-300 font-mono">
                                {item.matchesPlayed}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 font-mono font-black text-sm border border-amber-500/30">
                                  {item.goals}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center text-slate-400 font-mono">
                                {item.goalsPerMatch}
                              </td>
                              <td className="py-3 px-3 text-right">
                                {item.hatTricks > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                                    <Flame className="w-3 h-3 text-rose-400" />
                                    <span>{item.hatTricks} Hat-trick{item.hatTricks > 1 ? 's' : ''}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-600 text-[10px]">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Player of the Match */}
            {activeLeaderboardTab === 'potm' && (
              <div className="p-4 sm:p-5">
                {filteredPotm.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs space-y-1">
                    <Star className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-400">No POTM awards assigned yet</p>
                    <p>Select a Player of the Match when editing completed fixtures.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                          <th className="py-2.5 px-3">Rank</th>
                          <th className="py-2.5 px-3">Player</th>
                          <th className="py-2.5 px-3 text-center">Matches</th>
                          <th className="py-2.5 px-3 text-center">Awards Count</th>
                          <th className="py-2.5 px-3 text-right">Most Recent Award</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {filteredPotm.map((item, index) => {
                          const rank = index + 1;
                          return (
                            <tr
                              key={item.playerId}
                              className="hover:bg-slate-850/50 transition-colors group"
                            >
                              <td className="py-3 px-3">
                                {rank === 1 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white font-black text-xs shadow-md shadow-purple-500/20">
                                    1
                                  </span>
                                ) : rank === 2 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-950 font-black text-xs shadow-md">
                                    2
                                  </span>
                                ) : rank === 3 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-800 text-white font-black text-xs shadow-md">
                                    3
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono pl-2">{rank}</span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-200">
                                    {item.squadNumber ? `#${item.squadNumber}` : item.playerName.slice(0, 2).toUpperCase()}
                                  </div>
                                  <span className="font-bold text-white text-xs group-hover:text-purple-400 transition-colors">
                                    {item.playerName}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center text-slate-300 font-mono">
                                {item.matchesPlayed}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 font-mono font-black text-sm border border-purple-500/30 flex items-center justify-center gap-1 w-fit mx-auto">
                                  <Star className="w-3.5 h-3.5 text-purple-400 fill-purple-400" />
                                  <span>{item.awardsCount}</span>
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                {item.latestAward?.opponent ? (
                                  <span className="text-[11px] text-slate-300">
                                    vs <strong>{item.latestAward.opponent}</strong>
                                    {item.latestAward.date && (
                                      <span className="text-slate-500 ml-1.5 font-mono">
                                        ({item.latestAward.date})
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-slate-600 text-[10px]">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: The Wall (Defensive Recognition) */}
            {activeLeaderboardTab === 'defenders' && (
              <div className="p-4 sm:p-5 space-y-4">
                <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/20 text-xs text-sky-200 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>
                    <strong>The Wall Recognition:</strong> Equal celebration for Goalkeepers and Defenders.
                    Clean sheets are credited to players on pitch during shutout periods and matches.
                  </span>
                </div>

                {filteredWall.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs space-y-1">
                    <Shield className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-400">No defensive records found</p>
                    <p>Clean sheets and defensive minutes will be tracked automatically.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                          <th className="py-2.5 px-3">Rank</th>
                          <th className="py-2.5 px-3">Player</th>
                          <th className="py-2.5 px-3 text-center">Matches</th>
                          <th className="py-2.5 px-3 text-center">Clean Sheets on Pitch</th>
                          <th className="py-2.5 px-3 text-center">Defensive + GK Mins</th>
                          <th className="py-2.5 px-3 text-right">Clean Sheet %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {filteredWall.map((item, index) => {
                          const rank = index + 1;
                          return (
                            <tr
                              key={item.playerId}
                              className="hover:bg-slate-850/50 transition-colors group"
                            >
                              <td className="py-3 px-3">
                                {rank === 1 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-500 text-slate-950 font-black text-xs shadow-md shadow-sky-500/20">
                                    1
                                  </span>
                                ) : rank === 2 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-950 font-black text-xs shadow-md">
                                    2
                                  </span>
                                ) : rank === 3 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-800 text-white font-black text-xs shadow-md">
                                    3
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono pl-2">{rank}</span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-200">
                                    {item.squadNumber ? `#${item.squadNumber}` : item.playerName.slice(0, 2).toUpperCase()}
                                  </div>
                                  <span className="font-bold text-white text-xs group-hover:text-sky-400 transition-colors">
                                    {item.playerName}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center text-slate-300 font-mono">
                                {item.matchesPlayed}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 font-mono font-black text-sm border border-sky-500/30">
                                  {item.cleanSheets}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center text-slate-300 font-mono">
                                {item.defensiveMinutes + item.gkMinutes}m
                                <span className="text-[10px] text-slate-500 ml-1">
                                  ({item.gkMinutes}m GK)
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className="font-bold text-sky-400 font-mono text-xs">
                                  {item.cleanSheetRate}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Positional Versatility Breakdown & Heatmap */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Positional Versatility & Minutes Distribution
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  Visual breakdown of player rotation across Goalkeeper, Defense, Midfield, and Attack.
                </p>
              </div>

              {/* Position Legend */}
              <div className="flex items-center gap-3 text-[11px] font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> GK
                </span>
                <span className="flex items-center gap-1.5 text-sky-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> DEF
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> MID
                </span>
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> ATT
                </span>
              </div>
            </div>

            {filteredVersatility.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No versatility data available yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredVersatility.map((pv) => {
                  const total = Math.max(1, pv.totalMinutes);
                  const gkMins = pv.minutesByPosition.Goalkeeper || 0;
                  const defMins = pv.minutesByPosition.Defence || 0;
                  const midMins = pv.minutesByPosition.Midfield || 0;
                  const attMins = pv.minutesByPosition.Attack || 0;

                  const gkPct = Math.round((gkMins / total) * 100);
                  const defPct = Math.round((defMins / total) * 100);
                  const midPct = Math.round((midMins / total) * 100);
                  const attPct = Math.round((attMins / total) * 100);

                  return (
                    <div
                      key={pv.playerId}
                      className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">
                            {pv.squadNumber ? `#${pv.squadNumber}` : pv.playerName.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-white">{pv.playerName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              pv.versatilityLevel === 'Total Footballer'
                                ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                                : pv.versatilityLevel === 'Versatile'
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                : pv.versatilityLevel === 'Developing'
                                ? 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {pv.versatilityLevel}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {pv.totalMinutes}m
                          </span>
                        </div>
                      </div>

                      {/* Multi-segment stacked progress bar */}
                      <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
                        {gkPct > 0 && (
                          <div
                            style={{ width: `${gkPct}%` }}
                            className="bg-emerald-500 transition-all duration-300"
                            title={`GK: ${gkMins}m (${gkPct}%)`}
                          />
                        )}
                        {defPct > 0 && (
                          <div
                            style={{ width: `${defPct}%` }}
                            className="bg-sky-500 transition-all duration-300"
                            title={`DEF: ${defMins}m (${defPct}%)`}
                          />
                        )}
                        {midPct > 0 && (
                          <div
                            style={{ width: `${midPct}%` }}
                            className="bg-amber-500 transition-all duration-300"
                            title={`MID: ${midMins}m (${midPct}%)`}
                          />
                        )}
                        {attPct > 0 && (
                          <div
                            style={{ width: `${attPct}%` }}
                            className="bg-rose-500 transition-all duration-300"
                            title={`ATT: ${attMins}m (${attPct}%)`}
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <span>GK: {gkMins}m</span>
                        <span>DEF: {defMins}m</span>
                        <span>MID: {midMins}m</span>
                        <span>ATT: {attMins}m</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Official Print Presentation Card Modal */}
      {summary && (
        <PrintPresentationCard
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          summary={summary}
        />
      )}
    </div>
  );
};
