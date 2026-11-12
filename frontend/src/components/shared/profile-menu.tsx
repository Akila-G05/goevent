'use client';

import { useEffect, useRef, useState } from 'react';
import { UserRound } from 'lucide-react';
import { getRoleLabel } from '@/lib/session-store';

interface ProfileMenuProps {
  email?: string;
  roleId?: string;
  className?: string;
}

/**
 * Icon-only profile button that opens a small account card.
 * Closes on outside click and on Escape.
 */
export function ProfileMenu({ email, roleId, className = '' }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Account"
        aria-expanded={open}
        title={email || 'Account'}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <UserRound className="h-[18px] w-[18px]" />
      </button>

      {open && (
        <div
          aria-label="Account details"
          className="absolute right-0 top-full z-[60] mt-2 w-60 overflow-hidden rounded-2xl border border-white/10 bg-[#101014]/95 p-3 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
              <UserRound className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-white">
                {email || 'Signed in'}
              </p>
              <p className="text-[11px] text-zinc-400">{getRoleLabel(roleId)}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-2.5 text-[11px] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Session active</span>
          </div>
        </div>
      )}
    </div>
  );
}
