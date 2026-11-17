'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { eventsApi, type EventSummary } from '@/api/events';
import { API_BASE_URL } from '@/api/routes';
import { toListingDetail, FALLBACK_EVENT_IMAGE } from '@/lib/event-detail-adapter';
import { audienceLabel, formatEventDate, levelStyle } from '@/lib/event-labels';
import { EventDetailView } from './event-detail-view';
import type { RelatedCard } from './related-events';

const RELATED_LIMIT = 3;

function toRelatedCard(event: EventSummary): RelatedCard {
  return {
    key: String(event.id),
    href: `/events/${event.id}`,
    imageUrl: event.imagePath ? `${API_BASE_URL}${event.imagePath}` : FALLBACK_EVENT_IMAGE,
    category: event.category,
    dateLine: formatEventDate(event.startsOn),
    venueCity: event.venueCity,
    title: event.name,
    venueName: event.venueName,
    badge: levelStyle(event.eventLevel).label,
    status: audienceLabel(event.audience),
  };
}

export function EventListingDetail({ eventId }: { eventId: number }) {
  const detailQuery = useQuery({
    queryKey: ['events', 'detail', eventId],
    queryFn: () => eventsApi.detail(eventId),
  });

  const listQuery = useQuery({
    queryKey: ['events', 'approved', 'related'],
    queryFn: () => eventsApi.list(12),
  });

  if (detailQuery.isPending) {
    return (
      <div className="min-h-[60vh] bg-[#fdf8f8] px-4 py-16 text-center">
        <p role="status" className="text-sm text-zinc-500">Loading event...</p>
      </div>
    );
  }

  if (detailQuery.isError) {
    return (
      <div className="min-h-[60vh] bg-[#fdf8f8] px-4 py-16 text-center">
        <div role="alert" className="flex flex-col items-center gap-3 text-sm text-red-600">
          <span>This event could not be loaded.</span>
          <button
            type="button"
            onClick={() => detailQuery.refetch()}
            className="font-semibold text-black underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const related = (listQuery.data ?? [])
    .filter((event) => event.id !== eventId)
    .slice(0, RELATED_LIMIT)
    .map(toRelatedCard);

  return <EventDetailView event={toListingDetail(detailQuery.data)} related={related} />;
}
