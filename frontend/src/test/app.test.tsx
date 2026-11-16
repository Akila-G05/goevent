import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
  it('renders the GoEvent hero title and search button', () => {
    renderHome();
    expect(screen.getByRole('heading', { level: 1, name: /WHAT'S CONCERT/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
  });

  it('opens the reservation modal and links Book Now to the event detail page', () => {
    renderHome();

    fireEvent.click(screen.getByRole('button', { name: /See Detail/i }));

    expect(screen.getByText(/Ticket Reservation/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Book Now/i })).toHaveAttribute(
      'href',
      '/events/le-pharaohs-bangkok'
    );
  });
});
