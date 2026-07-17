// Thin client for the host's Postiz API, reached SAME-ORIGIN through the Caddy
// reverse proxy (`/api/*` -> Postiz). The browser holds Postiz's httpOnly `auth`
// cookie; this code never reads, stores, or logs it (nor the password). We only
// rely on the browser attaching the cookie automatically.

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Thrown when the session is missing/expired (HTTP 401). Callers route to login. */
export class UnauthorizedError extends ApiError {
  constructor(message = 'Not authenticated') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

type Json = Record<string, unknown> | unknown[];

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      credentials: 'include',
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body && !(init.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'Network error reaching the server.');
  }

  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(res.status, text || `Request failed (${res.status})`);
  }

  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: Json) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: Json) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  raw: request,
};
