// Small typed localStorage store for remembered UI preferences.

export type CalendarView = 'list' | 'day' | 'week' | 'month';
export type CalendarSort = 'desc' | 'asc'; // desc = newest first

export interface CalendarPrefs {
  view: CalendarView;
  sort: CalendarSort;
}

const KEY = 'pm-calendar-prefs';
const DEFAULTS: CalendarPrefs = { view: 'list', sort: 'desc' };

export function getCalendarPrefs(): CalendarPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<CalendarPrefs>;
    return {
      view: (['list', 'day', 'week', 'month'] as const).includes(p.view as CalendarView)
        ? (p.view as CalendarView)
        : DEFAULTS.view,
      sort: p.sort === 'asc' ? 'asc' : 'desc',
    };
  } catch {
    return DEFAULTS;
  }
}

export function setCalendarPrefs(prefs: CalendarPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota/availability errors */
  }
}

// Last Set applied in Compose, so the selector reopens where you left off.
// '' means "No Set".
const LAST_SET_KEY = 'pm-last-set-id';

export function getLastSetId(): string {
  try {
    return localStorage.getItem(LAST_SET_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setLastSetId(id: string): void {
  try {
    localStorage.setItem(LAST_SET_KEY, id);
  } catch {
    /* ignore */
  }
}
