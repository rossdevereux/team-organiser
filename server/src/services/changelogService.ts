import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ChangelogSection {
  title: 'Added' | 'Changed' | 'Deprecated' | 'Removed' | 'Fixed' | 'Security';
  items: string[];
}

export interface ChangelogRelease {
  version: string;
  date?: string;
  isUnreleased?: boolean;
  sections: ChangelogSection[];
}

export interface ChangelogResponse {
  currentVersion: string;
  releases: ChangelogRelease[];
  rawMarkdown?: string;
}

/**
 * Parses raw Keep a Changelog markdown string into structured releases and sections.
 */
export const parseChangelogMarkdown = (markdown: string): ChangelogRelease[] => {
  const lines = markdown.split(/\r?\n/);
  const releases: ChangelogRelease[] = [];

  let currentRelease: ChangelogRelease | null = null;
  let currentSection: ChangelogSection | null = null;
  let currentItemLines: string[] = [];

  const flushItem = () => {
    if (currentSection && currentItemLines.length > 0) {
      const fullItem = currentItemLines.join('\n').trim();
      if (fullItem) {
        currentSection.items.push(fullItem);
      }
      currentItemLines = [];
    }
  };

  const flushSection = () => {
    flushItem();
    if (currentRelease && currentSection) {
      if (currentSection.items.length > 0) {
        currentRelease.sections.push(currentSection);
      }
      currentSection = null;
    }
  };

  const flushRelease = () => {
    flushSection();
    if (currentRelease) {
      releases.push(currentRelease);
      currentRelease = null;
    }
  };

  for (const line of lines) {
    // Match version headers: e.g. "## [Unreleased]" or "## [1.0.0] - 2026-10-12" or "## [1.0.0]"
    const releaseMatch = line.match(/^##\s+\[(.*?)\](?:\s*-\s*(\d{4}-\d{2}-\d{2}))?/);
    if (releaseMatch) {
      flushRelease();
      const rawVersion = releaseMatch[1].trim();
      const isUnreleased = rawVersion.toLowerCase() === 'unreleased';
      currentRelease = {
        version: rawVersion,
        date: releaseMatch[2]?.trim(),
        isUnreleased,
        sections: [],
      };
      continue;
    }

    // Match section headers: e.g. "### Added", "### Changed", "### Fixed", etc.
    const sectionMatch = line.match(/^###\s+(Added|Changed|Deprecated|Removed|Fixed|Security)/i);
    if (sectionMatch && currentRelease) {
      flushSection();
      const rawTitle = sectionMatch[1].trim();
      const normalizedTitle = (rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).toLowerCase()) as ChangelogSection['title'];
      currentSection = {
        title: normalizedTitle,
        items: [],
      };
      continue;
    }

    // Match top-level bullet point item
    if (currentSection && line.match(/^[-*]\s+/)) {
      flushItem();
      currentItemLines.push(line.replace(/^[-*]\s+/, '').trim());
      continue;
    }

    // Match multi-line continuation or nested bullet points
    if (currentSection && currentItemLines.length > 0) {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        currentItemLines.push(line);
      }
    }
  }

  flushRelease();
  return releases;
};

/**
 * Finds the project CHANGELOG.md file by checking standard parent paths.
 */
export const findChangelogPath = (): string | null => {
  const candidatePaths = [
    resolve(process.cwd(), 'CHANGELOG.md'),
    resolve(process.cwd(), '../CHANGELOG.md'),
    resolve(__dirname, '../../../CHANGELOG.md'),
    resolve(__dirname, '../../CHANGELOG.md'),
  ];

  for (const p of candidatePaths) {
    if (existsSync(p)) {
      return p;
    }
  }
  return null;
};

/**
 * Finds current package version from root or server package.json.
 */
export const getCurrentVersion = (): string => {
  const candidatePkgPaths = [
    resolve(process.cwd(), 'package.json'),
    resolve(process.cwd(), '../package.json'),
    resolve(__dirname, '../../../package.json'),
    resolve(__dirname, '../../package.json'),
  ];

  for (const p of candidatePkgPaths) {
    if (existsSync(p)) {
      try {
        const pkg = JSON.parse(readFileSync(p, 'utf-8'));
        if (pkg.version) return pkg.version;
      } catch {
        // continue
      }
    }
  }
  return '1.0.0';
};

/**
 * Loads and returns the complete structured changelog data.
 */
export const getChangelogData = (): ChangelogResponse => {
  const currentVersion = getCurrentVersion();
  const filePath = findChangelogPath();

  if (!filePath) {
    return {
      currentVersion,
      releases: [
        {
          version: currentVersion,
          date: new Date().toISOString().split('T')[0],
          isUnreleased: false,
          sections: [
            {
              title: 'Added',
              items: ['Initial release of SubShuffle youth football rotation manager.'],
            },
          ],
        },
      ],
    };
  }

  try {
    const rawMarkdown = readFileSync(filePath, 'utf-8');
    const releases = parseChangelogMarkdown(rawMarkdown);
    return {
      currentVersion,
      releases,
      rawMarkdown,
    };
  } catch (err) {
    console.error('Failed to read or parse CHANGELOG.md:', err);
    return {
      currentVersion,
      releases: [],
    };
  }
};
