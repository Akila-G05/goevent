import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import EventsPage from '@/app/events/page';
import { eventsApi, type EventSummary } from '@/api/events';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/api/events', () => ({
  eventsApi: {
    search: vi.fn(),
    filters: vi.fn(),
  },
}));

const search = vi.mocked(eventsApi.search);
const filters = vi.mocked(eventsApi.filters);

const event: EventSummary = {
  id: 10,
  name: 'Campus Hack',
  description: null,
  category: 'TECHNOLOGY',
  audience: 'UNIVERSITY',
  eventLevel: 'FREE',
  venueName: 'Main Hall',
  venueCity: 'Colombo',
  imagePath: null,
  startsOn: '2027-05-01',
  timeRange: '10:00 - 12:00',
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <EventsPage />
    </QueryClientProvider>
  );

beforeEach(() => {
  search.mockReset();
  filters.mockReset();
  search.mockResolvedValue([event]);
  filters.mockResolvedValue({ categories: ['TECHNOLOGY'], audiences: ['UNIVERSITY'], tags: ['AI'] });
});

describe('Events page', () => {
  it('lists events newest first by default', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Campus Hack' })).toBeInTheDocument();
    expect(search).toHaveBeenCalledWith({ query: undefined, category: undefined, audience: undefined, tags: [] }, 'desc');
  });

  it('sends a selected tag to the backend search', async () => {
    renderPage();

    await screen.findByRole('heading', { name: 'Campus Hack' });
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    fireEvent.click(screen.getByRole('button', { name: 'AI' }));

    await waitFor(() =>
      expect(search).toHaveBeenLastCalledWith(expect.objectContaining({ tags: ['AI'] }), 'desc')
    );
  });

  it('offers the category, audience and sort controls', async () => {
    renderPage();

    await screen.findByRole('heading', { name: 'Campus Hack' });
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));

    expect(screen.getByLabelText('Sort by')).toHaveValue('newest');
    expect(screen.getByRole('option', { name: 'Technology' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'University students' })).toBeInTheDocument();
  });
});
