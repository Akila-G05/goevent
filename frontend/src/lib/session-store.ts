import { create } from 'zustand';
import { authApi } from '@/api';

export type SessionStatus = 'loading' | 'authenticated' | 'guest';

export interface SessionUser {
  userId?: number;
  name?: string;
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

export const useSessionStore = create<SessionState>((set, get) => ({
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
              name: data.name,
              roleId: data.roleId,
              email: data.email,
            },
          });
        } else {
          set({ status: 'guest', user: null });
        }
      } catch {
        // A failed check must never block the page. Only an unresolved
        // initial check falls back to guest; an already signed-in user
        // keeps their session if a later refresh fails.
        if (get().status !== 'authenticated') {
          set({ status: 'guest', user: null });
        }
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

/** Name shown in the UI, falling back to the email address. */
export function getDisplayName(user: SessionUser | null): string {
  return user?.name || user?.email || 'GoEvent member';
}
