import { csrfHeaders } from './csrf';
import { apiClient } from '@/lib/api-client';
import { API_ROUTES } from './routes';

/** Public card data for an approved event, as returned by `GET /events`. */
export interface EventSummary {
  id: number;
  name: string;
  description: string | null;
  category: string;
  /** `UNIVERSITY`, `PUBLIC` or `BOTH` - who may join. */
  audience: string;
  /** `LISTING_ONLY`, `FREE` or `PAYED`. */
  eventLevel: string;
  venueName: string;
  venueCity: string;
  /** Path under the API prefix, or null when no cover image was uploaded. */
  imagePath: string | null;
  /** Next upcoming date, `yyyy-MM-dd`. */
  startsOn: string;
  /** `HH:mm - HH:mm`. */
  timeRange: string;
}

/** Ordering for `eventsApi.list`: earliest date first, latest first, or random. */
export type EventSort = 'asc' | 'desc' | 'random' | 'name';

/** Criteria for the events page. Empty values mean "no restriction". */
export interface EventSearchCriteria {
  query?: string;
  category?: string;
  audience?: string;
  /** Matches events that have any of these tag names. */
  tags?: string[];
}

/** Values offered by the events-page filter, as stored by the backend. */
export interface EventFilterOptions {
  categories: string[];
  audiences: string[];
  tags: string[];
}

interface EventListResponse {
  status: boolean;
  events: EventSummary[];
}

/** Public detail of one approved event, as returned by `GET /events/{id}`. */
export interface EventDetails {
  revision?: number;
  id: number;
  name: string;
  description: string | null;
  category: string;
  audience: string;
  eventLevel: string;
  venue: {
    name: string;
    address: string | null;
    city: string;
    link: string | null;
    /** `latitude,longitude` resolved from the saved Google link, or null. */
    coordinates: string | null;
  };
  organizer: {
    name: string;
    memberSince: string;
  };
  imagePath: string | null;
  bannerPath: string | null;
  /** Every scheduled occurrence, earliest first. */
  dates: { date: string; time: string }[];
  links: { name: string; url: string }[];
  tags: string[];
}

interface EventDetailResponse {
  status: boolean;
  event: EventDetails;
}

/** One external link published with the event (link + event_has_links). */
export interface CreateEventLink {
  name: string;
  url: string;
}

/**
 * One occurrence of the event.
 *
 * The organizer enters a start and an end time. The backend joins them into the
 * single `"HH:mm - HH:mm"` value stored in `event_dates.time`, so the client
 * only ever sends the two clock values separately.
 */
export interface CreateEventDate {
  /** ISO date, `yyyy-MM-dd`. */
  date: string;
  /** 24-hour clock, `HH:mm`. */
  startTime: string;
  /** 24-hour clock, `HH:mm`; must be after {@link startTime}. */
  endTime: string;
}

export interface CreateEventVenue {
  name: string;
  city: string;
  address?: string;
  link?: string;
}

export interface CreateEventPayload {
  revision?: number;
  name: string;
  description?: string;
  categoryName: string;
  audienceName: string;
  /** 1 = LISTING_ONLY. Free (2) and paid (3) are rejected until they exist. */
  eventLevelId: number;
  venue: CreateEventVenue;
  links: CreateEventLink[];
  dates: CreateEventDate[];
  /** Tag names; the server resolves them case-insensitively and ignores unknown ones. */
  tags: string[];
}

export interface CreateEventResponse {
  status: boolean;
  id?: number;
  message?: string;
}

/** Result of the multipart image upload for an existing event. */
export interface UploadEventImageResponse {
  status: boolean;
  imagePath?: string;
  bannerPath?: string;
  message?: string;
}

/** One of the organizer's own events, in any review state. */
export interface OwnedEvent {
  id: number;
  name: string;
  category: string;
  audience: string;
  /** `LISTING_ONLY`, `FREE` or `PAYED`. */
  eventLevel: string;
  /** `PENDING`, `APPROVED`, `REJECTED` or `DRAFT`. */
  status: string;
  venueName: string;
  venueCity: string;
  imagePath: string | null;
  /** Earliest scheduled date, `yyyy-MM-dd`; null when no date is stored. */
  startsOn: string | null;
  timeRange: string | null;
}

