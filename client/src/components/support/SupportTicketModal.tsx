import React, { useState, useEffect } from 'react';
import {
  X,
  Bug,
  Lightbulb,
  HelpCircle,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LifeBuoy,
  Cpu,
} from 'lucide-react';
import { getAuthToken } from '../../firebase';
import {
  SupportTicketCategory,
  SupportTelemetry,
  SupportTicketResponse,
} from '../../types';

export interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userId?: string;
  activeTeamId?: string;
  activeFixtureId?: string;
  initialCategory?: SupportTicketCategory;
  initialSummary?: string;
  initialDescription?: string;
}

const APP_VERSION = '1.7.1';

export function gatherSupportTelemetry(context: {
  userEmail?: string;
  userId?: string;
  activeTeamId?: string;
  activeFixtureId?: string;
}): SupportTelemetry {
  const isBrowser = typeof window !== 'undefined';
  return {
    userEmail: context.userEmail || 'guest@subshuffle.local',
    userId: context.userId || 'guest',
    activeTeamId: context.activeTeamId || undefined,
    activeFixtureId: context.activeFixtureId || undefined,
    currentPath: isBrowser
      ? `${window.location.pathname}${window.location.search}`
      : '/',
    viewport: isBrowser ? `${window.innerWidth}x${window.innerHeight}` : '0x0',
    userAgent:
      typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    appVersion: APP_VERSION,
    onlineStatus: typeof navigator !== 'undefined' ? navigator.onLine : true,
    timestamp: new Date().toISOString(),
  };
}

const CATEGORY_OPTIONS: {
  id: SupportTicketCategory;
  label: string;
  sublabel: string;
  issueTypeId: string;
  icon: React.ComponentType<{ className?: string }>;
  activeClass: string;
}[] = [
  {
    id: 'bug',
    label: 'Bug Report',
    sublabel: 'Glitch or error',
    issueTypeId: '10002',
    icon: Bug,
    activeClass:
      'bg-rose-500/20 border-rose-500/50 text-rose-200 shadow-sm shadow-rose-500/10',
  },
  {
    id: 'feature',
    label: 'Feature Idea',
    sublabel: 'New suggestion',
    issueTypeId: '10003',
    icon: Lightbulb,
    activeClass:
      'bg-amber-500/20 border-amber-500/50 text-amber-200 shadow-sm shadow-amber-500/10',
  },
  {
    id: 'question',
    label: 'General Help',
    sublabel: 'Account or rules',
    issueTypeId: '10001',
    icon: HelpCircle,
    activeClass:
      'bg-sky-500/20 border-sky-500/50 text-sky-200 shadow-sm shadow-sky-500/10',
  },
];

