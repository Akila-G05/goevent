'use client';

import React, { useRef, useState } from 'react';
import { Clock, Plus } from 'lucide-react';
import type { EventDay } from '@/lib/sample-events';
import { toast } from '@/lib/toast-store';
import { SectionHeading } from './section-heading';

export function EventSchedule({ days, timezone }: { days: EventDay[]; timezone: string }) {
  const [activeDayId, setActiveDayId] = useState(days[0]?.id ?? '');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeDay = days.find((day) => day.id === activeDayId) ?? days[0];

  const focusTab = (index: number) => {
    const next = (index + days.length) % days.length;
    tabRefs.current[next]?.focus();
    setActiveDayId(days[next].id);
  };

  return (
    <section className="rounded-2xl border border-[#e5e2e1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)] sm:p-6">
      <SectionHeading title="Multi-day sessions & lineup" hint={timezone} />

      {/* Day tabs */}
      <div
        role="tablist"
        aria-label="Event schedule by day"
        className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3"
      >
        {days.map((day, index) => {
          const selected = day.id === activeDay?.id;
          return (
            <button
              key={day.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`day-tab-${day.id}`}
              aria-selected={selected}
              aria-controls={`day-panel-${day.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveDayId(day.id)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight') {
                  event.preventDefault();
                  focusTab(index + 1);
                }
                if (event.key === 'ArrowLeft') {
                  event.preventDefault();
                  focusTab(index - 1);
                }
              }}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                selected
                  ? 'border-[#1c1b1b] bg-[#1c1b1b] text-white shadow-md'
                  : 'border-[#e0dbd9] bg-[#f7f3f2] text-[#1c1b1b] hover:bg-[#ebe7e6]'
              }`}
            >
              <span className="block text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">
                {day.label}
              </span>
              <span className="mt-0.5 block text-sm font-semibold">{day.title}</span>
              <span
                className={`mt-0.5 block text-[11px] ${
                  selected ? 'text-white/70' : 'text-[#747878]'
                }`}
              >
                {day.hours}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sessions */}
      {activeDay && (
        <div
          role="tabpanel"
          id={`day-panel-${activeDay.id}`}
          aria-labelledby={`day-tab-${activeDay.id}`}
          className="mt-4 divide-y divide-[#eae6e5]"
        >
          {activeDay.sessions.map((session) => (
            <article
              key={session.id}
              className="flex flex-col gap-3 py-4 first:pt-1 sm:flex-row sm:items-start sm:gap-5"
            >
              <div className="flex w-full shrink-0 items-center gap-2 sm:w-28 sm:flex-col sm:items-start sm:gap-0.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#747878]">
                  Time
                </p>
                <p className="text-lg font-bold text-[#1c1b1b]">{session.time}</p>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-[#ebe7e6] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1c1b1b]">
                    {session.stage}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#e0dbd9] px-2.5 py-0.5 text-[10px] font-semibold text-[#747878]">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {session.duration}
                  </span>
                </div>
                <h4 className="mt-1.5 text-sm font-bold text-[#1c1b1b]">{session.title}</h4>
                <p className="mt-0.5 text-xs text-[#747878]">{session.speaker}</p>
              </div>

              <button
                type="button"
                onClick={() => toast.success(`Added “${session.title}” to your agenda.`)}
                className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-[#e0dbd9] px-3 py-1.5 text-[11px] font-semibold text-[#1c1b1b] transition-colors hover:border-[#1c1b1b] hover:bg-[#f7f3f2]"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add to agenda
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default EventSchedule;
