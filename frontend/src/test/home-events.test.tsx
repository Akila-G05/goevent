import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import HomePage from '@/app/page';
import { eventsApi, type EventSummary } from '@/api/events';

vi.mock('@/api/events', () => ({
  eventsApi: {
    list: vi.fn(),
    recommended: vi.fn(),
  },
}));

const listEvents = vi.mocked(eventsApi.recommended);

const freeUniversityEvent: EventSummary = {
  id: 10,
  name: 'Campus Hack',
  description: 'Hackathon',
  category: 'TECHNOLOGY',
  audience: 'UNIVERSITY',
  eventLevel: 'FREE',
  venueName: 'Main Hall',
  venueCity: 'Colombo',
  imagePath: null,
  startsOn: '2027-05-01',
  timeRange: '10:00 - 12:00',
};

const paidPublicEvent: EventSummary = {
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

const renderHome = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <HomePage />
    </QueryClientProvider>
  );

beforeEach(() => {
  listEvents.mockReset();
  vi.mocked(eventsApi.list).mockResolvedValue([]);
});

describe('Home page event cards', () => {
  it('shows each approved event with its level and who can join', async () => {
    listEvents.mockResolvedValue([freeUniversityEvent, paidPublicEvent]);
    renderHome();

    expect(await screen.findByRole('heading', { name: 'Campus Hack' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'City Jazz Night' })).toBeInTheDocument();

    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('University students')).toBeInTheDocument();
    expect(screen.getByText('University students & public')).toBeInTheDocument();
    expect(screen.getByText('Main Hall, Colombo')).toBeInTheDocument();
  });

  it('links each card with an Explore button to its event page', async () => {
    listEvents.mockResolvedValue([freeUniversityEvent, paidPublicEvent]);
    renderHome();

    await screen.findByRole('heading', { name: 'Campus Hack' });
    const explore = screen.getAllByRole('link', { name: 'Explore' });

    expect(explore).toHaveLength(2);
    expect(explore[0]).toHaveAttribute('href', '/events/11');
    expect(explore[1]).toHaveAttribute('href', '/events/10');
  });

  it('asks the backend for approved events', async () => {
    listEvents.mockResolvedValue([]);
    renderHome();

    await waitFor(() => expect(listEvents).toHaveBeenCalled());
  });

  it('shows an empty state when no events are published', async () => {
    listEvents.mockResolvedValue([]);
    renderHome();

    expect(await screen.findByText('No events to show yet.')).toBeInTheDocument();
  });

  it('shows an error with a retry action when the events cannot be loaded', async () => {
    listEvents.mockRejectedValue(new Error('network down'));
    renderHome();

    expect(await screen.findByRole('alert')).toHaveTextContent('Events could not be loaded.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
  it('shows four events per page, newest first, and reaches the rest with the carousel, up to six', async () => {
    const many: EventSummary[] = Array.from({ length: 8 }, (_, index) => ({
      ...freeUniversityEvent,
      id: 100 + index,
      name: `Event ${index + 1}`,
      startsOn: `2027-01-${String(index + 1).padStart(2, '0')}`,
    }));
    listEvents.mockResolvedValue(many);
    renderHome();

    expect(await screen.findByRole('heading', { name: 'Event 8' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Event 5' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Event 4' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next events' }));

    expect(screen.getByRole('heading', { name: 'Event 4' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Event 3' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Event 2' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Event 8' })).not.toBeInTheDocument();
  });
});
