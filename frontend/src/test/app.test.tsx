import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HomePage from '@/app/page';

describe('HomePage Component', () => {
  it('renders the GoEvent hero title and search button', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1, name: /WHAT'S CONCERT/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
  });

  it('opens the reservation modal and links Book Now to the event detail page', () => {
    render(<HomePage />);

    fireEvent.click(screen.getAllByRole('button', { name: /Find Tickets/i })[0]);

    expect(screen.getByText(/Ticket Reservation/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Book Now/i })).toHaveAttribute(
      'href',
      '/events/yoabiso'
    );
  });
});
