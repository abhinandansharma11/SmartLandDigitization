// ==========================================
// BhumiSetu - API Client (talks to the Bhu-Digitize FastAPI backend)
// ==========================================

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || '/api/v1';

const TOKEN_KEY = 'bhoomi-token';
let token: string | null = null;
try { token = localStorage.getItem(TOKEN_KEY); } catch { /* storage unavailable */ }

export const getToken = () => token;
export function setToken(t: string | null) {
  token = t;
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

// Called when the backend says the session is no longer valid (set by the auth store).
let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

type Opts = { method?: string; json?: unknown; body?: BodyInit; params?: Record<string, string | number | boolean | undefined | null>; auth?: boolean };

async function request<T>(endpoint: string, opts: Opts = {}): Promise<T> {
  const url = new URL(API_BASE_URL + endpoint, window.location.origin);
  for (const [k, v] of Object.entries(opts.params || {})) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  const headers: Record<string, string> = {};
  if (opts.auth !== false && token) headers.Authorization = `Bearer ${token}`;
  let body = opts.body;
  if (opts.json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(opts.json); }
  const res = await fetch(url.toString(), { method: opts.method || 'GET', headers, body });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = typeof j.detail === 'string' ? j.detail : Array.isArray(j.detail) ? j.detail.map((d: any) => d.msg).join('; ') : JSON.stringify(j.detail ?? j);
    } catch { /* not JSON */ }
    if (res.status === 401 && opts.auth !== false && token) onUnauthorized();
    throw new ApiError(res.status, msg);
  }
  const ct = res.headers.get('content-type') || '';
  return (ct.includes('json') ? res.json() : res.text()) as Promise<T>;
}

export const apiClient = {
  baseURL: API_BASE_URL,
  get: <T>(endpoint: string, params?: Opts['params'], auth = true) => request<T>(endpoint, { params, auth }),
  post: <T>(endpoint: string, json?: unknown) => request<T>(endpoint, { method: 'POST', json }),
  put: <T>(endpoint: string, json?: unknown) => request<T>(endpoint, { method: 'PUT', json }),
  patch: <T>(endpoint: string, json?: unknown) => request<T>(endpoint, { method: 'PATCH', json }),
  upload: <T>(endpoint: string, form: FormData) => request<T>(endpoint, { method: 'POST', body: form }),
};

/** Image URLs carry the token as a query parameter because <img> cannot send headers. */
export const pageImageUrl = (docId: string, page = 1, kind: 'processed' | 'original' = 'processed') =>
  `${API_BASE_URL}/documents/${docId}/pages/${page}/image?kind=${kind}&token=${encodeURIComponent(token || '')}`;
export const originalFileUrl = (docId: string) => `${API_BASE_URL}/documents/${docId}/original?token=${encodeURIComponent(token || '')}`;

// Kept for any leftover mock helpers.
export function delay(ms = 300): Promise<void> { return new Promise(r => setTimeout(r, ms)); }
