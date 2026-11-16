import { apiClient } from '@/lib/api-client';
import { API_ROUTES } from './routes';

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
