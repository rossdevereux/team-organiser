import React, { useState } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import { Player, BroadPosition, SPECIFIC_POSITIONS_MAP } from '../types';
import { EmptyState } from './EmptyState';
import { useToast } from '../context/ToastContext';
import {
  Users,
  UserPlus,
  Calendar,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  Palmtree,
  CalendarDays,
  Plus,
  CalendarOff,
  AlertCircle,
  Download,
  Upload,
  FileSpreadsheet,
} from 'lucide-react';

const ALL_POSITIONS: BroadPosition[] = ['Goalkeeper', 'Defence', 'Midfield', 'Attack'];

function getInitials(name?: string): string {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const SquadManager: React.FC = () => {
  const {
    players,
    fixtures,
    activeFixture,
    createPlayer,
    bulkCreatePlayers,
    updatePlayer,
    deletePlayer,
  } = useMatchday();

  const { showToast } = useToast();

  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // CSV Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [csvRawText, setCsvRawText] = useState<string>('');
  const [parsedImportPlayers, setParsedImportPlayers] = useState<Partial<Player>[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Player Absence / Holiday Modal state
  const [managingHolidaysPlayer, setManagingHolidaysPlayer] = useState<Player | null>(null);
  const [holidayStartDate, setHolidayStartDate] = useState<string>('');
  const [holidayEndDate, setHolidayEndDate] = useState<string>('');
  const [holidaySingleDate, setHolidaySingleDate] = useState<string>('');

  // Player Form State
  const [name, setName] = useState<string>('');
  const [squadNumber, setSquadNumber] = useState<string>('');
  const [preferredPositions, setPreferredPositions] = useState<BroadPosition[]>(['Midfield']);
  const [specificPositions, setSpecificPositions] = useState<string[]>([]);
  const [signOnDate, setSignOnDate] = useState<string>('');
  const [leaveDate, setLeaveDate] = useState<string>('');

  const fixtureDate = activeFixture?.date || new Date().toISOString().split('T')[0];

  const handleExportCSV = () => {
    if (players.length === 0) return;
    const headers = [
      'Name',
      'SquadNumber',
      'PreferredPositions',
      'SpecificPositions',
      'SignOnDate',
      'LeaveDate',
      'MatchesPlayed',
      'TotalMinutesPlayed',
    ];
    const rows = players.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`,
      p.squadNumber !== undefined ? p.squadNumber : '',
      `"${p.preferredPositions.join(';')}"`,
      `"${(p.specificPositions || []).join(';')}"`,
      p.signOnDate || '',
      p.leaveDate || '',
      p.matchesPlayed || 0,
      p.totalMinutesPlayed || 0,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `squad_roster_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSVText = (text: string) => {
    setCsvRawText(text);
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setParsedImportPlayers([]);
      return;
    }

    const first = lines[0].toLowerCase();
    const hasHeader = first.includes('name') || first.includes('player');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const parsed: Partial<Player>[] = [];
    dataLines.forEach((line) => {
      const delimiter = line.includes('\t') ? '\t' : ',';
      const parts = line.split(delimiter).map((c) => c.replace(/^"|"$/g, '').trim());
      if (parts.length === 0 || !parts[0]) return;

      const pName = parts[0];
      const pNum = parts[1] && !isNaN(Number(parts[1])) ? parseInt(parts[1], 10) : undefined;
      const rawPref = parts[2] ? parts[2].split(/[;,|]/).map((s) => s.trim()).filter(Boolean) : [];
      const validBroad: BroadPosition[] = ['Goalkeeper', 'Defence', 'Midfield', 'Attack'];
      const preferred: BroadPosition[] = [];
      rawPref.forEach((rp) => {
        const found = validBroad.find((b) => b.toLowerCase() === rp.toLowerCase());
        if (found && !preferred.includes(found)) preferred.push(found);
      });
      if (preferred.length === 0) preferred.push('Midfield');

      const specific = parts[3] ? parts[3].split(/[;,|]/).map((s) => s.trim()).filter(Boolean) : [];
      const signOnDate = parts[4] || undefined;
      const leaveDate = parts[5] || undefined;

      parsed.push({
        name: pName,
        squadNumber: pNum,
        preferredPositions: preferred,
        specificPositions: specific,
        signOnDate,
        leaveDate,
        unavailableDates: [],
        matchesPlayed: 0,
        totalMinutesPlayed: 0,
      });
    });

    setParsedImportPlayers(parsed);
  };

  const handleExecuteImport = async () => {
    if (parsedImportPlayers.length === 0) return;
    setIsImporting(true);
    try {
      const count = parsedImportPlayers.length;
      await bulkCreatePlayers(parsedImportPlayers);
      setIsImportModalOpen(false);
      setCsvRawText('');
      setParsedImportPlayers([]);
      showToast(`Successfully imported ${count} players to squad roster!`, 'success');
    } catch (err) {
      console.error('Failed importing players:', err);
      showToast('Failed to import players. Please check CSV format.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleStartAdd = () => {
    setName('');
    setSquadNumber('');
    setPreferredPositions(['Midfield']);
    setSpecificPositions([]);
    setSignOnDate('');
    setLeaveDate('');
    setIsAdding(true);
    setEditingId(null);
  };

  const handleStartEdit = (p: Player) => {
    setEditingId(p.id);
    setName(p.name);
    setSquadNumber(p.squadNumber ? String(p.squadNumber) : '');
    setPreferredPositions(p.preferredPositions);
    setSpecificPositions(p.specificPositions || []);
    setSignOnDate(p.signOnDate || '');
    setLeaveDate(p.leaveDate || '');
    setIsAdding(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const num = squadNumber ? parseInt(squadNumber, 10) : undefined;
    const playerName = name.trim();

    if (isAdding) {
      await createPlayer({
        name: playerName,
        squadNumber: num,
        preferredPositions,
        specificPositions,
        unavailableDates: [],
        signOnDate: signOnDate || undefined,
        leaveDate: leaveDate || undefined,
        matchesPlayed: 0,
        totalMinutesPlayed: 0,
      });
      setIsAdding(false);
      showToast('Player added to squad roster!', 'success');
    } else if (editingId) {
      const existing = players.find((p) => p.id === editingId);
      if (existing) {
        await updatePlayer({
          ...existing,
          name: playerName,
          squadNumber: num,
          preferredPositions,
          specificPositions,
          signOnDate: signOnDate || undefined,
          leaveDate: leaveDate || undefined,
        });
      }
      setEditingId(null);
      showToast('Player profile updated successfully!', 'success');
    }

    setName('');
    setSquadNumber('');
    setSpecificPositions([]);
    setSignOnDate('');
    setLeaveDate('');
  };

  const togglePosition = (pos: BroadPosition) => {
    if (preferredPositions.includes(pos)) {
      if (preferredPositions.length > 1) {
        setPreferredPositions(preferredPositions.filter((p) => p !== pos));
      }
    } else {
      setPreferredPositions([...preferredPositions, pos]);
    }
  };

  const toggleSpecificPosition = (specPos: string, broadCategory: BroadPosition) => {
    if (specificPositions.includes(specPos)) {
      setSpecificPositions(specificPositions.filter((s) => s !== specPos));
    } else {
      setSpecificPositions([...specificPositions, specPos]);
      if (!preferredPositions.includes(broadCategory)) {
        setPreferredPositions([...preferredPositions, broadCategory]);
      }
    }
  };

  // Holiday / Absence Handlers
  const handleAddSingleHoliday = async () => {
    if (!managingHolidaysPlayer || !holidaySingleDate) return;
    const currentDates = new Set(managingHolidaysPlayer.unavailableDates || []);
    currentDates.add(holidaySingleDate);

    const updated = {
      ...managingHolidaysPlayer,
      unavailableDates: Array.from(currentDates).sort(),
    };
    await updatePlayer(updated);
    setManagingHolidaysPlayer(updated);
    setHolidaySingleDate('');
  };

  const handleAddHolidayRange = async () => {
    if (!managingHolidaysPlayer || !holidayStartDate || !holidayEndDate) return;
    const start = new Date(holidayStartDate);
    const end = new Date(holidayEndDate);
    if (end < start) return;

    const currentDates = new Set(managingHolidaysPlayer.unavailableDates || []);
    const curr = new Date(start);
    while (curr <= end) {
      currentDates.add(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    const updated = {
      ...managingHolidaysPlayer,
      unavailableDates: Array.from(currentDates).sort(),
    };
    await updatePlayer(updated);
    setManagingHolidaysPlayer(updated);
    setHolidayStartDate('');
    setHolidayEndDate('');
  };

  const handleToggleFixtureDate = async (fDate: string) => {
    if (!managingHolidaysPlayer) return;
    const current = new Set(managingHolidaysPlayer.unavailableDates || []);
    if (current.has(fDate)) {
      current.delete(fDate);
    } else {
      current.add(fDate);
    }
    const updated = {
      ...managingHolidaysPlayer,
      unavailableDates: Array.from(current).sort(),
    };
    await updatePlayer(updated);
    setManagingHolidaysPlayer(updated);
  };

  const handleRemoveDate = async (targetDate: string) => {
    if (!managingHolidaysPlayer) return;
    const current = (managingHolidaysPlayer.unavailableDates || []).filter((d) => d !== targetDate);
    const updated = {
      ...managingHolidaysPlayer,
      unavailableDates: current,
    };
    await updatePlayer(updated);
    setManagingHolidaysPlayer(updated);
  };

  const handleClearAllDates = async () => {
    if (!managingHolidaysPlayer) return;
    const updated = {
      ...managingHolidaysPlayer,
      unavailableDates: [],
    };
    await updatePlayer(updated);
    setManagingHolidaysPlayer(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Full Squad Roster ({players.length})</h2>
            <p className="text-xs text-slate-400">
              Manage player profiles, preferred positions, and holiday/absence dates for fair rotation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={players.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition cursor-pointer disabled:opacity-40"
            title="Download full squad roster as CSV file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCsvRawText('');
              setParsedImportPlayers([]);
              setIsImportModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold text-xs transition cursor-pointer"
            title="Bulk import squad roster from CSV or spreadsheet copy-paste"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleStartAdd}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-lg shadow-sky-600/20 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Player</span>
          </button>
        </div>
      </div>

      {/* CSV Bulk Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Bulk Player Roster CSV Import</h3>
                  <p className="text-[11px] text-slate-400">
                    Import multiple players instantly from a CSV file or Excel spreadsheet copy-paste.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Instruction banner & sample template */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300 text-[11px]">Expected Column Order:</span>
                <button
                  type="button"
                  onClick={() =>
                    parseCSVText(
                      `Name,SquadNumber,PreferredPositions,SpecificPositions,SignOnDate,LeaveDate\nJack Owen,7,Midfield,Central Midfield,2026-09-01,\nNoah Clarke,4,Defence,Centre Back,2026-09-01,\nFinley Bell,1,Goalkeeper,Goalkeeper,2026-09-01,`
                    )
                  }
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold"
                >
                  ⚡ Load Sample CSV
                </button>
              </div>
              <p className="font-mono text-[10px] text-slate-400">
                Name, SquadNumber, PreferredPositions (separated by ;), SpecificPositions (separated by ;), SignOnDate (YYYY-MM-DD), LeaveDate
              </p>
            </div>

            {/* File Upload / Paste Area */}
            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between">
                <label className="text-slate-400 font-semibold">Paste CSV or Spreadsheet Data:</label>
                <label className="text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer font-semibold flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose .csv file</span>
                  <input
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const text = event.target?.result as string;
                          if (text) parseCSVText(text);
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </label>
              </div>

              <textarea
                value={csvRawText}
                onChange={(e) => parseCSVText(e.target.value)}
                placeholder={`Paste spreadsheet rows or CSV lines here...\nExample:\nEthan Wright, 10, Midfield;Attack, Left Midfield, 2026-09-01`}
                rows={4}
                className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 shrink-0"
              />

              {/* Parsed Preview Table */}
              {parsedImportPlayers.length > 0 && (
                <div className="flex-1 overflow-y-auto space-y-2 border border-slate-800 rounded-2xl p-3 bg-slate-950/60">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                    <span>Parsed Players Preview ({parsedImportPlayers.length})</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Ready to import
                    </span>
                  </div>

                  <div className="divide-y divide-slate-800/80 text-[11px]">
                    {parsedImportPlayers.map((p, idx) => (
                      <div key={idx} className="py-1.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono text-slate-400 w-5">#{p.squadNumber || '—'}</span>
                          <span className="font-semibold text-white truncate">{p.name}</span>
                        </div>
                        <div className="text-slate-400 truncate text-[10px]">
                          {p.preferredPositions?.join(', ')}
                          {p.specificPositions && p.specificPositions.length > 0
                            ? ` (${p.specificPositions.join(', ')})`
                            : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-850 text-slate-400 hover:text-white font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={parsedImportPlayers.length === 0 || isImporting}
                onClick={handleExecuteImport}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold shadow-lg shadow-indigo-600/20 transition cursor-pointer flex items-center gap-1.5"
              >
                {isImporting ? (
                  <span>Importing...</span>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import {parsedImportPlayers.length} Players</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Holiday / Absence Management Modal */}
      {managingHolidaysPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Palmtree className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Manage Holidays & Absences</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {managingHolidaysPlayer.name} {managingHolidaysPlayer.squadNumber ? `#${managingHolidaysPlayer.squadNumber}` : ''}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    The rotation algorithm will automatically exclude this player from matches on these dates.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setManagingHolidaysPlayer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Tabs / Add inputs */}
            <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
              {/* Option A: Add Date Range / Holiday */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <h4 className="font-semibold text-white flex items-center gap-1.5 text-xs">
                  <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
                  <span>Add Holiday Date Range (e.g. Vacation / Half-Term)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">From Date</label>
                    <input
                      type="date"
                      value={holidayStartDate}
                      onChange={(e) => setHolidayStartDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">To Date</label>
                    <input
                      type="date"
                      value={holidayEndDate}
                      onChange={(e) => setHolidayEndDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddHolidayRange}
                  disabled={!holidayStartDate || !holidayEndDate}
                  className="w-full py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Holiday Range</span>
                </button>
              </div>

              {/* Option B: Add Single Date */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <h4 className="font-semibold text-white flex items-center gap-1.5 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  <span>Add Single Unavailable Day</span>
                </h4>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={holidaySingleDate}
                    onChange={(e) => setHolidaySingleDate(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-sky-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleAddSingleHoliday}
                    disabled={!holidaySingleDate}
                    className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Day</span>
                  </button>
                </div>
              </div>

              {/* Option C: Quick Pick From Upcoming Fixtures */}
              {fixtures.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <h4 className="font-semibold text-white flex items-center gap-1.5 text-xs">
                    <AlertCircle className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Quick-Toggle for Upcoming Fixture Dates</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {fixtures.map((f) => {
                      const isUnavailable = (managingHolidaysPlayer.unavailableDates || []).includes(f.date);
                      const fFormatted = new Date(f.date).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      });
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => handleToggleFixtureDate(f.date)}
                          className={`p-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                            isUnavailable
                              ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <span className="font-semibold block truncate">vs {f.opponent}</span>
                            <span className="text-[10px] text-slate-400">{fFormatted}</span>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              isUnavailable
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {isUnavailable ? 'Away' : 'Available'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Scheduled Absences List */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span>Scheduled Unavailable Dates ({managingHolidaysPlayer.unavailableDates?.length || 0})</span>
                  </span>
                  {(managingHolidaysPlayer.unavailableDates || []).length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllDates}
                      className="text-[11px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                    >
                      Clear all dates
                    </button>
                  )}
                </div>

                {(managingHolidaysPlayer.unavailableDates || []).length === 0 ? (
                  <div className="p-4 text-center rounded-xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs">
                    No holiday dates currently set. {managingHolidaysPlayer.name} is fully available for all matches.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {managingHolidaysPlayer.unavailableDates.map((dateStr) => {
                      const displayDate = new Date(dateStr).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      });
                      return (
                        <div
                          key={dateStr}
                          className="p-2.5 rounded-xl bg-slate-950 border border-rose-900/40 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <CalendarOff className="w-3.5 h-3.5 text-rose-400" />
                            <div>
                              <span className="font-semibold text-white block">{displayDate}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{dateStr}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDate(dateStr)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition"
                            title="Remove date"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setManagingHolidaysPlayer(null)}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-lg shadow-sky-600/20 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Form Modal / Box */}
      {(isAdding || editingId) && (
        <form
          onSubmit={handleSave}
          className="p-5 rounded-2xl bg-slate-900 border border-sky-500/40 shadow-2xl space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>{isAdding ? 'Add Player to Squad' : 'Edit Player Details'}</span>
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
              }}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Player Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Leo Davies"
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Squad Number</label>
              <input
                type="number"
                value={squadNumber}
                onChange={(e) => setSquadNumber(e.target.value)}
                placeholder="e.g. 7"
                min="1"
                max="99"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Sign-on Date (Registered) <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="date"
                value={signOnDate}
                onChange={(e) => setSignOnDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500 font-medium"
              />
              <span className="text-[10px] text-slate-500">Player cannot be picked before this date</span>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Leave Date (Transferred / Inactive) <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="date"
                value={leaveDate}
                onChange={(e) => setLeaveDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500 font-medium"
              />
              <span className="text-[10px] text-slate-500">Player cannot be picked after this date</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 text-xs">
              Preferred Positions (Select 1 or more broad categories)
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_POSITIONS.map((pos) => {
                const isSelected = preferredPositions.includes(pos);
                return (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => togglePosition(pos)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{pos}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Specific Position Roles Selector */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <label className="block text-slate-400 font-semibold text-xs">
                Specific Position Roles <span className="text-slate-500 font-normal">(Optional — select specific tactical roles)</span>
              </label>
              {specificPositions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSpecificPositions([])}
                  className="text-[10px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                >
                  Clear specific roles ({specificPositions.length})
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {(['Goalkeeper', 'Defence', 'Midfield', 'Attack'] as BroadPosition[]).map((category) => {
                const roles = SPECIFIC_POSITIONS_MAP[category] || [];
                const isBroadActive = preferredPositions.includes(category);

                return (
                  <div
                    key={category}
                    className={`p-2.5 rounded-xl border transition ${
                      isBroadActive
                        ? 'bg-slate-950/80 border-slate-800'
                        : 'bg-slate-950/30 border-slate-900/80 opacity-70'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                      <span>{category} Roles</span>
                      {isBroadActive && (
                        <span className="text-[9px] text-sky-400 font-medium">Selected Broad</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {roles.map((role) => {
                        const isSelected = specificPositions.includes(role);
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => toggleSpecificPosition(role, category)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition cursor-pointer flex items-center gap-1 ${
                              isSelected
                                ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/50 shadow-sm font-semibold'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-indigo-400 shrink-0" />}
                            <span>{role}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-850 text-slate-400 hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition cursor-pointer"
            >
              {isAdding ? 'Save Player' : 'Update Player'}
            </button>
          </div>
        </form>
      )}

      {/* Players List Grid or Illustrated Empty State */}
      {players.length === 0 ? (
        <EmptyState
          variant="roster"
          title="No Players in Squad Roster Yet"
          description="Build your squad by adding individual players or importing your team roster from a CSV spreadsheet."
          action={{
            label: 'Add First Player',
            onClick: handleStartAdd,
            icon: UserPlus,
          }}
          secondaryAction={{
            label: 'Import CSV / Spreadsheet',
            onClick: () => setIsImportModalOpen(true),
            icon: Upload,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((player) => {
            const isUnavailableThisFixture = (player.unavailableDates || []).includes(fixtureDate);
            const holidayCount = (player.unavailableDates || []).length;
            const isNotSignedOnYet = Boolean(player.signOnDate && fixtureDate && fixtureDate < player.signOnDate);
            const hasLeftSquad = Boolean(player.leaveDate && fixtureDate && fixtureDate > player.leaveDate);
            const isInactiveForFixture = isUnavailableThisFixture || isNotSignedOnYet || hasLeftSquad;

            return (
              <div
                key={player.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  isInactiveForFixture
                    ? 'bg-slate-950/60 border-rose-900/40'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-white font-extrabold flex items-center justify-center text-sm border border-slate-700/60 shadow shrink-0">
                      {player.squadNumber ? `#${player.squadNumber}` : getInitials(player.name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-bold text-white leading-tight">{player.name}</h3>
                        {isNotSignedOnYet && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                            Not Signed On Yet
                          </span>
                        )}
                        {hasLeftSquad && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                            Left Squad
                          </span>
                        )}
                        {isUnavailableThisFixture && !isNotSignedOnYet && !hasLeftSquad && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                            Away Next Match
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {player.preferredPositions.map((pos) => (
                          <span
                            key={pos}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium"
                          >
                            {pos}
                          </span>
                        ))}
                      </div>
                      {player.specificPositions && player.specificPositions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {player.specificPositions.map((sp) => (
                            <span
                              key={sp}
                              className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium"
                            >
                              {sp}
                            </span>
                          ))}
                        </div>
                      )}
                      {(player.signOnDate || player.leaveDate) && (
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                          {player.signOnDate && (
                            <span>Signed: {new Date(player.signOnDate).toLocaleDateString('en-GB')}</span>
                          )}
                          {player.signOnDate && player.leaveDate && <span>•</span>}
                          {player.leaveDate && (
                            <span className="text-rose-400/90">Left: {new Date(player.leaveDate).toLocaleDateString('en-GB')}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(player)}
                      className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center justify-center cursor-pointer"
                      title="Edit player"
                      aria-label={`Edit ${player.name}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Remove ${player.name} from squad?`)) {
                          deletePlayer(player.id);
                          showToast('Player removed from squad.', 'info');
                        }
                      }}
                      className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 transition flex items-center justify-center cursor-pointer"
                      title="Delete player"
                      aria-label={`Delete ${player.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Season Stats & Holidays Button */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                    <span>{player.matchesPlayed} matches</span>
                    <span>•</span>
                    <span>{player.totalMinutesPlayed}m</span>
                  </div>

                  {/* Manage Holidays / Absence Dates Button with comfortable touch target */}
                  <button
                    type="button"
                    onClick={() => setManagingHolidaysPlayer(player)}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold tracking-tight transition cursor-pointer flex items-center gap-1.5 ${
                      holidayCount > 0
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                        : 'bg-slate-800/80 text-slate-300 border border-slate-700 hover:text-white hover:bg-slate-700'
                    }`}
                    title="Manage holiday and absence dates"
                  >
                    <Palmtree className="w-3.5 h-3.5 text-amber-400" />
                    <span>{holidayCount > 0 ? `${holidayCount} Holidays` : 'Add Holidays'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
