/**
 * Application Version Utilities
 * Reads the version injected during Vite build/dev, or falls back to standard 1.0.0.
 */

export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

export const APP_VERSION_LABEL = `v${APP_VERSION}`;

export const getAppVersion = (): string => APP_VERSION;
