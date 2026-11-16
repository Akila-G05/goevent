import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateEventModal } from '@/components/events/create-event-modal';
import { eventsApi } from '@/api/events';
import { toast } from '@/lib/toast-store';

vi.mock('@/lib/toast-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/toast-store')>();
  return { ...actual, toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } };
});

vi.mock('@/api/events', () => ({
  eventsApi: {
    create: vi.fn(),
    uploadImage: vi.fn(),
  },
}));

const createEvent = vi.mocked(eventsApi.create);
const uploadImage = vi.mocked(eventsApi.uploadImage);

beforeEach(() => {
  // jsdom does not implement object URLs.
  global.URL.createObjectURL = vi.fn(() => 'blob:cover');
  global.URL.revokeObjectURL = vi.fn();
  createEvent.mockReset();
  uploadImage.mockReset();
});

const renderModal = (onClose = vi.fn()) =>
  render(<CreateEventModal open onClose={onClose} />);

const fillRequiredFields = () => {
  fireEvent.change(screen.getByLabelText(/^Event name/), {
    target: { value: 'Tech Fest 2026' },
  });
  fireEvent.change(screen.getByLabelText(/^Category/), {
    target: { value: 'Technology' },
  });
  fireEvent.change(screen.getByLabelText(/^Audience/), {
    target: { value: 'University' },
  });
  fireEvent.change(screen.getByLabelText(/^Venue name/), {
    target: { value: 'Main Auditorium' },
  });
  fireEvent.change(screen.getByLabelText(/^City/), {
    target: { value: 'Colombo' },
  });
  fireEvent.change(screen.getByLabelText(/^Link label/), {
    target: { value: 'Register here' },
  });
  fireEvent.change(screen.getByLabelText(/^URL/), {
    target: { value: 'https://goevent.lk/register' },
  });
  fireEvent.change(screen.getByLabelText(/^Date/), {
    target: { value: '2026-12-24' },
  });
  fireEvent.change(screen.getByLabelText(/^Start time/), {
    target: { value: '18:00' },
  });
  fireEvent.change(screen.getByLabelText(/^End time/), {
    target: { value: '22:00' },
  });
};

const submitForm = () =>
  fireEvent.submit(document.getElementById('create-event-form') as HTMLFormElement);

describe('CreateEventModal', () => {
  it('renders the event details and image upload controls', () => {
    renderModal();

    expect(screen.getByLabelText(/^Event name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Category/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Audience/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Venue name/)).toBeInTheDocument();
    expect(screen.getByText('Upload cover image')).toBeInTheDocument();
    expect(
      screen.getByText(/Listing-only events are published as soon as you create them/)
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Banner/)).not.toBeInTheDocument();
    expect(screen.getByText(/Optional - preview only/)).toBeInTheDocument();
  });

  it('adds and removes schedule rows with start and end times', () => {
    renderModal();

    expect(screen.getAllByLabelText(/^Date/)).toHaveLength(1);
    expect(screen.getByLabelText(/^Start time/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^End time/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add another date' }));

    expect(screen.getAllByLabelText(/^Date/)).toHaveLength(2);
    expect(screen.getAllByLabelText(/^Start time/)).toHaveLength(2);
    expect(screen.getAllByLabelText(/^End time/)).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Remove date 2' }));

    expect(screen.getAllByLabelText(/^Date/)).toHaveLength(1);
  });

  it('supports more than one event link', () => {
    renderModal();

    expect(screen.getAllByLabelText(/^Link label/)).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Add another link' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add another link' }));

    expect(screen.getAllByLabelText(/^Link label/)).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: 'Remove link 2' }));

    expect(screen.getAllByLabelText(/^Link label/)).toHaveLength(2);
  });

  it('keeps free and paid event types disabled and offers listing only', () => {
    renderModal();

    const listing = screen.getByRole('button', { name: /^Listing only/ });
    const free = screen.getByRole('button', { name: /^Free/ });
    const paid = screen.getByRole('button', { name: /^Paid/ });

    expect(listing).toHaveAttribute('aria-pressed', 'true');
    expect(free).toBeDisabled();
    expect(paid).toBeDisabled();
    expect(screen.getAllByText('Coming soon')).toHaveLength(2);
    expect(screen.queryByText('Ticket tiers')).not.toBeInTheDocument();

    fireEvent.click(paid);
    fireEvent.click(free);

    expect(listing).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Ticket tiers')).not.toBeInTheDocument();
  });

  it('rejects a file that is not an accepted image type', () => {
    renderModal();

    const coverInput = document.querySelectorAll<HTMLInputElement>('input[type="file"]')[0];
    const file = new File(['notes'], 'notes.txt', { type: 'text/plain' });

    fireEvent.change(coverInput, { target: { files: [file] } });

    expect(toast.error).toHaveBeenCalledWith('Choose a JPEG, PNG or WebP image.', expect.anything());
  });

  it('sends the separate start and end times so the server can join them', async () => {
    const onClose = vi.fn();
    createEvent.mockResolvedValue({ status: true, id: 12 });
    renderModal(onClose);

    fillRequiredFields();
    submitForm();

    await waitFor(() => expect(createEvent).toHaveBeenCalledTimes(1));

    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Tech Fest 2026',
        categoryName: 'Technology',
        audienceName: 'University',
        eventLevelId: 1,
        links: [{ name: 'Register here', url: 'https://goevent.lk/register' }],
        dates: [{ date: '2026-12-24', startTime: '18:00', endTime: '22:00' }],
      })
    );

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('accepts an end time before the start as an overnight event', async () => {
    createEvent.mockResolvedValue({ status: true, id: 12 });
    renderModal();

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/^End time/), {
      target: { value: '02:00' },
    });
    submitForm();

    await waitFor(() => expect(createEvent).toHaveBeenCalledTimes(1));
    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({
      dates: [expect.objectContaining({ endTime: '02:00' })],
    }));
  });

  it('shows the backend error without closing the dialog', async () => {
    const onClose = vi.fn();
    createEvent.mockRejectedValue({ message: 'Only organizers can create events.' });
    renderModal(onClose);

    fillRequiredFields();
    submitForm();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Only organizers can create events.', expect.anything())
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('uploads the chosen cover image after creating the event', async () => {
    const onClose = vi.fn();
    createEvent.mockResolvedValue({ status: true, id: 12 });
    uploadImage.mockResolvedValue({
      status: true,
      imagePath: '/goevent/api/images/event/12/cover.png',
    });
    renderModal(onClose);

    const file = new File(['bytes'], 'cover.png', { type: 'image/png' });
    const coverInput = document.querySelectorAll<HTMLInputElement>('input[type="file"]')[0];
    fireEvent.change(coverInput, { target: { files: [file] } });

    fillRequiredFields();
    submitForm();

    await waitFor(() => expect(uploadImage).toHaveBeenCalledWith(12, file));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('keeps the created event when only the image upload fails', async () => {
    const onClose = vi.fn();
    createEvent.mockResolvedValue({ status: true, id: 12 });
    uploadImage.mockRejectedValue({ message: 'Could not save the image.' });
    renderModal(onClose);

    const file = new File(['bytes'], 'cover.png', { type: 'image/png' });
    const coverInput = document.querySelectorAll<HTMLInputElement>('input[type="file"]')[0];
    fireEvent.change(coverInput, { target: { files: [file] } });

    fillRequiredFields();
    submitForm();

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(createEvent).toHaveBeenCalledTimes(1);
  });

  it('closes from the Cancel button', () => {
    const onClose = vi.fn();
    renderModal(onClose);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
