'use client';

import { useLoadingStore } from '@/lib/loading-store';

/**
 * Full-window loading overlay.
 *
 * It is mounted once in the root layout and follows every request made through
 * `apiClient` automatically. Manual control is available via `loading`:
 *
 *   loading.open();
 *   loading.close(500); // closes 500 ms after the call
 */
export function LoadingOverlay() {
  const visible = useLoadingStore((state) => state.visible);
  const closing = useLoadingStore((state) => state.closing);
  const closeDuration = useLoadingStore((state) => state.closeDuration);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading"
      className={`fixed inset-0 z-[100] flex select-none items-center justify-center bg-black/60 backdrop-blur-[2px] transition-opacity ease-out ${
        closing ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      style={{ transitionDuration: `${closeDuration}ms` }}
    >
      <div className="relative flex flex-col items-center gap-8">
        {/* Ambient concert glow */}
        <div className="pointer-events-none absolute -top-10 h-44 w-44 rounded-full bg-red-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 h-44 w-44 rounded-full bg-purple-600/20 blur-3xl" />

        {/* Spinner */}
        <div className="relative flex h-24 w-24 items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-white/10" />

          <span
            className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-white border-r-white/40"
            style={{ animationDuration: '900ms' }}
          />

          <span
            className="absolute inset-3 animate-[spin_1.6s_linear_infinite_reverse] rounded-full border-2 border-transparent border-b-red-500 border-l-red-500/30"
          />

          {/* Brand bars */}
          <span className="relative flex items-end gap-1">
            <span
              className="h-3 w-1.5 -skew-x-12 animate-pulse rounded-full bg-white/90"
              style={{ animationDuration: '900ms' }}
            />
            <span
              className="h-5 w-1.5 -skew-x-12 animate-pulse rounded-full bg-white"
              style={{ animationDuration: '900ms', animationDelay: '150ms' }}
            />
            <span
              className="h-4 w-1.5 -skew-x-12 animate-pulse rounded-full bg-white/70"
              style={{ animationDuration: '900ms', animationDelay: '300ms' }}
            />
          </span>
        </div>

        <span className="font-display text-xs font-bold uppercase tracking-[0.4em] text-white/80">
          Loading
        </span>
      </div>
    </div>
  );
}
