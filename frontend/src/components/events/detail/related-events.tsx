import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { EventDetail } from '@/lib/sample-events';
import { SectionHeading } from './section-heading';

export function RelatedEvents({ events }: { events: EventDetail[] }) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeading
        title="You might also like"
        hint="Curated forums and live tours happening across Southeast Asia"
        action={
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e0dbd9] text-[#a8a4a3]">
              <ChevronLeft className="h-4 w-4" />
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#1c1b1b] text-[#1c1b1b]">
              <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        }
      />

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
        {events.map((event) => (
          <Link
            key={event.slug}
            href={`/events/${event.slug}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-[#e5e2e1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            <div className="relative h-40 w-full overflow-hidden bg-[#f1edec]">
              <Image
                src={event.cardImage}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                <span className="rounded-full bg-[#1c1b1b] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                  {event.category}
                </span>
                <span className="rounded-full bg-[#fdf8f8]/90 px-2.5 py-1 text-[10px] font-bold text-[#1c1b1b] backdrop-blur">
                  From ${event.priceFrom}
                </span>
              </div>
            </div>

            <div className="flex flex-1 flex-col p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#747878]">
                {event.dateLine} <span aria-hidden="true">·</span> {event.venue.city}
              </p>
              <h3 className="mt-1 font-display text-lg uppercase leading-tight text-[#1c1b1b] transition-colors group-hover:text-[#444748]">
                {event.title}
              </h3>
              <p className="mt-0.5 text-[11px] text-[#747878]">{event.venue.name}</p>

              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                <span className="rounded-full bg-[#f1edec] px-2.5 py-1 text-[10px] font-semibold text-[#444748]">
                  {event.status}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1c1b1b]">
                  View event
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default RelatedEvents;
