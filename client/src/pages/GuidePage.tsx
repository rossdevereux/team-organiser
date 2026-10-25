import React, { useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BookOpen,
  Search,
  X,
  ChevronRight,
  ArrowUp,
  Printer,
  Play,
  ArrowRight,
  Share2,
  CheckCircle2,
  HelpCircle,
  Clock,
  Shield,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useNavigate, Link } from '@tanstack/react-router';
import { PublicNav } from '../components/PublicNav';
import { useMatchday } from '../context/MatchdayContext';
import { useToast } from '../context/ToastContext';
import { AppVersion } from '../components/AppVersion';
import { ReleaseNotesModal } from '../components/ReleaseNotesModal';
import { useOnboarding } from '../components/onboarding/OnboardingContext';
import guideMarkdown from '../../../docs/USER_GUIDE.md?raw';

function githubSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/ /g, '-');
}

function getNodeText(node: any): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getNodeText).join('');
  if (node && typeof node === 'object' && node.props && node.props.children) {
    return getNodeText(node.props.children);
  }
  return '';
}

interface TocItem {
  level: number;
  text: string;
  id: string;
}

export const GuidePage: React.FC = () => {
  const { currentUser, enterDemoMode } = useMatchday();
  const { replayOnboarding } = useOnboarding();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<string>('');
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Parse Table of Contents from raw markdown
  const tocItems = useMemo<TocItem[]>(() => {
    const lines = guideMarkdown.split('\n');
    const items: TocItem[] = [];
    const headingRegex = /^(#{2,3})\s+(.+)$/;

    for (const line of lines) {
      const match = headingRegex.exec(line);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        // Skip the "Table of Contents" heading itself from TOC list
        if (text.toLowerCase() === 'table of contents') continue;
        items.push({
          level,
          text,
          id: githubSlug(text),
        });
      }
    }
    return items;
  }, []);

  // Filter TOC or sections by search query
  const filteredToc = useMemo(() => {
    if (!searchQuery.trim()) return tocItems;
    const q = searchQuery.toLowerCase();
    return tocItems.filter((item) => item.text.toLowerCase().includes(q));
  }, [tocItems, searchQuery]);

  // Scroll listener for "Back to top" and active section highlight
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);

      // Find currently visible heading
      const headingElements = tocItems
        .map((item) => document.getElementById(item.id))
        .filter(Boolean) as HTMLElement[];

      const scrollPos = window.scrollY + 140;
      for (let i = headingElements.length - 1; i >= 0; i--) {
        const el = headingElements[i];
        if (el.offsetTop <= scrollPos) {
          setActiveSectionId(el.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [tocItems]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleStartDemo = () => {
    enterDemoMode();
    showToast('Loaded Demo Mode with sample squad: The Rovers FC', 'info');
    navigate({ to: '/lineup', search: (prev: any) => prev });
  };

  const handleReplaySetupWizard = () => {
    navigate({ to: '/lineup', search: (prev: any) => prev });
    replayOnboarding();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SubShuffle Coach User Guide',
          text: 'Comprehensive matchday guide for grassroots football coaches using SubShuffle.',
          url: window.location.href,
        });
      } catch {
        // Ignored if cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Guide link copied to clipboard!', 'success');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-black">
      {/* Public Top Navbar */}
      <PublicNav activePage="guide" />

      {/* Hero Header */}
      <section className="relative overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-950 py-10 sm:py-14">
        {/* Glow backdrop */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-48 bg-gradient-to-r from-emerald-500/10 via-sky-500/15 to-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Grassroots Coach Handbook</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                SubShuffle Coach User Guide
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Step-by-step walkthroughs for club setup, FA-compliant fair-play rotations, pitchside stopwatch subs, and season participation reports.
              </p>
            </div>

            {/* Quick Action Tools */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={handleReplaySetupWizard}
                className="min-h-[42px] px-3.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                title="Replay interactive setup wizard and product tour"
                data-testid="guide-replay-wizard-button"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Replay Setup Wizard</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="min-h-[42px] px-3.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                title="Print or save as PDF"
              >
                <Printer className="w-3.5 h-3.5 text-slate-400" />
                <span>Print Guide</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="min-h-[42px] px-3.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                title="Share guide link"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Share</span>
              </button>

              {currentUser ? (
                <button
                  type="button"
                  onClick={() => navigate({ to: '/lineup', search: (p: any) => p })}
                  className="min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  <span>Open Planner</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartDemo}
                  className="min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Try Interactive Demo</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Search Bar */}
          <div className="mt-8 max-w-xl">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics (e.g. substitutions, blackout dates, fair play, pricing)..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/40 shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  aria-label="Clear search query"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Found {filteredToc.length} matching guide sections</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-emerald-400 hover:underline cursor-pointer"
                >
                  Clear filter
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Guide Content & Sidebar */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Sticky Table of Contents Sidebar (Desktop) */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 no-scrollbar">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Guide Contents</span>
            </div>

            <nav className="space-y-0.5" aria-label="Table of Contents">
              {filteredToc.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">No matching topics found.</p>
              ) : (
                filteredToc.map((item) => {
                  const isH2 = item.level === 2;
                  const isActive = activeSectionId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => scrollToSection(item.id)}
                      className={`w-full text-left rounded-lg transition-colors cursor-pointer flex items-center justify-between group ${
                        isH2
                          ? 'py-2 px-2.5 text-xs font-bold mt-2 first:mt-0'
                          : 'py-1.5 pl-6 pr-2 text-[11px] font-medium'
                      } ${
                        isActive
                          ? 'bg-emerald-500/15 text-emerald-400 font-bold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <span className="truncate">{item.text}</span>
                      <ChevronRight
                        className={`w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-transform shrink-0 ${
                          isActive ? 'text-emerald-400 translate-x-0.5' : ''
                        }`}
                      />
                    </button>
                  );
                })
              )}
            </nav>
          </aside>

          {/* Markdown Body Viewer */}
          <article className="lg:col-span-8 bg-slate-900/40 rounded-3xl border border-slate-800/80 p-6 sm:p-10 shadow-xl overflow-hidden">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1({ children, ...props }) {
                  const text = getNodeText(children);
                  const id = githubSlug(text);
                  return (
                    <h1
                      id={id}
                      className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight pb-4 mb-6 border-b border-slate-800/80 scroll-mt-24"
                      {...props}
                    >
                      {children}
                    </h1>
                  );
                },
                h2({ children, ...props }) {
                  const text = getNodeText(children);
                  const id = githubSlug(text);
                  return (
                    <h2
                      id={id}
                      className="text-xl sm:text-2xl font-bold text-white mt-12 mb-4 pt-6 border-t border-slate-800/80 flex items-center gap-2.5 group scroll-mt-24"
                      {...props}
                    >
                      <span className="text-emerald-400 font-mono text-lg select-none">§</span>
                      <span>{children}</span>
                    </h2>
                  );
                },
                h3({ children, ...props }) {
                  const text = getNodeText(children);
                  const id = githubSlug(text);
                  return (
                    <h3
                      id={id}
                      className="text-base sm:text-lg font-bold text-emerald-300 mt-7 mb-3 flex items-center gap-2 scroll-mt-24"
                      {...props}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shrink-0" />
                      <span>{children}</span>
                    </h3>
                  );
                },
                h4({ children, ...props }) {
                  return (
                    <h4 className="text-sm font-semibold text-slate-200 mt-4 mb-2" {...props}>
                      {children}
                    </h4>
                  );
                },
                p({ children, ...props }) {
                  return (
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4" {...props}>
                      {children}
                    </p>
                  );
                },
                ul({ children, ...props }) {
                  return (
                    <ul className="list-disc pl-5 space-y-1.5 mb-5 text-slate-300 text-xs sm:text-sm marker:text-emerald-400" {...props}>
                      {children}
                    </ul>
                  );
                },
                ol({ children, ...props }) {
                  return (
                    <ol className="list-decimal pl-5 space-y-1.5 mb-5 text-slate-300 text-xs sm:text-sm marker:text-emerald-400 font-medium" {...props}>
                      {children}
                    </ol>
                  );
                },
                li({ children, ...props }) {
                  return (
                    <li className="leading-relaxed pl-1" {...props}>
                      {children}
                    </li>
                  );
                },
                blockquote({ children, ...props }) {
                  return (
                    <blockquote
                      className="my-5 p-4 rounded-2xl bg-emerald-500/10 border-l-4 border-emerald-500 text-emerald-200 text-xs sm:text-sm leading-relaxed shadow-sm"
                      {...props}
                    >
                      {children}
                    </blockquote>
                  );
                },
                table({ children, ...props }) {
                  return (
                    <div className="overflow-x-auto my-6 rounded-2xl border border-slate-800 shadow-md">
                      <table className="w-full text-left text-xs border-collapse" {...props}>
                        {children}
                      </table>
                    </div>
                  );
                },
                thead({ children, ...props }) {
                  return (
                    <thead className="bg-slate-850 text-slate-200 uppercase tracking-wider font-bold border-b border-slate-800" {...props}>
                      {children}
                    </thead>
                  );
                },
                th({ children, ...props }) {
                  return (
                    <th className="p-3 text-[11px] font-bold text-slate-300" {...props}>
                      {children}
                    </th>
                  );
                },
                td({ children, ...props }) {
                  return (
                    <td className="p-3 border-t border-slate-800/60 text-slate-300 text-xs" {...props}>
                      {children}
                    </td>
                  );
                },
                code({ inline, className, children, ...props }: any) {
                  return (
                    <code
                      className="px-1.5 py-0.5 rounded-md bg-slate-800 text-emerald-300 font-mono text-[11px] border border-slate-700/60"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                a({ href, children, ...props }) {
                  const isInternalAnchor = href && href.startsWith('#');
                  return (
                    <a
                      href={href}
                      onClick={(e) => {
                        if (isInternalAnchor) {
                          e.preventDefault();
                          scrollToSection(href.slice(1));
                        }
                      }}
                      className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors cursor-pointer font-medium"
                      {...props}
                    >
                      {children}
                    </a>
                  );
                },
                hr({ ...props }) {
                  return <hr className="my-8 border-slate-800/80" {...props} />;
                },
                strong({ children, ...props }) {
                  return <strong className="font-bold text-white" {...props}>{children}</strong>;
                },
              }}
            >
              {guideMarkdown}
            </ReactMarkdown>

            {/* End of Guide Touchline Help Banner */}
            <div className="mt-12 p-6 rounded-2xl bg-gradient-to-tr from-emerald-950/40 via-slate-900 to-indigo-950/30 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-5">
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Ready to run your next matchday?</span>
                </div>
                <p className="text-xs text-slate-300">
                  Open SubShuffle to auto-balance your lineups, share WhatsApp call-ups, and track fair play.
                </p>
              </div>

              {currentUser ? (
                <button
                  type="button"
                  onClick={() => navigate({ to: '/lineup', search: (p: any) => p })}
                  className="min-h-[44px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartDemo}
                  className="min-h-[44px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Launch Interactive Demo</span>
                </button>
              )}
            </div>
          </article>
        </div>
      </main>

      {/* Floating Back to Top Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-slate-900/90 hover:bg-emerald-600 text-slate-300 hover:text-white border border-slate-700 hover:border-emerald-500 shadow-2xl backdrop-blur-md transition-all cursor-pointer animate-in fade-in"
          aria-label="Scroll back to top"
          title="Back to top"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}

      {/* Public Footer */}
      <footer className="mt-auto py-8 bg-slate-950 text-slate-500 text-xs border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-300">SubShuffle</span>
            <span>•</span>
            <span>Coach User Guide</span>
            <span>•</span>
            <AppVersion onClick={() => setChangelogOpen(true)} />
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <Link to="/rules" className="hover:text-emerald-400 transition cursor-pointer">
              FA Youth Rules
            </Link>
            <span>•</span>
            <Link to="/calculator" className="hover:text-emerald-400 transition cursor-pointer">
              Playing Time Calculator
            </Link>
            <span>•</span>
            <button
              type="button"
              onClick={handleStartDemo}
              className="hover:text-emerald-400 transition cursor-pointer"
            >
              Interactive Demo
            </button>
          </div>
        </div>
      </footer>

      <ReleaseNotesModal
        isOpen={changelogOpen}
        onClose={() => setChangelogOpen(false)}
      />
    </div>
  );
};
