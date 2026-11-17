'use client';

import React, { useEffect, useState } from 'react';
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
  PENDING: { label: 'Legacy pending', className: 'bg-amber-100 text-amber-800' },
  APPROVED: { label: 'Published', className: 'bg-emerald-100 text-emerald-800' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
  DRAFT: { label: 'Draft', className: 'bg-zinc-200 text-zinc-700' },
};

const DISABLED_BUTTON =
  'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors';

/**
 * The organizer's own events, in every review state. Each event is one row.
 * Edit is available only for listing events; other events show it disabled.
 */
export function MyEventsList({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<EventDetails | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const mineQuery = useQuery({
    queryKey: ['events', 'mine'],
    queryFn: () => eventsApi.mine(),
  });

  useEffect(() => {
    if (mineQuery.isSuccess) onCountChange?.(mineQuery.data.length);
  }, [mineQuery.isSuccess, mineQuery.data, onCountChange]);

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
      <div className="mb-4">
        <h2 className="font-display text-2xl uppercase tracking-wide text-[#1c1b1b]">My events</h2>
        <p className="text-xs text-[#736e6c]">Your events. New listings publish immediately.</p>
      </div>

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
            const canView = event.status === 'APPROVED';

            return (
              <li key={event.id} className="flex flex-nowrap items-center gap-4 py-3">
                <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-200">
                  <Image
                    src={imageUrl}
                    alt=""
                    fill
                    unoptimized={imageUrl.startsWith('/')}
                    sizes="96px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status.className}`}
                    >
                      {status.label}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      {event.category}
                    </span>
                  </div>
                  <p className="truncate font-display text-lg uppercase leading-tight text-[#1c1b1b]">
                    {event.name}
                  </p>
                </div>

                <div className="w-56 shrink-0 text-xs text-zinc-500">
                  <p className="truncate">
                    {event.startsOn ? formatEventDate(event.startsOn) : 'No date'}
                    {event.timeRange ? ` • ${event.timeRange}` : ''}
                  </p>
                  <p className="truncate">
                    {event.venueName}, {event.venueCity}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {canView ? (
                    <Link
                      href={`/events/${event.id}`}
                      className={`${DISABLED_BUTTON} bg-[#f0eceb] text-[#1c1b1b] hover:bg-[#e4dfde]`}
                    >
                      View
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      title="Available once the event is published"
                      className={`${DISABLED_BUTTON} cursor-not-allowed bg-[#f0eceb] text-[#a8a4a3]`}
                    >
                      View
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => openEditor(event)}
                    disabled={!canEdit || loadingId === event.id}
                    title={canEdit ? 'Edit this event' : 'Only listing events can be edited'}
                    className={`${DISABLED_BUTTON} disabled:cursor-not-allowed disabled:bg-[#f0eceb] disabled:text-[#a8a4a3] bg-[#1c1b1b] text-white hover:bg-[#333131]`}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    {loadingId === event.id ? 'Opening…' : 'Edit'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && <CreateEventModal key={editing.id} open event={editing} onClose={closeEditor} />}
    </section>
  );
}

export default MyEventsList;
