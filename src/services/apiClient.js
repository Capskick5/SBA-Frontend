import { createError } from './apiError';
import { tokenStorage } from './tokenStorage';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

let refreshPromise = null;

function buildUrl(path) {
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function buildUrlWithParams(path, params = {}) {
  const absolute = buildUrl(path).startsWith('http')
    ? buildUrl(path)
    : `${window.location.origin}${buildUrl(path)}`;
  const url = new URL(absolute);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

function inferErrorType(status) {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'RESOURCE_NOT_FOUND';
  if (status === 409) return 'DUPLICATE_RESOURCE';
  if (status === 429) return 'RATE_LIMITED';
  return 'INTERNAL_SERVER_ERROR';
}

async function parseErrorResponse(response) {
  try {
    const body = await response.json();
    throw createError({
      code: response.status,
      message: body.message,
      error_type: body.errorType || body.error_type || inferErrorType(response.status),
      errors: body.errors,
    });
  } catch (err) {
    if (err?.error_type) throw err;
    throw createError({
      code: response.status,
      message: response.statusText || 'Co loi xay ra.',
      error_type: inferErrorType(response.status),
    });
  }
}

async function refreshAccessToken() {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    throw createError({ code: 401, error_type: 'UNAUTHORIZED' });
  }

  const response = await fetch(buildUrl('/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    tokenStorage.clear();
    await parseErrorResponse(response);
  }

  const body = await response.json();
  const data = body.data;
  tokenStorage.setSession({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: tokenStorage.getUser(),
  });
  return data.accessToken;
}

async function getValidAccessToken() {
  return tokenStorage.getAccessToken();
}

async function request(path, { method = 'GET', body, auth = true, retry = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await getValidAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && auth && retry && tokenStorage.getRefreshToken()) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    await refreshPromise;
    return request(path, { method, body, auth, retry: false });
  }

  if (response.status === 204) {
    if (!response.ok) await parseErrorResponse(response);
    return null;
  }

  if (!response.ok) {
    await parseErrorResponse(response);
  }

  const json = await response.json();
  return json.data;
}

export async function apiGet(path, params) {
  const response = await fetch(buildUrlWithParams(path, params));
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || 'API request failed.';
    throw createError({
      code: response.status,
      message,
      error_type: payload?.errorType || payload?.error_type || inferErrorType(response.status),
      errors: payload?.errors,
    });
  }

  return payload?.data ?? payload;
}

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
  request,
};
