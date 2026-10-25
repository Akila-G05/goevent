'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'All Tickets Event', href: '/#browse' },
    { label: 'Festivals', href: '/#events' },
    { label: 'VIP Experiences', href: '/#upcoming' },
    { label: 'About Us', href: '/#discover' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0d0d10]/85 backdrop-blur-xl border-b border-white/10 text-white transition-all">
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

          {/* Center Glass Pill Menu */}
          <nav className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-full px-5 py-2 backdrop-blur-md shadow-inner space-x-6 text-xs sm:text-sm tracking-wide text-zinc-300 font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="hover:text-white transition-colors duration-150 relative py-1"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <Link
              href="/login"
              className="text-xs font-semibold text-zinc-300 hover:text-white px-4 py-2 rounded-full border border-white/10 hover:border-white/30 transition-all flex items-center space-x-1.5"
            >
              <span>Sign In</span>
            </Link>
            <Link
              href="/signup"
              className="bg-white text-black hover:bg-zinc-100 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-full flex items-center space-x-1.5 shadow-md hover:shadow-lg transition-transform active:scale-95"
            >
              <span>Join Us</span>
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            <Link
              href="/signup"
              className="bg-white text-black text-xs font-semibold px-3 py-1.5 rounded-full flex items-center space-x-1"
            >
              <span>Join</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
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
        <div className="md:hidden bg-[#101014] border-b border-white/10 px-4 pt-3 pb-6 space-y-3">
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
            <div className="pt-2 border-t border-white/10 flex flex-col space-y-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm text-zinc-200 hover:bg-white/5 rounded-lg flex items-center justify-between"
              >
                <span>Sign In to Account</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-semibold text-black bg-white rounded-lg flex items-center justify-between"
              >
                <span>Join Us / Sign Up</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-black" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
