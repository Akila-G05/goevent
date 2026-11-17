import React from 'react';
import type { EventDetail } from '@/lib/sample-events';
import { HighlightIcon } from './event-icon';
import { SectionHeading } from './section-heading';

export function EventAbout({ event }: { event: EventDetail }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title="About the event" />

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="space-y-4 text-base leading-relaxed text-[#444748]">
          {event.about.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        {event.highlights.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#1c1b1b]">
            Conference highlights
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {event.highlights.map((highlight) => (
              <article
                key={highlight.title}
                className="flex items-start gap-3 rounded-lg bg-[#f7f3f2] p-4 transition-colors hover:bg-[#f1edec]"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#000000] text-white">
                  <HighlightIcon icon={highlight.icon} className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-[#1c1b1b]">{highlight.title}</h4>
                  <p className="mt-0.5 text-sm leading-relaxed text-[#575f67]">{highlight.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
        )}
      </div>
    </section>
  );
}

export default EventAbout;
