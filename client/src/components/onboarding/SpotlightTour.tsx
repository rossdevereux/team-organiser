import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  Trophy,
  Share2,
  Zap,
  Armchair,
  Wand2,
  ShieldCheck,
} from 'lucide-react';
import { useOnboarding } from './OnboardingContext';
import { useMatchday } from '../../context/MatchdayContext';

interface TourStepConfig {
  targetSelector: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  preferredPlacement?: 'top' | 'bottom' | 'center';
}

const TOUR_STEPS: TourStepConfig[] = [
  {
    targetSelector: '[data-tour-target="bench"]',
    title: '1. The Substitute Bench',
    description:
      'Players not starting on the pitch rest here. Tap or drag to substitute players onto the field, or record call-offs and late arrivals with 1 click.',
    icon: <Armchair className="w-5 h-5 text-sky-400" />,
    preferredPlacement: 'bottom',
  },
  {
    targetSelector: '[data-tour-target="auto-balance"]',
    title: '2. ⚡ 1-Tap Auto-Balance',
    description:
      'The magic core of SubShuffle! Our smart fair-rotation algorithm automatically distributes positions and guarantees equal minutes across all match periods.',
    icon: <Wand2 className="w-5 h-5 text-indigo-400" />,
    preferredPlacement: 'bottom',
  },
  {
    targetSelector: '[data-tour-target="pitch"]',
    title: '3. Interactive Pitch & Periods',
    description:
      'View your starting lineup on the tactical pitch canvas. Drag players to swap positions pitchside, and switch between 1st Half and 2nd Half.',
    icon: <Sparkles className="w-5 h-5 text-emerald-400" />,
    preferredPlacement: 'top',
  },
  {
    targetSelector: '[data-tour-target="fair-play"]',
    title: '4. FA 50%+ Equal Minutes Tracker',
    description:
      'SubShuffle continuously validates playing time. Live visual indicators verify every child meets the mandatory 50%+ grassroots youth time rule.',
    icon: <ShieldCheck className="w-5 h-5 text-amber-400" />,
    preferredPlacement: 'bottom',
  },
];

