import { supabase } from '@/integrations/supabase/client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Core API client that automatically injects the Supabase JWT token.
 */
export type ApiClientType = {
  <T = any>(endpoint: string, options?: RequestInit): Promise<T>;
  get: <T = any>(endpoint: string, config?: any) => Promise<T>;
  post: <T = any>(endpoint: string, body?: any, config?: any) => Promise<T>;
  put: <T = any>(endpoint: string, body?: any, config?: any) => Promise<T>;
  patch: <T = any>(endpoint: string, body?: any, config?: any) => Promise<T>;
  delete: <T = any>(endpoint: string, config?: any) => Promise<T>;
};

const _apiClient = async function<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      errorMessage = await response.text();
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
};

export const apiClient = _apiClient as ApiClientType;

apiClient.get = async function<T = any>(endpoint: string, config?: any) {
  const params = config?.params;
  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const key in params) {
      if (params[key] !== undefined && params[key] !== null) {
        searchParams.append(key, String(params[key]));
      }
    }
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }
  return _apiClient<T>(url, { method: 'GET', ...config });
};

apiClient.post = async function<T = any>(endpoint: string, body?: any, config?: any) {
  return _apiClient<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    ...config,
  });
};

apiClient.put = async function<T = any>(endpoint: string, body?: any, config?: any) {
  return _apiClient<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
    ...config,
  });
};

apiClient.patch = async function<T = any>(endpoint: string, body?: any, config?: any) {
  return _apiClient<T>(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
    ...config,
  });
};

apiClient.delete = async function<T = any>(endpoint: string, config?: any) {
  return _apiClient<T>(endpoint, { method: 'DELETE', ...config });
};
