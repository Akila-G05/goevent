"use client";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { API_PREFIX } from "@/api/routes";
import { Csrf, adminError } from "@/api/admin";
import type { EventContent } from "@/api/coordinator";
export default function EventPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const event = useQuery({
    queryKey: ["public-event", id],
    queryFn: async () =>
      (
        await apiClient.get<{
          data: {
            id: number;
            name: string;
            description: string;
            content: string | null;
          };
        }>(`${API_PREFIX}/public-events/${id}`)
      ).data.data,
    retry: false,
  });
  useEffect(() => {
    if (!event.data) return;
    void (async () => {
      try {
        const csrf = (
          await apiClient.get<Csrf>(`${API_PREFIX}/public-events/csrf`)
        ).data;
        await apiClient.post(
          `${API_PREFIX}/public-events/${id}/impressions`,
          {},
          { headers: { [csrf.headerName]: csrf.token } },
        );
      } catch {
        /* Impression recording never blocks public reading. */
      }
    })();
  }, [id, event.data]);
  let content: Omit<EventContent, "approvalDocumentId"> | null = null;
  try {
    if (event.data?.content)
      content = JSON.parse(event.data.content) as Omit<
        EventContent,
        "approvalDocumentId"
      >;
  } catch {
    /* Preserve the approved legacy description when options are absent. */
  }
  return (
    <main className="min-h-screen bg-[#f7f5f4] px-6 pb-10 pt-28">
      <article className="mx-auto max-w-3xl space-y-5 rounded-2xl border bg-white p-8">
        {event.isPending ? (
          <p role="status">Loading event…</p>
        ) : event.error ? (
          <p role="alert">{adminError(event.error)}</p>
        ) : (
          <>
            <h1 className="font-display text-4xl">{event.data?.name}</h1>
            <p className="whitespace-pre-wrap">{event.data?.description}</p>
            {content && (
              <>
                {(content.bannerPath || content.imagePath) && (
                  // Approved public images use the configured storage or CDN URL.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={content.bannerPath || content.imagePath}
                    alt=""
                    className="w-full rounded-xl object-cover"
                  />
                )}
                <p>
                  {new Intl.DateTimeFormat("en-GB", {
                    dateStyle: "full",
                    timeStyle: "short",
                    timeZone: content.timezone,
                  }).format(new Date(content.startsAt))}{" "}
                  –{" "}
                  {new Intl.DateTimeFormat("en-GB", {
                    timeStyle: "short",
                    timeZone: content.timezone,
                  }).format(new Date(content.endsAt))}{" "}
                  ({content.timezone})
                </p>
                <p>
                  {content.venueName}, {content.venueCity}
                </p>
                {content.videoUrl && (
                  <a
                    className="underline"
                    href={content.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    External event video
                  </a>
                )}
                {content.packages.map((p, i) => (
                  <section className="rounded-xl border p-4" key={i}>
                    <h2 className="font-semibold">
                      {p.name} · {p.price} {content?.currency}
                    </h2>
                    <p>{p.benefits}</p>
                    <p>Configured quantity: {p.quantity}</p>
                  </section>
                ))}
                <p className="text-sm text-gray-600">
                  Ticket checkout and QR issuance are not available yet.
                </p>
              </>
            )}
          </>
        )}
      </article>
    </main>
  );
}
