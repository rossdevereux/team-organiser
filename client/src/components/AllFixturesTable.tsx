import React, { useState } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import { Fixture, Player } from '../types';
import { EditFixtureModal } from './EditFixtureModal';
import {
  Calendar,
  Users,
  UserMinus,
  Copy,
  Check,
  Trophy,
  MapPin,
  Clock,
  ArrowRight,
  Filter,
  CheckCircle2,
  FileSpreadsheet,
  Edit3,
  Trash2,
} from 'lucide-react';

interface AllFixturesTableProps {
  selectedSeason: string;
}

export const AllFixturesTable: React.FC<AllFixturesTableProps> = ({ selectedSeason }) => {
  const { fixtures, players, settings, setActiveFixtureId, setActiveTab, deleteFixture } = useMatchday();
  const [copied, setCopied] = useState<boolean>(false);
  const [editingFixture, setEditingFixture] = useState<Fixture | null>(null);

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const currentDefaultSeason = settings.currentSeason || '2026/2027';

  // Sort helper: order by squad number ascending, then name alphabetically
  const sortPlayersByNumberAndName = (a: Player, b: Player): number => {
    const numA = typeof a.squadNumber === 'number' && !isNaN(a.squadNumber) ? a.squadNumber : 9999;
    const numB = typeof b.squadNumber === 'number' && !isNaN(b.squadNumber) ? b.squadNumber : 9999;
    if (numA !== numB) {
      return numA - numB;
    }
    return a.name.localeCompare(b.name);
  };

  // Filter fixtures by selected season
  const filteredFixtures = fixtures.filter((f) => {
    if (selectedSeason === 'ALL') return true;
    return (f.season || currentDefaultSeason) === selectedSeason;
  });

  // Sort chronologically by date
  const sortedFixtures = [...filteredFixtures].sort((a, b) => a.date.localeCompare(b.date));

  // Build Copyable Plain Text / TSV export
  const handleCopyTable = () => {
    if (sortedFixtures.length === 0) return;

    let output = `SUBSHUFFLE - SEASON TEAM SHEETS MATRIX\n`;
    output += `Season: ${selectedSeason}\n`;
    output += `Generated: ${new Date().toLocaleDateString('en-GB')}\n\n`;

    // Fixtures overview header
    output += `FIXTURES:\n`;
    sortedFixtures.forEach((f, i) => {
      output += `[Col ${i + 1}] vs ${f.opponent} | Date: ${f.date} | Venue: ${f.venue} | Season: ${f.season || currentDefaultSeason}\n`;
    });
    output += `\n` + '='.repeat(50) + `\n\n`;

    // Section 1: Matchday Squad per fixture
    output += `--- ROW 1: MATCHDAY SQUADS (Selected Pitch & Bench) ---\n\n`;
    sortedFixtures.forEach((f) => {
      const selectedIds = f.matchSquad?.selectedPlayerIds || [];
      output += `MATCH: vs ${f.opponent} (${f.date})\n`;
      if (selectedIds.length === 0) {
        output += `  (No squad selected yet)\n`;
      } else {
        const sortedSelected = selectedIds
          .map((id) => playerMap.get(id))
          .filter((p): p is Player => Boolean(p))
          .sort(sortPlayersByNumberAndName);

        sortedSelected.forEach((p) => {
          output += `  #${p.squadNumber || '—'} ${p.name}\n`;
        });
      }
      output += `\n`;
    });

    // Section 2: Rested / Absent Players per fixture
    output += `--- ROW 2: RESTED & ABSENT PLAYERS ---\n\n`;
    sortedFixtures.forEach((f) => {
      const selectedIds = new Set(f.matchSquad?.selectedPlayerIds || []);
      const restedPlayers = players
        .filter((p) => !selectedIds.has(p.id))
        .sort(sortPlayersByNumberAndName);

      output += `MATCH: vs ${f.opponent} (${f.date})\n`;
      if (restedPlayers.length === 0) {
        output += `  (No players rested - full squad attending)\n`;
      } else {
        restedPlayers.forEach((p) => {
          const isAway = p.unavailableDates?.includes(f.date);
          const status = isAway ? '[AWAY/HOLIDAY]' : '[RESTED]';
          output += `  #${p.squadNumber || '—'} ${p.name} ${status}\n`;
        });
      }
      output += `\n`;
    });

    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (sortedFixtures.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-slate-400 text-xs">
        No fixtures found for season "{selectedSeason}". Schedule a fixture or switch season filters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>All Fixtures Team Sheet Matrix</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {sortedFixtures.length} Fixtures
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Horizontal cross-season matrix with a column per fixture, showing selected match squads and rested players.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyTable}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-sky-400 hover:text-sky-300 font-semibold text-xs border border-sky-500/30 transition cursor-pointer shadow-sm"
          title="Copy formatted text of all fixtures team sheets to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied to Clipboard!' : 'Copy Matrix Text'}</span>
        </button>
      </div>

      {/* Horizontal Scrolling Matrix Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            {/* Table Header: Columns per Fixture */}
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80">
                {/* Sticky Left Header Column */}
                <th className="py-4 px-4 sticky left-0 z-20 bg-slate-950 border-r border-slate-800 w-52 min-w-[200px] text-slate-400 font-bold uppercase text-[10px] tracking-wider shadow-md">
                  Category / Fixture
                </th>

                {/* Fixture Column Headers */}
                {sortedFixtures.map((fixture) => {
                  const fixtureSeason = fixture.season || currentDefaultSeason;
                  const formattedDate = new Date(fixture.date).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  });

                  return (
                    <th
                      key={fixture.id}
                      className="py-4 px-4 border-r border-slate-800/80 min-w-[220px] max-w-[280px] align-top hover:bg-slate-900/80 transition cursor-pointer"
                      onClick={() => {
                        setActiveFixtureId(fixture.id);
                        setActiveTab('lineup');
                      }}
                      title="Click to view & edit lineup for this match"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border ${
                              fixture.venue === 'Home'
                                ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            {fixture.venue}
                          </span>
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {fixtureSeason}
                          </span>
                        </div>

                        <div className="font-extrabold text-sm text-white hover:text-sky-400 transition flex items-center justify-between gap-1">
                          <span className="truncate">vs {fixture.opponent}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFixture(fixture);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition cursor-pointer"
                              title="Edit fixture logistics"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete fixture vs ${fixture.opponent}? This action cannot be undone.`)) {
                                  deleteFixture(fixture.id);
                                }
                              }}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                              title="Delete fixture"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{formattedDate}</span>
                          <span>•</span>
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{fixture.kickOffTime || '10:00'}</span>
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/80">
              {/* ROW 1: Team Squad (Separated by new line) */}
              <tr className="bg-slate-900/30 hover:bg-slate-900/50 transition">
                <td className="py-4 px-4 sticky left-0 z-10 bg-slate-950 border-r border-slate-800 align-top shadow-md">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wide">
                      <Users className="w-4 h-4" />
                      <span>Match Squad</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Selected pitch & bench players (separated by new line)
                    </p>
                  </div>
                </td>

                {sortedFixtures.map((fixture) => {
                  const selectedIds = fixture.matchSquad?.selectedPlayerIds || [];
                  const selectedPlayers = selectedIds
                    .map((id) => playerMap.get(id))
                    .filter((p): p is Player => Boolean(p))
                    .sort(sortPlayersByNumberAndName);

                  return (
                    <td
                      key={`squad-${fixture.id}`}
                      className="py-4 px-4 border-r border-slate-800/80 align-top font-mono text-xs"
                    >
                      {selectedPlayers.length === 0 ? (
                        <div className="text-slate-500 italic text-[11px] p-2 rounded-lg bg-slate-950/40 border border-dashed border-slate-800">
                          Squad not selected yet
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-bold text-emerald-400/80 uppercase pb-1 border-b border-slate-800/60 flex items-center justify-between">
                            <span>{selectedPlayers.length} Selected</span>
                            {fixture.postMatchRecording && (
                              <span className="text-[9px] text-emerald-300 font-normal">
                                {fixture.postMatchRecording.trackingMode === 'full_credit' ? '100% Credit' : 'Recorded'}
                              </span>
                            )}
                          </div>
                          <div className="divide-y divide-slate-800/40 text-[11px] leading-relaxed">
                            {selectedPlayers.map((player) => (
                              <div
                                key={player.id}
                                className="py-1 flex items-center justify-between hover:text-white transition"
                              >
                                <span className="text-slate-200 font-medium">
                                  {player.squadNumber ? `#${player.squadNumber} ` : ''}
                                  {player.name}
                                </span>
                                <span className="text-[10px] text-slate-500 font-sans">
                                  {player.preferredPositions[0] || 'MID'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* ROW 2: Rested Players (Separated by new line) */}
              <tr className="bg-slate-950/40 hover:bg-slate-900/30 transition">
                <td className="py-4 px-4 sticky left-0 z-10 bg-slate-950 border-r border-slate-800 align-top shadow-md">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wide">
                      <UserMinus className="w-4 h-4" />
                      <span>Rested / Inactive</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Rested and holiday players (separated by new line)
                    </p>
                  </div>
                </td>

                {sortedFixtures.map((fixture) => {
                  const selectedSet = new Set(fixture.matchSquad?.selectedPlayerIds || []);
                  const restedPlayers = players
                    .filter((p) => !selectedSet.has(p.id))
                    .sort(sortPlayersByNumberAndName);

                  return (
                    <td
                      key={`rested-${fixture.id}`}
                      className="py-4 px-4 border-r border-slate-800/80 align-top font-mono text-xs"
                    >
                      {restedPlayers.length === 0 ? (
                        <div className="text-slate-500 text-[11px] italic p-2">
                          All squad players selected
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-bold text-amber-400/80 uppercase pb-1 border-b border-slate-800/60">
                            {restedPlayers.length} Rested / Absent
                          </div>
                          <div className="divide-y divide-slate-800/40 text-[11px] leading-relaxed">
                            {restedPlayers.map((player) => {
                              const isAway = player.unavailableDates?.includes(fixture.date);
                              const isBeforeSignOn = Boolean(
                                player.signOnDate && fixture.date && fixture.date < player.signOnDate
                              );
                              const isAfterLeave = Boolean(
                                player.leaveDate && fixture.date && fixture.date > player.leaveDate
                              );

                              return (
                                <div
                                  key={player.id}
                                  className="py-1 flex items-center justify-between"
                                >
                                  <span className="text-slate-400">
                                    {player.squadNumber ? `#${player.squadNumber} ` : ''}
                                    {player.name}
                                  </span>

                                  {isAway ? (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                                      Away
                                    </span>
                                  ) : isBeforeSignOn ? (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                                      Not Joined
                                    </span>
                                  ) : isAfterLeave ? (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                                      Left
                                    </span>
                                  ) : (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                      Rested
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Fixture Modal */}
      <EditFixtureModal
        fixture={editingFixture}
        isOpen={Boolean(editingFixture)}
        onClose={() => setEditingFixture(null)}
      />
    </div>
  );
};
