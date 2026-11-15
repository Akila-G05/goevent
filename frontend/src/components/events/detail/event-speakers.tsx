'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import type { EventSpeaker } from '@/lib/sample-events';
import { toast } from '@/lib/toast-store';
import { SectionHeading } from './section-heading';

export function EventSpeakers({ speakers }: { speakers: EventSpeaker[] }) {
  return (
    <section className="rounded-2xl border border-[#e5e2e1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)] sm:p-6">
      <SectionHeading
        title="Keynote speakers & artists"
        action={
          <button
            type="button"
            onClick={() => toast.info(`${speakers.length} speakers are confirmed for this event.`)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1c1b1b] underline-offset-4 hover:underline"
          >
            View all {speakers.length} speakers
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        }
      />

      <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {speakers.map((speaker) => (
          <li key={speaker.id} className="flex flex-col items-center text-center">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-[#ebe7e6] bg-[#f1edec]">
              <Image
                src={speaker.image}
                alt={speaker.name}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
            <p className="mt-2 text-sm font-bold leading-tight text-[#1c1b1b]">{speaker.name}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#747878]">
              {speaker.role}
            </p>
            <p className="text-[11px] text-[#444748]">{speaker.org}</p>
            {speaker.badge && (
              <span className="mt-1.5 rounded-full bg-[#1c1b1b] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                {speaker.badge}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default EventSpeakers;
