'use client';

import { useState } from 'react';
import { authApi } from '@/api';
import { loading } from '@/lib/loading-store';
import { useSessionStore } from '@/lib/session-store';
import { getErrorMessage, toast } from '@/lib/toast-store';

/**
 * Shared logout handler: loading overlay, toast feedback and local session
 * state. Local state is cleared only after the backend confirms.
 */
export function useLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    loading.open();

    try {
      const response = await authApi.logout();

      if (response.status) {
        useSessionStore.getState().clear();
        toast.success('Signed out successfully');
      } else {
        toast.error(response.message || 'Could not sign out. Please try again.');
      }
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not sign out. Please try again.'));
    } finally {
      loading.close(500);
      setIsLoggingOut(false);
    }
  };

  return { logout, isLoggingOut };
}
