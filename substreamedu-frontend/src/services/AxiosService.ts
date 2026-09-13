import axios, { AxiosError } from 'axios';

import { baseURL } from '../constants/urls';
import { AuthService } from './AuthService';
import { debugLog } from '../utils/debug';

const getClientTimezone = () => {
  try {
    return typeof Intl !== 'undefined' ? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') : 'UTC';
  } catch {
    return 'UTC';
  }
};

const axiosService = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept-Language': 'uk',
    'X-Timezone': getClientTimezone(),
  },
});

let reqInterceptorId: number | null = null;
let resInterceptorId: number | null = null;

export const setupInterceptors = (
  setIsLoggedIn: (value: boolean) => void,
  navigate: (path: string) => void,
  onPremiumLimit?: (type: 'translation' | 'save') => void
) => {
  if (reqInterceptorId !== null) {
    axiosService.interceptors.request.eject(reqInterceptorId);
  }
  if (resInterceptorId !== null) {
    axiosService.interceptors.response.eject(resInterceptorId);
  }

  reqInterceptorId = axiosService.interceptors.request.use((req) => {
    (req as any).metadata = { startTime: new Date() };

    const tz = getClientTimezone();
    if (tz) {
      req.headers['X-Timezone'] = tz;
    }

    const email = AuthService.getUserEmail();
    if (email) {
      req.headers['X-User-Email'] = email;
    }

    const userId = AuthService.getUserId();
    if (userId) {
      req.headers['X-User-Id'] = userId;
    }

    const token = AuthService.getToken();
    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }

    return req;
  }, (error) => Promise.reject(error));

  resInterceptorId = axiosService.interceptors.response.use(
    (response) => {
      const startTime = (response.config as any).metadata?.startTime;
      const duration = startTime ? new Date().getTime() - startTime.getTime() : 0;
      
      console.log(`%c[Performance] ${response.config.method?.toUpperCase()} ${response.config.url} took ${duration}ms`, 'color: cyan; font-weight: bold;');

      if (process.env.NODE_ENV === 'development') {
        debugLog(`[Axios Response] ${response.config.url}:`, response.data);
      }

      
      const isWrapped = response.data &&
        typeof response.data === 'object' &&
        ('success' in response.data || 'status' in response.data) &&
        'data' in response.data;

      if (isWrapped) {
        debugLog(`[Axios Unwrapping] ${response.config.url}:`, response.data.data);
        return { ...response, data: response.data.data };
      }
      return response;
    },
    (error: AxiosError) => {
      if (error.response && error.response.status === 401) {
        AuthService.clearUser();
        setIsLoggedIn(false);
        navigate('/login');
        return Promise.reject(error);
      }

      if (error.response && error.response.status === 403 && onPremiumLimit) {
        const data = error.response.data as any;
        const msg = (data?.message || '').toLowerCase();
        const url = error.config?.url || '';

        if (msg.includes('translation limit') || url.includes('translation/prod')) {
          onPremiumLimit('translation');
        } else if (msg.includes('save limit') || msg.includes('word save') || url.includes('translated')) {
          onPremiumLimit('save');
        }
      }

      const startTime = (error.config as any)?.metadata?.startTime;
      const duration = startTime ? new Date().getTime() - startTime.getTime() : 0;
      console.log(`%c[Performance Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} took ${duration}ms`, 'color: red; font-weight: bold;');

      console.error('HTTP error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method,
        data: error.response?.data,
        message: error.message
      });
      return Promise.reject(error);
    }
  );
};

export { axiosService };