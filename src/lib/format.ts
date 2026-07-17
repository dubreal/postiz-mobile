import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/** Postiz stores dates in UTC; render in the viewer's local zone. */
export function toLocal(iso: string) {
  return dayjs.utc(iso).local();
}

export function dayKey(iso: string): string {
  return toLocal(iso).format('YYYY-MM-DD');
}

export function dayHeading(iso: string): string {
  const d = toLocal(iso);
  const today = dayjs().startOf('day');
  const diff = d.startOf('day').diff(today, 'day');
  if (diff === 0) return `Today, ${d.format('MMM D')}`;
  if (diff === 1) return `Tomorrow, ${d.format('MMM D')}`;
  if (diff === -1) return `Yesterday, ${d.format('MMM D')}`;
  return d.format('ddd, MMM D');
}

export function timeLabel(iso: string): string {
  return toLocal(iso).format('h:mm A');
}

/** Convert a datetime-local input value (local) to a UTC ISO string. */
export function localInputToUtcISO(localValue: string): string {
  return dayjs(localValue).utc().toISOString();
}

/** Default schedule value: next top-of-hour, formatted for datetime-local. */
export function defaultScheduleLocal(): string {
  return dayjs().add(1, 'hour').startOf('hour').format('YYYY-MM-DDTHH:mm');
}

/**
 * A post is locked (not editable) once it has published or is publishing now.
 * Postiz has no explicit "publishing" state, so a QUEUE post whose time has
 * arrived counts as in-flight and locked. DRAFT/ERROR/future-QUEUE stay editable.
 */
export function isPostLocked(state: string, publishDateISO: string): boolean {
  if (state === 'PUBLISHED') return true;
  if (state === 'QUEUE' && !toLocal(publishDateISO).isAfter(dayjs())) return true;
  return false;
}

/** Strip HTML tags to a short plain-text preview of post content. */
export function stripHtml(html: string, max = 140): string {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
