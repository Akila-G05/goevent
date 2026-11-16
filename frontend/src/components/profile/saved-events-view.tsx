'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bookmark, MapPin } from 'lucide-react';
import { listSampleEvents, type EventDetail } from '@/lib/sample-events';
import { toast } from '@/lib/toast-store';

/** Saved events sub-screen. Sample data only; nothing here calls the backend. */
export function SavedEventsView() {
  const [saved, setSaved] = useState<EventDetail[]>(() => listSampleEvents().slice(0, 6));

  const unsave = (event: EventDetail) => {
    setSaved((current) => current.filter((item) => item.slug !== event.slug));
    toast.info(`"${event.title}" removed from saved events.`);
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl uppercase tracking-wide text-[#1c1b1b]">Saved events</h2>
          <p className="text-xs text-[#736e6c]">Events you bookmarked to revisit before they sell out.</p>
        </div>
        <span className="rounded-full bg-[#ede9e8] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#1c1b1b]">
          {saved.length} saved
        </span>
      </div>

      {saved.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d6d0ce] bg-white p-10 text-center">
          <Bookmark className="mx-auto h-6 w-6 text-[#736e6c]" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-[#1c1b1b]">No saved events</p>
          <p className="mt-1 text-xs text-[#736e6c]">Save an event from its page and it will appear here.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {saved.map((event) => (
            <li
              key={event.slug}
              className="flex flex-col overflow-hidden rounded-2xl border border-[#eae6e5] bg-white shadow-sm"
            >
              <div className="relative h-40 w-full bg-[#f1edec]">
                <Image
                  src={event.cardImage}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                />
                <span className="absolute left-3 top-3 rounded bg-[#000000] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  {event.category}
                </span>
                <button
                  type="button"
                  onClick={() => unsave(event)}
                  aria-label={`Remove ${event.title} from saved events`}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#1c1b1b] shadow-sm transition-colors hover:bg-white"
                >
                  <Bookmark className="h-4 w-4 fill-current" aria-hidden="true" />
                </button>
              </div>

              <div className="flex flex-1 flex-col justify-between gap-4 p-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#575f67]">{event.dateLine}</p>
                  <h3 className="mt-1 font-display text-xl uppercase leading-tight text-[#1c1b1b]">{event.title}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-[#575f67]">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {event.venue.name}, {event.venue.city}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#111111]">{event.status}</span>
                  <Link
                    href={`/events/${event.slug}`}
                    className="rounded-full bg-[#ebe7e6] px-3 py-1.5 text-xs font-semibold text-[#111111] transition-colors hover:bg-[#000000] hover:text-white"
                  >
                    View event
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default SavedEventsView;
