import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  X,
  Search,
  Sparkles,
  Calendar,
  Tag,
  CheckCircle2,
  PlusCircle,
  RefreshCw,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { CHANGELOG_DATA } from '../utils/userChangelog';
import { APP_VERSION } from '../utils/version';

export interface ReleaseNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type CategoryFilter = 'All' | 'Added' | 'Improved' | 'Fixed';

/**
 * Extracts plain string content recursively from React children.
 */
function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (React.isValidElement(node) && node.props && (node.props as any).children) {
    return extractText((node.props as any).children);
  }
  return '';
}

export const ReleaseNotesModal: React.FC<ReleaseNotesModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter releases and sections according to search and category
  const filteredReleases = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return CHANGELOG_DATA.map((rel) => {
      const matchesVersion = rel.version.toLowerCase().includes(query);

      // Filter sections in this release
      const matchedSections = rel.sections
        .filter((sec) => {
          if (selectedCategory === 'All') return true;
          return sec.title.toLowerCase() === selectedCategory.toLowerCase();
        })
        .map((sec) => {
          if (!query || matchesVersion) return sec;

          const filteredItems = sec.items.filter(
            (item) =>
              item.headline.toLowerCase().includes(query) ||
              item.description.toLowerCase().includes(query) ||
              item.rawMarkdown.toLowerCase().includes(query)
          );

          return {
            ...sec,
            items: filteredItems,
          };
        })
        .filter((sec) => sec.items.length > 0);

      // Reconstruct filtered release markdown
      const releaseMarkdown = [
        `## [${rel.version}]${rel.date ? ` - ${rel.date}` : ''}`,
        ...matchedSections.map(
          (sec) => `### ${sec.title}\n${sec.items.map((i) => i.rawMarkdown).join('\n')}`
        ),
      ].join('\n\n');

      return {
        ...rel,
        sections: matchedSections,
        filteredMarkdown: releaseMarkdown,
      };
    }).filter((rel) => rel.sections.length > 0);
  }, [searchQuery, selectedCategory]);

  // Custom Tailwind markdown component renderers
  const markdownComponents = useMemo(
    () => ({
      h2: ({ children }: { children?: React.ReactNode }) => {
        const rawText = extractText(children).trim();
        const match = rawText.match(/\[?(.*?)\]?(?:\s*-\s*(\d{4}-\d{2}-\d{2}))?$/);
        const version = match ? match[1].trim() : rawText;
        const date = match ? match[2] : undefined;
        const isUnreleased = /unreleased/i.test(version);
        const isCurrent = version === APP_VERSION;

        return (
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-emerald-400" />
                <span>{isUnreleased ? 'Upcoming Features' : `Version ${version}`}</span>
              </span>

              {isUnreleased && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Unreleased
                </span>
              )}

              {isCurrent && !isUnreleased && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Current Version
                </span>
              )}
            </div>

            {date && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-700/60 shadow-sm">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{date}</span>
              </div>
            )}
          </div>
        );
      },
      h3: ({ children }: { children?: React.ReactNode }) => {
        const rawText = extractText(children).trim();
        const normalized = rawText.toLowerCase();

        if (normalized.includes('add')) {
          return (
            <div className="flex items-center gap-2 mt-4 mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold border bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                <PlusCircle className="w-3 h-3 text-emerald-400" />
                <span>Added</span>
                <span className="text-[10px] text-emerald-400/80 font-normal">(New Features)</span>
              </span>
            </div>
          );
        }

        if (normalized.includes('improv') || normalized.includes('chang')) {
          return (
            <div className="flex items-center gap-2 mt-4 mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold border bg-sky-500/10 text-sky-300 border-sky-500/20">
                <RefreshCw className="w-3 h-3 text-sky-400" />
                <span>Improved</span>
                <span className="text-[10px] text-sky-400/80 font-normal">(Improvements)</span>
              </span>
            </div>
          );
        }

        if (normalized.includes('fix')) {
          return (
            <div className="flex items-center gap-2 mt-4 mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold border bg-amber-500/10 text-amber-300 border-amber-500/20">
                <CheckCircle2 className="w-3 h-3 text-amber-400" />
                <span>Fixed</span>
                <span className="text-[10px] text-amber-400/80 font-normal">(Bug Fixes)</span>
              </span>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2 mt-4 mb-2.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border bg-slate-800 text-slate-300 border-slate-700">
              <span>{children}</span>
            </span>
          </div>
        );
      },
      ul: ({ children }: { children?: React.ReactNode }) => (
        <ul className="space-y-2.5 pl-1 my-2">{children}</ul>
      ),
      li: ({ children }: { children?: React.ReactNode }) => (
        <li className="text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
          <span className="text-slate-500 mt-1 select-none shrink-0">•</span>
          <div className="min-w-0 flex-1">{children}</div>
        </li>
      ),
      strong: ({ children }: { children?: React.ReactNode }) => (
        <strong className="font-semibold text-white tracking-wide">{children}</strong>
      ),
      a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 hover:text-sky-300 underline font-medium inline-flex items-center gap-0.5"
        >
          <span>{children}</span>
          <ArrowUpRight className="w-3 h-3 inline opacity-70" />
        </a>
      ),
      p: ({ children }: { children?: React.ReactNode }) => (
        <div className="text-xs text-slate-300 leading-relaxed">{children}</div>
      ),
    }),
    []
  );

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
                Stay up to date with new coaching features, matchday updates, and improvements
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
            {(['All', 'Added', 'Improved', 'Fixed'] as CategoryFilter[]).map((cat) => (
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
          {filteredReleases.length === 0 ? (
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
                  className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                    rel.isUnreleased
                      ? 'bg-slate-900/80 border-indigo-500/30 shadow-lg shadow-indigo-950/20'
                      : isCurrent
                      ? 'bg-slate-900/90 border-emerald-500/40 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/30'
                      : 'bg-slate-900/50 border-slate-800/80'
                  }`}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {rel.filteredMarkdown}
                  </ReactMarkdown>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <span className="text-slate-300 font-medium">Keep a Changelog</span>
            <span>&</span>
            <span className="text-slate-300 font-medium">SemVer</span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/rossdevereux/team-organiser/blob/main/CHANGELOG.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-emerald-400 transition flex items-center gap-1"
            >
              <span>Developer Changelog</span>
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
