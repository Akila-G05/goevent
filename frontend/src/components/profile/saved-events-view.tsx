'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, MapPin } from 'lucide-react';
import { eventsApi, type EventSummary } from '@/api/events';
import { API_BASE_URL } from '@/api/routes';
import { FALLBACK_EVENT_IMAGE } from '@/lib/event-detail-adapter';
import { audienceLabel, formatEventDate } from '@/lib/event-labels';
import { getErrorMessage, toast } from '@/lib/toast-store';

/** The signed-in user's saved events, with a control to remove each one. */
export function SavedEventsView() {
  const queryClient = useQueryClient();

  const savedQuery = useQuery({
    queryKey: ['events', 'saved'],
    queryFn: () => eventsApi.saved(),
    retry: false,
  });

  const remove = useMutation({
    mutationFn: (eventId: number) => eventsApi.unsave(eventId),
    onSuccess: () => {
      toast.success('Removed from saved events.');
      queryClient.invalidateQueries({ queryKey: ['events', 'saved'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'The event could not be removed.'), { title: 'Remove failed' });
    },
  });

  const saved: EventSummary[] = savedQuery.data ?? [];

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl uppercase tracking-wide text-[#1c1b1b]">Saved events</h2>
          <p className="text-xs text-[#736e6c]">Events you saved to revisit before they sell out.</p>
        </div>
        {savedQuery.isSuccess && (
          <span className="rounded-full bg-[#ede9e8] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#1c1b1b]">
            {saved.length} saved
          </span>
        )}
      </div>

      {savedQuery.isPending && <p role="status" className="text-sm text-zinc-500">Loading saved events...</p>}

      {savedQuery.isError && (
        <p role="alert" className="text-sm text-red-600">
          Saved events could not be loaded. Sign in to see them.
        </p>
      )}

      {savedQuery.isSuccess && saved.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#d6d0ce] bg-white p-10 text-center">
          <Bookmark className="mx-auto h-6 w-6 text-[#736e6c]" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-[#1c1b1b]">No saved events</p>
          <p className="mt-1 text-xs text-[#736e6c]">Use Save on any event card and it will appear here.</p>
        </div>
      )}

      {saved.length > 0 && (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {saved.map((event) => {
            const imageUrl = event.imagePath ? `${API_BASE_URL}${event.imagePath}` : FALLBACK_EVENT_IMAGE;

            return (
              <li
                key={event.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-[#eae6e5] bg-white shadow-sm"
              >
                <div className="relative h-40 w-full bg-[#f1edec]">
                  <Image
                    src={imageUrl}
                    alt=""
                    fill
                    unoptimized={imageUrl.startsWith('/')}
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                  />
                  <span className="absolute left-3 top-3 rounded bg-[#000000] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    {event.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove.mutate(event.id)}
                    disabled={remove.isPending}
                    aria-label={`Remove ${event.name} from saved events`}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#1c1b1b] shadow-sm transition-colors hover:bg-white disabled:opacity-60"
                  >
                    <Bookmark className="h-4 w-4 fill-current" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex flex-1 flex-col justify-between gap-4 p-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#575f67]">
                      {formatEventDate(event.startsOn)} • {event.timeRange}
                    </p>
                    <h3 className="mt-1 font-display text-xl uppercase leading-tight text-[#1c1b1b]">{event.name}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[#575f67]">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {event.venueName}, {event.venueCity}
                    </p>
                    <p className="mt-1 text-xs text-[#736e6c]">{audienceLabel(event.audience)}</p>
                  </div>

                  <div className="flex items-center justify-end">
                    <Link
                      href={`/events/${event.id}`}
                      className="rounded-full bg-[#ebe7e6] px-3 py-1.5 text-xs font-semibold text-[#111111] transition-colors hover:bg-[#000000] hover:text-white"
                    >
                      View event
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default SavedEventsView;
