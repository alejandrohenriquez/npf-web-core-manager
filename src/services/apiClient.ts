declare global {
  interface Window {
    __NPF_CONFIG__?: {
      API_URL?: string;
      BACKEND_URL?: string;
    };
  }
}

function normalizeApiUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (trimmed.endsWith('/api/v1')) return trimmed;
  if (trimmed.endsWith('/api')) return `${trimmed}/v1`;
  return `${trimmed}/api/v1`;
}

function resolveBaseUrl(): string {
  const runtimeCfg = typeof window !== 'undefined' ? window.__NPF_CONFIG__ : undefined;
  const runtimeRaw = runtimeCfg?.API_URL || runtimeCfg?.BACKEND_URL;
  if (runtimeRaw && runtimeRaw.trim() !== '') {
    return normalizeApiUrl(runtimeRaw);
  }

  const buildEnvUrl = import.meta.env.VITE_NPF_CORE_MANAGER_API_URL;
  if (buildEnvUrl && buildEnvUrl.trim() !== '' && buildEnvUrl.trim() !== '/api/v1') {
    return normalizeApiUrl(buildEnvUrl);
  }

  const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : '127.0.0.1';
  return `http://${host}:8010/api/v1`;
}

export const BASE_URL = resolveBaseUrl();

export function getBackendDisplayHost(): string {
  try {
    const u = new URL(BASE_URL, typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8010');
    return u.host;
  } catch {
    return BASE_URL;
  }
}

export async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let errorDetail = 'Unknown error';
    try {
      const errJson = await response.json();
      errorDetail = errJson.message || JSON.stringify(errJson);
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(`API Error [${response.status}]: ${errorDetail}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
