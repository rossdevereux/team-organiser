import { getAuthToken } from '../firebase';
import { TeamDashboardSummary } from '../types';
import { runWithTrace } from './performance';

export async function fetchTeamDashboardSummary(
  teamId: string,
  season?: string,
  userId?: string
): Promise<TeamDashboardSummary> {
  return runWithTrace(
    'team_dashboard_fetch',
    async (trace) => {
      const cacheKey = `subshuffle_dashboard_summary_${teamId}_${season || 'ALL'}`;

      try {
        const token = await getAuthToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        if (userId) {
          headers['x-user-id'] = userId;
        }

        const query = season && season !== 'ALL' ? `?season=${encodeURIComponent(season)}` : '';
        const res = await fetch(`/api/teams/${teamId}/dashboard-summary${query}`, { headers });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch team dashboard summary');
        }

        const data: TeamDashboardSummary = await res.json();
        trace.putMetric('scorers_count', data.scorersLeaderboard?.length || 0);
        trace.putMetric('potm_count', data.potmLeaderboard?.length || 0);

        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (_) {}

        return data;
      } catch (err) {
        // If offline or fetch failed, check local storage cache
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            return JSON.parse(cached) as TeamDashboardSummary;
          } catch (_) {}
        }
        throw err;
      }
    },
    { teamId, season: season || 'ALL' }
  );
}
