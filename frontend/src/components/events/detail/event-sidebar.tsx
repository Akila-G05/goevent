import React from 'react';
import { ExternalLink } from 'lucide-react';
import type { EventDay, EventDetail, EventTagGroups } from '@/lib/sample-events';

interface EventSidebarProps {
  days: EventDay[];
  tags: EventTagGroups;
  links: NonNullable<EventDetail['links']>;
}

const TAG_GROUPS: Array<{ key: keyof EventTagGroups; label: string }> = [
  { key: 'topic', label: 'Topic' },
  { key: 'format', label: 'Format' },
  { key: 'audience', label: 'Audience' },
];

/**
 * Right-hand column for stored events. It uses the same card treatment as the
 * ticket panel so the event's days, tags and links sit where passes would be.
 */
export function EventSidebar({ days, tags, links }: EventSidebarProps) {
  return (
    <div className="space-y-6 lg:sticky lg:top-28">
      <SidebarCard title="Schedule" badge={`${days.length} ${days.length === 1 ? 'day' : 'days'}`}>
        <ul className="space-y-2">
          {days.map((day) => (
            <li key={day.id} className="flex items-center justify-between gap-3 rounded-lg bg-[#f7f3f2] p-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#575f67]">{day.label}</p>
                <p className="truncate text-sm font-semibold text-[#1c1b1b]">{day.title}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-[#1c1b1b]">{day.hours}</span>
            </li>
          ))}
        </ul>
      </SidebarCard>

      <SidebarCard title="Tags">
        <div className="space-y-4">
          {TAG_GROUPS.map(({ key, label }) =>
            tags[key].length > 0 ? (
              <div key={key}>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#575f67]">{label}</p>
                <ul className="flex flex-wrap gap-2">
                  {tags[key].map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full bg-[#000000] px-3 py-1 text-xs font-medium text-white"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null
          )}
        </div>
      </SidebarCard>

      {links.length > 0 && (
        <SidebarCard title="Links">
          <ul className="space-y-2">
            {links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-lg bg-[#f7f3f2] p-3 text-sm font-semibold text-[#1c1b1b] transition-colors hover:bg-[#f1edec]"
                >
                  <span className="truncate">{link.name}</span>
                  <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </SidebarCard>
      )}
    </div>
  );
}

function SidebarCard({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl uppercase tracking-wider text-[#1c1b1b]">{title}</h2>
        {badge && (
          <span className="rounded bg-[#ffdad6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#93000a]">
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

export default EventSidebar;
