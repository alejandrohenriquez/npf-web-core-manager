const BASE_URL = import.meta.env.VITE_NPF_CORE_MANAGER_API_URL || 'http://127.0.0.1:8010/api/v1';

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
