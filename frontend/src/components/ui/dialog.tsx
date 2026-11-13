'use client';

import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Extra classes for the dialog panel (use it to control the max width). */
  panelClassName?: string;
}

/**
 * Minimal accessible dialog: portal, Escape/backdrop close, scroll lock and
 * initial focus. It intentionally ships no animation library so the profile
 * page stays dependency-free.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  panelClassName,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // Keep the latest callback without re-running the effect (and re-focusing
  // the panel) every time the parent re-renders.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
      }
    };

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] overflow-y-auto">
      <div
        className="fixed inset-0 bg-[#1c1b1b]/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={-1}
          className={`relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#eae6e5] bg-white text-[#1c1b1b] shadow-2xl outline-none ${
            panelClassName ?? ''
          }`}
        >
          <header className="flex items-start justify-between gap-4 border-b border-[#f0eceb] px-6 py-5">
            <div>
              <h2
                id={titleId}
                className="font-display text-2xl uppercase tracking-wide text-[#1c1b1b]"
              >
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-xs text-[#736e6c]">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-full p-2 text-[#736e6c] transition-colors hover:bg-[#f0eceb] hover:text-[#1c1b1b]"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>

          {footer && (
            <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-[#f0eceb] px-6 py-4">
              {footer}
            </footer>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
