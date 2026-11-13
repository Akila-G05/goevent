import { apiClient } from '@/lib/api-client';
import { API_ROUTES } from './routes';

export interface UserProfileResponse {
  status: boolean;
  message?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  mobile?: string;
  role?: string;
  profileImgUrl?: string;
  /** ISO date (yyyy-MM-dd) of the account registration. */
  registeredDate?: string;
}

const parseUserResponse = (data: UserProfileResponse | string): UserProfileResponse => {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as UserProfileResponse;
    } catch {
      return { status: false, message: data };
    }
  }

  return data;
};

export const userApi = {
  /**
   * Load the profile of the signed-in user (resolved from the session cookie).
   */
  getProfile: async (): Promise<UserProfileResponse> => {
    const response = await apiClient.get<UserProfileResponse | string>(
      API_ROUTES.USER.DATA
    );

    return parseUserResponse(response.data);
  },
};
