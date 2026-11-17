'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { eventsApi } from '@/api/events';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface Cell {
  date: Date;
  inMonth: boolean;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Local calendar date as `yyyy-MM-dd`, the format the server returns. */
function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Six full weeks starting on the Sunday before the 1st, so the grid is always the same height. */
function buildCells(year: number, month: number): Cell[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return { date, inMonth: date.getMonth() === month };
  });
}

/**
 * Month calendar for today. Days that another approved event reserves are
 * marked with a dot. The clock and "today" are read on the client only, so the
 * server render never disagrees with the browser.
 */
export function EventCalendar() {
  const [now, setNow] = useState<Date | null>(null);
  const [view, setView] = useState<{ year: number; month: number } | null>(null);

  const reservedQuery = useQuery({
    queryKey: ['events', 'calendar'],
    queryFn: () => eventsApi.reservedDates(),
  });

  useEffect(() => {
    const first = new Date();
    setNow(first);
    setView({ year: first.getFullYear(), month: first.getMonth() });

    const timer = setInterval(() => setNow(new Date()), 1000);

    return () => clearInterval(timer);
  }, []);

  const reserved = useMemo(() => new Set(reservedQuery.data ?? []), [reservedQuery.data]);

  if (!now || !view) {
    return (
      <section className="rounded-2xl border border-[#eae6e5] bg-white p-5 shadow-sm">
        <p className="text-sm text-[#736e6c]">Loading calendar…</p>
      </section>
    );
  }

  const cells = buildCells(view.year, view.month);
  const todayKey = dateKey(now);
  const monthTitle = new Date(view.year, view.month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const headline = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const clock = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const reservedThisMonth = cells.filter((cell) => cell.inMonth && reserved.has(dateKey(cell.date))).length;

  const shiftMonth = (delta: number) =>
    setView((current) => {
      const base = current ?? { year: now.getFullYear(), month: now.getMonth() };
      const next = new Date(base.year, base.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  return (
    <section aria-label="Calendar" className="rounded-2xl border border-[#eae6e5] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[#eae6e5] pb-3">
        <p className="text-sm font-semibold text-[#1c1b1b]">{headline}</p>
        <p className="font-mono text-xs tabular-nums text-[#736e6c]">{clock}</p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="font-display text-xl uppercase tracking-wide text-[#1c1b1b]">{monthTitle}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#1c1b1b] transition-colors hover:bg-[#f5f2f1]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#1c1b1b] transition-colors hover:bg-[#f5f2f1]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((day) => (
          <span key={day} className="py-1 text-[11px] font-semibold text-[#736e6c]">
            {day}
          </span>
        ))}

        {cells.map((cell) => {
          const key = dateKey(cell.date);
          const isToday = key === todayKey;
          const isReserved = reserved.has(key);

          return (
            <div key={key} className="flex flex-col items-center py-0.5">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm tabular-nums ${
                  isToday
                    ? 'bg-[#e4572e] font-bold text-white'
                    : cell.inMonth
                      ? 'text-[#1c1b1b]'
                      : 'text-[#c4bfbd]'
                }`}
                aria-label={isReserved ? `${cell.date.getDate()}, reserved by an event` : undefined}
              >
                {cell.date.getDate()}
              </span>
              <span
                className={`mt-0.5 h-1 w-1 rounded-full ${
                  isReserved ? (cell.inMonth ? 'bg-[#1c1b1b]' : 'bg-[#c4bfbd]') : 'bg-transparent'
                }`}
              />
            </div>
          );
        })}
      </div>

      <p className="mt-4 flex items-center gap-2 border-t border-[#eae6e5] pt-3 text-xs text-[#736e6c]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#1c1b1b]" aria-hidden="true" />
        {reservedThisMonth} {reservedThisMonth === 1 ? 'day' : 'days'} reserved by events this month
      </p>
    </section>
  );
}

export default EventCalendar;
