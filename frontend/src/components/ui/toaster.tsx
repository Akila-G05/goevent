'use client';

import { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useToastStore, type ToastItem, type ToastSeverity } from '@/lib/toast-store';

const VARIANTS: Record<
  ToastSeverity,
  {
    Icon: typeof Info;
    iconClass: string;
    border: string;
    bar: string;
  }
> = {
  error: {
    Icon: AlertCircle,
    iconClass: 'bg-red-500/15 text-red-400 ring-1 ring-inset ring-red-500/25',
    border: 'border-red-500/25',
    bar: '#ef4444',
  },
  warning: {
    Icon: AlertTriangle,
    iconClass: 'bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/25',
    border: 'border-amber-500/25',
    bar: '#f59e0b',
  },
  info: {
    Icon: Info,
    iconClass: 'bg-sky-500/15 text-sky-400 ring-1 ring-inset ring-sky-500/25',
    border: 'border-sky-500/25',
    bar: '#0ea5e9',
  },
  success: {
    Icon: CheckCircle2,
    iconClass: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-inset ring-emerald-500/25',
    border: 'border-emerald-500/25',
    bar: '#10b981',
  },
};

interface ToastCardProps {
  toast: ToastItem;
}

function ToastCard({ toast }: ToastCardProps) {
  const [paused, setPaused] = useState(false);

  const dismiss = useToastStore((state) => state.dismiss);
  const pause = useToastStore((state) => state.pause);
  const resume = useToastStore((state) => state.resume);

  const { Icon, iconClass, border, bar } = VARIANTS[toast.severity];

  return (
    <div
      role={toast.severity === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => {
        setPaused(true);
        pause(toast.id);
      }}
      onMouseLeave={() => {
        setPaused(false);
        resume(toast.id);
      }}
      className={`pointer-events-auto relative w-full overflow-hidden rounded-2xl border bg-[#161619]/95 p-4 pr-11 shadow-[0_18px_45px_-12px_rgba(0,0,0,0.85)] backdrop-blur-md ${border} ${
        toast.closing ? 'toast-exit' : 'toast-enter'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconClass}`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>

        <div className="min-w-0 space-y-0.5">
          {toast.title && (
            <p className="text-[13px] font-bold leading-tight text-white">{toast.title}</p>
          )}
          <p
            className={
              toast.title
                ? 'text-xs leading-snug text-zinc-400'
                : 'text-[13px] font-medium leading-snug text-zinc-100'
            }
          >
            {toast.message}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss notification"
        className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/15 text-red-400 transition-colors hover:bg-red-500/30 hover:text-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Accent bar doubles as the auto-dismiss progress indicator */}
      <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/5">
        <span
          className="toast-progress block h-full origin-left"
          style={{
            backgroundColor: bar,
            animationDuration: `${toast.duration}ms`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        />
      </span>
    </div>
  );
}

/**
 * Fixed viewport: top-right on desktop, full-width top on mobile.
 * Mounted once in the root layout.
 */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-4 top-4 z-[120] flex flex-col items-stretch gap-3 sm:inset-x-auto sm:right-6 sm:top-6 sm:w-[360px] sm:items-end"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} toast={item} />
      ))}
    </div>
  );
}
