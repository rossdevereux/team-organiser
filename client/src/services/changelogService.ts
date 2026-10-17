import { APP_VERSION } from '../utils/version';

export interface ChangelogSection {
  title: 'Added' | 'Changed' | 'Deprecated' | 'Removed' | 'Fixed' | 'Security';
  items: string[];
}

export interface ChangelogRelease {
  version: string;
  date?: string;
  isUnreleased?: boolean;
  sections: ChangelogSection[];
  rawMarkdown?: string;
}

export interface ChangelogResponse {
  currentVersion: string;
  releases: ChangelogRelease[];
  rawMarkdown?: string;
}

// Resilient fallback dataset for offline mode, demo mode, or when offline
const FALLBACK_CHANGELOG: ChangelogResponse = {
  currentVersion: APP_VERSION,
  releases: [
    {
      version: 'Unreleased',
      isUnreleased: true,
      sections: [
        {
          title: 'Added',
          items: [
            'App version display in footer with interactive, searchable Changelog modal ([#5](https://github.com/rossdevereux/team-organiser/issues/5)).',
            'Fixture-specific goalkeeper and position lock/unlock overrides.',
            'Universal GitHub issue lifecycle and release automation skill.',
          ],
        },
        {
          title: 'Fixed',
          items: [
            'Fixed player inspection drawer layout and touch ergonomics on pitch view.',
            'Fixed private team data memory leak upon logging out and entering demo mode.',
          ],
        },
      ],
    },
    {
      version: '1.0.0',
      date: '2026-10-12',
      isUnreleased: false,
      sections: [
        {
          title: 'Added',
          items: [
            'Fair match rotation engine preventing consecutive benchings and guaranteeing equal participation.',
            'Interactive 2D football pitch supporting 5-a-side, 7-a-side, 9-a-side, and 11-a-side formats.',
            'Formation editor with customizable player pitch coordinates (2-3-1, 3-2-1, 2-4-1, 3-1-2).',
            'Panoramic multi-fixture matrix view with WhatsApp and CSV sharing.',
            'Player absence & holiday manager with roster warning badges.',
            'Tactical substitution recommendations (Equal Game Time, Positional Match, Rolling Single Sub).',
          ],
        },
      ],
    },
  ],
};

/**
 * Fetches changelog from the server with cache-busting version query param.
 * Falls back gracefully to bundled data if offline or error.
 */
export const fetchChangelogData = async (): Promise<ChangelogResponse> => {
  try {
    const res = await fetch(`/api/changelog?v=${encodeURIComponent(APP_VERSION)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.releases) && data.releases.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Network request for changelog failed, falling back to local dataset:', err);
  }

  return FALLBACK_CHANGELOG;
};
