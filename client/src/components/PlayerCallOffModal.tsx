import React from 'react';
import { useMatchday } from '../context/MatchdayContext';
import { useToast } from '../context/ToastContext';
import { Player } from '../types';
import { UserX, UserMinus, X, AlertCircle, ArrowRight } from 'lucide-react';
import { getPlayerInitials } from '../utils/playerUtils';

interface PlayerCallOffModalProps {
  player: Player | null;
  onClose: () => void;
  currentLocation?: 'pitch' | 'bench';
  positionLabel?: string;
}


export const PlayerCallOffModal: React.FC<PlayerCallOffModalProps> = ({
  player,
  onClose,
  currentLocation,
  positionLabel,
}) => {
  const {
    activeFixture,
    players,
    replaceSquadPlayer,
    removePlayerFromSquad,
  } = useMatchday();

  const { showToast } = useToast();

  if (!player || !activeFixture || !activeFixture.matchSquad) return null;

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const restedPlayers = (activeFixture.matchSquad.restedPlayerIds || [])
    .map((id) => playerMap.get(id))
    .filter((p): p is Player => Boolean(p));

  const currentPeriodLineup = activeFixture.matchSquad.lineupsByPeriod[0];
  const hasBenchSubs = currentPeriodLineup?.subs.length > 0;
  const isPitchPlayer = currentLocation === 'pitch' || (
    currentPeriodLineup?.onPitch.some((p) => p.playerId === player.id)
  );

  const handleRemoveWithoutReplacement = async () => {
    const playerName = player.name;
    await removePlayerFromSquad(player.id);
    onClose();
    showToast(`✓ ${playerName} removed from matchday squad (space not filled).`, 'info');
  };

  const handleReplaceWithRested = async (replacementId: string, replacementName: string) => {
    await replaceSquadPlayer(player.id, replacementId);
    onClose();
    showToast(`✓ ${replacementName} moved to team sheet, replacing ${player.name}.`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in print:hidden">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Player Ill / Call-Off</span>
                {positionLabel && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-sky-300 font-mono font-bold border border-slate-700">
                    {positionLabel}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Manage matchday absence for <strong className="text-slate-200">{player.name}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Status Snapshot */}
        <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-slate-800 text-slate-200 font-bold flex items-center justify-center text-xs border border-slate-700 shrink-0">
              {player.squadNumber ? `#${player.squadNumber}` : getPlayerInitials(player.name)}
            </span>
            <div>
              <div className="font-bold text-white">{player.name}</div>
              <div className="text-[11px] text-slate-400">
                Preferred: {player.preferredPositions.join(', ')}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase tracking-wider">
            {isPitchPlayer ? 'On Pitch' : 'On Subs Bench'}
          </span>
        </div>

        {/* Option 1: Remove Player and Do Not Replace (Space Cannot Be Filled) */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/40 via-slate-950/50 to-slate-950 border border-rose-500/30 space-y-3">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 mt-0.5 shrink-0">
              <UserMinus className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">
                Option 1: Remove Player (Do Not Replace)
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                {isPitchPlayer && hasBenchSubs
                  ? `Removes ${player.name} from the squad. An available bench substitute will automatically step up to fill their spot on the pitch.`
                  : `Removes ${player.name} from the matchday team sheet completely without replacing from rested players (playing with 1 fewer squad member).`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemoveWithoutReplacement}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-rose-950/50"
          >
            <UserMinus className="w-4 h-4" />
            <span>Remove Without Replacement (Leave Space Empty)</span>
          </button>
        </div>

        {/* Divider with 'OR' badge */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-800" />
          <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
            Or Replace If Cover Is Available
          </span>
          <div className="flex-grow border-t border-slate-800" />
        </div>

        {/* Option 2: Replace with Player from Rested Roster */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200">
              Option 2: Replace From Rested Rotation Roster
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {restedPlayers.length} player{restedPlayers.length === 1 ? '' : 's'} available
            </span>
          </div>

          {restedPlayers.length === 0 ? (
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-1.5">
              <AlertCircle className="w-5 h-5 text-amber-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-300">
                No Rested Players Available
              </p>
              <p className="text-[11px] text-slate-400 leading-normal">
                All club squad members are already on the matchday team sheet. Please use <strong>Option 1 above</strong> to remove {player.name} and play with the remaining players.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {restedPlayers.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleReplaceWithRested(r.id, r.name)}
                  className="w-full min-h-[48px] p-2.5 rounded-xl bg-slate-950/80 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/50 text-left flex items-center justify-between transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                      {r.squadNumber || getPlayerInitials(r.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white group-hover:text-emerald-300 break-words leading-snug">
                        {r.name}
                      </div>
                      <span className="text-[11px] text-slate-400 break-words block mt-0.5">
                        {r.preferredPositions.join(', ')} • {r.totalMinutesPlayed}m season
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400 group-hover:text-emerald-300 shrink-0 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                    <span>Bring In</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
