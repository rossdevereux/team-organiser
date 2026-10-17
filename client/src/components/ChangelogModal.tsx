import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Sparkles,
  Calendar,
  Tag,
  CheckCircle2,
  PlusCircle,
  RefreshCw,
  ShieldAlert,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { fetchChangelogData, ChangelogRelease, ChangelogSection } from '../services/changelogService';
import { APP_VERSION } from '../utils/version';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SectionCategory = 'All' | 'Added' | 'Changed' | 'Fixed' | 'Security';

const SECTION_CONFIG: Record<
  string,
  { label: string; icon: React.FC<{ className?: string }>; color: string; badge: string }
> = {
  Added: {
    label: 'New Features',
    icon: PlusCircle,
    color: 'text-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  },
  Changed: {
    label: 'Improvements',
    icon: RefreshCw,
    color: 'text-sky-400',
    badge: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  },
  Fixed: {
    label: 'Bug Fixes',
    icon: CheckCircle2,
    color: 'text-amber-400',
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  },
  Security: {
    label: 'Security',
    icon: ShieldAlert,
    color: 'text-rose-400',
    badge: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  },
  Deprecated: {
    label: 'Deprecated',
    icon: RefreshCw,
    color: 'text-slate-400',
    badge: 'bg-slate-800 text-slate-300 border-slate-700',
  },
  Removed: {
    label: 'Removed',
    icon: X,
    color: 'text-slate-500',
    badge: 'bg-slate-800 text-slate-400 border-slate-700',
  },
};

/**
 * Parses markdown inline links and issue references (#123) into clickable HTML elements.
 */
const renderFormattedText = (text: string): React.ReactNode => {
  // Regex to match markdown links [text](url) and issue references #123
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    // Markdown link: [Title](https://...)
    const linkMatch = remaining.match(/^\[(.*?)\]\((https?:\/\/[^\s)]+)\)/);
    if (linkMatch) {
      tokens.push(
        <a
          key={`link-${keyIndex++}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 hover:text-sky-300 underline font-medium inline-flex items-center gap-0.5"
        >
          <span>{linkMatch[1]}</span>
          <ArrowUpRight className="w-3 h-3 inline opacity-70" />
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Bare GitHub Issue link / issue number: #123
    const issueMatch = remaining.match(/^#(\d+)/);
    if (issueMatch) {
      const issueNum = issueMatch[1];
      tokens.push(
        <a
          key={`issue-${keyIndex++}`}
          href={`https://github.com/rossdevereux/team-organiser/issues/${issueNum}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:text-emerald-300 font-mono font-semibold underline"
        >
          #{issueNum}
        </a>
      );
      remaining = remaining.slice(issueMatch[0].length);
      continue;
    }

    // Regular text up to next special character
    const nextSpecial = remaining.search(/\[|#/);
    if (nextSpecial === -1) {
      tokens.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      // Consume single char to advance if no regex matched
      tokens.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      tokens.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return <>{tokens}</>;
};

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  const [releases, setReleases] = useState<ChangelogRelease[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<SectionCategory>('All');

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setLoading(true);

    fetchChangelogData().then((data) => {
      if (mounted) {
        setReleases(data.releases);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter releases and sections based on search and category
  const filteredReleases = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return releases
      .map((rel) => {
        const matchesVersion = rel.version.toLowerCase().includes(query);

        // Filter sections within this release
        const matchedSections = rel.sections
          .filter((sec) => {
            if (selectedCategory !== 'All' && sec.title !== selectedCategory) {
              return false;
            }
            return true;
          })
          .map((sec) => {
            if (!query || matchesVersion) return sec;
            const filteredItems = sec.items.filter((item) =>
              item.toLowerCase().includes(query)
            );
            return {
              ...sec,
              items: filteredItems,
            };
          })
          .filter((sec) => sec.items.length > 0);

        return {
          ...rel,
          sections: matchedSections,
        };
      })
      .filter((rel) => rel.sections.length > 0);
  }, [releases, searchQuery, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="changelog-modal-title"
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-900/90">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id="changelog-modal-title" className="text-lg font-bold text-white">
                  Release Notes & Changelog
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-emerald-400" />
                  <span>v{APP_VERSION}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Stay up to date with new features, rotation engine updates, and fixes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
            aria-label="Close changelog modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter Toolbar */}
        <div className="p-4 sm:px-6 bg-slate-950/50 border-b border-slate-800/80 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search changes, features, or versions (e.g. goalkeeper, fixture, rotation)..."
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-slate-500 text-[11px] flex items-center gap-1 shrink-0 font-medium mr-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>
            {(['All', 'Added', 'Changed', 'Fixed'] as SectionCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer shrink-0 text-xs ${
                  selectedCategory === cat
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-400 border border-slate-750'
                }`}
              >
                {cat === 'All' ? 'All Updates' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Loading release notes...</p>
            </div>
          ) : filteredReleases.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-850 border border-slate-800 text-slate-500 mx-auto flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-300">No matching updates found</p>
                <p className="text-xs text-slate-500">
                  Try adjusting your search query or switching the category filter
                </p>
              </div>
              {(searchQuery || selectedCategory !== 'All') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            filteredReleases.map((rel) => {
              const isCurrent = rel.version === APP_VERSION;

              return (
                <div
                  key={rel.version}
                  className={`p-5 rounded-2xl border transition-all ${
                    rel.isUnreleased
                      ? 'bg-slate-900/80 border-indigo-500/30 shadow-lg shadow-indigo-950/20'
                      : isCurrent
                      ? 'bg-slate-900/90 border-emerald-500/40 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/30'
                      : 'bg-slate-900/50 border-slate-800/80'
                  }`}
                >
                  {/* Version Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800/80">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-emerald-400" />
                        <span>{rel.isUnreleased ? 'Upcoming Features' : `Version ${rel.version}`}</span>
                      </span>

                      {rel.isUnreleased && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Unreleased
                        </span>
                      )}

                      {isCurrent && !rel.isUnreleased && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Current Version
                        </span>
                      )}
                    </div>

                    {rel.date && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{rel.date}</span>
                      </div>
                    )}
                  </div>

                  {/* Release Sections (Added, Changed, Fixed, etc.) */}
                  <div className="mt-4 space-y-4">
                    {rel.sections.map((sec) => {
                      const cfg = SECTION_CONFIG[sec.title] || SECTION_CONFIG.Added;
                      const IconComponent = cfg.icon;

                      return (
                        <div key={sec.title} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${cfg.badge}`}
                            >
                              <IconComponent className="w-3 h-3" />
                              <span>{cfg.label}</span>
                            </span>
                          </div>

                          <ul className="space-y-2 pl-2">
                            {sec.items.map((item, idx) => (
                              <li
                                key={idx}
                                className="text-xs text-slate-300 leading-relaxed flex items-start gap-2"
                              >
                                <span className="text-slate-600 mt-1 select-none">•</span>
                                <div className="min-w-0 flex-1 whitespace-pre-line">
                                  {renderFormattedText(item)}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <a
              href="https://keepachangelog.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-white underline font-medium"
            >
              Keep a Changelog
            </a>
            <span>&</span>
            <a
              href="https://semver.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-white underline font-medium"
            >
              SemVer
            </a>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/rossdevereux/team-organiser/blob/main/CHANGELOG.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-emerald-400 transition flex items-center gap-1"
            >
              <span>View Raw CHANGELOG.md</span>
              <ArrowUpRight className="w-3 h-3" />
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
