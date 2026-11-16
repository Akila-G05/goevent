/** Labels for the backend `event_level` and `audience` values, shared by cards and detail pages. */

export const EVENT_LEVEL_STYLE: Record<string, { label: string; className: string }> = {
  FREE: { label: 'Free', className: 'bg-emerald-100 text-emerald-800' },
  PAYED: { label: 'Paid', className: 'bg-amber-100 text-amber-800' },
  LISTING_ONLY: { label: 'Listing only', className: 'bg-zinc-200 text-zinc-700' },
};

export const AUDIENCE_LABEL: Record<string, string> = {
  UNIVERSITY: 'University students',
  PUBLIC: 'Public',
  BOTH: 'University students & public',
};

export function levelStyle(eventLevel: string) {
  return EVENT_LEVEL_STYLE[eventLevel] ?? EVENT_LEVEL_STYLE.LISTING_ONLY;
}

export function audienceLabel(audience: string) {
  return AUDIENCE_LABEL[audience] ?? audience;
}

/** `yyyy-MM-dd` from the backend, shown as e.g. "Fri, Dec 18, 2026". */
export function formatEventDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
