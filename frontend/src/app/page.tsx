'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, ChevronDown, CornerDownRight, Search } from 'lucide-react';
import { eventsApi } from '@/api/events';
import { EventCarousel } from '@/components/events/event-carousel';
import { EventRows } from '@/components/events/event-rows';
import { Footer } from '@/components/shared/footer';
import { filterAndSortEvents, type EventOrder } from '@/lib/event-sort';

const MARQUEE_ITEMS = [
  'Music',
  'Workshop',
  'Sports',
  'Festival',
  'Conference',
  'Technology',
  'Networking',
  'Exhibition',
  'Theatre',
  'Career',
];

const HOST_STEPS = [
  { title: 'Describe your event', body: 'Add the title, date, venue and category.' },
  { title: 'Add the visuals', body: 'Upload a cover image and an optional banner.' },
  { title: 'Publish and manage', body: 'Your listing appears straight away. Edit it any time from your profile.' },
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<EventOrder>('newest');

  // Browsing cards: personalised on the server (student university, otherwise random)
  const recommendedQuery = useQuery({
    queryKey: ['events', 'recommended'],
    queryFn: () => eventsApi.recommended(6),
  });

  // Events panel lists newest first; the discover list lists oldest first
  const eventsDescQuery = useQuery({
    queryKey: ['events', 'approved', 'desc'],
    queryFn: () => eventsApi.list(6, 'desc'),
  });

  const eventsAscQuery = useQuery({
    queryKey: ['events', 'approved', 'asc'],
    queryFn: () => eventsApi.list(50, 'asc'),
  });

  const listedCount = eventsAscQuery.isSuccess ? eventsAscQuery.data.length : null;

  const searchHref = `/events?${new URLSearchParams({
    ...(searchQuery.trim() ? { q: searchQuery.trim() } : {}),
    sort: sortOrder,
  }).toString()}`;

  return (
    <div className="w-full bg-[#f8f9fa] text-black">
      {/* =========================================================================
          SECTION 1: HERO
          ========================================================================= */}
      <section className="relative bg-[#0c0c0e] px-3 pb-10 pt-24 sm:px-6 lg:px-8">
        <div className="relative mx-auto h-[82dvh] min-h-[620px] max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl">
          <Image
            src="https://images.unsplash.com/photo-1659273145168-7217ae03db0c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"
            alt="Crowd with hands raised at a live event"
            fill
            priority
            className="object-cover object-center brightness-[0.45] contrast-[1.1]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent" />

          {/* Rotating badge */}
          <div aria-hidden className="absolute right-10 top-1/2 hidden h-36 w-36 -translate-y-1/2 items-center justify-center lg:flex">
            <svg viewBox="0 0 140 140" className="absolute inset-0 h-full w-full animate-spin" style={{ animationDuration: '18s' }}>
              <defs>
                <path id="goevent-badge-circle" d="M70,70 m-54,0 a54,54 0 1,1 108,0 a54,54 0 1,1 -108,0" />
              </defs>
              <text className="fill-white text-[12px] font-semibold uppercase tracking-[0.25em]">
                <textPath href="#goevent-badge-circle">Live · Upcoming · Near you ·</textPath>
              </text>
            </svg>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black">
              <ArrowUpRight className="h-6 w-6" />
            </span>
          </div>

          <div className="relative z-10 flex h-full flex-col justify-between p-6 pb-28 sm:p-10 sm:pb-32 lg:p-14 lg:pb-36">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-xs font-semibold text-white backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              {listedCount === null ? 'Discover events near you' : `${listedCount} events listed right now`}
            </div>

            <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h1 className="font-display text-6xl font-black uppercase leading-[0.86] tracking-tight text-white sm:text-7xl lg:text-8xl">
                Find your <br />
                <span className="text-transparent [-webkit-text-stroke:1.5px_#ffffff]">next event</span>
              </h1>
              <p className="mt-6 max-w-xl text-sm leading-relaxed text-zinc-300 sm:text-base">
                Workshops, concerts, sports and campus festivals in one place. Find something you like,
                or host your own.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="#browse"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-zinc-200 active:scale-95"
                >
                  Browse events
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Host an event
                </Link>
              </div>
            </div>

            <div className="grid max-w-2xl grid-cols-1 gap-3 rounded-2xl border border-white/15 bg-black/45 p-3 backdrop-blur-xl sm:grid-cols-[1fr_auto_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by event, category, venue"
                  aria-label="Search events"
                  className="w-full rounded-xl border border-white/15 bg-white/10 py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-400 transition-all focus:bg-white/20 focus:outline-none focus:ring-1 focus:ring-white/40"
                />
              </div>

              <div className="relative">
                <select
                  aria-label="Sort events"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as EventOrder)}
                  className="w-full cursor-pointer appearance-none rounded-xl border border-white/15 bg-white/10 px-4 py-3 pr-10 text-sm text-zinc-200 focus:outline-none"
                >
                  <option value="newest" className="bg-[#1a1a20] text-white">Newest first</option>
                  <option value="oldest" className="bg-[#1a1a20] text-white">Oldest first</option>
                  <option value="name" className="bg-[#1a1a20] text-white">Name A-Z</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              </div>

              <Link
                href={searchHref}
                className="flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black shadow-lg transition-all hover:bg-zinc-200 active:scale-[0.98]"
              >
                <CornerDownRight className="h-4 w-4 stroke-[2.5]" />
                <span>Search</span>
              </Link>
            </div>
          </div>

          {/* Category ticker */}
          <div aria-hidden className="absolute inset-x-0 bottom-0 z-10 overflow-hidden border-t border-white/15 bg-black/50 backdrop-blur-sm">
            <style>{`
              @keyframes goevent-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
              .goevent-marquee { animation: goevent-marquee 30s linear infinite; }
              @media (prefers-reduced-motion: reduce) { .goevent-marquee { animation: none; } }
            `}</style>
            <div className="goevent-marquee flex w-max whitespace-nowrap py-3.5">
              {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, index) => (
                <span key={`${item}-${index}`} className="flex items-center gap-6 px-6 font-display text-xl uppercase tracking-wider text-white/90">
                  {item}
                  <span className="text-red-400">✦</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: BROWSING EVENTS (students: their university; others: random)
          ========================================================================= */}
      <section id="browse" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-zinc-200">
          <h2 className="font-display text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-black leading-[0.9] uppercase">
            BROWSING<br />EVENTS
          </h2>
          <Link href="/events" className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-black transition-colors hover:border-black hover:bg-black hover:text-white">
            View all events
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recommendedQuery.isPending && (
          <p role="status" className="mt-8 text-sm text-zinc-500">Loading events...</p>
        )}

        {recommendedQuery.isError && (
          <div role="alert" className="mt-8 flex flex-wrap items-center gap-4 text-sm text-red-600">
            <span>Events could not be loaded.</span>
            <button
              type="button"
              onClick={() => recommendedQuery.refetch()}
              className="font-semibold text-black underline underline-offset-4"
            >
              Try again
            </button>
          </div>
        )}

        {recommendedQuery.isSuccess && recommendedQuery.data.length === 0 && (
          <p className="mt-8 text-sm text-zinc-500">No events to show yet.</p>
        )}

        {recommendedQuery.isSuccess && recommendedQuery.data.length > 0 && (
          <div className="mt-8">
            {filterAndSortEvents(recommendedQuery.data, searchQuery, sortOrder).length === 0 ? (
              <p className="text-sm text-zinc-500">No events match your search.</p>
            ) : (
              <EventCarousel events={filterAndSortEvents(recommendedQuery.data, searchQuery, sortOrder)} />
            )}
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 3: HOST AN EVENT + LATEST EVENTS
          ========================================================================= */}
      <section id="events" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#0f0f13] text-white rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
            <div className="lg:col-span-6 relative p-6 sm:p-10 flex flex-col justify-between bg-gradient-to-br from-[#1d1d26] via-[#0f0f13] to-[#0f0f13]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-400">For organisers</p>
                <h2 className="mt-3 font-display text-5xl sm:text-6xl font-black uppercase leading-[0.9] text-white">
                  Host your<br />own event
                </h2>
                <p className="mt-4 max-w-md text-sm text-zinc-400">
                  Create a listing for your workshop, festival or match, then manage it from your profile.
                </p>
              </div>

              <ol className="mt-10 space-y-5">
                {HOST_STEPS.map((step, index) => (
                  <li key={step.title} className="flex items-start gap-4">
                    <span className="font-display text-3xl text-white/30">0{index + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{step.title}</p>
                      <p className="text-xs text-zinc-400">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <Link
                href="/signup"
                className="mt-10 inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
              >
                Start hosting
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/10 bg-[#121216]">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <h3 className="font-display text-4xl sm:text-5xl font-black text-white tracking-wide uppercase">
                    Latest events
                  </h3>
                </div>

                <div className="mt-2">
                  {eventsDescQuery.isPending && (
                    <p role="status" className="py-4 text-sm text-zinc-400">Loading events...</p>
                  )}
                  {eventsDescQuery.isError && (
                    <p role="alert" className="py-4 text-sm text-red-400">Events could not be loaded.</p>
                  )}
                  {eventsDescQuery.isSuccess && (
                    <EventRows variant="dark" events={eventsDescQuery.data} actionLabel="View" />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end pt-6 border-t border-white/10 mt-4">
                <Link href="/events" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:text-zinc-300">
                  View all events
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: DISCOVER MORE
          ========================================================================= */}
      <section id="discover" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-200">
        <div className="mb-10">
          <h2 className="font-display text-5xl sm:text-6xl font-black tracking-tight text-black leading-[0.9] uppercase">
            DISCOVER<br />MORE
          </h2>
        </div>

        {eventsAscQuery.isPending && (
          <p role="status" className="py-6 text-sm text-zinc-500">Loading events...</p>
        )}

        {eventsAscQuery.isError && (
          <p role="alert" className="py-6 text-sm text-red-600">Events could not be loaded.</p>
        )}

        {eventsAscQuery.isSuccess && <EventRows events={eventsAscQuery.data} actionLabel="View event" />}

        <div className="flex justify-end mt-8">
          <Link
            href="/events"
            className="border border-zinc-300 hover:border-black text-black text-xs font-semibold px-6 py-2.5 rounded-full flex items-center space-x-1.5 hover:bg-black hover:text-white transition-colors"
          >
            <span>View all events</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
