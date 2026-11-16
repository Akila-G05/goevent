import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { EventListingDetail } from '@/components/events/detail/event-listing-detail';
import { eventsApi, type EventDetails, type EventSummary } from '@/api/events';

vi.mock('@/api/events', () => ({
  eventsApi: {
    detail: vi.fn(),
    list: vi.fn(),
  },
}));

const loadDetail = vi.mocked(eventsApi.detail);
const loadList = vi.mocked(eventsApi.list);

const event: EventDetails = {
  id: 10,
  name: 'Campus Hack',
  description: 'A weekend build sprint.',
  category: 'TECHNOLOGY',
  audience: 'UNIVERSITY',
  eventLevel: 'FREE',
  venue: {
    name: 'Main Hall',
    address: '1 Hall Road',
    city: 'Colombo',
    link: 'https://maps.example.com/main-hall',
    coordinates: '6.8508767,80.2641585',
  },
  organizer: { name: 'Akila Gimhana', memberSince: '2026' },
  imagePath: null,
  bannerPath: null,
  dates: [
    { date: '2027-05-01', time: '10:00 - 12:00' },
    { date: '2027-05-02', time: '09:00 - 11:00' },
  ],
  links: [
    { name: 'Register', url: 'https://example.com/register' },
    { name: 'Unsafe', url: 'javascript:alert(1)' },
  ],
  tags: ['AI', 'Workshop'],
};

const otherEvent: EventSummary = {
  id: 11,
  name: 'City Jazz Night',
  description: null,
  category: 'MUSIC',
  audience: 'BOTH',
  eventLevel: 'PAYED',
  venueName: 'Open Air Stage',
  venueCity: 'Kandy',
  imagePath: null,
  startsOn: '2027-06-12',
  timeRange: '18:00 - 21:00',
};

const renderDetail = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <EventListingDetail eventId={10} />
    </QueryClientProvider>
  );

beforeEach(() => {
  loadDetail.mockReset();
  loadList.mockReset();
  loadList.mockResolvedValue([otherEvent]);
});

describe('EventListingDetail', () => {
  it('shows the stored event in the sample layout', async () => {
    loadDetail.mockResolvedValue(event);
    renderDetail();

    expect(await screen.findByRole('heading', { level: 1, name: 'Campus Hack' })).toBeInTheDocument();
    expect(loadDetail).toHaveBeenCalledWith(10);
    expect(screen.getByText('Akila Gimhana')).toBeInTheDocument();
    expect(screen.getByText('Organizer since 2026')).toBeInTheDocument();
    expect(screen.getAllByText('A weekend build sprint.').length).toBeGreaterThan(0);
    expect(screen.getByText('Day 2')).toBeInTheDocument();
    expect(screen.getByText('Workshop')).toBeInTheDocument();
    expect(screen.getByText(/1 Hall Road/)).toBeInTheDocument();
  });

  it('shows only web links and hides the ticket and buttons for a stored event', async () => {
    loadDetail.mockResolvedValue(event);
    renderDetail();

    await screen.findByRole('heading', { level: 1, name: 'Campus Hack' });

    expect(screen.getByRole('link', { name: 'Register' })).toHaveAttribute('href', 'https://example.com/register');
    expect(screen.queryByRole('link', { name: 'Unsafe' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Reserve seat/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Follow' })).not.toBeInTheDocument();
  });

  it('embeds the Google map at the saved location', async () => {
    loadDetail.mockResolvedValue(event);
    renderDetail();

    await screen.findByRole('heading', { level: 1, name: 'Campus Hack' });

    const map = screen.getByTitle('Google Map of Main Hall');
    expect(map.getAttribute('src')).toContain('q=6.8508767%2C80.2641585');
    expect(map.getAttribute('src')).toContain('output=embed');
  });

  it('links the other events to their own pages', async () => {
    loadDetail.mockResolvedValue(event);
    renderDetail();

    await screen.findByRole('heading', { level: 1, name: 'Campus Hack' });

    expect(await screen.findByRole('heading', { name: 'City Jazz Night' })).toBeInTheDocument();
    const card = screen.getByRole('link', { name: /City Jazz Night/i });
    expect(card).toHaveAttribute('href', '/events/11');
  });

  it('shows a retry message when the event cannot be loaded', async () => {
    loadDetail.mockRejectedValue(new Error('Event not found.'));
    renderDetail();

    expect(await screen.findByRole('alert')).toHaveTextContent('This event could not be loaded.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
