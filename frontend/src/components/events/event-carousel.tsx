'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { EventSummary } from '@/api/events';
import { EventCard } from './event-card';

const PAGE_SIZE = 4;
const MAX_EVENTS = 6;

/** Four event cards per page; more pages appear as arrows and dots, up to six events. */
export function EventCarousel({ events }: { events: EventSummary[] }) {
  const items = events.slice(0, MAX_EVENTS);
  const pageCount = Math.ceil(items.length / PAGE_SIZE);
  const [page, setPage] = useState(0);
  const currentPage = Math.min(page, Math.max(0, pageCount - 1));
  const visible = items.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      {pageCount > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <div className="flex items-center gap-1.5" role="group" aria-label="Choose a page of events">
            {Array.from({ length: pageCount }, (_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Page ${index + 1}`}
                aria-current={index === currentPage}
                onClick={() => setPage(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentPage ? 'w-6 bg-black' : 'w-2 bg-zinc-300 hover:bg-zinc-400'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous events"
              disabled={currentPage === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 transition-colors hover:border-black hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-zinc-300 disabled:hover:bg-transparent disabled:hover:text-black"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next events"
              disabled={currentPage === pageCount - 1}
              onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 transition-colors hover:border-black hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-zinc-300 disabled:hover:bg-transparent disabled:hover:text-black"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventCarousel;
