'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CornerDownRight, Loader2, LogOut, Menu, X } from 'lucide-react';
import { ProfileMenu } from '@/components/shared/profile-menu';
import { useLogout } from '@/hooks/use-logout';
import { getRoleLabel, useSessionStore } from '@/lib/session-store';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const refresh = useSessionStore((state) => state.refresh);
  const { logout, isLoggingOut } = useLogout();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const navLinks = [
    { label: 'All Tickets Event', href: '/#browse' },
    { label: 'Festivals', href: '/#events' },
    { label: 'VIP Experiences', href: '/#upcoming' },
    { label: 'About Us', href: '/#discover' },
  ];

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
  };

  return (
    <header className='absolute top-0 left-0 right-0 z-50 w-full'>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo with 3 slashes */}
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="flex items-center space-x-1">
              <span className="w-1.5 h-6 bg-white rounded-full transform -skew-x-12 group-hover:bg-red-500 transition-colors" />
              <span className="w-1.5 h-6 bg-white/80 rounded-full transform -skew-x-12 group-hover:bg-red-400 transition-colors" />
              <span className="w-1.5 h-6 bg-white/60 rounded-full transform -skew-x-12 group-hover:bg-red-300 transition-colors" />
            </div>
            <span className="font-display text-2xl sm:text-3xl tracking-wider text-white font-bold ml-1">
              GOEVENT
            </span>
          </Link>

          {/* Center Dark Glass Pill Menu */}
          <nav className="hidden md:flex items-center bg-black/40 border border-white/10 rounded-full px-7 py-2.5 backdrop-blur-md shadow-2xl space-x-7 text-xs sm:text-[13px] tracking-wide text-zinc-300 font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="hover:text-white transition-colors duration-150 relative py-0.5"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Action: session aware */}
          <div className="hidden md:flex items-center space-x-2.5">
            {status === 'loading' ? (
              <span
                aria-hidden
                className="h-9 w-9 animate-pulse rounded-full bg-white/10"
              />
            ) : status === 'authenticated' ? (
              <>
                <ProfileMenu email={user?.email} roleId={user?.roleId} />
                <button
                  type="button"
                  onClick={logout}
                  disabled={isLoggingOut}
                  className="flex items-center space-x-2 rounded-full border border-white/20 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoggingOut ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogOut className="h-3.5 w-3.5" />
                  )}
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <Link
                href="/signup"
                className="bg-white text-black hover:bg-zinc-100 text-xs sm:text-[13px] font-semibold px-5 py-2.5 rounded-full flex items-center space-x-2 shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                <CornerDownRight className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Join Us</span>
              </Link>
            )}
          </div>

          {/* Mobile Action & Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            {status === 'loading' ? (
              <span
                aria-hidden
                className="h-8 w-8 animate-pulse rounded-full bg-white/10"
              />
            ) : status === 'authenticated' ? (
              <ProfileMenu email={user?.email} roleId={user?.roleId} />
            ) : (
              <Link
                href="/signup"
                className="bg-white text-black text-xs font-semibold px-3.5 py-1.5 rounded-full flex items-center space-x-1.5"
              >
                <CornerDownRight className="w-3 h-3 stroke-[2.5]" />
                <span>Join</span>
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-zinc-300 hover:text-white rounded-lg hover:bg-white/10"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#101014]/95 backdrop-blur-xl border border-white/10 mx-4 mt-2 rounded-2xl p-4 space-y-3 shadow-2xl">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm text-zinc-200 hover:bg-white/5 rounded-lg"
              >
                {link.label}
              </Link>
            ))}

            <div className="pt-2 border-t border-white/10">
              {status === 'authenticated' ? (
                <div className="space-y-2">
                  <div className="px-3 py-1.5">
                    <p className="truncate text-xs font-medium text-zinc-200">
                      {user?.email}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {getRoleLabel(user?.roleId)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span>Logout</span>
                    {isLoggingOut ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col space-y-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 rounded-lg flex items-center justify-between"
                  >
                    <span>Sign In</span>
                    <CornerDownRight className="w-3.5 h-3.5 text-zinc-400 stroke-[2.5]" />
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2.5 text-sm font-semibold text-black bg-white rounded-xl flex items-center justify-between"
                  >
                    <span>Join Us</span>
                    <CornerDownRight className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
