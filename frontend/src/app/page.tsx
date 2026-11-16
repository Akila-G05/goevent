'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search,
  ArrowUpRight,
  CornerDownRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Sparkles,
  ShieldCheck,
  X,
} from 'lucide-react';
import { eventsApi } from '@/api/events';
import { EventCarousel } from '@/components/events/event-carousel';
import { EventRows } from '@/components/events/event-rows';
export default function HomePage() {
  // State for search filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Surabaya');
  const [selectedDateFilter, setSelectedDateFilter] = useState('Any Date');

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
  // State for Events split section
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(48); // %

  // State for Booking Modal demo
  const [selectedConcertForBooking, setSelectedConcertForBooking] = useState<{
    slug: string;
    title: string;
    city: string;
    date: string;
    price: number;
  } | null>(null);

  return (
    <div className="w-full bg-[#f8f9fa] text-black">
      {/* =========================================================================
          SECTION 1: HERO SECTION (From Screenshot 1)
          ========================================================================= */}
      <section className="relative w-full h-[100dvh] min-h-[640px] bg-[#0c0c0e] flex flex-col justify-between overflow-hidden">
        {/* Background Concert Image with Dark Gradient Overlays */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1659273145168-7217ae03db0c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"
            alt="Concert stage crowd hands up"
            fill
            priority
            className="object-cover object-center brightness-[0.55] contrast-[1.15]"
          />
          {/* Subtle gradient vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-transparent to-black/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/40" />
        </div>

        {/* Hero Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-6 sm:pb-8 lg:pb-10 flex-1 flex flex-col justify-end w-full h-full">
          {/* Main Headline */}
          <div className="max-w-4xl mb-4 sm:mb-6">
            <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl xl:text-8xl text-white font-black tracking-tight leading-[0.88] uppercase drop-shadow-md">
              WHAT&apos;S CONCERT<br />HAPPENING IN ASIA?
            </h1>
          </div>

          {/* Bottom Bar: Glassmorphic Search Form (Left) & Tour Spotlight Card (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-end">
            {/* Left: Floating Search Box */}
            <div className="lg:col-span-8">
              <div className="bg-[#18181c]/65 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3">
                {/* Search Text Input */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by artist, event, venue"
                    className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/15 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/40 transition-all"
                  />
                </div>

                {/* Dropdowns & Search Button Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  {/* City Selector */}
                  <div className="relative">
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="w-full appearance-none bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none cursor-pointer pr-10"
                    >
                      <option value="Surabaya" className="bg-[#1a1a20] text-white">Surabaya</option>
                      <option value="Jakarta" className="bg-[#1a1a20] text-white">Jakarta</option>
                      <option value="Bangkok" className="bg-[#1a1a20] text-white">Bangkok</option>
                      <option value="Bali" className="bg-[#1a1a20] text-white">Bali</option>
                      <option value="Kuala Lumpur" className="bg-[#1a1a20] text-white">Kuala Lumpur</option>
                      <option value="Tokyo" className="bg-[#1a1a20] text-white">Tokyo</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                  </div>

                  {/* Date Selector */}
                  <div className="relative">
                    <select
                      value={selectedDateFilter}
                      onChange={(e) => setSelectedDateFilter(e.target.value)}
                      className="w-full appearance-none bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none cursor-pointer pr-10"
                    >
                      <option value="Any Date" className="bg-[#1a1a20] text-white">Select Date</option>
                      <option value="Today" className="bg-[#1a1a20] text-white">Today</option>
                      <option value="This Weekend" className="bg-[#1a1a20] text-white">This Weekend</option>
                      <option value="This Month" className="bg-[#1a1a20] text-white">This Month</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                  </div>

                  {/* Search Action Button */}
                  <button
                    onClick={() => {
                      const browseElem = document.getElementById('browse');
                      browseElem?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-full bg-white text-black hover:bg-zinc-200 font-semibold text-sm py-3 px-5 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98] shadow-lg"
                  >
                    <CornerDownRight className="w-4 h-4 stroke-[2.5]" />
                    <span>Search</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Featured Tour Spotlight Card */}
            <div className="hidden lg:block lg:col-span-4">
              <div className="bg-[#1a1a1f]/80 backdrop-blur-md border border-white/15 rounded-2xl p-3 shadow-2xl flex flex-col space-y-2 group cursor-pointer hover:border-white/30 transition-all">
                <div className="relative h-36 w-full rounded-xl overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1558047291-26cc184812b6?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"
                    alt="Metal Matters Tour"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3 text-white">
                    <span className="font-display text-sm tracking-wider uppercase text-zinc-300 font-bold block">
                      Live Tour 2024
                    </span>
                    <h3 className="font-display text-lg text-white font-black leading-tight uppercase">
                      THE METAL MATTERS TOUR 2024
                    </h3>
                  </div>
                </div>
                {/* Carousel Pagination Dots */}
                <div className="flex items-center justify-center space-x-1.5 py-1">
                  <span className="w-2 h-2 rounded-full bg-white" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: BROWSING EVENTS (students: their university; others: random)
          ========================================================================= */}
      <section id="browse" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="pb-6 border-b border-zinc-200">
          <h2 className="font-display text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-black leading-[0.9] uppercase">
            BROWSING<br />EVENTS
          </h2>
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
            <EventCarousel events={recommendedQuery.data} />
          </div>
        )}
      </section>
      {/* =========================================================================
          SECTION 3: FEATURED TOUR & EVENTS SPLIT SHOWCASE (From Screenshot 3 - Dark)
          ========================================================================= */}
      <section id="events" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#0f0f13] text-white rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
            {/* Left Side: Tour Poster Image & Floating Audio Player */}
            <div className="lg:col-span-6 relative p-6 sm:p-10 flex flex-col justify-between overflow-hidden min-h-[480px]">
              {/* Poster Photo Background */}
              <div className="absolute inset-0 z-0">
                <Image
                  src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80"
                  alt="Le Pharaohs Tour"
                  fill
                  className="object-cover object-center brightness-[0.7] contrast-[1.1]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f13] via-transparent to-black/40" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
              </div>

              {/* Tour Headline & Button Overlay */}
              <div className="relative z-10 space-y-4">
                <h2 className="font-display text-4xl sm:text-6xl font-black text-white leading-[0.9] uppercase drop-shadow-md">
                  LE PHARAOHS X<br />SERKONSER TOUR
                </h2>
                <button
                  onClick={() =>
                    setSelectedConcertForBooking({
                      slug: 'le-pharaohs-bangkok',
                      title: 'LE PHARAOHS X SERKONSER TOUR',
                      city: 'Asia & World Stadium Tour',
                      date: 'Summer 2024',
                      price: 110,
                    })
                  }
                  className="bg-white/90 hover:bg-white text-black font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-full inline-flex items-center space-x-1.5 transition-all shadow-lg active:scale-95"
                >
                  <span>See Detail</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

              {/* Floating Music Player Widget */}
              <div className="relative z-10 mt-8 bg-black/75 backdrop-blur-xl border border-white/15 rounded-2xl p-4 shadow-2xl max-w-md">
                <div className="flex items-center space-x-3 mb-3">
                  {/* Cyberpunk Album Thumbnail */}
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-white/10">
                    <Image
                      src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80"
                      alt="Wegah Kelangan track cover"
                      fill
                      className="object-cover"
                    />
                  </div>
                  {/* Song Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-display text-base text-white font-bold uppercase tracking-wider truncate">
                      WEGAH KELANGAN
                    </h4>
                    <p className="text-[11px] text-zinc-400 truncate">
                      Mencoba Kembali - Le Pharaohs
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 mb-2">
                  <div
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const newPct = Math.round((clickX / rect.width) * 100);
                      setPlaybackProgress(Math.max(0, Math.min(100, newPct)));
                    }}
                    className="w-full h-1 bg-white/20 rounded-full cursor-pointer overflow-hidden"
                  >
                    <div
                      className="h-full bg-white transition-all rounded-full"
                      style={{ width: `${playbackProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                    <span>1:48</span>
                    <span>3:40</span>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={() => setPlaybackProgress((p) => Math.max(0, p - 10))}
                    className="p-1 text-zinc-400 hover:text-white transition-colors"
                    aria-label="Previous track"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-zinc-200 transition-transform active:scale-95 shadow-md"
                    aria-label={isPlaying ? 'Pause track' : 'Play track'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
                  </button>
                  <button
                    onClick={() => setPlaybackProgress((p) => Math.min(100, p + 10))}
                    className="p-1 text-zinc-400 hover:text-white transition-colors"
                    aria-label="Next track"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Side: Tour Schedule & Cities */}
            <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/10 bg-[#121216]">
              <div>
                {/* Header & Region Tabs */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <h3 className="font-display text-4xl sm:text-5xl font-black text-white tracking-wide uppercase">
                    EVENTS
                  </h3>

                </div>

                {/* Event rows: newest first, from the backend */}
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

              {/* Bottom Pagination & Arrows */}
              <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-4">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-white" />
                  <span className="w-2 h-2 rounded-full bg-white/30" />
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-colors"
                    aria-label="Previous events page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-colors"
                    aria-label="Next events page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: DISCOVER MORE / GUIDES (From Screenshot 4)
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

        {eventsAscQuery.isSuccess && <EventRows events={eventsAscQuery.data} actionLabel="Discover More" />}

        {/* View All Button */}
        <div className="flex justify-end mt-8">
          <button className="border border-zinc-300 hover:border-black text-black text-xs font-semibold px-6 py-2.5 rounded-full flex items-center space-x-1.5 hover:bg-black hover:text-white transition-colors">
            <span>View All</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </section>
      {/* =========================================================================
          SECTION 6: PREMIUM FOOTER
          ========================================================================= */}
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
                The premier concert and live event booking platform. Discover verified live tours, reserve tickets with real-time inventory, and access instant QR check-ins.
              </p>
            </div>

            {/* Col 2: Navigation */}
            <div>
              <h4 className="font-display text-lg font-bold uppercase text-white tracking-wider mb-4">
                Explore Events
              </h4>
              <ul className="space-y-2 text-xs text-zinc-400">
                <li><Link href="#browse" className="hover:text-white transition-colors">Concerts in Asia</Link></li>
                <li><Link href="#events" className="hover:text-white transition-colors">Festivals & Tours</Link></li>
                <li><Link href="#discover" className="hover:text-white transition-colors">Concert Prep Guides</Link></li>
              </ul>
            </div>

            {/* Col 3: Role Portals */}
            <div>
              <h4 className="font-display text-lg font-bold uppercase text-white tracking-wider mb-4">
                Account & Access
              </h4>
              <ul className="space-y-2 text-xs text-zinc-400">
                <li>
                  <Link href="/login" className="hover:text-white flex items-center space-x-1 transition-colors">
                    <span>Sign In to Your Account</span>
                    <ArrowUpRight className="w-3 h-3 text-red-400" />
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="hover:text-white flex items-center space-x-1 transition-colors">
                    <span>Create Attendee or Creator Account</span>
                    <ArrowUpRight className="w-3 h-3 text-zinc-400" />
                  </Link>
                </li>
                <li>
                  <Link href="#browse" className="hover:text-white transition-colors">
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
                  className="bg-white/10 border border-white/15 rounded-l-full px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none w-full"
                />
                <button className="bg-white text-black font-semibold text-xs px-4 py-2 rounded-r-full hover:bg-zinc-200 transition-colors shrink-0">
                  Join
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-8 text-[11px] text-zinc-500 gap-4">
            <p>Â© {new Date().getFullYear()} GoEvent Platform. All rights reserved.</p>
            <div className="flex items-center space-x-6">
              <span className="hover:text-zinc-400 cursor-pointer">Privacy Policy</span>
              <span className="hover:text-zinc-400 cursor-pointer">Terms of Service</span>
              <span className="hover:text-zinc-400 cursor-pointer">Ticket Invariant Security</span>
            </div>
          </div>
        </div>
      </footer>

      {/* =========================================================================
          INTERACTIVE TICKET RESERVATION MODAL (Preview of Booking Invariant Flow)
          ========================================================================= */}
      {selectedConcertForBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#141418] border border-white/15 text-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-6">
            <button
              onClick={() => setSelectedConcertForBooking(null)}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors"
              aria-label="Close booking modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center space-x-2 text-xs text-red-400 font-semibold uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4" />
                <span>Ticket Reservation</span>
              </div>
              <h3 className="font-display text-3xl font-black uppercase text-white leading-tight">
                {selectedConcertForBooking.title}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 flex items-center space-x-2">
                <span>ðŸ“ {selectedConcertForBooking.city}</span>
                <span>â€¢</span>
                <span>ðŸ“… {selectedConcertForBooking.date}</span>
              </p>
            </div>

            {/* Ticket Tier Selection */}
            <div className="space-y-3">
              <div className="border border-white/10 hover:border-white/30 rounded-xl p-3.5 bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                <div>
                  <h4 className="text-sm font-bold text-white">General Admission</h4>
                  <p className="text-[11px] text-zinc-400">Standard standing arena access</p>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-white">
                    ${selectedConcertForBooking.price}
                  </span>
                  <span className="block text-[10px] text-emerald-400 font-medium">In Stock</span>
                </div>
              </div>

              <div className="border border-white/10 hover:border-white/30 rounded-xl p-3.5 bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                <div>
                  <h4 className="text-sm font-bold text-white">VIP Diamond Access</h4>
                  <p className="text-[11px] text-zinc-400">Front row soundcheck + priority QR lane</p>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-white">
                    ${selectedConcertForBooking.price + 90}
                  </span>
                  <span className="block text-[10px] text-amber-400 font-medium">Limited (14 left)</span>
                </div>
              </div>
            </div>

            {/* Invariant guarantee banner */}
            <div className="flex items-center space-x-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Concurreny-safe reservation with signed QR pass and real-time inventory hold.</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setSelectedConcertForBooking(null)}
                className="w-1/2 py-2.5 rounded-full border border-white/20 text-xs font-semibold text-zinc-300 hover:text-white hover:border-white/40 transition-colors"
              >
                Cancel
              </button>
              <Link
                href={`/events/${selectedConcertForBooking.slug}`}
                onClick={() => setSelectedConcertForBooking(null)}
                className="w-1/2 py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-lg active:scale-95"
              >
                <span>Book Now</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
