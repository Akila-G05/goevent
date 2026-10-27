'use client';

import React, { useState } from 'react';
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

// Data types
interface ConcertCard {
  id: string;
  title: string;
  artistSubtitle: string;
  dayOfWeek: string;
  dayNumber: string;
  monthYear: string;
  city: string;
  venue: string;
  imageUrl: string;
  category: 'All' | 'Today' | 'This Weekend' | 'This Month' | 'Festival';
  price: number;
}

interface TourEvent {
  id: string;
  dayOfWeek: string;
  dayNumber: string;
  monthYear: string;
  city: string;
  tourSubtitle: string;
  tag: string;
  region: 'Asia' | 'International';
  price: number;
}

interface UpcomingConcert {
  id: string;
  title: string;
  subtitle: string;
  tags: string[];
  dayOfWeek: string;
  dayNumber: string;
  monthYear: string;
  badgeOverlay: string;
  imageUrl: string;
  price: number;
}

interface Article {
  id: string;
  badge: string;
  title: string;
  excerpt: string;
  imageUrl: string;
}

export default function HomePage() {
  // State for search filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Surabaya');
  const [selectedDateFilter, setSelectedDateFilter] = useState('Any Date');

  // State for Browsing Concerts section
  const [browseCity, setBrowseCity] = useState('Surabaya');
  const [activeTab, setActiveTab] = useState<'All' | 'Today' | 'This Weekend' | 'This Month' | 'Festival'>('All');
  const [browseCarouselIndex, setBrowseCarouselIndex] = useState(0);

  // State for Events split section
  const [eventRegion, setEventRegion] = useState<'Asia' | 'International'>('Asia');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(48); // %

  // State for Booking Modal demo
  const [selectedConcertForBooking, setSelectedConcertForBooking] = useState<{
    title: string;
    city: string;
    date: string;
    price: number;
  } | null>(null);

  // Sample data strictly derived from the Mello design screenshots
  const browsingConcerts: ConcertCard[] = [
    {
      id: 'c1',
      title: 'YOABISO',
      artistSubtitle: 'Sir Paul Shaddy - delivered by Tokopedia',
      dayOfWeek: 'SUN',
      dayNumber: '18',
      monthYear: 'APR 24',
      city: 'Surabaya',
      venue: 'Lapangan Merr',
      imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
      category: 'All',
      price: 65,
    },
    {
      id: 'c2',
      title: 'ANDI ODANG',
      artistSubtitle: 'Pestapora Festival',
      dayOfWeek: 'SUN',
      dayNumber: '2',
      monthYear: 'APR 24',
      city: 'Surabaya',
      venue: 'Tunjungan Plaza',
      imageUrl: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=800&q=80',
      category: 'Festival',
      price: 85,
    },
    {
      id: 'c3',
      title: 'SOUND OF HERACLES',
      artistSubtitle: 'Metal Death Festival',
      dayOfWeek: 'SUN',
      dayNumber: '11',
      monthYear: 'APR 24',
      city: 'Surabaya',
      venue: 'Gedung Gedangan',
      imageUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80',
      category: 'This Weekend',
      price: 50,
    },
    {
      id: 'c4',
      title: 'THE YELLOW WALL',
      artistSubtitle: 'Sir Paul Shaddy - delivered by Tokopedia',
      dayOfWeek: 'SUN',
      dayNumber: '18',
      monthYear: 'APR 24',
      city: 'Surabaya',
      venue: 'Lapangan Merr',
      imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
      category: 'This Month',
      price: 70,
    },
    {
      id: 'c5',
      title: 'SIR PAUL SHADDY',
      artistSubtitle: 'Sir Paul Shaddy - delivered by Tokopedia',
      dayOfWeek: 'SUN',
      dayNumber: '31',
      monthYear: 'MAY 24',
      city: 'Surabaya',
      venue: 'Lapangan Merr',
      imageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
      category: 'All',
      price: 95,
    },
  ];

  const tourEvents: TourEvent[] = [
    {
      id: 't1',
      dayOfWeek: 'SUN',
      dayNumber: '27',
      monthYear: 'APR 24',
      city: 'BANGKOK',
      tourSubtitle: 'Comeback Again Nailong 24 City All The World',
      tag: 'Le Pharaohs',
      region: 'Asia',
      price: 110,
    },
    {
      id: 't2',
      dayOfWeek: 'SAT',
      dayNumber: '16',
      monthYear: 'MEI 24',
      city: 'JAKARTA',
      tourSubtitle: 'Comeback Again Nailong 24 City All The World',
      tag: 'Le Pharaohs',
      region: 'Asia',
      price: 95,
    },
    {
      id: 't3',
      dayOfWeek: 'FRI',
      dayNumber: '12',
      monthYear: 'JUN 24',
      city: 'SURABAYA',
      tourSubtitle: 'Comeback Again Nailong 24 City All The World',
      tag: 'Le Pharaohs',
      region: 'Asia',
      price: 85,
    },
    {
      id: 't4',
      dayOfWeek: 'SAT',
      dayNumber: '4',
      monthYear: 'JUL 24',
      city: 'BALI',
      tourSubtitle: 'Comeback Again Nailong 24 City All The World',
      tag: 'Le Pharaohs',
      region: 'Asia',
      price: 125,
    },
    {
      id: 't5',
      dayOfWeek: 'SAT',
      dayNumber: '24',
      monthYear: 'APR 24',
      city: 'KUALA LUMPUR',
      tourSubtitle: 'Comeback Again Nailong 24 City All The World',
      tag: 'Le Pharaohs',
      region: 'Asia',
      price: 105,
    },
    {
      id: 't6',
      dayOfWeek: 'THU',
      dayNumber: '15',
      monthYear: 'AUG 24',
      city: 'TOKYO',
      tourSubtitle: 'World Tour Stadium Special - Tokyo Dome',
      tag: 'Le Pharaohs',
      region: 'International',
      price: 160,
    },
    {
      id: 't7',
      dayOfWeek: 'SAT',
      dayNumber: '28',
      monthYear: 'SEP 24',
      city: 'SEOUL',
      tourSubtitle: 'Olympic Gymnastics Arena Live Experience',
      tag: 'Le Pharaohs',
      region: 'International',
      price: 150,
    },
  ];

  const upcomingConcerts: UpcomingConcert[] = [
    {
      id: 'u1',
      title: 'SIR PAUL SHADDY',
      subtitle: 'Sir Paul Shaddy - delivered by Tokopedia',
      tags: ['Surabaya', 'Lapangan Merr'],
      dayOfWeek: 'SUN',
      dayNumber: '18',
      monthYear: 'APR 24',
      badgeOverlay: 'SIR PAUL SHADDY SOLO',
      imageUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=800&q=80',
      price: 90,
    },
    {
      id: 'u2',
      title: 'BRING ME THE STAR TRACK',
      subtitle: 'Jakarta Tour 2024 - delivered by Ngojek',
      tags: ['Jakarta', 'Indonesia Arena'],
      dayOfWeek: 'SAT',
      dayNumber: '16',
      monthYear: 'MAY 24',
      badgeOverlay: 'BRING ME THE STAR TRACK Jakarta Tour 2024',
      imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
      price: 120,
    },
    {
      id: 'u3',
      title: '4GVS',
      subtitle: 'This is 4GVS - delivered by JLANT',
      tags: ['Malang', 'Rampal'],
      dayOfWeek: 'SUN',
      dayNumber: '18',
      monthYear: 'APR 24',
      badgeOverlay: 'THIS IS 4GVS',
      imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
      price: 75,
    },
    {
      id: 'u4',
      title: 'NAILONG',
      subtitle: 'Comeback Again Nailong 24 City All The World',
      tags: ['Bojonegoro', 'GOR DABONSIA'],
      dayOfWeek: 'SAT',
      dayNumber: '16',
      monthYear: 'APR 24',
      badgeOverlay: 'COMEBACK AGAIN NAILONG 24 CITY ALL THE WORLD',
      imageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
      price: 80,
    },
  ];

  const articles: Article[] = [
    {
      id: 'a1',
      badge: 'Tips',
      title: 'HOW TO PREPARE FOR TICKET SALES',
      excerpt: 'Before tickets go on sale, follow these tips to get ready',
      imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'a2',
      badge: 'Music',
      title: 'WHAT TO BRING TO A CONCERT',
      excerpt: 'Read our ultimate packing checklist before you go to your next concert',
      imageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'a3',
      badge: 'Welcome',
      title: 'GET STARTED ON GOEVENT',
      excerpt: 'Read our ultimate packing checklist before you go to your next concert',
      imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'a4',
      badge: 'Tips',
      title: 'CONCERT TICKET BUYING GUIDE',
      excerpt: 'Read our ultimate packing checklist before you go to your next concert',
      imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
    },
  ];

  // Filtered concert cards
  const filteredConcerts = browsingConcerts.filter((c) => {
    if (activeTab === 'All') return true;
    return c.category === activeTab;
  });

  const filteredEvents = tourEvents.filter((e) => e.region === eventRegion);

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
          SECTION 2: BROWSING CONCERTS IN (From Screenshot 2)
          ========================================================================= */}
      <section id="browse" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Title Header with City Selector */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-zinc-200">
          <div>
            <h2 className="font-display text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-black leading-[0.9] uppercase">
              BROWSING<br />CONCERTS IN
            </h2>
          </div>

          <div className="relative self-start sm:self-end">
            <select
              value={browseCity}
              onChange={(e) => setBrowseCity(e.target.value)}
              className="appearance-none bg-white border border-zinc-300 rounded-full px-6 py-2.5 text-sm font-semibold text-black focus:outline-none cursor-pointer pr-10 shadow-sm hover:border-black transition-colors"
            >
              <option value="Surabaya">Surabaya</option>
              <option value="Jakarta">Jakarta</option>
              <option value="Bangkok">Bangkok</option>
              <option value="Bali">Bali</option>
              <option value="Singapore">Singapore</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-6 sm:space-x-8 mt-6 overflow-x-auto pb-2 scrollbar-none text-sm font-medium">
          {(['All', 'Today', 'This Weekend', 'This Month', 'Festival'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 whitespace-nowrap transition-colors relative ${activeTab === tab
                ? 'text-black font-bold'
                : 'text-zinc-500 hover:text-black'
                }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Concert Cards Carousel / Horizontal Grid */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {filteredConcerts.map((concert) => (
            <div
              key={concert.id}
              className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
            >
              {/* Card Image */}
              <div className="relative h-44 w-full overflow-hidden bg-zinc-100">
                <Image
                  src={concert.imageUrl}
                  alt={concert.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                {/* Date Block & Details */}
                <div className="flex items-start space-x-3">
                  {/* Left Date Badge */}
                  <div className="border border-zinc-200 rounded-lg px-2 py-1.5 text-center min-w-[50px] bg-zinc-50 shadow-2xs">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase block tracking-wider">
                      {concert.dayOfWeek}
                    </span>
                    <span className="text-xl font-display font-black text-black leading-none block">
                      {concert.dayNumber}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-600 uppercase block">
                      {concert.monthYear}
                    </span>
                  </div>

                  {/* Title & Subtitle */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-xl font-black text-black leading-tight uppercase truncate">
                      {concert.title}
                    </h3>
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                      {concert.artistSubtitle}
                    </p>
                  </div>
                </div>

                {/* Location Tags / Chips */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-medium bg-zinc-100 text-zinc-700 px-2.5 py-0.5 rounded-full">
                    {concert.city}
                  </span>
                  <span className="text-[10px] font-medium bg-zinc-100 text-zinc-700 px-2.5 py-0.5 rounded-full">
                    {concert.venue}
                  </span>
                </div>

                {/* Find Tickets Action */}
                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900">
                    ${concert.price}
                  </span>
                  <button
                    onClick={() =>
                      setSelectedConcertForBooking({
                        title: concert.title,
                        city: concert.city,
                        date: `${concert.dayOfWeek} ${concert.dayNumber} ${concert.monthYear}`,
                        price: concert.price,
                      })
                    }
                    className="border border-zinc-300 hover:border-black text-black text-xs font-semibold px-3 py-1.5 rounded-full flex items-center space-x-1 hover:bg-black hover:text-white transition-colors"
                  >
                    <span>Find Tickets</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Carousel Bottom Indicators */}
        <div className="flex items-center justify-between mt-8 pt-4">
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full transition-colors ${browseCarouselIndex % 2 === 0 ? 'bg-black' : 'bg-zinc-300'
                }`}
            />
            <span
              className={`w-2 h-2 rounded-full transition-colors ${browseCarouselIndex % 2 === 1 ? 'bg-black' : 'bg-zinc-300'
                }`}
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setBrowseCarouselIndex((prev) => Math.max(0, prev - 1))}
              className="w-9 h-9 rounded-full border border-zinc-300 flex items-center justify-center hover:bg-black hover:text-white hover:border-black transition-colors"
              aria-label="Previous concert"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setBrowseCarouselIndex((prev) => prev + 1)}
              className="w-9 h-9 rounded-full border border-zinc-300 flex items-center justify-center hover:bg-black hover:text-white hover:border-black transition-colors"
              aria-label="Next concert"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
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

                  <div className="flex items-center space-x-4 text-xs font-semibold">
                    <button
                      onClick={() => setEventRegion('Asia')}
                      className={`transition-colors ${eventRegion === 'Asia'
                        ? 'text-white border-b-2 border-white pb-1'
                        : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                      Asia (8)
                    </button>
                    <button
                      onClick={() => setEventRegion('International')}
                      className={`transition-colors ${eventRegion === 'International'
                        ? 'text-white border-b-2 border-white pb-1'
                        : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                      International (5)
                    </button>
                  </div>
                </div>

                {/* Event Rows */}
                <div className="divide-y divide-white/5 mt-2">
                  {filteredEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="py-4 flex items-center justify-between gap-4 group hover:bg-white/[0.03] px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center space-x-4 min-w-0">
                        {/* Date badge */}
                        <div className="border border-white/15 rounded-lg px-2.5 py-1.5 text-center min-w-[54px] bg-white/5">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase block">
                            {evt.dayOfWeek}
                          </span>
                          <span className="text-xl font-display font-black text-white leading-none block">
                            {evt.dayNumber}
                          </span>
                          <span className="text-[9px] font-bold text-zinc-400 uppercase block">
                            {evt.monthYear}
                          </span>
                        </div>

                        {/* Event info */}
                        <div className="min-w-0">
                          <h4 className="font-display text-2xl font-black text-white leading-tight uppercase group-hover:text-red-400 transition-colors truncate">
                            {evt.city}
                          </h4>
                          <p className="text-[11px] text-zinc-400 truncate max-w-xs">
                            {evt.tourSubtitle}
                          </p>
                          <span className="inline-block mt-1 text-[10px] bg-white/10 text-zinc-300 px-2 py-0.5 rounded-full font-medium">
                            {evt.tag}
                          </span>
                        </div>
                      </div>

                      {/* Find Tickets Button */}
                      <button
                        onClick={() =>
                          setSelectedConcertForBooking({
                            title: `${evt.city} - ${evt.tag}`,
                            city: evt.city,
                            date: `${evt.dayOfWeek} ${evt.dayNumber} ${evt.monthYear}`,
                            price: evt.price,
                          })
                        }
                        className="shrink-0 bg-white hover:bg-zinc-200 text-black text-xs font-semibold px-4 py-2 rounded-full flex items-center space-x-1 transition-all active:scale-95 shadow-md"
                      >
                        <span>Find Tickets</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
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
          SECTION 4: UPCOMING CONCERTS 2x2 GRID (From Screenshot 5)
          ========================================================================= */}
      <section id="upcoming" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="mb-10">
          <h2 className="font-display text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-black leading-[0.9] uppercase">
            UPCOMING<br />CONCERTS
          </h2>
        </div>

        {/* 2x2 Grid of Featured Concert Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {upcomingConcerts.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col sm:flex-row gap-5 group"
            >
              {/* Left poster with overlay text */}
              <div className="relative w-full sm:w-1/2 h-56 sm:h-auto rounded-xl overflow-hidden bg-zinc-900 shrink-0">
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500 brightness-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <span className="font-display text-lg uppercase font-black leading-tight block drop-shadow-md">
                    {item.badgeOverlay}
                  </span>
                </div>
              </div>

              {/* Right Details */}
              <div className="flex-1 flex flex-col justify-between py-1 space-y-4">
                <div className="space-y-2">
                  <h3 className="font-display text-2xl sm:text-3xl font-black text-black leading-tight uppercase">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {item.subtitle}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium bg-zinc-100 text-zinc-700 px-2.5 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                  {/* Date Badge */}
                  <div className="border border-zinc-200 rounded-lg px-2.5 py-1 text-center bg-zinc-50">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase block">
                      {item.dayOfWeek}
                    </span>
                    <span className="text-lg font-display font-black text-black leading-none block">
                      {item.dayNumber}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-600 uppercase block">
                      {item.monthYear}
                    </span>
                  </div>

                  {/* Find Tickets Button */}
                  <button
                    onClick={() =>
                      setSelectedConcertForBooking({
                        title: item.title,
                        city: item.tags[0],
                        date: `${item.dayOfWeek} ${item.dayNumber} ${item.monthYear}`,
                        price: item.price,
                      })
                    }
                    className="border border-zinc-300 hover:border-black text-black hover:bg-black hover:text-white text-xs font-semibold px-4 py-2 rounded-full flex items-center space-x-1 transition-colors"
                  >
                    <span>Find Tickets</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
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

        {/* Editorial Articles List */}
        <div className="divide-y divide-zinc-200">
          {articles.map((art) => (
            <div
              key={art.id}
              className="py-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center group cursor-pointer hover:bg-zinc-100/60 px-4 rounded-2xl transition-colors"
            >
              {/* Thumbnail */}
              <div className="md:col-span-3">
                <div className="relative h-32 w-full rounded-xl overflow-hidden bg-zinc-100">
                  <Image
                    src={art.imageUrl}
                    alt={art.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>

              {/* Title & Badge */}
              <div className="md:col-span-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-200/80 px-2.5 py-0.5 rounded-full inline-block">
                  {art.badge}
                </span>
                <h3 className="font-display text-2xl font-black text-black uppercase leading-tight group-hover:text-red-600 transition-colors">
                  {art.title}
                </h3>
              </div>

              {/* Excerpt */}
              <div className="md:col-span-3 text-xs text-zinc-500">
                <p>{art.excerpt}</p>
              </div>

              {/* Link */}
              <div className="md:col-span-2 flex justify-start md:justify-end">
                <span className="text-xs font-bold text-black flex items-center space-x-1 group-hover:underline">
                  <span>Discover More</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>

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
                <li><Link href="#upcoming" className="hover:text-white transition-colors">Upcoming Concerts</Link></li>
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
            <p>© {new Date().getFullYear()} GoEvent Platform. All rights reserved.</p>
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
                <span>📍 {selectedConcertForBooking.city}</span>
                <span>•</span>
                <span>📅 {selectedConcertForBooking.date}</span>
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
              <button
                onClick={() => {
                  alert(`Ticket hold reserved for ${selectedConcertForBooking.title}! Proceeding to checkout.`);
                  setSelectedConcertForBooking(null);
                }}
                className="w-1/2 py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-lg active:scale-95"
              >
                <span>Book Now</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
