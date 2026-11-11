import { apiClient } from '@/lib/api-client';
import { API_ROUTES } from './routes';

export const contentApi = {
  getInitialData: async (): Promise<string> => {
    const response = await apiClient.get<string>(API_ROUTES.CONTENT.INITIAL_DATA);
    return response.data;
  },

  getUniversities: async (): Promise<string> => {
    const response = await apiClient.get<string>(API_ROUTES.CONTENT.UNIVERSITIES);
    return response.data;
  },

  getOrganizations: async (): Promise<string> => {
    const response = await apiClient.get<string>(API_ROUTES.CONTENT.ORGANIZATIONS);
    return response.data;
  },
};

