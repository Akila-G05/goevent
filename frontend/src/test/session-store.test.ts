import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock('@/api', () => ({
  authApi: { getSession },
}));

import { useSessionStore } from '@/lib/session-store';

describe('session store', () => {
  beforeEach(() => {
    getSession.mockReset();
    useSessionStore.setState({ status: 'loading', user: null });
  });

  it('marks the user authenticated when the backend has a session', async () => {
    getSession.mockResolvedValue({
      status: true,
      authenticated: true,
      userId: 7,
      roleId: 'STUDENT',
      email: 'attendee@goevent.com',
    });

    await useSessionStore.getState().refresh();

    expect(useSessionStore.getState().status).toBe('authenticated');
    expect(useSessionStore.getState().user).toEqual({
      userId: 7,
      roleId: 'STUDENT',
      email: 'attendee@goevent.com',
    });
  });

  it('treats a missing session as guest', async () => {
    getSession.mockResolvedValue({ status: true, authenticated: false });

    await useSessionStore.getState().refresh();

    expect(useSessionStore.getState().status).toBe('guest');
    expect(useSessionStore.getState().user).toBeNull();
  });

  it('treats a failed check as guest without throwing', async () => {
    getSession.mockRejectedValue(new Error('network down'));

    await expect(
      useSessionStore.getState().refresh()
    ).resolves.toBeUndefined();

    expect(useSessionStore.getState().status).toBe('guest');
    expect(useSessionStore.getState().user).toBeNull();
  });

  it('clears the session state on logout', () => {
    useSessionStore
      .getState()
      .setAuthenticated({ userId: 1, roleId: 'USER', email: 'viewer@goevent.com' });

    expect(useSessionStore.getState().status).toBe('authenticated');

    useSessionStore.getState().clear();

    expect(useSessionStore.getState().status).toBe('guest');
    expect(useSessionStore.getState().user).toBeNull();
  });
});
