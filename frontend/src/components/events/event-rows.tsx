import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { EventSummary } from '@/api/events';
import { API_BASE_URL } from '@/api/routes';
import { FALLBACK_EVENT_IMAGE } from '@/lib/event-detail-adapter';
import { formatEventDate } from '@/lib/event-labels';

interface EventRowsProps {
  events: EventSummary[];
  actionLabel: string;
  /** `dark` for the black events panel, `light` for the page canvas. */
  variant?: 'light' | 'dark';
}

/** One event per row, each linking to its own page. */
export function EventRows({ events, actionLabel, variant = 'light' }: EventRowsProps) {
  const dark = variant === 'dark';

  return (
    <ul className={dark ? 'divide-y divide-white/5' : 'divide-y divide-zinc-200'}>
      {events.map((event) => {
        const imageUrl = event.imagePath ? `${API_BASE_URL}${event.imagePath}` : FALLBACK_EVENT_IMAGE;

        return (
          <li key={event.id}>
            <Link
              href={`/events/${event.id}`}
              className={`group grid grid-cols-1 items-center gap-4 rounded-2xl px-2 py-4 transition-colors md:grid-cols-12 ${
                dark ? 'hover:bg-white/[0.03]' : 'px-4 py-5 hover:bg-zinc-100/60'
              }`}
            >
              <div
                className={`relative overflow-hidden rounded-lg bg-zinc-200 md:col-span-2 ${
                  dark ? 'h-16' : 'h-28'
                }`}
              >
                <Image
                  src={imageUrl}
                  alt=""
                  fill
                  unoptimized={imageUrl.startsWith('/')}
                  sizes="120px"
                  className="object-cover"
                />
              </div>

              <div className="min-w-0 md:col-span-4">
                <p
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    dark ? 'text-zinc-400' : 'text-zinc-500'
                  }`}
                >
                  {event.category}
                </p>
                <h3
                  className={`truncate font-display text-2xl font-black uppercase leading-tight transition-colors ${
                    dark ? 'text-white group-hover:text-zinc-300' : 'text-black group-hover:text-zinc-600'
                  }`}
                >
                  {event.name}
                </h3>
              </div>

              <div className={`text-xs md:col-span-3 ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                <p className="truncate">
                  {formatEventDate(event.startsOn)} • {event.timeRange}
                </p>
                <p className="truncate">
                  {event.venueName}, {event.venueCity}
                </p>
              </div>

              <div className="flex md:col-span-3 md:justify-end">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold group-hover:underline ${
                    dark ? 'text-white' : 'text-black'
                  }`}
                >
                  {actionLabel}
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default EventRows;
