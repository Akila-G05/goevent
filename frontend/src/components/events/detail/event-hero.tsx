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
  Flag,
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
          className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#747878]"
        >
          <Link href="/" className="transition-colors hover:text-[#1c1b1b]">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <Link href="/#events" className="transition-colors hover:text-[#1c1b1b]">
            Events
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span>{event.category}</span>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span className="max-w-[220px] truncate text-[#1c1b1b] sm:max-w-none">
            {event.title}
          </span>
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => toast.info('Share links are coming with the public event API.')}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e2e1] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#1c1b1b] transition-colors hover:border-[#1c1b1b]"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
            Share
          </button>
          <button
            type="button"
            onClick={() => toast.success('Saved to your events.')}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e2e1] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#1c1b1b] transition-colors hover:border-[#1c1b1b]"
          >
            <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
            Save
          </button>
          <button
            type="button"
            onClick={() => toast.info('Reports are reviewed by the moderation team.')}
            className="inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 text-[11px] font-semibold text-red-600 transition-colors hover:border-red-200 hover:bg-red-50"
          >
            <Flag className="h-3.5 w-3.5" aria-hidden="true" />
            Report
          </button>
        </div>
      </div>

      {/* Hero banner */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-[#e5e2e1] bg-[#1c1b1b] shadow-xl">
        <div className="relative h-[360px] w-full sm:h-[420px] lg:h-[460px]">
          <Image
            src={event.heroImage}
            alt={`${event.title} stage`}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 1280px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1c1b1b] via-[#1c1b1b]/55 to-transparent" />

          {/* Badges */}
          <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2 sm:left-6 sm:top-6">
            <span className="rounded-lg bg-[#1c1b1b] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-md">
              {event.category}
            </span>
            {event.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#fdf8f8]/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#1c1b1b] shadow-md backdrop-blur">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Verified official pass
              </span>
            )}
            <span className="rounded-full bg-[#ebe7e6]/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#1c1b1b] backdrop-blur">
              {event.format}
            </span>
          </div>

          {/* Title block */}
          <div className="absolute inset-x-4 bottom-4 z-10 flex flex-col gap-4 sm:inset-x-6 sm:bottom-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c4c7c7]">
                <span>{event.dateLine}</span>
                <span aria-hidden="true">•</span>
                <span>{event.locationLine}</span>
                <span aria-hidden="true">•</span>
                <span className="text-[#d8e1ea]">Live &amp; interactive</span>
              </div>
              <h1 className="font-display text-4xl uppercase leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-6xl">
                {event.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#e5e2e1] sm:text-base">
                {event.subtitle}
              </p>
            </div>

            <a
              href="#tickets"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#fdf8f8] px-6 py-3 text-sm font-bold text-[#1c1b1b] shadow-lg transition-transform hover:bg-[#ebe7e6] active:scale-95"
            >
              Reserve seat
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* Meta strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#f1edec] px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <MetaItem
              icon={<CalendarDays className="h-[18px] w-[18px]" aria-hidden="true" />}
              label="Date & Schedule"
              value={event.dateRange}
            />
            <MetaItem
              icon={<MapPin className="h-[18px] w-[18px]" aria-hidden="true" />}
              label="Venue Location"
              value={event.venue.name}
            />
            <MetaItem
              icon={<Ticket className="h-[18px] w-[18px]" aria-hidden="true" />}
              label="Ticket Range"
              value={`Tiered from $${event.priceFrom}.00 to $${event.priceTo}.00`}
            />
          </div>

          {event.studentDiscount && (
            <p className="inline-flex items-center gap-2 rounded-full border border-[#c4c7c7] bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-[#444748]">
              <GraduationCap className="h-4 w-4 text-[#1c1b1b]" aria-hidden="true" />
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
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ebe7e6] text-[#1c1b1b]">
        {icon}
      </span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#747878]">{label}</p>
        <p className="text-sm font-semibold text-[#1c1b1b]">{value}</p>
      </div>
    </div>
  );
}

export default EventHero;
