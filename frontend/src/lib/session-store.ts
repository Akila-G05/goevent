import { create } from 'zustand';
import { authApi } from '@/api';

export type SessionStatus = 'loading' | 'authenticated' | 'guest';

export interface SessionUser {
  userId?: number;
  roleId?: string;
  email?: string;
}

interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
  /** Silent check against the backend; failures are treated as "guest". */
  refresh: () => Promise<void>;
  /** Called after a successful sign-in / Google auth. */
  setAuthenticated: (user: SessionUser) => void;
  clear: () => void;
}

let pendingRefresh: Promise<void> | null = null;

export const useSessionStore = create<SessionState>((set) => ({
  status: 'loading',
  user: null,

  refresh: async () => {
    // Collapse duplicate calls (e.g. React re-mounts) into one request.
    if (pendingRefresh) {
      return pendingRefresh;
    }

    pendingRefresh = (async () => {
      try {
        const data = await authApi.getSession();

        if (data.status && data.authenticated) {
          set({
            status: 'authenticated',
            user: {
              userId: data.userId,
              roleId: data.roleId,
              email: data.email,
            },
          });
        } else {
          set({ status: 'guest', user: null });
        }
      } catch {
        // A failed check must never block the page.
        set({ status: 'guest', user: null });
      } finally {
        pendingRefresh = null;
      }
    })();

    return pendingRefresh;
  },

  setAuthenticated: (user) => set({ status: 'authenticated', user }),

  clear: () => set({ status: 'guest', user: null }),
}));

const ROLE_LABELS: Record<string, string> = {
  USER: 'Attendee',
  ORGANIZER: 'Organizer',
  STUDENT: 'Student',
  CONTRIBUTOR: 'Contributor',
};

export function getRoleLabel(roleId?: string): string {
  if (!roleId) {
    return 'Attendee';
  }

  return ROLE_LABELS[roleId] ?? roleId;
}
