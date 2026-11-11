export type Theme = 'light' | 'dark';

const KEY = 'kerfly.theme';

/** The theme the user picked, or null to follow the system. */
export function savedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null; // storage blocked
  }
}

/** What is shown right now: the pick, else the system setting. */
export function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === 'light' || set === 'dark') return set;
  const saved = savedTheme();
  if (saved) return saved;
  const dark = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return dark ? 'dark' : 'light';
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // the choice still applies until the page is closed
  }
}

/** Applies the saved pick before the first render (index.html does the same earlier, to avoid a flash). */
export function applySavedTheme(): void {
  const saved = savedTheme();
  if (saved) document.documentElement.dataset.theme = saved;
}
