import React from 'react';
import type { EventDetail } from '@/lib/sample-events';
import { HighlightIcon } from './event-icon';
import { SectionHeading } from './section-heading';

export function EventAbout({ event }: { event: EventDetail }) {
  return (
    <section className="rounded-2xl border border-[#e5e2e1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)] sm:p-6">
      <SectionHeading title="About the event" />

      <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#444748]">
        {event.about.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      <h3 className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#1c1b1b]">
        <span aria-hidden="true" className="text-[#c4c7c7]">
          ///
        </span>
        Conference highlights
      </h3>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {event.highlights.map((highlight, index) => (
          <article
            key={highlight.title}
            className="rounded-xl border border-[#eae6e5] bg-[#faf8f7] p-4 transition-colors hover:border-[#c4c7c7]"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ebe7e6] text-[#1c1b1b]">
                <HighlightIcon icon={highlight.icon} className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#747878]">
                  0{index + 1}
                </p>
                <h4 className="text-sm font-bold text-[#1c1b1b]">{highlight.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-[#747878]">{highlight.body}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default EventAbout;
