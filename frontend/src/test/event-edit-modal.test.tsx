import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { CreateEventModal } from '@/components/events/create-event-modal';
import { eventsApi, type EventDetails } from '@/api/events';

vi.mock('@/api/events', () => ({
  eventsApi: {
    create: vi.fn(),
    update: vi.fn(),
    uploadImage: vi.fn(),
  },
}));

const createEvent = vi.mocked(eventsApi.create);
const updateEvent = vi.mocked(eventsApi.update);

const stored: EventDetails = {
  id: 10,
  name: 'Campus Hack',
  description: 'A weekend build sprint.',
  category: 'TECHNOLOGY',
  audience: 'UNIVERSITY',
  eventLevel: 'LISTING_ONLY',
  venue: {
    name: 'Main Hall',
    address: '1 Hall Road',
    city: 'Colombo',
    link: null,
    coordinates: null,
  },
  organizer: { name: 'Akila Gimhana', memberSince: '2026' },
  imagePath: null,
  bannerPath: null,
  dates: [{ date: '2027-05-01', time: '10:00 - 12:00' }],
  links: [{ name: 'Register', url: 'https://example.com/register' }],
  tags: [],
};

beforeEach(() => {
  createEvent.mockReset();
  updateEvent.mockReset();
  vi.mocked(eventsApi.uploadImage).mockReset();
});

describe('CreateEventModal in edit mode', () => {
  it('prefills the stored details and saves through update, not create', async () => {
    updateEvent.mockResolvedValue({ status: true, id: 10 });
    const onClose = vi.fn();

    render(<CreateEventModal open event={stored} onClose={onClose} />);

    expect(screen.getByRole('heading', { name: 'Edit event' })).toBeInTheDocument();
    expect((screen.getByLabelText(/^Event name/) as HTMLInputElement).value).toBe('Campus Hack');
    expect((screen.getByLabelText(/^Category/) as HTMLSelectElement).value).toBe('Technology');
    expect((screen.getByLabelText(/^Audience/) as HTMLSelectElement).value).toBe('University');

    fireEvent.change(screen.getByLabelText(/^Event name/), { target: { value: 'Campus Hack 2' } });
    fireEvent.submit(document.getElementById('create-event-form') as HTMLFormElement);

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(updateEvent).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        name: 'Campus Hack 2',
        categoryName: 'Technology',
        dates: [{ date: '2027-05-01', startTime: '10:00', endTime: '12:00' }],
      })
    );
    expect(createEvent).not.toHaveBeenCalled();
  });
});
