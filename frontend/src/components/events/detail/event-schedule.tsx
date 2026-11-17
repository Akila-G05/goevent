'use client';

import React, { useRef, useState } from 'react';
import { Clock } from 'lucide-react';
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
    <section className="flex flex-col gap-4">
      <SectionHeading
        title="Multi-day sessions & lineup"
        action={
          <span className="rounded-full bg-[#ebe7e6] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#1c1b1b]">
            {timezone}
          </span>
        }
      />

      <div className="rounded-xl bg-white p-6 shadow-sm">
        {/* Day tabs */}
        <div
          role="tablist"
          aria-label="Event schedule by day"
          className="mb-5 grid grid-cols-1 gap-2 md:grid-cols-3"
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
                className={`rounded-xl p-4 text-left transition-all ${
                  selected
                    ? 'bg-[#000000] text-white shadow-md'
                    : 'bg-[#f7f3f2] text-[#1c1b1b] hover:bg-[#ebe7e6]'
                }`}
              >
                <span
                  className={`block text-[11px] font-bold uppercase tracking-wider ${
                    selected ? 'text-[#c4c7c7]' : 'text-[#575f67]'
                  }`}
                >
                  {day.label}
                </span>
                <span className="mt-1 block text-sm font-semibold">{day.title}</span>
                <span className={`mt-1 block text-xs ${selected ? 'text-[#e5e2e1]' : 'text-[#575f67]'}`}>
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
            className="space-y-3"
          >
            {activeDay.sessions.map((session, index) => (
              <article
                key={session.id}
                className="flex flex-col gap-4 rounded-xl bg-[#f7f3f2] p-4 transition-colors hover:bg-[#f1edec] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-[#e5e2e1]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#575f67]">Time</span>
                    <span className="text-base font-semibold text-[#111111]">{session.time}</span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          index === 0 ? 'bg-[#000000] text-white' : 'bg-[#e5e2e1] text-[#1c1b1b]'
                        }`}
                      >
                        {session.stage}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-[#575f67]">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {session.duration}
                      </span>
                    </div>
                    <h4 className="mt-1 text-sm font-semibold text-[#1c1b1b]">{session.title}</h4>
                    <p className="mt-0.5 text-xs text-[#575f67]">{session.speaker}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toast.success(`Added "${session.title}" to your agenda.`)}
                  className="shrink-0 self-start rounded-full bg-[#fdf8f8] px-4 py-2 text-xs font-semibold text-[#111111] shadow-sm transition-colors hover:bg-[#ebe7e6] sm:self-center"
                >
                  Add to agenda
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default EventSchedule;
