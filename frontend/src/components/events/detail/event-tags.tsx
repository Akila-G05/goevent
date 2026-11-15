import React from 'react';
import type { EventTagGroups } from '@/lib/sample-events';
import { SectionHeading } from './section-heading';

const GROUP_LABELS: Array<{ key: keyof EventTagGroups; label: string }> = [
  { key: 'topic', label: 'Topic' },
  { key: 'format', label: 'Format' },
  { key: 'audience', label: 'Audience' },
];

export function EventTags({ tags }: { tags: EventTagGroups }) {
  return (
    <section className="rounded-2xl border border-[#e5e2e1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)] sm:p-6">
      <SectionHeading title="Tags" hint="Helps attendees find the event & filter the agenda" />

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {GROUP_LABELS.map(({ key, label }) => (
          <div key={key}>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#747878]">
              {label}
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {tags[key].map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-[#e0dbd9] bg-[#faf8f7] px-3 py-1 text-[11px] font-semibold text-[#1c1b1b]"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export default EventTags;
