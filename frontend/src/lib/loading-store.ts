import { create } from 'zustand';

/** Default fade-out duration used by `loading.close()`. */
export const DEFAULT_CLOSE_MS = 500;

/** Safety net: force-close the overlay if a handler forgets `loading.close()`. */
export const MAX_OPEN_MS = 20000;

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
let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

const clearCloseTimer = () => {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
};

const clearWatchdog = () => {
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }
};

export const useLoadingStore = create<LoadingState>((set, get) => ({
  visible: false,
  closing: false,
  pending: 0,
  closeDuration: DEFAULT_CLOSE_MS,

  /** Show the overlay immediately. Every call must be paired with a `close()`. */
  open: () => {
    clearCloseTimer();

    set((state) => ({
      visible: true,
      closing: false,
      pending: state.pending + 1,
    }));

    if (!watchdogTimer) {
      watchdogTimer = setTimeout(() => {
        watchdogTimer = null;

        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            '[loading] Overlay was still open after 20s and was closed automatically. ' +
              'Did every loading.open() get a loading.close()?'
          );
        }

        set({ pending: 0, closing: true, closeDuration: DEFAULT_CLOSE_MS });

        closeTimer = setTimeout(() => {
          closeTimer = null;
          set({ visible: false, closing: false });
        }, DEFAULT_CLOSE_MS);
      }, MAX_OPEN_MS);
    }
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

    // Requests are still in flight.
    if (nextPending > 0) {
      return;
    }

    clearWatchdog();

    // A fade-out is already running (e.g. triggered by the watchdog).
    if (closing) {
      return;
    }

    set({ closing: true, closeDuration: durationMs });
    clearCloseTimer();

    closeTimer = setTimeout(() => {
      closeTimer = null;
      set({ visible: false, closing: false });
    }, durationMs);
  },
}));

/**
 * Imperative API usable outside React (handlers, helpers, etc.):
 *
 *   loading.open();
 *   try {
 *     ...
 *   } finally {
 *     loading.close(500); // fades out over 500 ms, then unmounts
 *   }
 */
export const loading = {
  open: () => useLoadingStore.getState().open(),
  close: (durationMs?: number) => useLoadingStore.getState().close(durationMs),
};
