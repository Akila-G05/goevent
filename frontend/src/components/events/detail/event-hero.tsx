'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowDown,
  BadgeCheck,
  Bookmark,
  CalendarDays,
  ChevronRight,
  GraduationCap,
  MapPin,
  Share2,
  Ticket,
} from 'lucide-react';
import type { EventDetail } from '@/lib/sample-events';
import { toast } from '@/lib/toast-store';

interface EventHeroProps {
  event: EventDetail;
}

export function EventHero({ event }: EventHeroProps) {
  return (
    <section className="mx-auto w-full max-w-[1280px] px-4 pt-6 sm:px-6 lg:px-8">
      {/* Breadcrumb + quick actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-[#575f67]"
        >
          <Link href="/" className="transition-colors hover:text-[#1c1b1b]">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <Link href="/#events" className="transition-colors hover:text-[#1c1b1b]">
            Events
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span className="max-w-[12rem] truncate font-semibold text-[#1c1b1b] md:max-w-md">
            {event.title}
          </span>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toast.info('Link copied to clipboard.')}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#f7f3f2] px-4 py-2 text-xs font-semibold text-[#1c1b1b] shadow-sm transition-colors hover:bg-[#f1edec]"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Share
          </button>
          <button
            type="button"
            onClick={() => toast.success('Event saved.')}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#f7f3f2] px-4 py-2 text-xs font-semibold text-[#1c1b1b] shadow-sm transition-colors hover:bg-[#f1edec]"
          >
            <Bookmark className="h-4 w-4" aria-hidden="true" />
            Save
          </button>
          <span className="mx-1 hidden h-6 w-px bg-[#e5e2e1] sm:block" aria-hidden="true" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffdad6] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#93000a]">
            <span className="h-2 w-2 animate-ping rounded-full bg-[#ba1a1a]" aria-hidden="true" />
            {event.status}
          </span>
        </div>
      </div>

      {/* Hero banner */}
      <div className="relative mt-4 w-full overflow-hidden rounded-xl bg-[#111111] shadow-xl">
        <div className="relative h-[380px] w-full lg:h-[460px]">
          <Image
            src={event.heroImage}
            alt={`${event.title} stage`}
            fill
            priority
            unoptimized={event.heroImage.startsWith('/')}
            sizes="(max-width: 1024px) 100vw, 1280px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/60 to-transparent" />

          {/* Badges */}
          <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2 sm:left-6 sm:top-6">
            <span className="rounded-lg bg-[#111111] px-3 py-1.5 font-display text-lg uppercase tracking-widest text-white shadow-md">
              {event.category}
            </span>
            {event.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#fdf8f8]/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#1c1b1b] shadow-md backdrop-blur-md">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Verified official pass
              </span>
            )}
            <span className="rounded-full bg-[#e5e2e1]/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#1c1b1b] backdrop-blur-md">
              {event.format}
            </span>
          </div>

          {/* Title block */}
          <div className="absolute inset-x-4 bottom-6 z-10 flex flex-col gap-4 sm:inset-x-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-widest text-[#c4c7c7]">
                <span>{event.dateLine}</span>
                <span aria-hidden="true">•</span>
                <span>{event.locationLine}</span>
                <span aria-hidden="true">•</span>
                <span className="text-[#d8e1ea]">Live &amp; interactive</span>
              </div>
              <h1 className="font-display text-4xl uppercase leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-6xl">
                {event.title}
              </h1>
              <p className="mt-2 max-w-2xl text-base leading-relaxed text-[#e5e2e1]">
                {event.subtitle}
              </p>
            </div>

            {!event.listingOnly && (
              <a
                href="#ticketSection"
                className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-[#fdf8f8] px-7 py-3 text-sm font-semibold text-[#111111] shadow-lg transition-transform hover:bg-[#ebe7e6] active:scale-95 md:self-auto"
              >
                Reserve seat
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>

        {/* Meta strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#f1edec] px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <MetaItem
              icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
              label="Date & Schedule"
              value={event.dateRange}
            />
            <MetaItem
              icon={<MapPin className="h-5 w-5" aria-hidden="true" />}
              label="Venue Location"
              value={event.venue.name}
            />
            {!event.listingOnly && (
              <MetaItem
                icon={<Ticket className="h-5 w-5" aria-hidden="true" />}
                label="Ticket Range"
                value={`Tiered from $${event.priceFrom}.00 to $${event.priceTo}.00`}
              />
            )}
          </div>

          {event.studentDiscount && (
            <p className="inline-flex items-center gap-2 rounded-full bg-[#e5e2e1]/80 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-[#111111]">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
              {event.studentDiscount}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ebe7e6] text-[#111111]">
        {icon}
      </span>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#575f67]">{label}</p>
        <p className="text-sm font-semibold text-[#1c1b1b]">{value}</p>
      </div>
    </div>
  );
}
