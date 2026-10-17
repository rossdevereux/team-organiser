import userChangelog from '../../../CHANGELOG.user.md?raw';

export type UserChangeType = 'added' | 'improved' | 'fixed';

export interface UserChangelogItem {
  headline: string;
  description: string;
  rawMarkdown: string;
}

export interface UserChangelogSection {
  type: UserChangeType;
  title: 'Added' | 'Improved' | 'Fixed';
  items: UserChangelogItem[];
  rawMarkdown: string;
}

export interface UserChangelogRelease {
  version: string;
  date?: string;
  isUnreleased?: boolean;
  sections: UserChangelogSection[];
  rawMarkdown: string;
}

/**
 * Parses user-facing Markdown release notes into structured release objects.
 */
export function parseUserChangelog(markdown: string): UserChangelogRelease[] {
  const releases: UserChangelogRelease[] = [];
  const lines = markdown.split(/\r?\n/);

  let currentRelease: UserChangelogRelease | null = null;
  let currentSection: UserChangelogSection | null = null;
  let releaseMarkdownLines: string[] = [];
  let sectionMarkdownLines: string[] = [];

  const finalizeSection = () => {
    if (currentSection && currentRelease) {
      currentSection.rawMarkdown = sectionMarkdownLines.join('\n').trim();
      currentRelease.sections.push(currentSection);
      currentSection = null;
      sectionMarkdownLines = [];
    }
  };

  const finalizeRelease = () => {
    finalizeSection();
    if (currentRelease) {
      currentRelease.rawMarkdown = releaseMarkdownLines.join('\n').trim();
      releases.push(currentRelease);
      currentRelease = null;
      releaseMarkdownLines = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for version header: ## [1.1.0] - 2026-10-17 or ## [Unreleased]
    const releaseMatch = trimmed.match(/^##\s+\[?(.*?)\]?(?:\s*-\s*(\d{4}-\d{2}-\d{2}))?$/);
    if (releaseMatch && !trimmed.startsWith('###')) {
      finalizeRelease();
      const rawVersion = releaseMatch[1].trim();
      const isUnreleased = /unreleased/i.test(rawVersion);
      currentRelease = {
        version: rawVersion,
        date: releaseMatch[2],
        isUnreleased,
        sections: [],
        rawMarkdown: '',
      };
      releaseMarkdownLines.push(line);
      continue;
    }

    // Check for section header: ### Added / ### Improved / ### Fixed
    const sectionMatch = trimmed.match(/^###\s+(Added|Improved|Changed|Fixed)/i);
    if (sectionMatch && currentRelease) {
      finalizeSection();
      const sectionName = sectionMatch[1];
      const normalizedType: UserChangeType =
        sectionName.toLowerCase() === 'added'
          ? 'added'
          : sectionName.toLowerCase() === 'fixed'
          ? 'fixed'
          : 'improved';

      const normalizedTitle: 'Added' | 'Improved' | 'Fixed' =
        normalizedType === 'added' ? 'Added' : normalizedType === 'fixed' ? 'Fixed' : 'Improved';

      currentSection = {
        type: normalizedType,
        title: normalizedTitle,
        items: [],
        rawMarkdown: '',
      };
      releaseMarkdownLines.push(line);
      sectionMarkdownLines.push(line);
      continue;
    }

    // Check for bullet items: - **Headline**: Description
    if (trimmed.startsWith('-') && currentSection) {
      const itemContent = trimmed.replace(/^-\s*/, '');
      const headlineMatch = itemContent.match(/^\*\*(.*?)\*\*:\s*(.*)$/);
      if (headlineMatch) {
        currentSection.items.push({
          headline: headlineMatch[1].trim(),
          description: headlineMatch[2].trim(),
          rawMarkdown: trimmed,
        });
      } else {
        currentSection.items.push({
          headline: '',
          description: itemContent,
          rawMarkdown: trimmed,
        });
      }
      releaseMarkdownLines.push(line);
      sectionMarkdownLines.push(line);
      continue;
    }

    if (currentRelease) {
      releaseMarkdownLines.push(line);
    }
    if (currentSection) {
      sectionMarkdownLines.push(line);
    }
  }

  finalizeRelease();
  return releases;
}

export const CHANGELOG_RAW: string = userChangelog;
export const CHANGELOG_DATA: UserChangelogRelease[] = parseUserChangelog(userChangelog);
