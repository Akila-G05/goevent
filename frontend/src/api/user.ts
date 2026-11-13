import { apiClient } from '@/lib/api-client';
import { API_BASE_URL, API_ROUTES } from './routes';
import type { OrganizationItem, UniversityItem } from './content';

export type UserAuthType = 'GOOGLE' | 'MANUAL';

export interface StudentProfile {
  indexNo?: string;
  uniEmail?: string;
  universityId?: number;
  universityName?: string;
}

export interface OrganizationProfile {
  organizationId?: number;
  organizationName?: string;
  position?: string;
}

export interface UserOptions {
  universities: UniversityItem[];
  organizations: OrganizationItem[];
}

export interface UserProfileResponse {
  status: boolean;
  message?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  mobile?: string;
  role?: string;
  authType?: UserAuthType | string;
  profileImgUrl?: string;
  /** ISO date (yyyy-MM-dd) of the account registration. */
  registeredDate?: string;
  student?: StudentProfile | null;
  organization?: OrganizationProfile | null;
  options?: UserOptions;
}

export interface UpdateProfilePayload {
  firstName: string;
  lastName: string;
  mobile?: string;
  profileImgUrl?: string;
  student?: {
    indexNo: string;
    uniEmail: string;
    universityId: number;
  };
  organization?: {
    organizationId: number;
    position: string;
  };
}

export interface ProfileImageUploadResponse {
  status: boolean;
  message?: string;
  profileImgUrl?: string;
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

const parseImageResponse = (
  data: ProfileImageUploadResponse | string
): ProfileImageUploadResponse => {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as ProfileImageUploadResponse;
    } catch {
      return { status: false, message: data };
    }
  }

  return data;
};

/**
 * Google avatars are absolute URLs, uploaded images are stored as a path
 * relative to the API origin. Resolve both into something an `<img>` can use.
 */
export function resolveProfileImageUrl(url?: string | null): string | undefined {
  if (!url) {
    return undefined;
  }

  if (/^(https?:|data:|blob:)/i.test(url)) {
    return url;
  }

  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

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

  /**
   * Update the editable profile fields. The backend ignores role, auth type
   * and email and keeps the stored values.
   */
  updateProfile: async (payload: UpdateProfilePayload): Promise<UserProfileResponse> => {
    const response = await apiClient.put<UserProfileResponse | string>(
      API_ROUTES.USER.DATA,
      payload
    );

    return parseUserResponse(response.data);
  },

  /**
   * Upload a profile image (JPEG, PNG or WebP, max 2 MB).
   */
  uploadProfileImage: async (file: File): Promise<ProfileImageUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<ProfileImageUploadResponse | string>(
      API_ROUTES.USER.IMAGE,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );

    return parseImageResponse(response.data);
  },
};
