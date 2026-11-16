'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { eventsApi, type EventSearchCriteria, type EventSort } from '@/api/events';
import { EventCard } from '@/components/events/event-card';
import { Footer } from '@/components/shared/footer';
import { audienceLabel } from '@/lib/event-labels';
import type { EventOrder } from '@/lib/event-sort';

const SORT_TO_API: Record<EventOrder, EventSort> = {
  newest: 'desc',
  oldest: 'asc',
  name: 'name',
};

const SORT_LABELS: Record<EventOrder, string> = {
  newest: 'Date: newest first',
  oldest: 'Date: oldest first',
  name: 'Name A-Z',
};

const inputClass =
  'w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-black';

function parseOrder(value: string | null): EventOrder {
  return value === 'oldest' || value === 'name' ? value : 'newest';
}

/** `TECHNOLOGY` -> `Technology`, for the filter labels. */
function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default function EventsPage() {
  return (
    <>
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <EventsBrowser />
      </Suspense>
      <Footer />
    </>
  );
}

function EventsBrowser() {
  const params = useSearchParams();
  const [query, setQuery] = useState(() => params.get('q') ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [sort, setSort] = useState<EventOrder>(() => parseOrder(params.get('sort')));
  const [category, setCategory] = useState('');
  const [audience, setAudience] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!filtersOpen) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFiltersOpen(false);
      }
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [filtersOpen]);

  const optionsQuery = useQuery({
    queryKey: ['events', 'filters'],
    queryFn: () => eventsApi.filters(),
  });

  const criteria: EventSearchCriteria = {
    query: debouncedQuery.trim() || undefined,
    category: category || undefined,
    audience: audience || undefined,
    tags,
  };

  const eventsQuery = useQuery({
    queryKey: ['events', 'search', criteria, sort],
    queryFn: () => eventsApi.search(criteria, SORT_TO_API[sort]),
  });

  const toggleTag = (tag: string) =>
    setTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));

  const clearFilters = () => {
    setQuery('');
    setDebouncedQuery('');
    setSort('newest');
    setCategory('');
    setAudience('');
    setTags([]);
  };

  const activeCount =
    (query.trim() ? 1 : 0) + (category ? 1 : 0) + (audience ? 1 : 0) + tags.length + (sort !== 'newest' ? 1 : 0);

  return (
    <main className="min-h-screen bg-[#f8f9fa] pb-16 pt-24 text-black">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 pb-6">
          <h1 className="font-display text-5xl uppercase tracking-tight sm:text-6xl">All events</h1>

          <div className="flex items-center gap-4">
            {eventsQuery.isSuccess && (
              <p className="text-sm text-zinc-500" aria-live="polite">
                {eventsQuery.data.length} {eventsQuery.data.length === 1 ? 'event' : 'events'}
              </p>
            )}
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-expanded={filtersOpen}
              aria-controls="event-filters"
              className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filters
              {activeCount > 0 && (
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-black">{activeCount}</span>
              )}
            </button>
          </div>
        </header>

        {filtersOpen && (
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setFiltersOpen(false)} aria-hidden="true" />
        )}

        <aside
          id="event-filters"
          aria-label="Event filters"
          aria-hidden={!filtersOpen}
          className={`fixed left-0 top-0 z-50 flex h-full w-[min(22rem,90vw)] flex-col gap-5 overflow-y-auto bg-white p-6 shadow-2xl transition-transform duration-300 ease-out ${
            filtersOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl uppercase tracking-wide">Filters</h2>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              aria-label="Close filters"
              className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-black"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by event, category, venue"
              aria-label="Search events"
              className={`${inputClass} pl-11`}
            />
          </div>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-600">
            Sort by
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as EventOrder)}
              className={inputClass}
            >
              {(Object.keys(SORT_LABELS) as EventOrder[]).map((option) => (
                <option key={option} value={option}>
                  {SORT_LABELS[option]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-600">
            Category
            <select value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass}>
              <option value="">All categories</option>
              {optionsQuery.data?.categories.map((value) => (
                <option key={value} value={value}>
                  {titleCase(value)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-600">
            Audience
            <select value={audience} onChange={(event) => setAudience(event.target.value)} className={inputClass}>
              <option value="">Any audience</option>
              {optionsQuery.data?.audiences.map((value) => (
                <option key={value} value={value}>
                  {audienceLabel(value)}
                </option>
              ))}
            </select>
          </label>

          {optionsQuery.data && optionsQuery.data.tags.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500">Tags</legend>
              <div className="flex flex-wrap gap-2">
                {optionsQuery.data.tags.map((tag) => {
                  const selected = tags.includes(tag);

                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleTag(tag)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        selected ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-zinc-200 pt-4">
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-zinc-600 underline underline-offset-4 hover:text-black"
            >
              Clear filters
            </button>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="rounded-full bg-black px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"
            >
              Show events
            </button>
          </div>
        </aside>

        <section className="mt-8" aria-label="Results">
          {eventsQuery.isPending && <p role="status" className="text-sm text-zinc-500">Loading events...</p>}

          {eventsQuery.isError && (
            <div role="alert" className="flex flex-wrap items-center gap-4 text-sm text-red-600">
              <span>Events could not be loaded.</span>
              <button
                type="button"
                onClick={() => eventsQuery.refetch()}
                className="font-semibold text-black underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          )}

          {eventsQuery.isSuccess && eventsQuery.data.length === 0 && (
            <p className="text-sm text-zinc-500">No events match these filters.</p>
          )}

          {eventsQuery.isSuccess && eventsQuery.data.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {eventsQuery.data.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
