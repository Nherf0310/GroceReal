'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UsePollingOptions {
  intervalMs?: number;
  enabled?: boolean;
}

export function usePolling(
  callback: () => Promise<void> | void,
  { intervalMs = 10000, enabled = true }: UsePollingOptions = {}
) {
  const [isStopped, setIsStopped] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const isPolling = enabled && !isStopped;

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await savedCallback.current();
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const stop = useCallback(() => {
    setIsStopped(true);
  }, []);

  const start = useCallback(() => {
    setIsStopped(false);
  }, []);

  useEffect(() => {
    if (!isPolling) return;

    let timerId: NodeJS.Timeout | null = null;

    const tick = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        try {
          await savedCallback.current();
        } catch (err) {
          console.error('Polling tick failed:', err);
        }
      }
    };

    void tick();
    timerId = setInterval(tick, intervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void tick();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerId) clearInterval(timerId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPolling, intervalMs]);

  return {
    isPolling,
    isRefreshing,
    refresh,
    stop,
    start,
  };
}
