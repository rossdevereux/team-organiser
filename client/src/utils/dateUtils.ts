/**
 * Computes meet time by subtracting offset minutes from kick-off time (e.g. 10:00 - 30m -> 09:30).
 */
export function calculateMeetTime(kickOffTime: string, offsetMins: number = 30): string {
  const [h, m] = (kickOffTime || '10:00').split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '09:30';
  let total = h * 60 + m - offsetMins;
  if (total < 0) total += 24 * 60;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

/**
 * Returns today's ISO date string (YYYY-MM-DD).
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}
