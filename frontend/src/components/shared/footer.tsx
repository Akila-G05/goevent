import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

/**
 * Site footer shared by the home page, the events pages and the contact page.
 * Anchors are absolute (`/#events`) so they work from any route.
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
              Discover, host and manage events in one place: workshops, concerts, sports and campus festivals.
            </p>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4 className="font-display text-lg font-bold uppercase text-white tracking-wider mb-4">
              Explore
            </h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <Link href="/events" className="hover:text-white transition-colors">
                  All events
                </Link>
              </li>
              <li>
                <Link href="/#browse" className="hover:text-white transition-colors">
                  Browse picks
                </Link>
              </li>
              <li>
                <Link href="/#events" className="hover:text-white transition-colors">
                  Latest events
                </Link>
              </li>
              <li>
                <Link href="/#discover" className="hover:text-white transition-colors">
                  More events
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Account */}
          <div>
            <h4 className="font-display text-lg font-bold uppercase text-white tracking-wider mb-4">
              Account
            </h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <Link
                  href="/login"
                  className="hover:text-white flex items-center space-x-1 transition-colors"
                >
                  <span>Sign in</span>
                  <ArrowUpRight className="w-3 h-3 text-zinc-400" />
                </Link>
              </li>
              <li>
                <Link
                  href="/signup"
                  className="hover:text-white flex items-center space-x-1 transition-colors"
                >
                  <span>Create an account</span>
                  <ArrowUpRight className="w-3 h-3 text-zinc-400" />
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-white transition-colors">
                  Host an event
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Help */}
          <div>
            <h4 className="font-display text-lg font-bold uppercase text-white tracking-wider mb-4">
              Need help?
            </h4>
            <p className="text-xs text-zinc-400 mb-4">
              Questions about hosting, booking or your account? Send us a message.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
            >
              Contact Us
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 text-[11px] text-zinc-500 gap-4">
          <p>© {new Date().getFullYear()} GoEvent Platform. All rights reserved.</p>
          <Link href="/contact" className="hover:text-zinc-300 transition-colors">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
