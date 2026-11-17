'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { loading } from '@/lib/loading-store';

/** How long the loading screen stays up for a page change. */
const PAGE_LOAD_MS = 450;

/**
 * Shows the loading screen whenever a page is opened: on the first load and on
 * every route change. Requests made while the page renders are covered by the
 * API client, so the screen stays up until the page has its data.
 */
export function RouteLoader() {
  const pathname = usePathname();

  useEffect(() => {
    loading.open();

    // Each open is paired with its own close, so rapid navigations stay balanced.
    setTimeout(() => loading.close(300), PAGE_LOAD_MS);
  }, [pathname]);

  return null;
}

export default RouteLoader;
