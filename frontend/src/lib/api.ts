import { supabase } from '@/integrations/supabase/client';

function resolveApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  if (raw) {
    if (raw.startsWith('/')) return raw;
    const withProtocol = /^https?:\/\//i.test(raw)
      ? raw
      : /^(localhost|127\.0\.0\.1)/i.test(raw)
      ? `http://${raw}`
      : `https://${raw}`;
    return withProtocol.endsWith('/api') ? withProtocol : `${withProtocol}/api`;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return '/api';
    }
    return 'https://api.tuungane.com/api';
  }
  return 'https://api.tuungane.com/api';
}

const API_BASE_URL = resolveApiBaseUrl();

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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    cache: 'no-cache',
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.clone().json();
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
