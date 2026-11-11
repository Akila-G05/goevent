import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { API_BASE_URL } from '@/api/routes';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    const customError = {
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      errorCode: error.response?.data?.errorCode || 'NETWORK_ERROR',
      status: error.response?.status,
    };
    return Promise.reject(customError);
  }
);

