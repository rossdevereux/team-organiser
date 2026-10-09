import React, { useState, useEffect } from 'react';
import { useMatchday } from '../context/MatchdayContext';
import { Fixture, Player } from '../types';
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  Crown,
  Trash2,
  X,
  Check,
  ExternalLink,
  AlertTriangle,
  Edit3,
} from 'lucide-react';

interface EditFixtureModalProps {
  isOpen: boolean;
  fixture: Fixture | null;
  onClose: () => void;
}

export const EditFixtureModal: React.FC<EditFixtureModalProps> = ({
  isOpen,
  fixture,
  onClose,
}) => {
  const {
    players,
    settings,
    fixtures,
    updateFixture,
    deleteFixture,
  } = useMatchday();

  const currentDefaultSeason = settings.currentSeason || '2026/2027';
  const configuredSeasons = settings.seasons || ['2025/2026', '2026/2027'];
  const allDistinctSeasons = Array.from(
    new Set([...configuredSeasons, ...fixtures.map((f) => f.season || currentDefaultSeason)])
  ).filter(Boolean);

  const [opponent, setOpponent] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [kickOffTime, setKickOffTime] = useState<string>('10:00');
  const [meetTime, setMeetTime] = useState<string>('09:30');
  const [groundAddress, setGroundAddress] = useState<string>('');
  const [venue, setVenue] = useState<'Home' | 'Away'>('Home');
  const [season, setSeason] = useState<string>(currentDefaultSeason);
  const [status, setStatus] = useState<Fixture['status']>('Upcoming');
  const [captainId, setCaptainId] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (fixture) {
      setOpponent(fixture.opponent || '');
      setDate(fixture.date || '');
      setKickOffTime(fixture.kickOffTime || '10:00');
      setMeetTime(fixture.meetTime || '09:30');
      setGroundAddress(fixture.groundAddress || '');
      setVenue(fixture.venue || 'Home');
      setSeason(fixture.season || currentDefaultSeason);
      setStatus(fixture.status || 'Upcoming');
      setCaptainId(fixture.captainId || '');
      setIsDeleting(false);
    }
  }, [fixture, currentDefaultSeason]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !fixture) return null;

  const calcMeetTime = (ko: string, offsetMins: number = 30): string => {
    const [h, m] = ko.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '09:30';
    let total = h * 60 + m - offsetMins;
    if (total < 0) total += 24 * 60;
    const newH = Math.floor(total / 60) % 24;
    const newM = total % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  const handleKickOffChange = (newKo: string) => {
    setKickOffTime(newKo);
    setMeetTime(calcMeetTime(newKo, 30));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponent.trim() || !date) return;

    await updateFixture({
      ...fixture,
      opponent: opponent.trim(),
      date,
      kickOffTime,
      meetTime: meetTime || undefined,
      groundAddress: groundAddress.trim() || undefined,
      venue,
      season: season.trim() || currentDefaultSeason,
      status,
      captainId: captainId || undefined,
    });

    onClose();
  };

  const handleDelete = async () => {
    await deleteFixture(fixture.id);
    setIsDeleting(false);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Edit Fixture Logistics</h3>
              <p className="text-xs text-slate-400">
                Update match details vs {fixture.opponent}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Delete Confirmation Warning */}
        {isDeleting ? (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3 animate-fade-in">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-rose-200">Delete this fixture?</h4>
                <p className="text-xs text-rose-300/80 mt-0.5">
                  Are you sure you want to delete the fixture against <strong>{fixture.opponent}</strong> on {fixture.date}? This will also delete any saved lineups and match records for this fixture.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleting(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition cursor-pointer"
              >
                Yes, Delete Fixture
              </button>
            </div>
          </div>
        ) : null}

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Opponent Team */}
            <div className="sm:col-span-2">
              <label className="block text-slate-400 font-semibold mb-1">Opponent Team</label>
              <input
                type="text"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Match Date</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            {/* Venue */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Venue</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVenue('Home')}
                  className={`py-2 px-3 rounded-xl border text-center font-semibold transition cursor-pointer ${
                    venue === 'Home'
                      ? 'bg-sky-600 border-sky-500 text-white shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Home
                </button>
                <button
                  type="button"
                  onClick={() => setVenue('Away')}
                  className={`py-2 px-3 rounded-xl border text-center font-semibold transition cursor-pointer ${
                    venue === 'Away'
                      ? 'bg-sky-600 border-sky-500 text-white shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Away
                </button>
              </div>
            </div>

            {/* Kick-off Time */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Kick-off Time</span>
              </label>
              <input
                type="time"
                value={kickOffTime}
                onChange={(e) => handleKickOffChange(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            {/* Meet Time */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Meet Time</span>
                </label>
                <button
                  type="button"
                  onClick={() => setMeetTime(calcMeetTime(kickOffTime, 30))}
                  className="text-[10px] text-sky-400 hover:text-sky-300 font-medium"
                >
                  ⚡ Auto -30m
                </button>
              </div>
              <input
                type="time"
                value={meetTime}
                onChange={(e) => setMeetTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            {/* Season */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Season</span>
              </label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-medium"
              >
                {allDistinctSeasons.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Match Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Fixture['status'])}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="Upcoming">Upcoming</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Postponed">Postponed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Ground Address */}
            <div className="sm:col-span-2">
              <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>Ground Address & Postcode</span>
              </label>
              <input
                type="text"
                value={groundAddress}
                onChange={(e) => setGroundAddress(e.target.value)}
                placeholder="e.g. Riverside Recreation Ground, Reading, RG1 4PS"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
              {groundAddress && (
                <div className="mt-1 text-right">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(groundAddress)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 font-semibold"
                  >
                    <span>Preview on Google Maps</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Matchday Captain */}
            <div className="sm:col-span-2">
              <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Matchday Captain (©)</span>
              </label>
              <select
                value={captainId}
                onChange={(e) => setCaptainId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="">-- No Captain Assigned --</option>
                {players.map((p: Player) => (
                  <option key={p.id} value={p.id}>
                    {p.squadNumber ? `#${p.squadNumber} ` : ''}{p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsDeleting(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 font-semibold transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Fixture</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/25 transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
