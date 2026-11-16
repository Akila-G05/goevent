'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { eventsApi, type EventDetails, type OwnedEvent } from '@/api/events';
import { API_BASE_URL } from '@/api/routes';
import { FALLBACK_EVENT_IMAGE } from '@/lib/event-detail-adapter';
import { formatEventDate } from '@/lib/event-labels';
import { getErrorMessage, toast } from '@/lib/toast-store';
import { CreateEventModal } from './create-event-modal';

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pending review', className: 'bg-amber-100 text-amber-800' },
  APPROVED: { label: 'Published', className: 'bg-emerald-100 text-emerald-800' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
  DRAFT: { label: 'Draft', className: 'bg-zinc-200 text-zinc-700' },
};

/** The organizer's own events in every review state, with an edit action for listing events. */
export function MyEventsList({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<EventDetails | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const mineQuery = useQuery({
    queryKey: ['events', 'mine'],
    queryFn: () => eventsApi.mine(),
  });

  if (mineQuery.isSuccess) {
    onCountChange?.(mineQuery.data.length);
  }

  const openEditor = async (event: OwnedEvent) => {
    setLoadingId(event.id);

    try {
      setEditing(await eventsApi.mineDetail(event.id));
    } catch (error) {
      toast.error(getErrorMessage(error, 'The event could not be opened for editing.'), {
        title: 'Edit unavailable',
      });
    } finally {
      setLoadingId(null);
    }
  };

  const closeEditor = () => {
    setEditing(null);
    queryClient.invalidateQueries({ queryKey: ['events'] });
  };

  return (
    <section className="rounded-2xl border border-[#e5e2e1] bg-white p-5 shadow-sm sm:p-6">
      {mineQuery.isPending && <p role="status" className="py-6 text-sm text-zinc-500">Loading your events...</p>}

      {mineQuery.isError && (
        <p role="alert" className="py-6 text-sm text-red-600">
          Your events could not be loaded. Sign in as an organizer to see them.
        </p>
      )}

      {mineQuery.isSuccess && mineQuery.data.length === 0 && (
        <p className="py-6 text-sm text-zinc-500">You have not published any events yet.</p>
      )}

      {mineQuery.isSuccess && mineQuery.data.length > 0 && (
        <ul className="divide-y divide-[#eae6e5]">
          {mineQuery.data.map((event) => {
            const status = STATUS_STYLE[event.status] ?? STATUS_STYLE.DRAFT;
            const imageUrl = event.imagePath ? `${API_BASE_URL}${event.imagePath}` : FALLBACK_EVENT_IMAGE;
            const canEdit = event.eventLevel === 'LISTING_ONLY';

            return (
              <li key={event.id} className="grid grid-cols-1 items-center gap-4 py-4 md:grid-cols-12">
                <div className="relative h-16 overflow-hidden rounded-lg bg-zinc-200 md:col-span-2">
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
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status.className}`}>
                      {status.label}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      {event.category}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-display text-xl uppercase leading-tight text-[#1c1b1b]">
                    {event.name}
                  </p>
                </div>

                <div className="text-xs text-zinc-500 md:col-span-3">
                  <p className="truncate">
                    {event.startsOn ? formatEventDate(event.startsOn) : 'No date'}
                    {event.timeRange ? ` • ${event.timeRange}` : ''}
                  </p>
                  <p className="truncate">
                    {event.venueName}, {event.venueCity}
                  </p>
                </div>

                <div className="flex items-center gap-2 md:col-span-3 md:justify-end">
                  {event.status === 'APPROVED' && (
                    <Link
                      href={`/events/${event.id}`}
                      className="rounded-full bg-[#f0eceb] px-4 py-2 text-xs font-semibold text-[#1c1b1b] transition-colors hover:bg-[#e4dfde]"
                    >
                      View
                    </Link>
                  )}
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => openEditor(event)}
                      disabled={loadingId === event.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#1c1b1b] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#333131] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      {loadingId === event.id ? 'Opening…' : 'Edit'}
                    </button>
                  ) : (
                    <span className="text-[11px] text-zinc-400">Editing is for listing events</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <CreateEventModal key={editing.id} open event={editing} onClose={closeEditor} />
      )}
    </section>
  );
}

export default MyEventsList;
