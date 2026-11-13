import { create } from 'zustand';

export type ToastSeverity = 'error' | 'warning' | 'info' | 'success';

export interface ToastOptions {
  title?: string;
  /** Auto-dismiss delay in milliseconds. Defaults per severity. */
  duration?: number;
}

export interface ToastItem {
  id: string;
  severity: ToastSeverity;
  title?: string;
  message: string;
  duration: number;
  /** True while the exit animation plays, just before removal. */
  closing: boolean;
}

/** Maximum number of toasts on screen at the same time. */
export const MAX_TOASTS = 3;

/** Must match the exit animation duration in `globals.css`. */
const EXIT_MS = 180;

const DEFAULT_DURATIONS: Record<ToastSeverity, number> = {
  error: 6000,
  warning: 5000,
  info: 4000,
  success: 4000,
};

interface ToastState {
  toasts: ToastItem[];
  push: (severity: ToastSeverity, message: string, options?: ToastOptions) => string | null;
  dismiss: (id: string) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
  clear: () => void;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const deadlines = new Map<string, number>();
const pausedRemaining = new Map<string, number>();

let nextId = 0;

const clearTimer = (id: string) => {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
  }
  timers.delete(id);
};

const startTimer = (id: string, durationMs: number) => {
  clearTimer(id);
  deadlines.set(id, Date.now() + durationMs);

  timers.set(
    id,
    setTimeout(() => {
      timers.delete(id);
      useToastStore.getState().dismiss(id);
    }, durationMs)
  );
};

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  push: (severity, message, options = {}) => {
    const text = (message ?? '').trim();
    if (!text) {
      return null;
    }

    // Ignore an identical toast that is already visible.
    const duplicate = get().toasts.find(
      (item) => !item.closing && item.severity === severity && item.message === text
    );
    if (duplicate) {
      return duplicate.id;
    }

    const toast: ToastItem = {
      id: `toast_${++nextId}`,
      severity,
      title: options.title,
      message: text,
      duration: options.duration ?? DEFAULT_DURATIONS[severity],
      closing: false,
    };

    // Newest first, so it renders at the top of the stack.
    set((state) => ({ toasts: [toast, ...state.toasts] }));

    startTimer(toast.id, toast.duration);

    // Enforce the visible limit by closing the oldest toasts.
    const active = get().toasts.filter((item) => !item.closing);
    active.slice(MAX_TOASTS).forEach((item) => get().dismiss(item.id));

    return toast.id;
  },

  dismiss: (id) => {
    const toast = get().toasts.find((item) => item.id === id);
    if (!toast || toast.closing) {
      return;
    }

    clearTimer(id);
    deadlines.delete(id);
    pausedRemaining.delete(id);

    set((state) => ({
      toasts: state.toasts.map((item) =>
        item.id === id ? { ...item, closing: true } : item
      ),
    }));

    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }));
    }, EXIT_MS);
  },

  pause: (id) => {
    const deadline = deadlines.get(id);
    if (!deadline) {
      return;
    }

    pausedRemaining.set(id, Math.max(0, deadline - Date.now()));
    clearTimer(id);
    deadlines.delete(id);
  },

  resume: (id) => {
    const remaining = pausedRemaining.get(id);
    if (remaining === undefined) {
      return;
    }

    pausedRemaining.delete(id);
    startTimer(id, remaining);
  },

  clear: () => {
    get().toasts.forEach((item) => get().dismiss(item.id));
  },
}));

const normalizeSeverity = (value?: string): ToastSeverity | null => {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  return normalized === 'error' ||
    normalized === 'warning' ||
    normalized === 'info' ||
    normalized === 'success'
    ? (normalized as ToastSeverity)
    : null;
};

const show = (severity: ToastSeverity, message: string, options?: ToastOptions) =>
  useToastStore.getState().push(severity, message, options);

/**
 * Imperative toast API — usable outside React as well.
 *
 *   toast.success('Authentication successful');
 *   toast.error(data.message, { title: 'Login failed' });
 *   toast.info('Please select your organization.');
 */
export const toast = {
  error: (message: string, options?: ToastOptions) => show('error', message, options),
  warning: (message: string, options?: ToastOptions) => show('warning', message, options),
  info: (message: string, options?: ToastOptions) => show('info', message, options),
  success: (message: string, options?: ToastOptions) => show('success', message, options),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
  clear: () => useToastStore.getState().clear(),

  /**
   * Renders a backend result using its own `severity` when one is provided.
   * Until the backend sends one, callers pass a context-appropriate fallback.
   */
  api: (
    data: { message?: string; severity?: string } | null | undefined,
    options?: { fallback?: ToastSeverity; title?: string; duration?: number }
  ) => {
    const severity = normalizeSeverity(data?.severity) ?? options?.fallback ?? 'warning';
    return show(severity, data?.message ?? '', {
      title: options?.title,
      duration: options?.duration,
    });
  },
};

/** Normalised axios errors from `api-client` are `{ message }` objects. */
export function getErrorMessage(
  error: unknown,
  fallback = 'Request failed! Please try again'
): string {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
}
