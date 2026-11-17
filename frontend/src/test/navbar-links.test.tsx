import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Navbar } from '@/components/shared/navbar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/events',
}));

vi.mock('@/components/shared/profile-button', () => ({
  ProfileButton: () => null,
}));

vi.mock('@/hooks/use-logout', () => ({
  useLogout: () => ({ logout: () => {}, isLoggingOut: false }),
}));

vi.mock('@/lib/session-store', () => ({
  getDisplayName: () => 'Test User',
  getRoleLabel: () => 'Attendee',
  useSessionStore: (selector: (state: unknown) => unknown) =>
    selector({ status: 'authenticated', user: { roleId: 'USER' }, refresh: () => {} }),
}));

describe('Navbar links', () => {
  it('lists Home, Profile, Events and Contact Us in that order', () => {
    render(<Navbar />);

    const desktopNav = screen.getByRole('navigation');
    const labels = within(desktopNav)
      .getAllByRole('link')
      .map((link) => link.textContent);

    expect(labels).toEqual(['Home', 'Profile', 'Events', 'Contact Us']);
    expect(within(desktopNav).getByRole('link', { name: 'Contact Us' })).toHaveAttribute('href', '/contact');
  });
});
