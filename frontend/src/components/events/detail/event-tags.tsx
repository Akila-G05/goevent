'use client';

import React, { useState } from 'react';
import { Tag } from 'lucide-react';
import type { EventTagGroups } from '@/lib/sample-events';

const GROUP_LABELS: Array<{ key: keyof EventTagGroups; label: string }> = [
  { key: 'topic', label: 'Topic' },
  { key: 'format', label: 'Format' },
  { key: 'audience', label: 'Audience' },
];

export function EventTags({ tags }: { tags: EventTagGroups }) {
  const [selected, setSelected] = useState<Record<string, string[]>>(() => ({
    topic: tags.topic.slice(0, 2),
    format: tags.format.slice(0, 1),
    audience: tags.audience.slice(0, 1),
  }));

  const toggle = (key: keyof EventTagGroups, tag: string) => {
    setSelected((current) => {
      const active = current[key] ?? [];
      const next = active.includes(tag) ? active.filter((item) => item !== tag) : [...active, tag];
      return { ...current, [key]: next };
    });
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-[#111111]" aria-hidden="true" />
          <h2 className="font-display text-2xl uppercase tracking-wider text-[#1c1b1b] sm:text-3xl">Tags</h2>
        </div>
        <p className="text-xs text-[#747878]">Helps attendees find the event &amp; filter the agenda</p>
      </div>

      <div className="space-y-5 rounded-xl bg-white p-6 shadow-sm">
        {GROUP_LABELS.map(({ key, label }) => (
          <div key={key}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#575f67]">{label}</p>
            <div className="flex flex-wrap gap-2">
              {tags[key].map((tag) => {
                const active = selected[key]?.includes(tag) ?? false;
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle(key, tag)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                      active
                        ? 'bg-[#000000] text-white shadow-sm'
                        : 'bg-[#f7f3f2] text-[#1c1b1b] hover:bg-[#ebe7e6]'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default EventTags;
