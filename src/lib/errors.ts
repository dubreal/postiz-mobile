import { ApiError } from './api';
import { providerLabel } from './providers';

/**
 * Turn any thrown value into a short, human-readable message for the UI.
 * Postiz returns validation failures as a JSON body (single object or array of
 * `{ provider, name, message }`); we unwrap those into plain sentences instead of
 * dumping raw JSON at the user.
 */
export function friendlyError(
  err: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (err instanceof ApiError) {
    if (err.status === 0)
      return 'Cannot reach the server. Check your connection and try again.';
    if (err.status === 401) return 'Your session expired. Please sign in again.';
    const parsed = parseValidation(err.message);
    if (parsed) return parsed;
    if (err.status >= 500) return 'The server had a problem. Please try again.';
    const t = (err.message ?? '').trim();
    if (t && t.length <= 200 && !/^[[{<]/.test(t)) return ensurePeriod(t);
    return fallback;
  }
  if (err instanceof Error) {
    const t = (err.message ?? '').trim();
    if (t && !/^[[{<]/.test(t)) return ensurePeriod(t);
  }
  return fallback;
}

/** Unwrap a Postiz validation JSON body into a readable sentence, or null. */
function parseValidation(body: string): string | null {
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    return null;
  }
  const items = Array.isArray(data) ? data : [data];
  const msgs: string[] = [];
  for (const it of items) {
    if (it && typeof it === 'object') {
      const o = it as Record<string, unknown>;
      const raw =
        typeof o.message === 'string'
          ? o.message
          : typeof o.msg === 'string'
            ? o.msg
            : typeof o.error === 'string'
              ? o.error
              : '';
      if (!raw) continue;
      const prov = typeof o.provider === 'string' ? providerLabel(o.provider) : '';
      msgs.push(prov ? `${prov}: ${raw}` : raw);
    } else if (typeof it === 'string' && it.trim()) {
      msgs.push(it.trim());
    }
  }
  if (!msgs.length) return null;
  return [...new Set(msgs)].map(ensurePeriod).join(' ');
}

function ensurePeriod(s: string): string {
  const t = s.trim();
  return !t || /[.!?:]$/.test(t) ? t : `${t}.`;
}
