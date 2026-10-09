import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  AppContextMode,
  ComponentDensity,
  ClubhouseMode,
  getContrastTextColor,
} from './tokens';

export interface DesignSystemContextValue {
  context: AppContextMode;
  setContext: (mode: AppContextMode) => void;
  density: ComponentDensity;
  setDensity: (density: ComponentDensity) => void;
  clubhouseMode: ClubhouseMode;
  setClubhouseMode: (mode: ClubhouseMode) => void;
  kitPrimary: string;
  kitSecondary: string;
  setKitColors: (primary: string, secondary: string) => void;
  isTouchline: boolean;
  isPrint: boolean;
  isClubhouse: boolean;
  toggleTouchline: () => void;
  resetToDefaults: () => void;
}

const DesignSystemContext = createContext<DesignSystemContextValue | null>(null);

const STORAGE_KEY_CONTEXT = 'subshuffle_ds_context';
const STORAGE_KEY_DENSITY = 'subshuffle_ds_density';
const STORAGE_KEY_MODE = 'subshuffle_ds_mode';
const STORAGE_KEY_KIT_PRIMARY = 'subshuffle_ds_kit_primary';
const STORAGE_KEY_KIT_SECONDARY = 'subshuffle_ds_kit_secondary';

export interface DesignSystemProviderProps {
  children: React.ReactNode;
  initialContext?: AppContextMode;
  initialDensity?: ComponentDensity;
  teamKitPrimary?: string;
  teamKitSecondary?: string;
}

export const DesignSystemProvider: React.FC<DesignSystemProviderProps> = ({
  children,
  initialContext,
  initialDensity,
  teamKitPrimary,
  teamKitSecondary,
}) => {
  // Context: clubhouse (default admin), touchline (pitchside high contrast), print (clean sheet)
  const [context, setContextState] = useState<AppContextMode>(() => {
    if (initialContext) return initialContext;
    const saved = localStorage.getItem(STORAGE_KEY_CONTEXT) as AppContextMode | null;
    return saved === 'touchline' || saved === 'print' || saved === 'clubhouse' ? saved : 'clubhouse';
  });

  // Density: compact, normal, touchline
  const [density, setDensityState] = useState<ComponentDensity>(() => {
    if (initialDensity) return initialDensity;
    const saved = localStorage.getItem(STORAGE_KEY_DENSITY) as ComponentDensity | null;
    return saved === 'compact' || saved === 'touchline' || saved === 'normal' ? saved : 'normal';
  });

  // Clubhouse Theme: dark (midnight dugout admin) or light (crisp daytime)
  const [clubhouseMode, setClubhouseModeState] = useState<ClubhouseMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MODE) as ClubhouseMode | null;
    return saved === 'light' ? 'light' : 'dark';
  });

  // Club Kit Colors (Dynamically overridable)
  const [kitPrimary, setKitPrimary] = useState<string>(() => {
    return teamKitPrimary || localStorage.getItem(STORAGE_KEY_KIT_PRIMARY) || '#1e3a8a';
  });
  const [kitSecondary, setKitSecondary] = useState<string>(() => {
    return teamKitSecondary || localStorage.getItem(STORAGE_KEY_KIT_SECONDARY) || '#f59e0b';
  });

  // Sync when team kit colors update from TeamSettings
  useEffect(() => {
    if (teamKitPrimary && teamKitPrimary !== kitPrimary) {
      setKitPrimary(teamKitPrimary);
    }
  }, [teamKitPrimary]);

  useEffect(() => {
    if (teamKitSecondary && teamKitSecondary !== kitSecondary) {
      setKitSecondary(teamKitSecondary);
    }
  }, [teamKitSecondary]);

  // Apply CSS custom properties and data attributes to the document root in real time
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-context', context);
    root.setAttribute('data-density', context === 'touchline' ? 'touchline' : density);
    root.setAttribute('data-mode', clubhouseMode);

    root.style.setProperty('--kit-primary', kitPrimary);
    root.style.setProperty('--kit-secondary', kitSecondary);
    root.style.setProperty('--kit-primary-contrast', getContrastTextColor(kitPrimary));
    root.style.setProperty('--kit-secondary-contrast', getContrastTextColor(kitSecondary));

    // Save preferences
    localStorage.setItem(STORAGE_KEY_CONTEXT, context);
    localStorage.setItem(STORAGE_KEY_DENSITY, density);
    localStorage.setItem(STORAGE_KEY_MODE, clubhouseMode);
    localStorage.setItem(STORAGE_KEY_KIT_PRIMARY, kitPrimary);
    localStorage.setItem(STORAGE_KEY_KIT_SECONDARY, kitSecondary);
  }, [context, density, clubhouseMode, kitPrimary, kitSecondary]);

  const setContext = useCallback((newContext: AppContextMode) => {
    setContextState(newContext);
    // Automatically adjust density to touchline when switching to touchline mode
    if (newContext === 'touchline') {
      setDensityState('touchline');
    } else if (newContext === 'clubhouse' && density === 'touchline') {
      setDensityState('normal');
    }
  }, [density]);

  const setDensity = useCallback((newDensity: ComponentDensity) => {
    setDensityState(newDensity);
  }, []);

  const setClubhouseMode = useCallback((mode: ClubhouseMode) => {
    setClubhouseModeState(mode);
  }, []);

  const setKitColors = useCallback((primary: string, secondary: string) => {
    setKitPrimary(primary);
    setKitSecondary(secondary);
  }, []);

  const toggleTouchline = useCallback(() => {
    setContextState((prev) => (prev === 'touchline' ? 'clubhouse' : 'touchline'));
  }, []);

  const resetToDefaults = useCallback(() => {
    setContextState('clubhouse');
    setDensityState('normal');
    setClubhouseModeState('dark');
    setKitPrimary('#1e3a8a');
    setKitSecondary('#f59e0b');
  }, []);

  const value = useMemo<DesignSystemContextValue>(
    () => ({
      context,
      setContext,
      density,
      setDensity,
      clubhouseMode,
      setClubhouseMode,
      kitPrimary,
      kitSecondary,
      setKitColors,
      isTouchline: context === 'touchline',
      isPrint: context === 'print',
      isClubhouse: context === 'clubhouse',
      toggleTouchline,
      resetToDefaults,
    }),
    [
      context,
      setContext,
      density,
      setDensity,
      clubhouseMode,
      setClubhouseMode,
      kitPrimary,
      kitSecondary,
      setKitColors,
      toggleTouchline,
      resetToDefaults,
    ]
  );

  return (
    <DesignSystemContext.Provider value={value}>
      <div
        className="design-system-root w-full min-h-full transition-colors duration-200"
        data-context={context}
        data-density={context === 'touchline' ? 'touchline' : density}
        data-mode={clubhouseMode}
      >
        {children}
      </div>
    </DesignSystemContext.Provider>
  );
};

export const useDesignSystem = (): DesignSystemContextValue => {
  const ctx = useContext(DesignSystemContext);
  if (!ctx) {
    throw new Error('useDesignSystem must be used within a DesignSystemProvider');
  }
  return ctx;
};
