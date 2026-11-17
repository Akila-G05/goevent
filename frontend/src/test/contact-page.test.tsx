import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ContactPage from '@/app/contact/page';

describe('ContactPage', () => {
  it('shows validation errors when the form is submitted empty', async () => {
    render(<ContactPage />);

    fireEvent.click(screen.getByRole('button', { name: /Send message/i }));

    expect(await screen.findByText('Please enter your name')).toBeInTheDocument();
    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Message must be at least 10 characters')).toBeInTheDocument();
  });

  it('accepts a valid message and explains that the sample form does not send it', async () => {
    render(<ContactPage />);

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'Ada Lovelace' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByLabelText(/Message/i), { target: { value: 'Can I host a workshop?' } });
    fireEvent.click(screen.getByRole('button', { name: /Send message/i }));

    expect(await screen.findByText(/This is a sample form/i)).toBeInTheDocument();
    expect(screen.getByText(/Thanks, Ada Lovelace/i)).toBeInTheDocument();
  });
});
