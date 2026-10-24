import { logEvent } from 'firebase/analytics';
import { analytics } from '../firebase';

export interface AnalyticsEventParams {
  [key: string]: string | number | boolean | undefined | null;
}

/**
 * Log a generic analytics event to Google Analytics 4 (GA4) via Firebase Analytics SDK.
 * In environments where analytics is not initialized or supported (local test/dev without flag),
 * logs safely without throwing errors.
 */
export const trackEvent = (eventName: string, params?: AnalyticsEventParams): void => {
  try {
    if (analytics) {
      logEvent(analytics, eventName, params || {});
    }

    if (
      import.meta.env.DEV &&
      (import.meta.env.VITE_DEBUG_ANALYTICS === 'true' || import.meta.env.VITE_ENABLE_ANALYTICS === 'true')
    ) {
      console.log(`[Analytics Event] ${eventName}:`, params);
    }
  } catch (err) {
    console.warn(`[Analytics Error] Failed to log event "${eventName}":`, err);
  }
};

/**
 * Tracks when a coach executes an auto-rotation lineup balance across match periods.
 */
export const trackLineupAutoBalanced = (params: {
  teamId?: string;
  formation?: string;
  matchPeriodCount?: number;
  periodDurationMinutes?: number;
  pitchPlayerCount?: number;
  squadSize?: number;
}): void => {
  trackEvent('lineup_auto_balanced', {
    team_id: params.teamId,
    formation: params.formation,
    period_count: params.matchPeriodCount,
    period_duration: params.periodDurationMinutes,
    pitch_players: params.pitchPlayerCount,
    squad_size: params.squadSize,
  });
};

/**
 * Tracks when a pitchside live match stopwatch/timer is started.
 */
export const trackLiveMatchStarted = (params: {
  fixtureId?: string;
  opponent?: string;
  venue?: string;
  periodCount?: number;
}): void => {
  trackEvent('live_match_started', {
    fixture_id: params.fixtureId,
    opponent: params.opponent,
    venue: params.venue,
    period_count: params.periodCount,
  });
};

/**
 * Tracks an in-game substitution (tactical sideline sub or mid-match injury departure).
 */
export const trackLiveSubstitution = (params: {
  fixtureId?: string;
  period?: number;
  isEmergency?: boolean;
  reason?: 'tactical' | 'injured' | 'unwell' | 'left_early';
  matchMinute?: number;
}): void => {
  trackEvent('live_substitution', {
    fixture_id: params.fixtureId,
    period: params.period,
    is_emergency: Boolean(params.isEmergency),
    reason: params.reason || 'tactical',
    match_minute: params.matchMinute,
  });
};

/**
 * Tracks when a match is marked Completed and scores are saved.
 */
export const trackMatchCompleted = (params: {
  fixtureId?: string;
  opponent?: string;
  homeScore?: number;
  awayScore?: number;
  scorersCount?: number;
  venue?: string;
}): void => {
  trackEvent('match_completed', {
    fixture_id: params.fixtureId,
    opponent: params.opponent,
    home_score: params.homeScore,
    away_score: params.awayScore,
    scorers_count: params.scorersCount || 0,
    venue: params.venue,
  });
};

/**
 * Tracks when a coach copies the WhatsApp team announcement.
 */
export const trackWhatsAppExport = (params: {
  fixtureId?: string;
  opponent?: string;
  squadCount?: number;
}): void => {
  trackEvent('whatsapp_export_copied', {
    fixture_id: params.fixtureId,
    opponent: params.opponent,
    squad_count: params.squadCount,
  });
};

/**
 * Tracks when a coach generates a PDF team sheet or Presentation Day Award.
 */
export const trackPrintSheet = (params: {
  type: 'match_sheet' | 'presentation_award' | 'fair_play_summary';
  fixtureId?: string;
  teamId?: string;
}): void => {
  trackEvent('print_sheet_opened', {
    type: params.type,
    fixture_id: params.fixtureId,
    team_id: params.teamId,
  });
};

/**
 * Tracks when the subscription paywall modal is presented to the user.
 */
export const trackPaywallViewed = (params: {
  source?: string;
  daysRemaining?: number;
  tier?: string;
}): void => {
  trackEvent('paywall_viewed', {
    source: params.source || 'default',
    days_remaining: params.daysRemaining,
    tier: params.tier,
  });
};

/**
 * Tracks when a user clicks to upgrade or start checkout for a paid plan.
 */
export const trackTrialUpgradeClicked = (params: {
  plan: 'monthly' | 'annual';
  source?: string;
}): void => {
  trackEvent('trial_upgrade_clicked', {
    plan: params.plan,
    source: params.source || 'paywall',
  });
};

/**
 * Tracks when a coach creates a new team/squad.
 */
export const trackTeamCreated = (params: {
  format?: number;
  ageGroup?: string;
}): void => {
  trackEvent('team_created', {
    format: params.format,
    age_group: params.ageGroup,
  });
};

/**
 * Tracks when a coach imports squad players via CSV.
 */
export const trackCsvImport = (params: {
  playerCount: number;
}): void => {
  trackEvent('csv_import_completed', {
    player_count: params.playerCount,
  });
};

/**
 * Tracks virtual page/tab navigation within the Single Page App (SPA).
 */
export const trackPageView = (pageName: string, path?: string): void => {
  trackEvent('page_view', {
    page_title: pageName,
    page_location: path || (typeof window !== 'undefined' ? window.location.href : undefined),
    page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
  });
};
