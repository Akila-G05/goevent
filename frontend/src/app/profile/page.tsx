'use client';

import React from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Loader2,
  LogOut,
  Mail,
  Settings,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserRound,
} from 'lucide-react';
import { useLogout } from '@/hooks/use-logout';
import { getDisplayName, getRoleLabel, useSessionStore } from '@/lib/session-store';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return 'G';
  }

  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return initials || 'G';
}

export default function ProfilePage() {
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const { logout, isLoggingOut } = useLogout();

  const displayName = getDisplayName(user);
  const roleLabel = getRoleLabel(user?.roleId);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0c] px-4 pb-16 pt-24 text-white sm:px-6 sm:pt-28 lg:px-8">
      {/* Ambient stage glow */}
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-600/10 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-4xl">
        {status === 'loading' ? (
          <div className="space-y-4">
            <div className="h-40 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
              <div className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
              <div className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
            </div>
          </div>
        ) : status === 'guest' ? (
          /* Signed-out state: the page never breaks for guests. */
          <div className="rounded-3xl border border-white/10 bg-[#121216] p-8 text-center shadow-2xl sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300">
              <UserRound className="h-7 w-7" />
            </div>
            <h1 className="mt-5 font-display text-3xl font-bold uppercase tracking-wide sm:text-4xl">
              Your profile
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-zinc-400">
              Sign in to see your account details, bookings and tickets.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="w-full rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-100 sm:w-auto"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="w-full rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:bg-white/10 sm:w-auto"
              >
                Create an account
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Account header */}
            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#121216] p-6 shadow-2xl sm:p-8">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-red-600/10 blur-3xl" />

              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-red-500/30 to-purple-500/30 font-display text-2xl font-bold tracking-wider text-white">
                    {getInitials(displayName)}
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
                        {displayName}
                      </h1>
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Logged
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-zinc-400">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{user?.email || 'No email on file'}</span>
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                      <span>{roleLabel}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  disabled={isLoggingOut}
                  className="flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoggingOut ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogOut className="h-3.5 w-3.5" />
                  )}
                  <span>Logout</span>
                </button>
              </div>
            </section>

            {/* Sample profile content */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <section className="rounded-2xl border border-white/10 bg-[#121216] p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
                  <UserRound className="h-3.5 w-3.5 text-red-400" />
                  <span>Account</span>
                </div>

                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-zinc-500">Name</dt>
                    <dd className="truncate text-zinc-200">{displayName}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-zinc-500">Email</dt>
                    <dd className="truncate text-zinc-200">{user?.email || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-zinc-500">Role</dt>
                    <dd className="text-zinc-200">{roleLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-zinc-500">User ID</dt>
                    <dd className="text-zinc-200">{user?.userId ?? '—'}</dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#121216] p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
                  <Ticket className="h-3.5 w-3.5 text-red-400" />
                  <span>My tickets</span>
                </div>

                <div className="mt-4 flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-center">
                  <Ticket className="h-6 w-6 text-zinc-600" />
                  <p className="mt-2 text-xs text-zinc-500">No tickets yet</p>
                  <p className="text-[11px] text-zinc-600">Your bookings will appear here.</p>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#121216] p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
                  <Sparkles className="h-3.5 w-3.5 text-red-400" />
                  <span>Next up</span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                    <div>
                      <p className="text-xs font-medium text-zinc-300">Discover events</p>
                      <p className="text-[11px] text-zinc-500">Browse what&apos;s happening near you.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <Settings className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                    <div>
                      <p className="text-xs font-medium text-zinc-300">Account settings</p>
                      <p className="text-[11px] text-zinc-500">Coming soon.</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <p className="text-center text-[11px] text-zinc-600">
              Sample profile page — account editing and booking history will be added later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
