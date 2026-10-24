import { trace as firebaseTrace, type PerformanceTrace } from 'firebase/performance';
import { perf } from '../firebase';

export interface TraceHandle {
  putAttribute: (attr: string, value: string) => void;
  putMetric: (metricName: string, value: number) => void;
  incrementMetric: (metricName: string, by?: number) => void;
  stop: () => void;
}

/**
 * Creates and starts a custom performance trace using the Firebase Performance SDK.
 * In environments where Firebase Performance is not active (e.g. dev, SSR, or tests without flag),
 * safely returns a no-op trace handle that never throws, and logs to console when VITE_DEBUG_PERF is set.
 */
export const startTrace = (traceName: string, attributes?: Record<string, string>): TraceHandle => {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  let nativeTrace: PerformanceTrace | null = null;

  try {
    if (perf) {
      nativeTrace = firebaseTrace(perf, traceName);
      if (attributes) {
        Object.entries(attributes).forEach(([k, v]) => {
          try {
            nativeTrace?.putAttribute(k, String(v));
          } catch {}
        });
      }
      nativeTrace.start();
    }
  } catch (err) {
    console.warn(`[Performance] Failed to start trace "${traceName}":`, err);
  }

  const isDebug =
    import.meta.env.DEV &&
    (import.meta.env.VITE_DEBUG_PERF === 'true' || import.meta.env.VITE_ENABLE_PERF === 'true');

  return {
    putAttribute: (attr: string, value: string) => {
      try {
        nativeTrace?.putAttribute(attr, String(value));
      } catch {}
    },
    putMetric: (metricName: string, value: number) => {
      try {
        nativeTrace?.putMetric(metricName, Math.round(value));
      } catch {}
    },
    incrementMetric: (metricName: string, by: number = 1) => {
      try {
        nativeTrace?.incrementMetric(metricName, Math.round(by));
      } catch {}
    },
    stop: () => {
      try {
        nativeTrace?.stop();
      } catch (err) {
        console.warn(`[Performance] Failed to stop trace "${traceName}":`, err);
      }
      if (isDebug) {
        const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
        console.log(`[Performance Trace] "${traceName}" completed in ${duration.toFixed(2)}ms`);
      }
    },
  };
};

/**
 * Executes a synchronous or asynchronous operation wrapped in a custom Firebase Performance trace.
 * Guarantees that the trace is always stopped even if an error is thrown.
 */
export const runWithTrace = async <T>(
  traceName: string,
  fn: (trace: TraceHandle) => Promise<T> | T,
  attributes?: Record<string, string>
): Promise<T> => {
  const handle = startTrace(traceName, attributes);
  try {
    return await fn(handle);
  } finally {
    handle.stop();
  }
};
