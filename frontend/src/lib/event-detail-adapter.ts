import type { EventDetails } from '@/api/events';
import { API_BASE_URL } from '@/api/routes';
import { audienceLabel, formatEventDate, levelStyle } from '@/lib/event-labels';
import type { EventDay, EventDetail } from '@/lib/sample-events';

/** Generic event photo for stored events that have no cover image yet. */
export const FALLBACK_EVENT_IMAGE =
  'https://images.unsplash.com/photo-1659273145168-7217ae03db0c?auto=format&fit=crop&w=1600&q=80';

const WEB_URL = /^https?:\/\//i;
const HERO_SUBTITLE_LENGTH = 180;

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function shorten(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length).trimEnd()}...` : text;
}

/**
 * Maps a stored event onto the sample detail view model, so a stored event uses
 * the same page design. Only stored values are used. Sections with no stored
 * counterpart (ticket tiers, speakers, prices) are hidden via `listingOnly`.
 */
export function toListingDetail(event: EventDetails): EventDetail {
  const level = levelStyle(event.eventLevel).label;
  const audience = audienceLabel(event.audience);
  const description = event.description?.trim() || 'No description has been added yet.';
  const firstDate = event.dates[0];
  const coverPath = event.bannerPath ?? event.imagePath;
  const image = coverPath ? `${API_BASE_URL}${coverPath}` : FALLBACK_EVENT_IMAGE;

  const days: EventDay[] = event.dates.map((slot, index) => ({
    id: `day-${index + 1}`,
    label: `Day ${index + 1}`,
    title: formatEventDate(slot.date),
    hours: slot.time,
    sessions: [
      {
        id: `session-${index + 1}`,
        time: slot.time.split(' - ')[0] ?? slot.time,
        stage: level,
        duration: slot.time,
        title: event.name,
        speaker: event.venue.name,
      },
    ],
  }));

  const addressLine = [event.venue.address, event.venue.city].filter(Boolean).join(', ');
  // The exact pin from the saved Google link beats a text search, which can
  // match a different place with the same name.
  const mapQuery =
    event.venue.coordinates ??
    [event.venue.name, event.venue.address, event.venue.city].filter(Boolean).join(' ');
  const googleLink =
    event.venue.link && WEB_URL.test(event.venue.link)
      ? event.venue.link
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  const links = event.links.filter((link) => WEB_URL.test(link.url));

  return {
    slug: String(event.id),
    title: event.name,
    subtitle: shorten(description, HERO_SUBTITLE_LENGTH),
    category: event.category,
    kind: event.category === 'TECHNOLOGY' ? 'tech' : 'music',
    status: level,
    verified: false,
    format: level,
    dateLine: firstDate ? formatEventDate(firstDate.date) : 'Date to be announced',
    dateRange: firstDate ? firstDate.time : 'To be announced',
    timezone: 'Event local time',
    locationLine: `${event.venue.name}, ${event.venue.city}`,
    heroImage: image,
    cardImage: image,
    priceFrom: 0,
    priceTo: 0,
    host: {
      name: event.organizer.name,
      tagline: `Organizer since ${event.organizer.memberSince}`,
      rating: 0,
      followers: '',
      pastEvents: 0,
      initials: initialsOf(event.organizer.name),
    },
    about: [description],
    highlights: [],
    tags: {
      topic: event.tags,
      format: [level],
      audience: [audience],
    },
    days,
    speakers: [],
    venue: {
      name: event.venue.name,
      address: addressLine,
      city: event.venue.city,
      entrance: '',
      shuttle: '',
      perks: [],
      mapQuery,
      googleLink,
    },
    tickets: [],
    requirements: '',
    related: [],
    listingOnly: true,
    links,
  };
}
