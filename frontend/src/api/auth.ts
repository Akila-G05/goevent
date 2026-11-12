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
  action?: 'REGISTRATION_REQUIRED' | 'REGISTERED' | 'REGISTRATION_PENDING' | 'LOGIN' | string;
  status: boolean;
  message?: string;
  userId?: number;
  roleId?: string;
  email?: string;
  [key: string]: any;
}

export interface ManualRegistrationData {
  fname: string;
  lname: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ManualRegistrationPayload extends ManualRegistrationData {
  roleId: string;
  index?: string;
  uniEmail?: string;
  uniId?: string;
  orgId?: string;
  position?: string;
}

export interface ManualLoginPayload {
  email: string;
  password: string;
}

const parseAuthResponse = (data: GoogleAuthResponse | string): GoogleAuthResponse => {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as GoogleAuthResponse;
    } catch {
      return { status: false, message: data };
    }
  }

  return data;
};

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

    return parseAuthResponse(response.data);
  },

  /**
   * Complete a manual (email/password) registration with a selected role.
   */
  registerManual: async (
    payload: ManualRegistrationPayload
  ): Promise<GoogleAuthResponse> => {
    const response = await apiClient.post<GoogleAuthResponse | string>(
      API_ROUTES.AUTH.REGISTER,
      payload
    );

    return parseAuthResponse(response.data);
  },

  /**
   * Sign in with an email/password account.
   */
  authenticateManual: async (
    payload: ManualLoginPayload
  ): Promise<GoogleAuthResponse> => {
    const response = await apiClient.post<GoogleAuthResponse | string>(
      API_ROUTES.AUTH.MANUAL,
      payload
    );

    return parseAuthResponse(response.data);
  },
};
