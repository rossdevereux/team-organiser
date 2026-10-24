import React, { useState } from 'react';
import { Player, BroadPosition } from '../../types';
import { Upload, X, FileSpreadsheet } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { trackCsvImport } from '../../utils/analytics';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportPlayers: (players: Partial<Player>[]) => Promise<void>;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  isOpen,
  onClose,
  onImportPlayers,
}) => {
  const { showToast } = useToast();
  const [csvRawText, setCsvRawText] = useState<string>('');
  const [parsedImportPlayers, setParsedImportPlayers] = useState<Partial<Player>[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  if (!isOpen) return null;

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) parseCSVText(text);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (parsedImportPlayers.length === 0) return;
    setIsImporting(true);
    try {
      const count = parsedImportPlayers.length;
      await onImportPlayers(parsedImportPlayers);
      trackCsvImport({ playerCount: count });
      onClose();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Import Squad via CSV / Spreadsheet</h3>
              <p className="text-xs text-slate-400">
                Paste player rows or upload a file. Supported columns: Name, Number, PreferredPositions, SpecificPositions, SignOnDate, LeaveDate.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* File Picker */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-xs text-slate-300 font-medium">Have a .csv or .txt file?</span>
            <label className="px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700 cursor-pointer transition">
              <span>Choose File</span>
              <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Paste Text Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Or Paste CSV Data (Comma or Tab separated):
            </label>
            <textarea
              rows={5}
              value={csvRawText}
              onChange={(e) => parseCSVText(e.target.value)}
              placeholder="Name, Number, Positions, Specific, SignOn, Leave&#10;Leo Davies, 7, Midfield, CM, 2026-09-01, &#10;Jack Wilson, 1, Goalkeeper, GK, , "
              className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Preview Section */}
          {parsedImportPlayers.length > 0 && (
            <div className="p-3 rounded-2xl bg-slate-950/90 border border-indigo-900/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-300 pb-1.5 border-b border-slate-800">
                <span>Preview: {parsedImportPlayers.length} Players Detected</span>
                <span className="text-[10px] text-slate-400 font-normal">Ready to add</span>
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
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-850 text-slate-400 hover:text-white font-semibold text-xs transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={parsedImportPlayers.length === 0 || isImporting}
            onClick={handleExecuteImport}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition cursor-pointer flex items-center gap-1.5"
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
  );
};
