'use client';

import React from 'react';
import { BadgeCheck, MessageCircle, Plus, Star, Users } from 'lucide-react';
import type { EventHost } from '@/lib/sample-events';
import { toast } from '@/lib/toast-store';

export function EventHostCard({ host }: { host: EventHost }) {
  return (
    <section className="rounded-2xl border border-[#e5e2e1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#1c1b1b] font-display text-xl text-white">
            {host.initials}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="text-sm font-bold text-[#1c1b1b]">{host.name}</h2>
              <BadgeCheck className="h-4 w-4 text-[#1c1b1b]" aria-label="Verified organiser" />
            </div>
            <p className="text-xs text-[#747878]">{host.tagline}</p>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-[#444748]">
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                {host.rating.toFixed(2)} organiser rating
              </span>
              <span aria-hidden="true" className="text-[#c4c7c7]">|</span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {host.followers} followers
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toast.info('Organiser chat is coming with the messaging module.')}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#c4c7c7] px-4 py-2 text-[11px] font-semibold text-[#1c1b1b] transition-colors hover:bg-[#f1edec]"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Contact host
          </button>
          <button
            type="button"
            onClick={() => toast.success(`Following ${host.name}.`)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#1c1b1b] px-4 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-[#333131]"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Follow
          </button>
        </div>
      </div>
    </section>
  );
}

export default EventHostCard;
