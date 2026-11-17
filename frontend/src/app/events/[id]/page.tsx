import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EventDetailView } from '@/components/events/detail/event-detail-view';
import { EventListingDetail } from '@/components/events/detail/event-listing-detail';
import type { RelatedCard } from '@/components/events/detail/related-events';
import { Footer } from '@/components/shared/footer';
import { getRelatedEvents, getSampleEvent, listSampleEvents } from '@/lib/sample-events';

interface EventPageProps {
  params: Promise<{ id: string }>;
}

const STORED_EVENT_ID = /^\d+$/;

export function generateStaticParams() {
  return listSampleEvents().map((event) => ({ id: event.slug }));
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = getSampleEvent(id);

  if (event) {
    return {
      title: `${event.title} - GoEvent`,
      description: event.subtitle,
    };
  }

  if (STORED_EVENT_ID.test(id)) {
    return { title: 'Event - GoEvent' };
  }

  return { title: 'Event not found - GoEvent' };
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  const sampleEvent = getSampleEvent(id);

  if (sampleEvent) {
    const related: RelatedCard[] = getRelatedEvents(sampleEvent).map((item) => ({
      key: item.slug,
      href: `/events/${item.slug}`,
      imageUrl: item.cardImage,
      category: item.category,
      dateLine: item.dateLine,
      venueCity: item.venue.city,
      title: item.title,
      venueName: item.venue.name,
      badge: `From $${item.priceFrom}`,
      status: item.status,
    }));

    return (
      <>
        <EventDetailView event={sampleEvent} related={related} />
        <Footer />
      </>
    );
  }

  if (STORED_EVENT_ID.test(id)) {
    return (
      <>
        <EventListingDetail eventId={Number(id)} />
        <Footer />
      </>
    );
  }

  notFound();
}
