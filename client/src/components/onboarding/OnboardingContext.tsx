import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserOnboardingState, DEFAULT_ONBOARDING_STATE } from '../../types';
import { getAuthToken } from '../../firebase';
import { useMatchday } from '../../context/MatchdayContext';

const LOCAL_STORAGE_KEY = 'subshuffle_onboarding_state';

interface OnboardingContextType {
  onboarding: UserOnboardingState;
  isWizardOpen: boolean;
  isTourOpen: boolean;
  tourStep: number;
  openWizard: () => void;
  closeWizard: (skip?: boolean) => void;
  completeWizard: (steps?: UserOnboardingState['completedSteps']) => Promise<void>;
  startTour: () => void;
  nextTourStep: () => void;
  prevTourStep: () => void;
  closeTour: () => void;
  replayOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useMatchday();
  const [onboarding, setOnboarding] = useState<UserOnboardingState>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        return { ...DEFAULT_ONBOARDING_STATE, ...JSON.parse(cached) };
      }
    } catch {
      // Fallback to default
    }
    return DEFAULT_ONBOARDING_STATE;
  });

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const initialCheckDone = useRef(false);

  // Sync state to backend API and localStorage
  const syncOnboarding = useCallback(async (newState: Partial<UserOnboardingState>) => {
    setOnboarding((prev) => {
      const merged: UserOnboardingState = {
        ...prev,
        ...newState,
        completedSteps: newState.completedSteps
          ? Array.from(new Set([...prev.completedSteps, ...newState.completedSteps]))
          : prev.completedSteps,
      };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
      } catch {
        // Ignore storage errors
      }
      return merged;
    });

    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (currentUser?.uid) {
        headers['x-user-id'] = currentUser.uid;
        headers['x-user-email'] = currentUser.email || '';
        headers['Authorization'] = 'Bearer mock-dev-token';
      }

      await fetch('/api/user/onboarding', {
        method: 'POST',
        headers,
        body: JSON.stringify(newState),
      });
    } catch (err) {
      console.warn('Failed to sync onboarding state with server:', err);
    }
  }, [currentUser]);

  // Fetch initial onboarding state from API
  useEffect(() => {
    let isMounted = true;

    async function loadOnboarding() {
      try {
        const token = await getAuthToken();
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        } else if (currentUser?.uid) {
          headers['x-user-id'] = currentUser.uid;
          headers['x-user-email'] = currentUser.email || '';
          headers['Authorization'] = 'Bearer mock-dev-token';
        }

        const res = await fetch('/api/user/onboarding', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.onboarding && isMounted) {
            setOnboarding((prev) => {
              const combined: UserOnboardingState = {
                ...DEFAULT_ONBOARDING_STATE,
                ...prev,
                ...data.onboarding,
                hasCompletedWizard: Boolean(prev.hasCompletedWizard || data.onboarding.hasCompletedWizard),
                hasSeenTour: Boolean(prev.hasSeenTour || data.onboarding.hasSeenTour),
                wizardDismissedAt: prev.wizardDismissedAt || data.onboarding.wizardDismissedAt,
              };
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(combined));
              } catch {
                // Ignore
              }
              return combined;
            });

            // Check if first-time coach needs setup wizard
            if (!initialCheckDone.current) {
              initialCheckDone.current = true;
              const isInformationalRoute =
                typeof window !== 'undefined' &&
                (window.location.pathname.startsWith('/guide') ||
                  window.location.pathname.startsWith('/rules') ||
                  window.location.pathname.startsWith('/features') ||
                  window.location.pathname.startsWith('/landing'));

              let localCached: Partial<UserOnboardingState> | null = null;
              try {
                const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
                if (raw) localCached = JSON.parse(raw);
              } catch {
                // Ignore
              }

              const hasCompleted = Boolean(
                data.onboarding.hasCompletedWizard || localCached?.hasCompletedWizard
              );
              const wasDismissed = Boolean(
                data.onboarding.wizardDismissedAt || localCached?.wizardDismissedAt
              );

              if (!hasCompleted && !wasDismissed && !isInformationalRoute) {
                // Wait briefly for app mount
                setTimeout(() => {
                  if (isMounted) setIsWizardOpen(true);
                }, 600);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch initial onboarding state:', err);
      }
    }

    loadOnboarding();

    return () => {
      isMounted = false;
    };
  }, []);

  const openWizard = useCallback(() => {
    setIsTourOpen(false);
    setIsWizardOpen(true);
  }, []);

  const closeWizard = useCallback((skip: boolean = false) => {
    setIsWizardOpen(false);
    if (skip) {
      syncOnboarding({
        wizardDismissedAt: new Date().toISOString(),
      });
    }
  }, [syncOnboarding]);

  const startTour = useCallback(() => {
    setIsWizardOpen(false);
    setTourStep(0);
    setIsTourOpen(true);
  }, []);

  const completeWizard = useCallback(async (steps?: UserOnboardingState['completedSteps']) => {
    setIsWizardOpen(false);
    await syncOnboarding({
      hasCompletedWizard: true,
      completedSteps: steps || ['team_created', 'players_added', 'fixture_created'],
    });

    // Seamlessly launch the guided spotlight tour
    startTour();
  }, [syncOnboarding, startTour]);

  const nextTourStep = useCallback(() => {
    setTourStep((prev) => prev + 1);
  }, []);

  const prevTourStep = useCallback(() => {
    setTourStep((prev) => Math.max(0, prev - 1));
  }, []);

  const closeTour = useCallback(() => {
    setIsTourOpen(false);
    syncOnboarding({
      hasSeenTour: true,
    });
  }, [syncOnboarding]);

  const replayOnboarding = useCallback(() => {
    setIsTourOpen(false);
    setIsWizardOpen(true);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        onboarding,
        isWizardOpen,
        isTourOpen,
        tourStep,
        openWizard,
        closeWizard,
        completeWizard,
        startTour,
        nextTourStep,
        prevTourStep,
        closeTour,
        replayOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export function useOnboarding(): OnboardingContextType {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
