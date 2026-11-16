"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  coordinatorApi,
  workspacePath,
  Workspace,
  Catalog,
  ApplicationRow,
  EventRow,
  EventDetail,
  EventContent,
  CampaignRow,
  Report,
  eventLocal,
} from "@/api/coordinator";
import { adminError } from "@/api/admin";
import { CreateEventModal } from "@/components/events/create-event-modal";
import { API_PREFIX } from "@/api/routes";
import { ApplicationForm, DateRange, control, button, card } from "./forms";
import { CoordinatorShell, type CoordinatorView } from "./workspace-shell";
import { CoordinatorOverview, EventBadge, eventSchedule } from "./overview";
export function CoordinatorDashboard() {
  const router = useRouter(),
    cache = useQueryClient();
  const [org, setOrg] = useState<number>(),
    [view, setView] = useState<CoordinatorView>("Overview"),
    [phase, setPhase] = useState("ALL"),
    [page, setPage] = useState(0);
  const [filterDates, setFilterDates] = useState(false);
  const [campaignPage, setCampaignPage] = useState(0);
  const [statisticsSelection, setStatisticsSelection] = useState<{
    organization: number;
    event: EventRow;
  }>();
  const [from, setFrom] = useState(
      new Date().toISOString().slice(0, 7) + "-01",
    ),
    [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [editor, setEditor] = useState<{
      id?: number;
      revision?: number;
      content?: EventContent;
    } | null>(null),
    [eventId, setEventId] = useState<number>();
  const eligibility = useQuery({
    queryKey: ["coordinator", "eligibility"],
    queryFn: () => coordinatorApi.get<Workspace[]>("eligibility"),
    retry: false,
  });
  const catalog = useQuery({
    queryKey: ["coordinator", "catalog"],
    queryFn: () => coordinatorApi.get<Catalog>("catalog"),
    enabled: !!eligibility.data,
  });
  const applications = useQuery({
    queryKey: ["coordinator", "applications", page],
    queryFn: () =>
      coordinatorApi.get<ApplicationRow[]>("applications", { page, size: 25 }),
    enabled: !!eligibility.data,
  });
  useEffect(() => {
    if ((eligibility.error as { status?: number })?.status === 401)
      router.replace("/login?returnTo=%2Fcoordinator");
  }, [eligibility.error, router]);
  useEffect(() => {
    if (
      eligibility.data &&
      !eligibility.data.some((w) => w.organization_id === org)
    ) {
      setOrg(eligibility.data[0]?.organization_id);
    }
  }, [eligibility.data, org]);
  const path = org ? workspacePath(org) : "";
  const endDate = Date.parse(`${to}T00:00:00Z`);
  const validRange =
    !!from &&
    !!to &&
    from <= to &&
    Number.isFinite(endDate) &&
    Number.isFinite(Date.parse(`${from}T00:00:00Z`));
  const range = {
    from: `${from}T00:00:00Z`,
    to: validRange ? new Date(endDate + 86400000).toISOString() : "",
  };
  const events = useQuery({
    queryKey: [
      "coordinator",
      "events",
      org,
      phase,
      page,
      from,
      to,
      view,
      filterDates,
    ],
    queryFn: () =>
      coordinatorApi.get<EventRow[]>(`${path}/events`, {
        phase: view === "Events" ? phase : "ALL",
        page,
        size: 25,
        ...(view === "Events" && filterDates ? range : {}),
      }),
    enabled:
      !!org &&
      !!eligibility.data &&
      (view !== "Events" || !filterDates || validRange),
    retry: false,
  });
  const statisticsEvent =
    statisticsSelection && statisticsSelection.organization === org
      ? statisticsSelection.event
      : undefined;
  const report = useQuery({
    queryKey: ["coordinator", "statistics", org, from, to, statisticsEvent?.id],
    queryFn: () =>
      coordinatorApi.get<Report>(`${path}/statistics`, {
        ...range,
        ...(statisticsEvent ? { eventId: statisticsEvent.id } : {}),
      }),
    enabled: !!org && view === "Overview" && validRange,
    retry: false,
  });
  const campaigns = useQuery({
    queryKey: ["coordinator", "campaigns", org, eventId, campaignPage],
    queryFn: () =>
      coordinatorApi.get<CampaignRow[]>(`${path}/events/${eventId}/campaigns`, {
        page: campaignPage,
        size: 25,
      }),
    enabled: !!org && !!eventId && view === "Participant emails",
    retry: false,
  });
  useEffect(() => {
    setCampaignPage(0);
  }, [org, eventId]);
  async function action(fn: () => Promise<unknown>, message: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      setNotice(message);
      await cache.invalidateQueries({ queryKey: ["coordinator"] });
    } catch (e) {
      setError(adminError(e));
    } finally {
      setBusy(false);
    }
  }
  async function edit(id: number) {
    await action(async () => {
      const event = await coordinatorApi.get<EventDetail>(
        `${path}/events/${id}`,
      );
      let content: EventContent | undefined;
      if (event.workingRevision) {
        content = JSON.parse(event.workingRevision.content) as EventContent;
        content.packages = content.packages.map((p) => ({
          ...p,
          saleStartsAt: eventLocal(p.saleStartsAt, content!.timezone),
          saleEndsAt: eventLocal(p.saleEndsAt, content!.timezone),
        }));
      }
      setEditor({ id, revision: event.revision, content });
    }, "");
  }
  async function save(content: EventContent) {
    if (editor?.id)
      await coordinatorApi.write("PUT", `${path}/events/${editor.id}`, {
        revision: editor.revision,
        content,
      });
    else await coordinatorApi.write("POST", `${path}/events`, content);
    setEditor(null);
    setNotice("Draft saved. Submit it for administrator review when ready.");
    await cache.invalidateQueries({ queryKey: ["coordinator"] });
  }
  if (eligibility.isPending)
    return (
      <main
        className="admin-app coordinator-app coordinator-gate"
        role="status"
      >
        Checking coordinator eligibility…
      </main>
    );
  if (eligibility.error)
    return (
      <main className="admin-app coordinator-app coordinator-gate">
        <p role="alert">{adminError(eligibility.error)}</p>
        <button className={button} onClick={() => eligibility.refetch()}>
          Retry eligibility check
        </button>
        <Link className="ml-4" href="/login?returnTo=%2Fcoordinator">
          Sign in
        </Link>
      </main>
    );
  return (
    <CoordinatorShell
      workspaces={eligibility.data || []}
      organization={org}
      view={view}
      busy={busy}
      canCreate={!!catalog.data}
      onOrganization={(id) => {
        setOrg(id);
        setPage(0);
        setEventId(undefined);
        setStatisticsSelection(undefined);
        setEditor(null);
        setError("");
        setNotice("");
      }}
      onView={(next) => {
        setView(next);
        setPage(0);
        setError("");
        setNotice("");
      }}
      onCreate={() => setEditor({})}
      onRefresh={() =>
        void cache.invalidateQueries({ queryKey: ["coordinator"] })
      }
    >
      <section className="coordinator-content">
        {!validRange &&
          (view === "Overview" || (view === "Events" && filterDates)) && (
            <p role="alert" className={card}>
              Choose valid, increasing date filters.
            </p>
          )}
        {error && (
          <p role="alert" className="admin-alert coordinator-notice">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="admin-notice coordinator-notice">
            {notice}
          </p>
        )}
        {!eligibility.data?.length && (
          <div className={card}>
            <h2 className="font-semibold">Request organization access</h2>
            <p className="mt-2 text-sm">
              Apply below. An administrator reviews your authorization for each
              organization separately.
            </p>
          </div>
        )}
        {(!org || view === "Organization access") && (
          <div className="coordinator-access-grid">
            <ApplicationForm
              catalog={catalog.data}
              busy={busy}
              onApply={(form) =>
                action(async () => {
                  const proof = form.get("proof") as File;
                  if (!proof?.size)
                    throw new Error("Authorization letter required.");
                  const proofId = await coordinatorApi.document(
                    proof,
                    "AUTHORIZATION",
                  );
                  await coordinatorApi.write("POST", "applications", {
                    organizationId: form.get("organizationId")
                      ? Number(form.get("organizationId"))
                      : null,
                    proposedName: form.get("proposedName") || null,
                    proposedTypeId: form.get("proposedTypeId")
                      ? Number(form.get("proposedTypeId"))
                      : null,
                    position: form.get("position"),
                    contactEmail: form.get("contactEmail"),
                    contactPhone: form.get("contactPhone"),
                    explanation: form.get("explanation"),
                    proofId,
                  });
                }, "Application submitted for review.")
              }
            />
            <div className={card}>
              <h2 className="font-display text-2xl">
                Organization access history
              </h2>
              {applications.isPending ? (
                <p role="status">Loading applications…</p>
              ) : applications.error ? (
                <p role="alert">{adminError(applications.error)}</p>
              ) : !applications.data?.length ? (
                <p className="mt-3 text-sm">No applications yet.</p>
              ) : (
                <ul className="divide-y">
                  {applications.data.map((a) => (
                    <li key={a.id} className="py-4 text-sm">
                      <strong>
                        {a.proposed_name ||
                          catalog.data?.organizations.find(
                            (o) => o.id === a.organization_id,
                          )?.name ||
                          `Organization ${a.organization_id}`}
                      </strong>
                      <p>
                        {a.revoked_at ||
                        (a.status_id === 2 &&
                          !eligibility.data?.some(
                            (workspace) =>
                              workspace.organization_id === a.organization_id,
                          ))
                          ? "Revoked"
                          : {
                              1: "Pending review",
                              2: "Approved",
                              3: "Rejected",
                            }[a.status_id] || "Unknown"}{" "}
                        · {a.position}
                      </p>
                      {a.decision_reason && (
                        <p>Review reason: {a.decision_reason}</p>
                      )}
                      {a.proof_id && (
                        <a
                          className="underline"
                          href={`${API_PREFIX}/coordinator/documents/${a.proof_id}`}
                        >
                          Download your private proof
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex justify-between">
                <button
                  className={button}
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous applications
                </button>
                <button
                  className={button}
                  disabled={applications.data?.length !== 25}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next applications
                </button>
              </div>
            </div>
          </div>
        )}
        {org && view === "Overview" && (
          <>
            <div className="admin-filters mb-0 flex flex-wrap items-end gap-3">
              <label>
                Event statistics
                <select
                  aria-label="Event statistics"
                  className={control}
                  value={statisticsEvent?.id || ""}
                  onChange={(event) => {
                    const selected = events.data?.find(
                      (item) => item.id === Number(event.target.value),
                    );
                    setStatisticsSelection(
                      selected
                        ? { organization: org, event: selected }
                        : undefined,
                    );
                  }}
                >
                  <option value="">All events</option>
                  {statisticsEvent &&
                    !events.data?.some(
                      (item) => item.id === statisticsEvent.id,
                    ) && (
                      <option value={statisticsEvent.id}>
                        {statisticsEvent.name}
                      </option>
                    )}
                  {events.data?.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </label>
              <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
              <span className="admin-sub">Inclusive dates, UTC</span>
              <div className="admin-tools">
                <button
                  type="button"
                  className="admin-btn"
                  aria-label="Previous statistics events"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous events
                </button>
                <button
                  type="button"
                  className="admin-btn"
                  aria-label="Next statistics events"
                  disabled={events.data?.length !== 25}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next events
                </button>
              </div>
            </div>
            {report.isPending ? (
              <p role="status">Loading recorded statistics…</p>
            ) : report.error ? (
              <p role="alert">{adminError(report.error)}</p>
            ) : (
              report.data && (
                <>
                  <p className="admin-sub">
                    {statisticsEvent
                      ? `Statistics for ${statisticsEvent.name}`
                      : "Statistics for all your events in this organization"}
                  </p>
                  <CoordinatorOverview
                    data={report.data}
                    events={events.data}
                    eventsPending={events.isPending}
                    eventsError={events.error}
                    eventPage={page}
                    onStatistics={(event) =>
                      setStatisticsSelection({ organization: org, event })
                    }
                    onEvents={() => {
                      setView("Events");
                      setPage(0);
                    }}
                    onCreate={() => setEditor({})}
                  />
                </>
              )
            )}
          </>
        )}
        {org && view === "Events" && (
          <>
            <div className="admin-filters mb-0 flex flex-wrap items-end gap-3">
              <label className="text-xs">
                State
                <select
                  className={`${control} block`}
                  value={phase}
                  onChange={(e) => {
                    setPhase(e.target.value);
                    setPage(0);
                  }}
                >
                  {[
                    "ALL",
                    "DRAFT",
                    "PENDING",
                    "REJECTED",
                    "UPCOMING",
                    "ONGOING",
                    "COMPLETED",
                    "CANCELLED",
                    "UNKNOWN",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={filterDates}
                  onChange={(e) => {
                    setFilterDates(e.target.checked);
                    setPage(0);
                  }}
                />
                Filter approved schedule by dates
              </label>
              <DateRange
                from={from}
                to={to}
                setFrom={(v) => {
                  setFrom(v);
                  setPage(0);
                }}
                setTo={(v) => {
                  setTo(v);
                  setPage(0);
                }}
              />
            </div>
            <p className="text-xs">
              Date filters use the approved schedule in UTC; drafts without an
              approved schedule are included.
            </p>
            {events.isPending ? (
              <p role="status">Loading events…</p>
            ) : events.error ? (
              <p role="alert">{adminError(events.error)}</p>
            ) : !events.data?.length ? (
              <p className={card}>
                No matching events. Save your first draft to get started.
              </p>
            ) : (
              events.data.map((e) => (
                <article
                  className={`${card} coordinator-event-card space-y-3`}
                  key={e.id}
                >
                  <div className="flex justify-between gap-4 coordinator-event-title">
                    <h2 className="font-display text-2xl">{e.name}</h2>
                    <EventBadge phase={e.phase} />
                  </div>
                  <p className="admin-sub">{eventSchedule(e)}</p>
                  <p className="admin-sub">
                    Proposed revision: {e.review_state || "No draft"} · Version{" "}
                    {e.revision}
                  </p>
                  {e.reason && (
                    <p className="text-sm">Review reason: {e.reason}</p>
                  )}
                  <div className="coordinator-event-actions flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={button}
                      onClick={() => {
                        setStatisticsSelection({ organization: org, event: e });
                        setView("Overview");
                        setPage(0);
                      }}
                    >
                      View statistics
                    </button>
                    <button
                      className={button}
                      disabled={
                        busy || !!e.disabled_at || e.review_state === "PENDING"
                      }
                      onClick={() => edit(e.id)}
                    >
                      Edit draft / proposed revision
                    </button>
                    <button
                      className={button}
                      disabled={
                        busy || e.review_state !== "DRAFT" || !!e.disabled_at
                      }
                      onClick={() =>
                        action(
                          () =>
                            coordinatorApi.write(
                              "POST",
                              `${path}/events/${e.id}/submit`,
                              { revision: e.revision },
                            ),
                          "Revision submitted. The approved version stays visible until a replacement is approved.",
                        )
                      }
                    >
                      Submit for review
                    </button>
                    <button
                      className={button}
                      disabled={busy}
                      onClick={() =>
                        action(
                          () => coordinatorApi.export(org, e.id),
                          "Attendee CSV exported.",
                        )
                      }
                    >
                      Export attendees CSV
                    </button>
                    <button
                      className={button}
                      onClick={() => {
                        setEventId(e.id);
                        setView("Participant emails");
                      }}
                    >
                      Participant emails
                    </button>
                    {!e.disabled_at && (
                      <button
                        className={button}
                        disabled={busy}
                        onClick={() => {
                          const reason = window.prompt(
                            "Required cancellation reason (bookings and payments are preserved):",
                          );
                          if (reason)
                            void action(
                              () =>
                                coordinatorApi.write(
                                  "POST",
                                  `${path}/events/${e.id}/cancel`,
                                  { revision: e.revision, reason },
                                ),
                              "Event cancelled; participant notice queued. No automatic refund was performed.",
                            );
                        }}
                      >
                        Cancel event
                      </button>
                    )}
                    {e.event_status_id === 4 && !e.published_revision_id && (
                      <button
                        className={button}
                        disabled={busy}
                        onClick={() => {
                          const reason = window.prompt(
                            "Permanently delete this unpublished draft? Enter a reason:",
                          );
                          if (reason)
                            void action(
                              () =>
                                coordinatorApi.write(
                                  "DELETE",
                                  `${path}/events/${e.id}`,
                                  { revision: e.revision, reason },
                                ),
                              "Draft deleted.",
                            );
                        }}
                      >
                        Delete draft
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
            <div className="flex justify-between">
              <button
                className={button}
                disabled={!page}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span>Page {page + 1}</span>
              <button
                className={button}
                disabled={events.data?.length !== 25}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
        {org && view === "Participant emails" && (
          <>
            <div className={card}>
              <label>
                Owned event
                <select
                  className={`${control} ml-3`}
                  value={eventId || ""}
                  onChange={(e) => setEventId(Number(e.target.value))}
                >
                  <option value="">Select an event</option>
                  {events.data?.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.timezone || "timezone unavailable"})
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-3 flex gap-3">
                <button
                  className={button}
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous events
                </button>
                <button
                  className={button}
                  disabled={events.data?.length !== 25}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next events
                </button>
              </div>
              <p className="mt-3 text-xs">
                Campaigns remain disabled until configuration review. Queued and
                ACS-accepted states do not mean inbox delivery. Scheduling uses
                the approved event timezone.
              </p>
            </div>
            {eventId && (
              <>
                <form
                  className={`${card} space-y-4`}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = new FormData(e.currentTarget);
                    void action(
                      () =>
                        coordinatorApi.write(
                          "POST",
                          `${path}/events/${eventId}/campaigns`,
                          {
                            subject: form.get("subject"),
                            message: form.get("message"),
                            scheduledLocal: form.get("schedule") || null,
                            confirm: form.get("confirm") === "on",
                          },
                        ),
                      "Participant campaign scheduled.",
                    );
                  }}
                >
                  <label className="block">
                    Subject
                    <input
                      name="subject"
                      className={`${control} block w-full`}
                      required
                      maxLength={200}
                    />
                  </label>
                  <label className="block">
                    Plain-text message
                    <textarea
                      name="message"
                      className={`${control} block w-full`}
                      required
                      maxLength={10000}
                      rows={5}
                    />
                  </label>
                  <label className="block">
                    Schedule in event timezone (leave blank for immediate)
                    <input
                      type="datetime-local"
                      name="schedule"
                      className={`${control} block`}
                    />
                  </label>
                  <label className="flex gap-2">
                    <input name="confirm" type="checkbox" required />I confirm
                    this message should be emailed to registered participants of
                    this event.
                  </label>
                  <button className={button} disabled={busy}>
                    Confirm campaign
                  </button>
                </form>
                {campaigns.isPending ? (
                  <p role="status">Loading campaigns…</p>
                ) : campaigns.error ? (
                  <p role="alert">{adminError(campaigns.error)}</p>
                ) : !campaigns.data?.length ? (
                  <p className={card}>No campaigns for this event.</p>
                ) : (
                  campaigns.data.map((c, i) => (
                    <article className={card} key={`${c.id}-${i}`}>
                      <strong>{c.subject}</strong>
                      <p>
                        {c.campaign_state} · {c.status || "Not dispatched"} ·{" "}
                        {c.recipients} recipient records
                      </p>
                      <p className="text-xs">
                        {c.scheduled_at} UTC · Event timezone:{" "}
                        {c.event_timezone}
                      </p>
                      {c.campaign_state === "SCHEDULED" && !c.system_notice && (
                        <button
                          disabled={busy}
                          className={button}
                          onClick={() =>
                            action(
                              () =>
                                coordinatorApi.write(
                                  "POST",
                                  `${path}/events/${eventId}/campaigns/${c.id}/cancel`,
                                  {},
                                ),
                              "Campaign cancelled before dispatch.",
                            )
                          }
                        >
                          Cancel campaign
                        </button>
                      )}
                    </article>
                  ))
                )}
                <div className="flex justify-between">
                  <button
                    className={button}
                    disabled={campaignPage === 0}
                    onClick={() => setCampaignPage((p) => p - 1)}
                  >
                    Previous campaigns
                  </button>
                  <button
                    className={button}
                    disabled={campaigns.data?.length !== 25}
                    onClick={() => setCampaignPage((p) => p + 1)}
                  >
                    Next campaigns
                  </button>
                </div>
              </>
            )}
          </>
        )}
        {catalog.error && <p role="alert">{adminError(catalog.error)}</p>}
      </section>
      {editor && catalog.data && (
        <CreateEventModal
          key={`${org}-${editor.id || "new"}-${editor.revision || 0}`}
          open
          onClose={() => setEditor(null)}
          catalog={catalog.data}
          initial={editor.content}
          onSave={save}
        />
      )}
    </CoordinatorShell>
  );
}
