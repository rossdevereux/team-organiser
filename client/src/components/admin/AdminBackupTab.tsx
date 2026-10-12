import React, { useState } from 'react';
import { BackupData } from '../../types';
import { Download, Upload } from 'lucide-react';
import { ConfirmModal } from '../ConfirmModal';
import { useToast } from '../../context/ToastContext';

interface AdminBackupTabProps {
  backupStats: {
    totalTeams: number;
    totalPlayers: number;
    totalFixtures: number;
    totalTrackedMinutes: number;
  } | null;
  onDownloadBackup: () => Promise<void>;
  onRestoreBackup: (data: BackupData) => Promise<void>;
}

export const AdminBackupTab: React.FC<AdminBackupTabProps> = ({
  backupStats,
  onDownloadBackup,
  onRestoreBackup,
}) => {
  const { showToast } = useToast();
  const [pendingRestoreData, setPendingRestoreData] = useState<BackupData | null>(null);
  const [restoring, setRestoring] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.teams || !json.players || !json.fixtures) {
          throw new Error('Invalid backup schema');
        }
        setPendingRestoreData(json);
      } catch {
        showToast('Invalid backup file. Must be a valid SubShuffle JSON snapshot.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestoreData) return;
    setRestoring(true);
    try {
      await onRestoreBackup(pendingRestoreData);
      setPendingRestoreData(null);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Database Health Summary */}
      {backupStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Total Teams</span>
            <p className="text-2xl font-black text-slate-100">{backupStats.totalTeams}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Registered Players</span>
            <p className="text-2xl font-black text-slate-100">{backupStats.totalPlayers}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Fixtures Logged</span>
            <p className="text-2xl font-black text-slate-100">{backupStats.totalFixtures}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Tracked Minutes</span>
            <p className="text-2xl font-black text-emerald-400">{backupStats.totalTrackedMinutes}m</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Export Snapshot */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-100">Export Full System Snapshot</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Download an immutable JSON backup of all club squads, registered players, match schedules,
              and custom claims. Useful before season roll-overs or major roster restructuring.
            </p>
          </div>

          <button
            type="button"
            onClick={onDownloadBackup}
            className="h-11 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download JSON Backup</span>
          </button>
        </div>

        {/* Card 2: Restore from Snapshot */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-100">Restore Database from Snapshot</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload a previously exported <code>.json</code> snapshot to restore system state. All active
              records will be synchronized and merged.
            </p>
          </div>

          <label className="h-11 px-5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2">
            <Upload className="w-4 h-4" />
            <span>Select Backup JSON File</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(pendingRestoreData)}
        title="Confirm Database Disaster Recovery Restore"
        message={`Warning: You are about to restore ${pendingRestoreData?.teams?.length || 0} teams, ${pendingRestoreData?.players?.length || 0} players, and ${pendingRestoreData?.fixtures?.length || 0} fixtures from snapshot created at ${pendingRestoreData?.exportedAt || 'unknown'}. This action cannot be undone.`}
        confirmLabel={restoring ? 'Restoring System...' : 'Overwrite & Restore'}
        cancelLabel="Abort Restore"
        isDestructive={true}
        onConfirm={handleConfirmRestore}
        onCancel={() => setPendingRestoreData(null)}
      />
    </div>
  );
};
