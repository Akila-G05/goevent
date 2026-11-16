"use client";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Eye,
  Info,
  Ticket,
  Users,
} from "lucide-react";
import type { EventRow, Report } from "@/api/coordinator";
import { adminError } from "@/api/admin";
import { Records } from "./forms";

const phaseNames: Record<string, string> = {
  DRAFT: "Draft",
  PENDING: "Pending review",
  REJECTED: "Rejected",
  UPCOMING: "Upcoming",
  ONGOING: "Ongoing",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  UNKNOWN: "Schedule unavailable",
};
export function EventBadge({ phase }: { phase: string }) {
  const tone =
    phase === "PENDING"
      ? "amber"
      : ["REJECTED", "CANCELLED"].includes(phase)
        ? "red"
        : ["UPCOMING", "ONGOING"].includes(phase)
          ? "green"
          : "";
  return (
    <span className={`admin-badge ${tone}`}>{phaseNames[phase] || phase}</span>
  );
}
export function eventSchedule(event: EventRow): string {
  if (!event.starts_at) return "Schedule not published";
  const raw = event.starts_at.replace(" ", "T");
  const date = new Date(/[zZ]$|[+-]\d{2}:\d{2}$/.test(raw) ? raw : raw + "Z");
  if (!Number.isFinite(+date)) return "Schedule unavailable";
  const timezone = event.timezone || "UTC";
  try {
    return (
      new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
      }).format(date) + ` · ${timezone}`
    );
  } catch {
    return "Schedule unavailable";
  }
}
export function CoordinatorOverview({
  data,
  events,
  eventsPending,
  eventsError,
  onEvents,
  onCreate,
  onStatistics,
  eventPage,
}: {
  data: Report;
  events?: EventRow[];
  eventsPending: boolean;
  eventsError: unknown;
  onEvents: () => void;
  onCreate: () => void;
  onStatistics: (event: EventRow) => void;
  eventPage: number;
}) {
  const metrics = [
    {
      label: "Owned events",
      value: data.events,
      icon: CalendarDays,
      hint: "Across your event workspace",
    },
    {
      label: "Recorded bookings",
      value: data.bookings,
      icon: Users,
      hint: "Within the selected dates",
    },
    {
      label: "Booked ticket quantity",
      value: data.ticketQuantities?.booked_quantity ?? "Unavailable",
      icon: Ticket,
      hint: "Recorded quantities within the selected dates",
    },
    {
      label: "Measured impressions",
      value: data.impressions.measured ?? "Unavailable",
      icon: Eye,
      hint: "Recorded views within the selected dates",
    },
  ];
  return (
    <>
      <div className="coordinator-summary" aria-label="Workspace statistics">
        {metrics.map(({ label, value, icon: Icon, hint }) => (
          <article key={label} className="admin-kpi">
            <h2 className="coordinator-kpi-label">
              {label}
              <Icon size={17} aria-hidden="true" />
            </h2>
            <strong data-unavailable={value === "Unavailable"}>{value}</strong>
            <p className="admin-sub">{hint}</p>
          </article>
        ))}
      </div>
      <section className="admin-card coordinator-card">
        <div className="coordinator-section-heading">
          <div>
            <h2>Event status</h2>
            <p className="admin-sub">Current status of the selected events</p>
          </div>
        </div>
        {data.eventStates ? (
          <div className="coordinator-event-states">
            {Object.entries(phaseNames).map(([phase, label]) => (
              <div key={phase}>
                <span>{label}</span>
                <strong>
                  {data.eventStates.find((state) => state.phase === phase)
                    ?.count ?? 0}
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-sub">Event status statistics unavailable.</p>
        )}
        {!!data.ticketQuantities?.invalid_quantities && (
          <p className="admin-sub mt-4">
            {data.ticketQuantities.invalid_quantities} historical ticket
            quantities could not be included.
          </p>
        )}
      </section>
      <section className="admin-card coordinator-card">
        <div className="coordinator-section-heading">
          <div>
            <h2>Your events</h2>
            <p className="admin-sub">
              {eventPage === 0
                ? "Latest events in this organization"
                : `Events · Page ${eventPage + 1}`}
            </p>
          </div>
          <button type="button" className="admin-btn" onClick={onEvents}>
            View all
            <ArrowRight size={13} aria-hidden="true" />
          </button>
        </div>
        {eventsPending ? (
          <p role="status" className="admin-sub">
            Loading events…
          </p>
        ) : eventsError ? (
          <p role="alert">{adminError(eventsError)}</p>
        ) : !events?.length ? (
          <div className="coordinator-empty">
            <CalendarDays size={27} aria-hidden="true" />
            <strong>Start with your first event</strong>
            <p>
              Save a draft and send it for administrator review when it is
              ready.
            </p>
            <button type="button" className="admin-btn" onClick={onCreate}>
              Create a draft
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="coordinator-event-list">
            {events.slice(0, 4).map((event) => (
              <div className="coordinator-event-row" key={event.id}>
                <div>
                  <strong>{event.name}</strong>
                  <p className="admin-sub">{eventSchedule(event)}</p>
                </div>
                <div className="coordinator-event-row-actions">
                  <EventBadge phase={event.phase} />
                  <button
                    type="button"
                    className="admin-btn"
                    onClick={() => onStatistics(event)}
                    aria-label={`View statistics for ${event.name}`}
                  >
                    View statistics
                    <ArrowRight size={13} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <details className="admin-report coordinator-disclosure">
        <summary>
          <Info size={16} aria-hidden="true" />
          About these numbers
          <ChevronDown size={14} aria-hidden="true" />
        </summary>
        <div className="admin-report-content">
          <p>{data.notice}</p>
          <p className="mt-2">
            Bookings without a recorded date:{" "}
            {data.unavailableHistory.bookings_without_time}.
          </p>
        </div>
      </details>
      <Records
        title="Recorded payment amounts"
        rows={data.payments}
        defaultOpen
        description="Paid and refunded amounts reflect recorded payment states, grouped by currency. Net recorded totals are unavailable without a refund ledger."
      />
      <Records title="Recorded package bookings" rows={data.packages} />
    </>
  );
}
