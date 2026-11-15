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

  it('shows ticket tiers only when the event is paid', () => {
    renderModal();

    expect(screen.queryByText('Ticket tiers')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Paid/ }));
    expect(screen.getByText('Ticket tiers')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Quantity/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Free/ }));
    expect(screen.queryByText('Ticket tiers')).not.toBeInTheDocument();
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
