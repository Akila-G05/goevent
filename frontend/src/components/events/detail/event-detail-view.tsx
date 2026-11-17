import React from 'react';
import type { EventDetail } from '@/lib/sample-events';
import { EventHero } from './event-hero';
import { EventHostCard } from './event-host';
import { EventAbout } from './event-about';
import { EventTags } from './event-tags';
import { EventSchedule } from './event-schedule';
import { EventSpeakers } from './event-speakers';
import { EventVenueSection } from './event-venue';
import { EventSidebar } from './event-sidebar';
import { TicketPanel } from './ticket-panel';
import { RelatedEvents, type RelatedCard } from './related-events';

export function EventDetailView({ event, related }: { event: EventDetail; related: RelatedCard[] }) {
  const listingOnly = event.listingOnly === true;

  return (
    <div className="min-h-screen bg-[#fdf8f8] pb-4 text-[#1c1b1b]">
      <EventHero event={event} />

      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-start gap-10 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:gap-6 lg:px-8">
        {/* Left column: event content */}
        <div className="flex flex-col gap-16 lg:col-span-8">
          <EventHostCard host={event.host} compact={listingOnly} />
          <EventAbout event={event} />
          {!listingOnly && <EventTags tags={event.tags} />}
          {!listingOnly && <EventSchedule days={event.days} timezone={event.timezone} />}
          {event.speakers.length > 0 && <EventSpeakers speakers={event.speakers} />}
          <EventVenueSection venue={event.venue} />
        </div>

        {/* Right column: stored-event details, or the sample ticket panel */}
        <aside className="lg:col-span-4">
          {listingOnly ? (
            <EventSidebar days={event.days} tags={event.tags} links={event.links ?? []} />
          ) : (
            <div id="ticketSection" className="scroll-mt-28 lg:sticky lg:top-28">
              <TicketPanel event={event} />
            </div>
          )}
        </aside>
      </div>

      <RelatedEvents cards={related} />
    </div>
  );
}

export default EventDetailView;
