import { apiClient } from '@/lib/api-client';
import { API_ROUTES } from './routes';

export interface UniversityItem {
  id: number;
  name: string;
}

export interface OrganizationItem {
  id: number;
  name: string;
  org_type_id: number;
  type: string;
}

export interface ContentResponse<T> {
  data: T;
  status: boolean;
  message: string;
}

export const contentApi = {
  getInitialData: async (): Promise<any> => {
    const response = await apiClient.get<ContentResponse<any> | string>(API_ROUTES.CONTENT.INITIAL_DATA);
    if (typeof response.data === 'string') {
      try {
        return JSON.parse(response.data);
      } catch {
        return response.data;
      }
    }
    return response.data;
  },

  getUniversities: async (): Promise<ContentResponse<UniversityItem[]>> => {
    const response = await apiClient.get<ContentResponse<UniversityItem[]> | string>(API_ROUTES.CONTENT.UNIVERSITIES);
    if (typeof response.data === 'string') {
      return JSON.parse(response.data);
    }
    return response.data;
  },

  getOrganizations: async (): Promise<ContentResponse<OrganizationItem[]>> => {
    const response = await apiClient.get<ContentResponse<OrganizationItem[]> | string>(API_ROUTES.CONTENT.ORGANIZATIONS);
    if (typeof response.data === 'string') {
      return JSON.parse(response.data);
    }
    return response.data;
  },
};
