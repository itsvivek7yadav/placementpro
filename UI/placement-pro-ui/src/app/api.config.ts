const isBrowser = typeof window !== 'undefined';
const localhostHosts = new Set(['localhost', '127.0.0.1']);

export const IS_LOCAL_FRONTEND =
  isBrowser && localhostHosts.has(window.location.hostname);

// Local dev talks directly to the Express server.
// Production uses same-origin rewrites from Vercel to the backend.
export const BACKEND_ORIGIN = IS_LOCAL_FRONTEND ? 'http://localhost:5050' : '';
export const API_BASE_URL = `${BACKEND_ORIGIN}/api`;

export function buildApiUrl(path = ''): string {
  const normalized = path.replace(/^\/+/, '');
  return normalized ? `${API_BASE_URL}/${normalized}` : API_BASE_URL;
}

export function buildBackendUrl(path = ''): string {
  if (!path) {
    return BACKEND_ORIGIN || '/';
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_ORIGIN}${normalized}`;
}

export function isApiRequestUrl(url: string): boolean {
  if (!url) {
    return false;
  }

  return url.startsWith(`${API_BASE_URL}/`);
}
