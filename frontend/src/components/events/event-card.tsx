import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, MapPin, Users } from 'lucide-react';
import type { EventSummary } from '@/api/events';
import { API_BASE_URL } from '@/api/routes';
import { audienceLabel, levelStyle } from '@/lib/event-labels';
import { SaveEventButton } from './save-event-button';

function formatDate(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`);

  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    day: date.toLocaleDateString('en-US', { day: 'numeric' }),
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
  };
}

export function EventCard({ event }: { event: EventSummary }) {
  const level = levelStyle(event.eventLevel);
  const audience = audienceLabel(event.audience);
  const date = formatDate(event.startsOn);
  const imageUrl = event.imagePath ? `${API_BASE_URL}${event.imagePath}` : null;

  return (
    <article className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group">
      <div className="relative h-40 w-full overflow-hidden bg-zinc-900">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={event.name}
            fill
            unoptimized
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 font-display text-2xl uppercase text-zinc-400">
            {event.category}
          </div>
        )}
        <span
          className={`absolute top-3 left-3 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${level.className}`}
        >
          {level.label}
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="border border-zinc-200 rounded-lg px-2 py-1.5 text-center min-w-[50px] bg-zinc-50">
            <span className="text-[10px] font-bold text-zinc-500 block">{date.weekday}</span>
            <span className="text-xl font-display font-black text-black leading-none block">{date.day}</span>
            <span className="text-[9px] font-bold text-zinc-600 block">{date.month}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h3
              className="font-display text-xl font-black text-black leading-tight uppercase truncate"
              title={event.name}
            >
              {event.name}
            </h3>
            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
              {event.category} - {event.timeRange}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2">
          <Users className="w-4 h-4 mt-0.5 shrink-0 text-zinc-700" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Who can join</p>
            <p className="text-xs font-semibold text-black">{audience}</p>
          </div>
        </div>

        <p className="text-xs text-zinc-600 flex items-center gap-1.5 min-w-0">
          <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {event.venueName}, {event.venueCity}
          </span>
        </p>

        <div className="mt-auto flex items-center gap-2">
          <SaveEventButton eventId={event.id} className="shrink-0" />
          <Link
            href={`/events/${event.id}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"
          >
            <span>Explore</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
