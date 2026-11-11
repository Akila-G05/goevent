import { apiClient } from '@/lib/api-client';
import { API_ROUTES } from './routes';

export interface GoogleAuthPayload {
  idToken: string;
}

export interface GoogleAuthResponse {
  action?: 'REGISTRATION_REQUIRED' | 'LOGIN' | string;
  status: boolean;
  message?: string;
  [key: string]: any;
}

/**
 * Service to handle authentication requests with the backend.
 */
export const authApi = {
  /**
   * Authenticate user with Google ID token.
   */
  authenticateGoogle: async (payload: GoogleAuthPayload): Promise<GoogleAuthResponse> => {
    const response = await apiClient.post<GoogleAuthResponse>(API_ROUTES.AUTH.GOOGLE, payload);
    return response.data;
  },
};

