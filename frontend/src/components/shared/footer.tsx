import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

/**
 * Site footer shared by the home page and the event detail pages. Anchors are
 * absolute (`/#events`) so they work from any route.
 */
export function Footer() {
  return (
    <footer className="bg-[#0c0c0e] text-white border-t border-white/10 pt-16 pb-12 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          {/* Col 1: Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="flex items-center space-x-1">
                <span className="w-1.5 h-6 bg-white rounded-full transform -skew-x-12" />
                <span className="w-1.5 h-6 bg-white/80 rounded-full transform -skew-x-12" />
                <span className="w-1.5 h-6 bg-white/60 rounded-full transform -skew-x-12" />
              </div>
              <span className="font-display text-3xl tracking-wider text-white font-bold">
                GOEVENT
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
              The premier concert and live event booking platform. Discover verified live tours,
              reserve tickets with real-time inventory, and access instant QR check-ins.
            </p>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4 className="font-display text-lg font-bold uppercase text-white tracking-wider mb-4">
              Explore Events
            </h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <Link href="/#browse" className="hover:text-white transition-colors">
                  Concerts in Asia
                </Link>
              </li>
              <li>
                <Link href="/#events" className="hover:text-white transition-colors">
                  Festivals &amp; Tours
                </Link>
              </li>
              <li>
                <Link href="/#upcoming" className="hover:text-white transition-colors">
                  Upcoming Concerts
                </Link>
              </li>
              <li>
                <Link href="/#discover" className="hover:text-white transition-colors">
                  Concert Prep Guides
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Role Portals */}
          <div>
            <h4 className="font-display text-lg font-bold uppercase text-white tracking-wider mb-4">
              Account &amp; Access
            </h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <Link
                  href="/login"
                  className="hover:text-white flex items-center space-x-1 transition-colors"
                >
                  <span>Sign In to Your Account</span>
                  <ArrowUpRight className="w-3 h-3 text-red-400" />
                </Link>
              </li>
              <li>
                <Link
                  href="/signup"
                  className="hover:text-white flex items-center space-x-1 transition-colors"
                >
                  <span>Create Attendee or Creator Account</span>
                  <ArrowUpRight className="w-3 h-3 text-zinc-400" />
                </Link>
              </li>
              <li>
                <Link href="/#browse" className="hover:text-white transition-colors">
                  Browse All Concert Passes
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Newsletter */}
          <div>
            <h4 className="font-display text-lg font-bold uppercase text-white tracking-wider mb-4">
              Concert Drop Alerts
            </h4>
            <p className="text-xs text-zinc-400 mb-3">
              Be the first to know when artist tickets and tour dates drop in your city.
            </p>
            <div className="flex items-center">
              <input
                type="email"
                placeholder="Enter your email"
                aria-label="Email for concert drop alerts"
                className="bg-white/10 border border-white/15 rounded-l-full px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none w-full"
              />
              <button className="bg-white text-black font-semibold text-xs px-4 py-2 rounded-r-full hover:bg-zinc-200 transition-colors shrink-0">
                Join
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 text-[11px] text-zinc-500 gap-4">
          <p>© {new Date().getFullYear()} GoEvent Platform. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <span className="hover:text-zinc-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-zinc-400 cursor-pointer">Terms of Service</span>
            <span className="hover:text-zinc-400 cursor-pointer">Ticket Invariant Security</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
