// Theme = which Postiz token block applies. Postiz scopes tokens under `.dark`
// and `.light` on <body>, so we swap that class. Tailwind `dark:` also keys off
// `.dark`. Default follows the system, overridable and remembered.

export type Theme = 'dark' | 'light';

const KEY = 'pm-theme';

export function getTheme(): Theme {
  const saved = localStorage.getItem(KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

export function applyTheme(theme: Theme): void {
  const body = document.body;
  const html = document.documentElement;
  body.classList.toggle('dark', theme === 'dark');
  body.classList.toggle('light', theme === 'light');
  html.classList.toggle('dark', theme === 'dark');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0e0e0e' : '#f0f2f4');
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(KEY, theme);
  applyTheme(theme);
}