export const SupportTicketModal: React.FC<SupportTicketModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  userId,
  activeTeamId,
  activeFixtureId,
  initialCategory = 'bug',
  initialSummary = '',
  initialDescription = '',
}) => {
  const [category, setCategory] = useState<SupportTicketCategory>(initialCategory);
  const [summary, setSummary] = useState(initialSummary);
  const [description, setDescription] = useState(initialDescription);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] =
    useState<SupportTicketResponse | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCategory(initialCategory);
      setSummary(initialSummary);
      setDescription(initialDescription);
      setSummaryError(null);
      setDescriptionError(null);
      setSubmitError(null);
      setSubmittedTicket(null);
    }
  }, [isOpen, initialCategory, initialSummary, initialDescription]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const telemetryPreview = gatherSupportTelemetry({
    userEmail,
    userId,
    activeTeamId,
    activeFixtureId,
  });

  const validateForm = (): boolean => {
    let valid = true;
    if (!summary.trim()) {
      setSummaryError('Please enter a short summary of your request.');
      valid = false;
    } else {
      setSummaryError(null);
    }

    if (!description.trim()) {
      setDescriptionError('Please provide details so we can help you quickly.');
      valid = false;
    } else {
      setDescriptionError(null);
    }

    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : 'Bearer mock-dev-token',
      };

      const telemetry = gatherSupportTelemetry({
        userEmail,
        userId,
        activeTeamId,
        activeFixtureId,
      });

      const res = await fetch('/api/support/ticket', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          category,
          summary: summary.trim(),
          description: description.trim(),
          telemetry,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.error || 'Could not submit support ticket. Please try again.'
        );
      }

      setSubmittedTicket({
        success: true,
        ticketKey: data.ticketKey || 'OPS-1',
        issueTypeId: data.issueTypeId || '10002',
        simulated: data.simulated,
      });
    } catch (err: any) {
      setSubmitError(
        err.message || 'An unexpected error occurred while sending your request.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSummary('');
    setDescription('');
    setSummaryError(null);
    setDescriptionError(null);
    setSubmitError(null);
    setSubmittedTicket(null);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      data-testid="support-ticket-modal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[92dvh] sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-modal-title"
      >
        {/* Sticky Header */}
        <div className="shrink-0 p-4 sm:p-6 pb-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="support-modal-title"
                className="text-base font-bold text-white"
              >
                Help &amp; Feedback
              </h3>
              <p className="text-[11px] text-slate-400">
                Direct pitchside support &amp; feature requests
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer flex items-center justify-center"
            aria-label="Close support modal"
            data-testid="support-modal-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-8 space-y-4">
          {submittedTicket ? (
            <div
              className="py-6 px-4 rounded-2xl bg-slate-950/70 border border-emerald-500/30 text-center space-y-4 animate-in fade-in duration-150"
              data-testid="support-ticket-success"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">
                  Request Received!
                </h4>
                <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                  Our team has logged your request in our support queue. Keep your
                  reference key handy:
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-emerald-500/40">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  Ticket Ref:
                </span>
                <span
                  className="text-sm font-mono font-black text-emerald-300"
                  data-testid="support-ticket-key"
                >
                  {submittedTicket.ticketKey}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Updates will be sent to{' '}
                <strong className="text-slate-200">
                  {telemetryPreview.userEmail}
                </strong>
                .
              </p>
            </div>
          ) : (
            <form
              id="support-ticket-form"
              onSubmit={handleSubmit}
              noValidate
              className="space-y-4 text-xs"
            >
              {/* Category Selector */}
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold text-xs">
                  How can we help?
                </label>
                <div
                  className="grid grid-cols-3 gap-2"
                  role="radiogroup"
                  aria-label="Ticket category"
                >
                  {CATEGORY_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = category === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setCategory(opt.id)}
                        data-testid={`support-category-${opt.id}`}
                        className={`min-h-[44px] p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
                          isSelected
                            ? opt.activeClass
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-[11px]">
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{opt.label}</span>
                        </div>
                        <span className="text-[10px] opacity-80 truncate">
                          {opt.sublabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Summary Input */}
              <div className="space-y-1">
                <label
                  htmlFor="support-summary-input"
                  className="block text-slate-300 font-semibold text-xs"
                >
                  Summary <span className="text-rose-400">*</span>
                </label>
                <input
                  id="support-summary-input"
                  type="text"
                  value={summary}
                  onChange={(e) => {
                    setSummary(e.target.value);
                    if (summaryError && e.target.value.trim()) {
                      setSummaryError(null);
                    }
                  }}
                  placeholder="e.g., Timer stopped in 3rd quarter"
                  maxLength={140}
                  data-testid="support-summary-input"
                  className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-950 border text-white text-xs font-medium placeholder:text-slate-500 focus:outline-none transition ${
                    summaryError
                      ? 'border-rose-500/70 focus:border-rose-400'
                      : 'border-slate-800 focus:border-emerald-500'
                  }`}
                />
                {summaryError && (
                  <p
                    role="alert"
                    data-testid="support-summary-error"
                    className="text-[11px] text-rose-400 flex items-center gap-1 pt-0.5"
                  >
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{summaryError}</span>
                  </p>
                )}
              </div>

              {/* Description Textarea */}
              <div className="space-y-1">
                <label
                  htmlFor="support-description-input"
                  className="block text-slate-300 font-semibold text-xs"
                >
                  Description <span className="text-rose-400">*</span>
                </label>
                <textarea
                  id="support-description-input"
                  rows={4}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (descriptionError && e.target.value.trim()) {
                      setDescriptionError(null);
                    }
                  }}
                  placeholder={
                    category === 'bug'
                      ? 'What happened, and what did you expect to happen?'
                      : category === 'feature'
                      ? 'Describe how this feature would help on matchday...'
                      : 'Let us know your question about your team, account, or FA rules...'
                  }
                  data-testid="support-description-input"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-white text-xs font-medium placeholder:text-slate-500 focus:outline-none transition resize-y ${
                    descriptionError
                      ? 'border-rose-500/70 focus:border-rose-400'
                      : 'border-slate-800 focus:border-emerald-500'
                  }`}
                />
                {descriptionError && (
                  <p
                    role="alert"
                    data-testid="support-description-error"
                    className="text-[11px] text-rose-400 flex items-center gap-1 pt-0.5"
                  >
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{descriptionError}</span>
                  </p>
                )}
              </div>

              {/* Silent Telemetry Notice */}
              <div
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5 text-[11px] text-slate-400"
                data-testid="support-telemetry-info"
              >
                <Cpu className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-300">
                    Automatic Diagnostic Context Attached
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Route: {telemetryPreview.currentPath} • Viewport:{' '}
                    {telemetryPreview.viewport} • v{telemetryPreview.appVersion}
                  </div>
                </div>
              </div>

              {submitError && (
                <div
                  role="alert"
                  data-testid="support-submit-error"
                  className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{submitError}</span>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="shrink-0 flex items-center justify-end gap-2 p-4 sm:px-6 border-t border-slate-800 bg-slate-900/95 backdrop-blur-sm">
          {submittedTicket ? (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold transition cursor-pointer"
                data-testid="support-submit-another-btn"
              >
                Submit Another
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition cursor-pointer"
                data-testid="support-done-btn"
              >
                Done
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="support-ticket-form"
                disabled={submitting}
                data-testid="support-submit-btn"
                className="min-h-[44px] flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-60 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Request</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

