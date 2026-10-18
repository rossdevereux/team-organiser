import { useState, useEffect, useRef, useCallback } from 'react';
import { LiveStatusResponse } from '../types';

export interface UseLiveMatchStatusOptions {
  fixtureId: string | null | undefined;
  enabled?: boolean;
  onStatusChange?: (status: LiveStatusResponse) => void;
  onFullSyncNeeded?: (status: LiveStatusResponse) => void;
}

export interface UseLiveMatchStatusResult {
  data: LiveStatusResponse | null;
  etag: string | null;
  isPolling: boolean;
  isTabVisible: boolean;
  currentInterval: number | null;
  refetch: () => Promise<LiveStatusResponse | null>;
}

/**
 * Custom React hook for highly-optimised live match polling.
 * - Dynamic adaptive intervals: 5s when match is 'live', 30s during 'paused' / 'upcoming', stops on 'completed'.
 * - Page Visibility API: Halts all HTTP requests when browser tab is hidden or screen is locked; resumes instantly on return.
 * - HTTP Conditional Requests: Stores and transmits latest ETag in 'If-None-Match' header; handles 304 Not Modified with 0-byte body.
 */
export function useLiveMatchStatus({
  fixtureId,
  enabled = true,
  onStatusChange,
  onFullSyncNeeded,
}: UseLiveMatchStatusOptions): UseLiveMatchStatusResult {
  const [data, setData] = useState<LiveStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [isTabVisible, setIsTabVisible] = useState<boolean>(
    typeof document !== 'undefined' ? !document.hidden : true
  );
  const [currentInterval, setCurrentInterval] = useState<number | null>(null);

  const etagRef = useRef<string | null>(null);
  const latestDataRef = useRef<LiveStatusResponse | null>(null);
  const prevFixtureIdRef = useRef<string | null | undefined>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const inFlightRef = useRef<boolean>(false);

  // Stable callbacks via refs to avoid tearing timers on render
  const onStatusChangeRef = useRef(onStatusChange);
  const onFullSyncNeededRef = useRef(onFullSyncNeeded);
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
    onFullSyncNeededRef.current = onFullSyncNeeded;
  }, [onStatusChange, onFullSyncNeeded]);

  const clearTimer = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, []);

  const calculateNextInterval = useCallback((status: LiveStatusResponse['status'] | undefined): number | null => {
    if (status === 'completed') {
      return null; // Terminate polling
    }
    if (status === 'live') {
      return 5000; // 5s active live timer interval
    }
    return 30000; // 30s paused / half-time / pre-match interval
  }, []);

  const poll = useCallback(async (): Promise<LiveStatusResponse | null> => {
    if (!fixtureId || !enabled) return null;
    if (typeof document !== 'undefined' && document.hidden) return null;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
    if (inFlightRef.current) return latestDataRef.current;

    inFlightRef.current = true;
    try {
      setIsPolling(true);
      const headers: Record<string, string> = {};
      if (etagRef.current) {
        headers['If-None-Match'] = etagRef.current;
      }

      const res = await fetch(`/api/fixtures/${fixtureId}/live-status`, {
        headers,
      });

      if (!isMountedRef.current) return null;

      // HTTP 304 Not Modified: 0-byte payload transferred
      if (res.status === 304) {
        setIsPolling(false);
        return latestDataRef.current;
      }

      if (res.ok) {
        const newEtag = res.headers.get('ETag') || res.headers.get('etag');
        if (newEtag) {
          etagRef.current = newEtag;
        }

        const freshData: LiveStatusResponse = await res.json();
        const prev = latestDataRef.current;
        latestDataRef.current = freshData;
        setData(freshData);
        setIsPolling(false);

        // Check if full sync needed (e.g. revision number incremented due to sideline sub or score edit)
        if (prev && freshData.version !== prev.version) {
          onFullSyncNeededRef.current?.(freshData);
        }

        // Check if runtime status changed
        if (
          !prev ||
          prev.status !== freshData.status ||
          prev.homeScore !== freshData.homeScore ||
          prev.awayScore !== freshData.awayScore ||
          prev.period !== freshData.period
        ) {
          onStatusChangeRef.current?.(freshData);
        }

        return freshData;
      } else {
        setIsPolling(false);
        return null;
      }
    } catch (_) {
      if (isMountedRef.current) {
        setIsPolling(false);
      }
      return null;
    } finally {
      inFlightRef.current = false;
    }
  }, [fixtureId, enabled]);

  // Maintain scheduleNext in ref for recursive timeout scheduling without stale closures
  const scheduleNextRef = useRef<(delayMs: number | null) => void>(() => {});

  const scheduleNext = useCallback((delayMs: number | null) => {
    clearTimer();
    if (delayMs === null || !enabled || !isMountedRef.current) {
      setCurrentInterval(null);
      return;
    }
    setCurrentInterval(delayMs);
    timeoutIdRef.current = setTimeout(async () => {
      const result = await poll();
      if (!isMountedRef.current) return;
      const nextDelay = calculateNextInterval(result?.status || latestDataRef.current?.status);
      scheduleNextRef.current(nextDelay);
    }, delayMs);
  }, [clearTimer, enabled, poll, calculateNextInterval]);

  useEffect(() => {
    scheduleNextRef.current = scheduleNext;
  }, [scheduleNext]);

  // Handle Page Visibility changes (screen lock / tab backgrounding)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsTabVisible(visible);

      if (!visible) {
        // Halt polling queries while tab is hidden
        clearTimer();
        setCurrentInterval(null);
      } else if (enabled && fixtureId) {
        // Immediately resume query when returning to foreground
        poll().then((res) => {
          if (!isMountedRef.current) return;
          const nextDelay = calculateNextInterval(res?.status || latestDataRef.current?.status);
          scheduleNextRef.current(nextDelay);
        });
      }
    };

    const handleOnline = () => {
      if (!document.hidden && enabled && fixtureId) {
        poll().then((res) => {
          if (!isMountedRef.current) return;
          const nextDelay = calculateNextInterval(res?.status || latestDataRef.current?.status);
          scheduleNextRef.current(nextDelay);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [enabled, fixtureId, poll, clearTimer, calculateNextInterval]);

  const pollRef = useRef(poll);
  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  // Lifecycle when fixtureId or enabled changes
  useEffect(() => {
    isMountedRef.current = true;

    if (!fixtureId || !enabled) {
      clearTimer();
      setCurrentInterval(null);
      return;
    }

    // Only reset cached etag if switching to a DIFFERENT fixture
    if (prevFixtureIdRef.current !== fixtureId) {
      etagRef.current = null;
      latestDataRef.current = null;
      setData(null);
      prevFixtureIdRef.current = fixtureId;
    }

    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }

    // Trigger initial poll
    pollRef.current().then((res) => {
      if (!isMountedRef.current) return;
      const nextDelay = calculateNextInterval(res?.status || latestDataRef.current?.status);
      scheduleNextRef.current(nextDelay);
    });

    return () => {
      clearTimer();
    };
  }, [fixtureId, enabled, clearTimer, calculateNextInterval]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearTimer();
    };
  }, [clearTimer]);

  return {
    data,
    etag: etagRef.current,
    isPolling,
    isTabVisible,
    currentInterval,
    refetch: poll,
  };
}
