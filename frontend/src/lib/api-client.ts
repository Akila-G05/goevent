import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { API_BASE_URL } from '@/api/routes';
import { loading } from '@/lib/loading-store';

/** Keeps the loading screen up briefly after the last response so it does not flicker. */
const LOADING_FADE_MS = 300;

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Every request shows the loading screen until it settles. The store counts
// in-flight requests, so the screen stays up while any of them is still running.
apiClient.interceptors.request.use(
  (config) => {
    loading.open();
    return config;
  },
  (error) => {
    loading.close(LOADING_FADE_MS);
    return Promise.reject(error);
  }
);

// Normalise failures so call sites receive a predictable `{ message }` shape.
// Toasts are still managed explicitly by each request handler.
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    loading.close(LOADING_FADE_MS);
    return response;
  },
  (error) => {
    loading.close(LOADING_FADE_MS);
    const customError = {
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      errorCode: error.response?.data?.errorCode || 'NETWORK_ERROR',
      status: error.response?.status,
    };
    return Promise.reject(customError);
  }
);