export const eventsApi = {
  /** Every upcoming date reserved by an approved event, as `yyyy-MM-dd`. */
  reservedDates: async (): Promise<string[]> => {
    const response = await apiClient.get<{ status: boolean; dates: string[] }>(API_ROUTES.EVENTS.CALENDAR);

    return response.data.dates;
  },

  /** The signed-in organizer's events, every review state, for the profile page. */
  mine: async (): Promise<OwnedEvent[]> => {
    const response = await apiClient.get<{ status: boolean; events: OwnedEvent[] }>(API_ROUTES.EVENTS.MINE);

    return response.data.events;
  },

  /** Full detail of one of the organizer's events, used to prefill the edit form. */
  mineDetail: async (id: number): Promise<EventDetails> => {
    const response = await apiClient.get<EventDetailResponse>(API_ROUTES.EVENTS.MINE_DETAIL(id));

    return response.data.event;
  },

  /** Replaces an event's listing details. The server checks ownership and keeps the review status. */
  update: async (id: number, payload: CreateEventPayload): Promise<CreateEventResponse> => {
    const response = await apiClient.put<CreateEventResponse>(API_ROUTES.EVENTS.DETAIL(id), payload, {headers:await csrfHeaders()});

    return response.data;
  },

  /** One approved event for the detail page. Rejects with a 404 for unknown or unapproved events. */
  detail: async (id: number): Promise<EventDetails> => {
    const response = await apiClient.get<EventDetailResponse>(API_ROUTES.EVENTS.DETAIL(id));

    return response.data.event;
  },

  /** Approved events with an upcoming date, for the home page. */
  /** Approved events matching the events-page criteria, ordered by `sort`. */
  search: async (criteria: EventSearchCriteria, sort: EventSort, limit = 50): Promise<EventSummary[]> => {
    const params = new URLSearchParams({ limit: String(limit), sort });

    if (criteria.query) {
      params.set('q', criteria.query);
    }

    if (criteria.category) {
      params.set('category', criteria.category);
    }

    if (criteria.audience) {
      params.set('audience', criteria.audience);
    }

    for (const tag of criteria.tags ?? []) {
      params.append('tag', tag);
    }

    const response = await apiClient.get<EventListResponse>(`${API_ROUTES.EVENTS.LIST}?${params.toString()}`);

    return response.data.events;
  },

  /** The signed-in user's saved events. Rejects with 401 when signed out. */
  saved: async (): Promise<EventSummary[]> => {
    const response = await apiClient.get<EventListResponse>(API_ROUTES.EVENTS.SAVED);

    return response.data.events;
  },

  save: async (id: number): Promise<void> => {
    await apiClient.post(API_ROUTES.EVENTS.SAVE(id), undefined, {headers:await csrfHeaders()});
  },

  unsave: async (id: number): Promise<void> => {
    await apiClient.delete(API_ROUTES.EVENTS.SAVE(id), {headers:await csrfHeaders()});
  },

  /** Category, audience and tag options for the events-page filter. */
  filters: async (): Promise<EventFilterOptions> => {
    const response = await apiClient.get<{ status: boolean; options: EventFilterOptions }>(
      API_ROUTES.EVENTS.FILTERS
    );

    return response.data.options;
  },

  list: async (limit = 24, sort: EventSort = 'asc'): Promise<EventSummary[]> => {
    const response = await apiClient.get<EventListResponse>(API_ROUTES.EVENTS.LIST, {
      params: { limit, sort },
    });

    return response.data.events;
  },

  /**
   * Home-page browsing list. A signed-in student gets events from their
   * university; everyone else gets a random selection. The server decides.
   */
  recommended: async (limit = 6): Promise<EventSummary[]> => {
    const response = await apiClient.get<EventListResponse>(API_ROUTES.EVENTS.RECOMMENDED, {
      params: { limit },
    });

    return response.data.events;
  },

  /**
   * Register a listing-only event. The owner comes from the session cookie, so
   * no user id is sent from the browser.
   */
  create: async (payload: CreateEventPayload): Promise<CreateEventResponse> => {
    const response = await apiClient.post<CreateEventResponse>(
      API_ROUTES.EVENTS.CREATE,
      payload,
      {headers:await csrfHeaders()}
    );

    return response.data;
  },

  /**
   * Upload the event's cover image (and an optional banner) once the event id
   * exists. The server stores the file and points `event.img_id` at it.
   */
  uploadImage: async (
    id: number,
    file: File,
    banner?: File
  ): Promise<UploadEventImageResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    if (banner) {
      formData.append('banner', banner);
    }

    const response = await apiClient.post<UploadEventImageResponse>(
      API_ROUTES.EVENTS.IMAGE(id),
      formData,
      { headers: { ...await csrfHeaders(), 'Content-Type': 'multipart/form-data' } }
    );

    return response.data;
  },
};
