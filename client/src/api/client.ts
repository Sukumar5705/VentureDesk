// Shared API client — always sends credentials (HTTP-only cookie auth)
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

// Event bus for 401 session expiry (listened to by AuthContext)
type SessionExpiredListener = () => void;
let sessionExpiredHandler: SessionExpiredListener | null = null;
export function onSessionExpired(fn: SessionExpiredListener) {
  sessionExpiredHandler = fn;
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
}

class ApiRequestError extends Error {
  status: number;
  code: string;
  details?: Array<{ field: string; message: string }>;
  constructor(status: number, code: string, message: string, details?: Array<{ field: string; message: string }>) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export { ApiRequestError };

/**
 * Core fetch wrapper.
 * Returns the full JSON body as-is — callers are responsible for unwrapping
 * `{ data: T }` or `{ data: T, pagination: {...} }` themselves.
 */
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw new ApiRequestError(0, 'NETWORK_ERROR', 'Network error, please check your connection');
  }

  // Empty responses (204, etc.)
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    if (!res.ok) {
      throw new ApiRequestError(res.status, 'PARSE_ERROR', 'Network error, please check your connection');
    }
    return null as T;
  }

  if (!res.ok) {
    const errBody = body as { error?: { code?: string; message?: string; details?: Array<{ field: string; message: string }> } };
    const code = errBody?.error?.code ?? 'UNKNOWN';
    const message = errBody?.error?.message ?? 'Something went wrong, please try again';
    const details = errBody?.error?.details;

    if (res.status === 401) {
      // Notify AuthContext to clear session (but not for the logout call itself)
      sessionExpiredHandler?.();
      throw new ApiRequestError(401, code, message, details);
    }

    throw new ApiRequestError(res.status, code, message, details);
  }

  // Return the full body — callers unwrap { data: T } or keep pagination
  return body as T;
}

export function get<T>(path: string) {
  return request<T>(path, { method: 'GET' });
}

export function post<T>(path: string, data?: unknown) {
  return request<T>(path, {
    method: 'POST',
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
}

export function patch<T>(path: string, data?: unknown) {
  return request<T>(path, {
    method: 'PATCH',
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
}

export default { get, post, patch };
