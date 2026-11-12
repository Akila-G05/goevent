import { create } from 'zustand';

/** Default fade-out duration used by `loading.close()`. */
export const DEFAULT_CLOSE_MS = 500;

interface LoadingState {
  /** Whether the overlay is mounted. */
  visible: boolean;
  /** True while the overlay is fading out. */
  closing: boolean;
  /** How many requests (or manual `open()` calls) are still waiting. */
  pending: number;
  /** Duration of the current fade-out, in milliseconds. */
  closeDuration: number;
  open: () => void;
  close: (durationMs?: number) => void;
}

let closeTimer: ReturnType<typeof setTimeout> | null = null;

export const useLoadingStore = create<LoadingState>((set, get) => ({
  visible: false,
  closing: false,
  pending: 0,
  closeDuration: DEFAULT_CLOSE_MS,

  /** Show the overlay immediately. Every call must be paired with a `close()`. */
  open: () => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }

    set((state) => ({
      visible: true,
      closing: false,
      pending: state.pending + 1,
    }));
  },

  /**
   * Hide the overlay after `durationMs` milliseconds (default 500).
   * While another request is still running the overlay stays open, and the
   * fade-out is rescheduled when the final request finishes.
   */
  close: (durationMs = DEFAULT_CLOSE_MS) => {
    const { pending, closing } = get();
    const nextPending = Math.max(0, pending - 1);

    if (nextPending !== pending) {
      set({ pending: nextPending });
    }

    // Requests are still in flight, or a fade-out is already running.
    if (nextPending > 0 || closing) {
      return;
    }

    set({ closing: true, closeDuration: durationMs });

    closeTimer = setTimeout(() => {
      closeTimer = null;
      set({ visible: false, closing: false });
    }, durationMs);
  },
}));

/**
 * Imperative API usable outside React (axios interceptors, helpers, etc.):
 *
 *   loading.open();        // show the overlay
 *   loading.close(500);    // fade out over 500 ms, then unmount
 */
export const loading = {
  open: () => useLoadingStore.getState().open(),
  close: (durationMs?: number) => useLoadingStore.getState().close(durationMs),
};
