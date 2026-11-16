import { apiClient } from "@/lib/api-client";
import { API_PREFIX } from "./routes";
import type { Csrf } from "./admin";
export interface Workspace {
  id: number;
  organization_id: number;
  name: string;
  position: string;
}
export interface Lookup {
  id: number;
  name?: string;
  type?: string;
}
export interface Catalog {
  categories: Lookup[];
  organizationTypes: Lookup[];
  universities: Lookup[];
  organizations: Lookup[];
}
export interface EventPackage {
  name: string;
  benefits: string;
  quantity: number;
  price: string;
  saleStartsAt: string;
  saleEndsAt: string;
  universityIds: number[];
}
export interface EventContent {
  name: string;
  description: string;
  categoryId: number;
  audienceId: number;
  eventLevelId: number;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  timezone: string;
  startsAt: string;
  endsAt: string;
  imagePath: string;
  bannerPath: string;
  videoUrl: string;
  approvalDocumentId?: number;
  confirmationMessage: string;
  currency: string;
  packages: EventPackage[];
  universityIds: number[];
  minimumAge: number;
  bookingLimit: number;
  qrIntended: boolean;
}
export interface EventRow {
  timezone: string | null;
  id: number;
  name: string;
  revision: number;
  phase: string;
  review_state: string | null;
  reason: string | null;
  starts_at: string | null;
  ends_at: string | null;
  disabled_at: string | null;
  published_revision_id: number | null;
  working_revision_id: number | null;
  event_status_id: number;
}
export interface EventDetail extends EventRow {
  workingRevision: { id: number; content: string; review_state: string } | null;
}
export interface ApplicationRow {
  id: number;
  organization_id: number | null;
  proposed_name: string | null;
  position: string;
  status_id: number;
  decision_reason: string | null;
  revoked_at: string | null;
  proof_id: number | null;
}
export interface CampaignRow {
  id: number;
  subject: string;
  scheduled_at: string;
  event_timezone: string;
  campaign_state: string;
  status: string | null;
  recipients: number;
  system_notice: boolean;
}
export interface Report {
  selectedEventId: number | null;
  eventStates: { phase: string; count: number }[];
  ticketQuantities: {
    booked_quantity: string | null;
    invalid_quantities: number;
  };
  events: number;
  bookings: number;
  impressions: { measured: number | null };
  packages: Record<string, string | number | null>[];
  payments: Record<string, string | number | null>[];
  unavailableHistory: { bookings_without_time: number };
  notice: string;
}
const base = `${API_PREFIX}/coordinator`;
export const workspacePath = (org: number) => `workspaces/${org}`;
export const coordinatorApi = {
  async get<T>(path: string, params?: Record<string, string | number>) {
    return (
      await apiClient.get<{ status: boolean; data: T }>(`${base}/${path}`, {
        params,
      })
    ).data.data;
  },
  async write<T = unknown>(
    method: "POST" | "PUT" | "DELETE",
    path: string,
    body: unknown,
  ) {
    const csrf = (await apiClient.get<Csrf>(`${base}/csrf`)).data;
    return (
      await apiClient.request<{ status: boolean; data: T }>({
        method,
        url: `${base}/${path}`,
        data: body,
        headers: { [csrf.headerName]: csrf.token },
      })
    ).data.data;
  },
  async document(file: File, purpose: "AUTHORIZATION" | "EVENT") {
    const csrf = (await apiClient.get<Csrf>(`${base}/csrf`)).data;
    const data = new FormData();
    data.append("file", file);
    data.append("purpose", purpose);
    return (
      await apiClient.post<{ data: { id: number } }>(
        `${base}/documents`,
        data,
        {
          headers: { "Content-Type": undefined, [csrf.headerName]: csrf.token },
        },
      )
    ).data.data.id;
  },
  async image(file: File, kind: "event" | "banner") {
    const csrf = (await apiClient.get<Csrf>(`${base}/csrf`)).data;
    const data = new FormData();
    data.append("file", file);
    data.append("kind", kind);
    return (
      await apiClient.post<{ data: { path: string } }>(`${base}/images`, data, {
        headers: { "Content-Type": undefined, [csrf.headerName]: csrf.token },
      })
    ).data.data.path;
  },
  async export(org: number, event: number) {
    const response = await apiClient.get(
      `${base}/${workspacePath(org)}/events/${event}/attendees.csv`,
      { responseType: "blob" },
    );
    const url = URL.createObjectURL(response.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendees-${event}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
/** Resolve event-local input with Intl; reject DST gaps and overlaps instead of guessing. */
export function zonedInstant(local: string, timezone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))
    throw new Error("Select a valid date and time.");
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const wall = Date.parse(`${local}:00Z`);
  const candidates: number[] = [];
  for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) {
    const candidate = wall - offset * 60000;
    if (formatter.format(new Date(candidate)).replace(" ", "T") === local)
      candidates.push(candidate);
  }
  if (candidates.length !== 1)
    throw new Error(
      "This date/time is invalid or ambiguous in the event timezone. Choose another time.",
    );
  return new Date(candidates[0]).toISOString();
}
export function eventLocal(value: string, timezone: string): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date(value))
    .replace(" ", "T");
}
