import axios from 'axios';
import { addPendingSync } from '@/lib/offlineDb';

export type OfflineEntity = 'products' | 'retailers' | 'sales' | 'purchases';

// Get API URL from environment variable with fallback for development
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:8001' : 'https://distrohub-backend.vercel.app');

// Validate URL format (but don't crash - just warn)
try {
  new URL(API_URL);
} catch (e) {
  console.error(`[API] WARNING: Invalid URL format: "${API_URL}". Please check VITE_API_URL environment variable.`);
}

if (import.meta.env.DEV) {
  console.log('[API] API URL:', API_URL);
}

// Warn if production and URL not set
if (!import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
  console.warn('[API] WARNING: VITE_API_URL not set in production. Using fallback URL.');
}

/** Paths that must work without a Bearer token */
function isPublicAuthPath(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/register') ||
    url.includes('/api/auth/google')
  );
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000, // 45 seconds timeout (increased to handle Render cold starts)
  withCredentials: false, // Don't send cookies, use Bearer token instead
});

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('token');
  const token = raw?.trim();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (!isPublicAuthPath(config.url)) {
    console.warn('[API] No token for protected request:', config.url);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    return Promise.reject(new Error('No authentication token'));
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env.DEV) {
      console.error('[API] Response error:', {
        message: error?.message,
        code: error?.code,
        status: error?.response?.status,
        data: error?.response?.data,
        url: error?.config?.url,
        hasAuthHeader: !!error?.config?.headers?.Authorization
      });
    }
    
    // Handle timeout errors - provide user-friendly message
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      const friendlyError = new Error(
        'Backend is taking too long to respond. This usually happens when the server is starting up (cold start). Please wait a moment and try again.'
      );
      (friendlyError as any).isTimeout = true;
      (friendlyError as any).originalError = error;
      return Promise.reject(friendlyError);
    }
    
    // Handle network errors
    if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      const friendlyError = new Error(
        'Cannot connect to the server. Please check your internet connection or try again later.'
      );
      (friendlyError as any).isNetworkError = true;
      (friendlyError as any).originalError = error;
      return Promise.reject(friendlyError);
    }
    
    // 503: transient backend/DB — do not clear session (same as network failure for UX)
    if (error.response?.status === 503) {
      return Promise.reject(error);
    }

    // 401: invalid/expired token or user removed — clear session once
    if (error.response?.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        const lock = 'distrohub_auth_redirect';
        if (!sessionStorage.getItem(lock)) {
          sessionStorage.setItem(lock, '1');
          console.warn('[API] 401 Unauthorized - clearing token and redirecting to login');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          setTimeout(() => sessionStorage.removeItem(lock), 2000);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

function isOffline() {
  return !navigator.onLine;
}

function isNetworkFailure(error: any) {
  return error?.code === 'ERR_NETWORK' || error?.isNetworkError || error?.message?.includes('Network Error');
}

export async function getWithOfflineFallback<T>(url: string, fallback: () => Promise<T>) {
  if (isOffline()) {
    return fallback();
  }
  try {
    const response = await api.get<T>(url);
    return response.data;
  } catch (error: any) {
    if (isNetworkFailure(error)) {
      return fallback();
    }
    throw error;
  }
}

export async function postWithOfflineQueue<T extends Record<string, unknown>>(
  entity: OfflineEntity,
  url: string,
  payload: T,
  options?: {
    queueData?: Record<string, unknown>;
    localRecord?: unknown;
    onOfflineSave?: (record: unknown) => Promise<void>;
    onOnlineSave?: (record: unknown) => Promise<void>;
  }
) {
  const queueData = options?.queueData ?? payload;
  const localRecord = options?.localRecord ?? payload;

  if (isOffline()) {
    await options?.onOfflineSave?.(localRecord);
    await addPendingSync({ entity, type: 'create', data: queueData });
    return { data: localRecord, offline: true };
  }

  try {
    const response = await api.post(url, payload);
    await options?.onOnlineSave?.(response.data ?? payload);
    return { data: response.data ?? payload, offline: false };
  } catch (error: any) {
    if (isNetworkFailure(error)) {
      await options?.onOfflineSave?.(localRecord);
      await addPendingSync({ entity, type: 'create', data: queueData });
      return { data: localRecord, offline: true };
    }
    throw error;
  }
}

export async function putWithOfflineQueue<T extends Record<string, unknown>>(
  entity: OfflineEntity,
  url: string,
  payload: T,
  options?: {
    localRecord?: unknown;
    onOfflineSave?: (record: unknown) => Promise<void>;
    onOnlineSave?: (record: unknown) => Promise<void>;
  }
) {
  const localRecord = options?.localRecord ?? payload;

  if (isOffline()) {
    await options?.onOfflineSave?.(localRecord);
    await addPendingSync({ entity, type: 'update', data: localRecord });
    return { data: localRecord, offline: true };
  }

  try {
    const response = await api.put(url, payload);
    await options?.onOnlineSave?.(response.data ?? payload);
    return { data: response.data ?? payload, offline: false };
  } catch (error: any) {
    if (isNetworkFailure(error)) {
      await options?.onOfflineSave?.(localRecord);
      await addPendingSync({ entity, type: 'update', data: localRecord });
      return { data: localRecord, offline: true };
    }
    throw error;
  }
}

export async function deleteWithOfflineQueue(
  entity: OfflineEntity,
  url: string,
  payload: { id: string },
  options?: {
    onOfflineDelete?: (record: { id: string }) => Promise<void>;
    onOnlineDelete?: (record: { id: string }) => Promise<void>;
  }
) {
  if (isOffline()) {
    await options?.onOfflineDelete?.(payload);
    await addPendingSync({ entity, type: 'delete', data: payload });
    return { offline: true };
  }

  try {
    await api.delete(url);
    await options?.onOnlineDelete?.(payload);
    return { offline: false };
  } catch (error: any) {
    if (isNetworkFailure(error)) {
      await options?.onOfflineDelete?.(payload);
      await addPendingSync({ entity, type: 'delete', data: payload });
      return { offline: true };
    }
    throw error;
  }
}
