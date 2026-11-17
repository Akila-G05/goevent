import type { EventSummary } from '@/api/events';

/** Sort orders offered by the home-page search bar. */
export type EventOrder = 'newest' | 'oldest' | 'name';

/**
 * Filters by name, category or venue, then orders the result. Dates are
 * `yyyy-MM-dd`, so string comparison is chronological; ties fall back to id.
 */
export function filterAndSortEvents(
  events: EventSummary[],
  query: string,
  order: EventOrder
): EventSummary[] {
  const needle = query.trim().toLowerCase();

  const matches = needle
    ? events.filter((event) =>
        [event.name, event.category, event.venueName, event.venueCity].some((value) =>
          value.toLowerCase().includes(needle)
        )
      )
    : events;

  return [...matches].sort((a, b) => {
    if (order === 'name') {
      return a.name.localeCompare(b.name);
    }

    const byDate = order === 'oldest' ? a.startsOn.localeCompare(b.startsOn) : b.startsOn.localeCompare(a.startsOn);

    return byDate || (order === 'oldest' ? a.id - b.id : b.id - a.id);
  });
}
