import { apiClient } from '@/lib/api-client';
import { API_PREFIX } from './routes';

/** Fetch for each mutation: login/logout replace the session. Never replay writes. */
export async function csrfHeaders(): Promise<Record<string, string>> {
  const { data } = await apiClient.get<{ headerName: string; token: string }>(`${API_PREFIX}/auth/csrf`);
  if (data.headerName !== 'X-CSRF-TOKEN' || typeof data.token !== 'string' || !data.token) {
    throw new Error('Unable to verify the security token. Refresh before retrying.');
  }
  return { [data.headerName]: data.token };
}
