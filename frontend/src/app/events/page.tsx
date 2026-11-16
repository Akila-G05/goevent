"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { API_PREFIX } from "@/api/routes";
import { adminError } from "@/api/admin";
export default function Events() {
  const [page, setPage] = useState(0);
  const events = useQuery({
    queryKey: ["public-events", page],
    queryFn: async () =>
      (
        await apiClient.get<{
          data: { id: number; name: string; description: string }[];
        }>(`${API_PREFIX}/public-events`, { params: { page, size: 25 } })
      ).data.data,
    retry: false,
  });
  return (
    <main className="min-h-screen bg-[#f7f5f4] px-6 pb-10 pt-28">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex justify-between">
          <h1 className="font-display text-4xl">Published events</h1>
          <Link
            href="/coordinator"
            className="rounded-full bg-black px-5 py-3 text-white"
          >
            Create Event
          </Link>
        </header>
        {events.isPending ? (
          <p role="status">Loading events…</p>
        ) : events.error ? (
          <p role="alert">{adminError(events.error)}</p>
        ) : !events.data?.length ? (
          <p>No published events yet.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {events.data.map((e) => (
              <li key={e.id} className="rounded-2xl border bg-white p-6">
                <Link
                  className="font-display text-2xl underline"
                  href={`/events/${e.id}`}
                >
                  {e.name}
                </Link>
                <p className="mt-2 line-clamp-3 text-sm">{e.description}</p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex justify-between">
          <button disabled={!page} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>Page {page + 1}</span>
          <button
            disabled={events.data?.length !== 25}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </main>
  );
}
