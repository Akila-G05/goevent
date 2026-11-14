import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateEventModal } from '@/components/events/create-event-modal';

beforeEach(() => {
  // jsdom does not implement object URLs.
  global.URL.createObjectURL = vi.fn(() => 'blob:cover');
  global.URL.revokeObjectURL = vi.fn();
});

const renderModal = (onClose = vi.fn()) =>
  render(<CreateEventModal open onClose={onClose} />);

describe('CreateEventModal', () => {
  it('renders the event details and image upload controls', () => {
    renderModal();

    expect(screen.getByLabelText(/^Event name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Category/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Audience/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Venue name/)).toBeInTheDocument();
    expect(screen.getByText('Upload cover image')).toBeInTheDocument();
    expect(screen.getByText('Design preview — this form is not saved to the backend yet.')).toBeInTheDocument();
  });

  it('adds and removes schedule rows', () => {
    renderModal();

    expect(screen.getAllByLabelText(/^Date/)).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Add another date' }));
    expect(screen.getAllByLabelText(/^Date/)).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Remove date 2' }));
    expect(screen.getAllByLabelText(/^Date/)).toHaveLength(1);
  });

  it('explains what each event type includes', () => {
    renderModal();

    // Listing only: no ticketing, no QR, no payments.
    expect(screen.getByText('Event listing only')).toBeInTheDocument();
    expect(screen.getByText('No ticket generation')).toBeInTheDocument();
    expect(screen.getByText('No QR codes')).toBeInTheDocument();
    expect(screen.getByText('No payment gateway')).toBeInTheDocument();

    // Free: the platform issues QR tickets, still no payment gateway.
    fireEvent.click(screen.getByRole('button', { name: /^Free/ }));
    expect(screen.getByText('Tickets generated')).toBeInTheDocument();
    expect(screen.getByText('QR codes issued')).toBeInTheDocument();
    expect(screen.getByText('No payment gateway')).toBeInTheDocument();
    expect(screen.queryByText('No ticket generation')).not.toBeInTheDocument();

    // Paid: same tickets plus the payment gateway.
    fireEvent.click(screen.getByRole('button', { name: /^Paid/ }));
    expect(screen.getByText('Payment gateway')).toBeInTheDocument();
    expect(screen.queryByText('No payment gateway')).not.toBeInTheDocument();
  });

  it('generates free tickets for free events and priced tiers for paid events', () => {
    renderModal();

    expect(screen.queryByText('Ticket tiers')).not.toBeInTheDocument();
    expect(screen.queryByText('Free tickets')).not.toBeInTheDocument();

    // Free events still produce tickets and QR codes, but never a price.
    fireEvent.click(screen.getByRole('button', { name: /^Free/ }));
    expect(screen.getByText('Free tickets')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Quantity/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Price/)).not.toBeInTheDocument();
    expect(screen.getByText('Free · 0.00')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Available from/)).toBeInTheDocument();

    // Paid events add the price field and sales window.
    fireEvent.click(screen.getByRole('button', { name: /^Paid/ }));
    expect(screen.getByText('Ticket tiers')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Price/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Sales open/)).toBeInTheDocument();

    // Listing-only events never generate tickets.
    fireEvent.click(screen.getByRole('button', { name: /^Listing only/ }));
    expect(screen.queryByText('Ticket tiers')).not.toBeInTheDocument();
    expect(screen.queryByText('Free tickets')).not.toBeInTheDocument();
  });

  it('rejects a file that is not an accepted image type', () => {
    renderModal();

    const coverInput = document.querySelectorAll<HTMLInputElement>('input[type="file"]')[0];
    const file = new File(['notes'], 'notes.txt', { type: 'text/plain' });

    fireEvent.change(coverInput, { target: { files: [file] } });

    expect(screen.getByRole('alert')).toHaveTextContent('Choose a JPEG, PNG or WebP image.');
  });

  it('closes from the Cancel button', () => {
    const onClose = vi.fn();
    renderModal(onClose);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
