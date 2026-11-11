import { apiClient } from '@/lib/api-client';
import { API_ROUTES } from './routes';

export type RoleId = 1 | 2 | 4; // 1: USER, 2: ORGANIZATION, 4: STUDENT

export interface GoogleAuthBasePayload {
  idToken: string;
}

export interface GoogleAuthUserPayload extends GoogleAuthBasePayload {
  roleId: '1';
}

export interface GoogleAuthStudentPayload extends GoogleAuthBasePayload {
  roleId: '4';
  index: string;
  uniEmail: string;
  uniId: string;
}

export interface GoogleAuthOrgPayload extends GoogleAuthBasePayload {
  roleId: '2';
  orgId: string;
  position: string;
}

export type GoogleRegistrationPayload =
  | GoogleAuthUserPayload
  | GoogleAuthStudentPayload
  | GoogleAuthOrgPayload;

export interface GoogleAuthResponse {
  action?: 'REGISTRATION_REQUIRED' | 'LOGIN' | string;
  status: boolean;
  message?: string;
  userId?: number;
  roleId?: string;
  email?: string;
  [key: string]: any;
}

/**
 * Service to handle authentication requests with the backend.
 */
export const authApi = {
  /**
   * Complete Google Registration or Sign-in with the backend
   */
  authenticateGoogle: async (
    payload: Record<string, string>
  ): Promise<GoogleAuthResponse> => {
    const response = await apiClient.post<GoogleAuthResponse | string>(
      API_ROUTES.AUTH.GOOGLE,
      payload
    );

    if (typeof response.data === 'string') {
      try {
        return JSON.parse(response.data);
      } catch {
        return { status: false, message: response.data };
      }
    }
    return response.data;
  },
};
