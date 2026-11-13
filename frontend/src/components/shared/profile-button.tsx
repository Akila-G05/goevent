'use client';

import Link from 'next/link';
import { UserRound } from 'lucide-react';

interface ProfileButtonProps {
  name?: string;
  className?: string;
}

/**
 * Icon-only account button. Navigates to the profile page.
 */
export function ProfileButton({ name, className = '' }: ProfileButtonProps) {
  return (
    <Link
      href="/profile"
      aria-label="Open profile"
      title={name || 'Profile'}
      className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${className}`}
    >
      <UserRound className="h-[18px] w-[18px]" />
    </Link>
  );
}
