import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { API_BASE_URL } from '@/api/routes';
import { loading } from '@/lib/loading-store';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Every request opens the global loading overlay...
apiClient.interceptors.request.use(
  (config) => {
    loading.open();
    return config;
  },
  (error) => Promise.reject(error)
);

// ...and every response (success or failure) closes it after 500 ms.
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    loading.close(500);
    return response;
  },
  (error) => {
    loading.close(500);

    const customError = {
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      errorCode: error.response?.data?.errorCode || 'NETWORK_ERROR',
      status: error.response?.status,
    };
    return Promise.reject(customError);
  }
);
