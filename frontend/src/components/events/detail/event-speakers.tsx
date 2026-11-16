'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import type { EventSpeaker } from '@/lib/sample-events';
import { toast } from '@/lib/toast-store';
import { SectionHeading } from './section-heading';

export function EventSpeakers({ speakers }: { speakers: EventSpeaker[] }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title="Keynote speakers & artists"
        action={
          <button
            type="button"
            onClick={() => toast.info(`${speakers.length} speakers are confirmed for this event.`)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#1c1b1b] hover:underline"
          >
            View all {speakers.length} speakers
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        }
      />

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {speakers.map((speaker) => (
          <li
            key={speaker.id}
            className="flex flex-col items-center rounded-xl bg-white p-4 text-center shadow-sm"
          >
            <div className="relative mb-3 h-20 w-20 overflow-hidden rounded-full shadow-md ring-2 ring-[#e5e2e1]">
              <Image
                src={speaker.image}
                alt={speaker.name}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
            <p className="text-sm font-semibold leading-snug text-[#1c1b1b]">{speaker.name}</p>
            <p className="mt-0.5 text-xs text-[#575f67]">{speaker.role}</p>
            <span className="mt-2 rounded-full bg-[#ebe7e6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1c1b1b]">
              {speaker.org}
            </span>
            {speaker.badge && (
              <span className="mt-1.5 rounded-full bg-[#000000] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
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