export const SpotlightTour: React.FC = () => {
  const { isTourOpen, tourStep, nextTourStep, prevTourStep, closeTour, startTour } = useOnboarding();
  const { setActiveTab } = useMatchday();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);

  const totalSteps = TOUR_STEPS.length;
  const isCelebration = tourStep >= totalSteps;
  const currentStep = !isCelebration ? TOUR_STEPS[tourStep] : null;

  // Measure and scroll target into view
  const updateTargetPosition = useCallback(() => {
    if (!isTourOpen || isCelebration || !currentStep) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(currentStep.targetSelector) as HTMLElement | null;
    if (!element) {
      setTargetRect(null);
      return;
    }

    // Scroll into view if out of viewport
    const rect = element.getBoundingClientRect();
    const isInViewport =
      rect.top >= 60 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) - 60 &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth);

    if (!isInViewport) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Capture updated rect
    const freshRect = element.getBoundingClientRect();
    setTargetRect(freshRect);

    // Position tooltip
    const padding = 16;
    const tooltipWidth = Math.min(380, window.innerWidth - 32);
    let top = freshRect.bottom + padding;
    let left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, freshRect.left));

    // If bottom clips past window, position above target
    if (top + 220 > window.innerHeight && freshRect.top > 240) {
      top = Math.max(70, freshRect.top - 230);
    }

    setTooltipStyle({
      top: `${top}px`,
      left: `${left}px`,
      maxWidth: `${tooltipWidth}px`,
    });
  }, [isTourOpen, isCelebration, currentStep]);

  useEffect(() => {
    if (isTourOpen) {
      // Ensure we are on Lineup page for the tour steps
      if (!isCelebration && tourStep < 3) {
        setActiveTab('lineup');
      }

      // Allow DOM to settle before measuring
      const timer = setTimeout(updateTargetPosition, 150);
      window.addEventListener('resize', updateTargetPosition);
      window.addEventListener('scroll', updateTargetPosition, true);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updateTargetPosition);
        window.removeEventListener('scroll', updateTargetPosition, true);
      };
    }
  }, [isTourOpen, tourStep, isCelebration, updateTargetPosition, setActiveTab]);

  // Keyboard navigation
  useEffect(() => {
    if (!isTourOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeTour();
      } else if (e.key === 'ArrowRight' && !isCelebration) {
        nextTourStep();
      } else if (e.key === 'ArrowLeft' && tourStep > 0 && !isCelebration) {
        prevTourStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTourOpen, isCelebration, tourStep, nextTourStep, prevTourStep, closeTour]);

  if (!isTourOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Interactive Product Tour"
      className="fixed inset-0 z-50 pointer-events-auto"
    >
      {/* Target Element Spotlight Cutout */}
      {targetRect && !isCelebration && (
        <div
          className="fixed pointer-events-none transition-all duration-300 ease-out rounded-2xl ring-4 ring-sky-400 ring-offset-2 ring-offset-slate-950"
          style={{
            top: `${Math.max(4, targetRect.top - 6)}px`,
            left: `${Math.max(4, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
            boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.82), 0 0 35px rgba(2, 132, 199, 0.5)',
          }}
        />
      )}

      {/* Fallback backdrop if no target element rect is measured */}
      {(!targetRect || isCelebration) && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity duration-300" />
      )}

      {/* Floating Tooltip Card for Steps 1-4 */}
      {!isCelebration && currentStep && (
        <div
          ref={tooltipRef}
          style={
            targetRect
              ? tooltipStyle
              : {
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  maxWidth: '380px',
                }
          }
          className="fixed z-50 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl shadow-2xl p-4 sm:p-5 text-slate-100 flex flex-col space-y-3.5 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                {currentStep.icon}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-sky-400 block">
                  Step {tourStep + 1} of {totalSteps}
                </span>
                <h4 className="text-sm font-black text-white">{currentStep.title}</h4>
              </div>
            </div>

            <button
              type="button"
              onClick={closeTour}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Close tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-300 leading-relaxed">{currentStep.description}</p>

          {/* Controls Footer */}
          <div className="flex items-center justify-between pt-1">
            {/* Step Indicators */}
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    idx === tourStep
                      ? 'w-5 bg-sky-400'
                      : idx < tourStep
                      ? 'w-2 bg-slate-600'
                      : 'w-1.5 bg-slate-800'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {tourStep > 0 && (
                <button
                  type="button"
                  onClick={prevTourStep}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={nextTourStep}
                className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-sky-600/20 transition cursor-pointer"
              >
                <span>{tourStep === totalSteps - 1 ? 'Finish Tour' : 'Next'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Final Celebration Overlay */}
      {isCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto">
          <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl shadow-2xl p-6 sm:p-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
            {/* Confetti Glow Background */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 bg-gradient-to-r from-emerald-500/20 via-sky-500/20 to-amber-500/20 blur-3xl pointer-events-none" />

            <div className="relative space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 via-emerald-500 to-sky-500 p-0.5 mx-auto shadow-xl shadow-amber-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center text-amber-400">
                  <Trophy className="w-8 h-8 animate-bounce" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Setup Complete</span>
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  You're Ready to Coach! 🏆
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                Your squad is organized, your first match is scheduled, and your lineup is perfectly balanced for 50%+ equal playing time.
              </p>
            </div>

            {/* Quick Matchday Feature Highlights */}
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-[#25D366]">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp Sheet</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Export squad lineups and match times directly to parents in 1 tap.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Live Match Mode</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Pitchside stopwatch, sub buzzer, and live substitutions on your phone.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={closeTour}
                className="w-full sm:w-auto min-h-[44px] px-8 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-xs font-extrabold text-slate-950 shadow-lg shadow-emerald-500/25 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Let's Play! 🚀</span>
              </button>
              <button
                type="button"
                onClick={startTour}
                className="w-full sm:w-auto min-h-[44px] px-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
              >
                <span>Replay Tour</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
