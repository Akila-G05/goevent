import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import HomePage from '@/app/page';
import { eventsApi } from '@/api/events';

vi.mock('@/api/events', () => ({
  eventsApi: {
    list: vi.fn(),
    recommended: vi.fn(),
  },
}));

beforeEach(() => {
  vi.mocked(eventsApi.list).mockResolvedValue([]);
  vi.mocked(eventsApi.recommended).mockResolvedValue([]);
});

const renderHome = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <HomePage />
    </QueryClientProvider>
  );

describe('HomePage Component', () => {
  it('renders the hero headline and the search button', () => {
    renderHome();
    expect(screen.getByRole('heading', { level: 1, name: /next event/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Search/i })).toBeInTheDocument();
  });

  it('links the hero call to action to the browsing section', () => {
    renderHome();
    expect(screen.getByRole('link', { name: /Browse events/i })).toHaveAttribute('href', '#browse');
    const hostLinks = screen.getAllByRole('link', { name: /Host an event/i });
    expect(hostLinks.length).toBeGreaterThan(0);
    expect(hostLinks[0]).toHaveAttribute('href', '/signup');
  });

  it('no longer shows the old concert reservation modal', () => {
    renderHome();
    expect(screen.queryByText(/Ticket Reservation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Le Pharaohs/i)).not.toBeInTheDocument();
  });
});
