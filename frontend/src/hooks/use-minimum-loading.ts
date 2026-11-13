'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Keeps a loading animation visible for at least `minimumMs`.
 *
 * A request that settles in 100 ms still shows the animation for 500 ms;
 * a request that takes 2000 ms keeps it visible for the whole 2000 ms.
 * Loading stops only after the request has settled AND the minimum time
 * has passed (or the request failed).
 */
export function useMinimumLoading(isLoading: boolean, minimumMs = 500): boolean {
  const [visible, setVisible] = useState(isLoading);
  const startedAtRef = useRef<number | null>(isLoading ? Date.now() : null);

  useEffect(() => {
    if (isLoading) {
      if (startedAtRef.current === null) {
        startedAtRef.current = Date.now();
      }

      setVisible(true);
      return;
    }

    if (startedAtRef.current === null) {
      setVisible(false);
      return;
    }

    const elapsed = Date.now() - startedAtRef.current;
    const remaining = Math.max(0, minimumMs - elapsed);

    const timer = setTimeout(() => {
      startedAtRef.current = null;
      setVisible(false);
    }, remaining);

    return () => clearTimeout(timer);
  }, [isLoading, minimumMs]);

  return visible;
}
