import React from 'react';
import type { EventDetail } from '@/lib/sample-events';
import { getRelatedEvents } from '@/lib/sample-events';
import { EventHero } from './event-hero';
import { EventHostCard } from './event-host';
import { EventAbout } from './event-about';
import { EventTags } from './event-tags';
import { EventSchedule } from './event-schedule';
import { EventSpeakers } from './event-speakers';
import { EventVenueSection } from './event-venue';
import { TicketPanel } from './ticket-panel';
import { RelatedEvents } from './related-events';

export function EventDetailView({ event }: { event: EventDetail }) {
  const related = getRelatedEvents(event);

  return (
    <div className="min-h-screen bg-[#fdf8f8] pb-4 text-[#1c1b1b]">
      <EventHero event={event} />

      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-5 px-4 py-6 sm:px-6 lg:grid-cols-12 lg:gap-6 lg:px-8">
        {/* Left column: event content */}
        <div className="flex flex-col gap-5 lg:col-span-8">
          <EventHostCard host={event.host} />
          <EventAbout event={event} />
          <EventTags tags={event.tags} />
          <EventSchedule days={event.days} timezone={event.timezone} />
          <EventSpeakers speakers={event.speakers} />
          <EventVenueSection venue={event.venue} />
        </div>

        {/* Right column: sticky booking rail */}
        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-24">
            <TicketPanel event={event} />
          </div>
        </aside>
      </div>

      <RelatedEvents events={related} />
    </div>
  );
}

export default EventDetailView;
