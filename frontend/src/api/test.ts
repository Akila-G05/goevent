import { apiClient } from '@/lib/api-client';
import { API_ROUTES } from './routes';

export interface TestResponse {
  status?: boolean;
  message?: string;
  [key: string]: any;
}

export const testApi = {
  getTestConnection: async (): Promise<TestResponse> => {
    const response = await apiClient.get<TestResponse>(API_ROUTES.TEST.BASE);
    return response.data;
  },

  clearGatewayCache: async (): Promise<string> => {
    const response = await apiClient.delete<string>(API_ROUTES.GATEWAY.CLEAR_CACHE);
    return response.data;
  },
};

