const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

function buildUrl(path, params = {}) {
  const url = new URL(`${API_BASE_URL}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  return url;
}

export async function apiGet(path, params) {
  const response = await fetch(buildUrl(path, params));
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || 'API request failed.';
    throw new Error(message);
  }

  return payload?.data ?? payload;
}
