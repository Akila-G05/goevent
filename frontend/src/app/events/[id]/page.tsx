import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EventDetailView } from '@/components/events/detail/event-detail-view';
import { Footer } from '@/components/shared/footer';
import { getSampleEvent, listSampleEvents } from '@/lib/sample-events';

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return listSampleEvents().map((event) => ({ id: event.slug }));
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = getSampleEvent(id);

  if (!event) {
    return { title: 'Event not found - GoEvent' };
  }

  return {
    title: `${event.title} - GoEvent`,
    description: event.subtitle,
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  const event = getSampleEvent(id);

  if (!event) {
    notFound();
  }

  return (
    <>
      <EventDetailView event={event} />
      <Footer />
    </>
  );
}
