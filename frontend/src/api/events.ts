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

interface EventListResponse {
  status: boolean;
  events: EventSummary[];
}

/** Public detail of one approved event, as returned by `GET /events/{id}`. */
export interface EventDetails {
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

export const eventsApi = {
  /** One approved event for the detail page. Rejects with a 404 for unknown or unapproved events. */
  detail: async (id: number): Promise<EventDetails> => {
    const response = await apiClient.get<EventDetailResponse>(API_ROUTES.EVENTS.DETAIL(id));

    return response.data.event;
  },

  /** Approved events with an upcoming date, for the home page. */
  list: async (limit = 24): Promise<EventSummary[]> => {
    const response = await apiClient.get<EventListResponse>(API_ROUTES.EVENTS.LIST, {
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
      payload
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
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );

    return response.data;
  },
};
