'use client';

import React from 'react';
import { BadgeCheck, Plus, Star } from 'lucide-react';
import type { EventHost } from '@/lib/sample-events';
import { toast } from '@/lib/toast-store';

/**
 * `compact` shows the organizer details only: no rating, follower count or
 * buttons. Stored events use it because they have no such data.
 */
export function EventHostCard({ host, compact = false }: { host: EventHost; compact?: boolean }) {
  return (
    <section className="flex flex-col justify-between gap-4 rounded-xl bg-white p-5 shadow-sm sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#1c1b1b] font-display text-2xl tracking-wider text-white shadow-inner">
          {host.initials}
        </span>
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-semibold text-[#1c1b1b]">{host.name}</h2>
            {!compact && <BadgeCheck className="h-4 w-4 text-[#1c1b1b]" aria-label="Verified organiser" />}
          </div>
          <p className="mt-0.5 text-sm text-[#575f67]">
            {host.tagline}
            {!compact && host.pastEvents > 0 && ` • ${host.pastEvents} Past Events`}
          </p>
          {!compact && (
            <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-[#747878]">
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                {host.rating.toFixed(2)} Organizer Rating
              </span>
              <span aria-hidden="true">•</span>
              <span>{host.followers} followers</span>
            </div>
          )}
        </div>
      </div>

      {!compact && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toast.info(`Message sent to ${host.name}.`)}
            className="rounded-full bg-[#ebe7e6] px-4 py-2 text-xs font-semibold text-[#1c1b1b] transition-colors hover:bg-[#e5e2e1]"
          >
            Contact Host
          </button>
          <button
            type="button"
            onClick={() => toast.success(`Following ${host.name}.`)}
            className="inline-flex items-center gap-1 rounded-full bg-[#000000] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#1c1b1b]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Follow
          </button>
        </div>
      )}
    </section>
  );
}

export default EventHostCard;
