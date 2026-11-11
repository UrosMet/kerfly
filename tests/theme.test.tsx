// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { DEFAULT_SETTINGS } from '../src/core/defaults';
import i18n from '../src/i18n';
import { useStore } from '../src/store';
import { applySavedTheme, currentTheme, savedTheme, setTheme } from '../src/ui/theme';

beforeEach(async () => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  useStore.setState({ settings: DEFAULT_SETTINGS, modules: [], step: 0, started: false });
  await i18n.changeLanguage('sr');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('theme', () => {
  it('follows the system until the user picks one', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('dark') }));
    expect(currentTheme()).toBe('dark');
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(currentTheme()).toBe('light');
  });

  it('works without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(currentTheme()).toBe('light');
  });

  it('setTheme applies and saves; applySavedTheme restores it', () => {
    setTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(savedTheme()).toBe('dark');
    delete document.documentElement.dataset.theme;
    applySavedTheme();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('ignores a bad saved value and survives blocked storage', () => {
    localStorage.setItem('kerfly.theme', 'purple');
    expect(savedTheme()).toBeNull();
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(savedTheme()).toBeNull();
    expect(() => setTheme('light')).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});

describe('theme toggle', () => {
  it('is on the landing page and in the app header, and switches the theme both ways', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /tema/i }));
    const first = document.documentElement.dataset.theme;
    expect(['light', 'dark']).toContain(first);
    fireEvent.click(screen.getByRole('button', { name: /tema/i }));
    expect(document.documentElement.dataset.theme).not.toBe(first);

    act(() => useStore.setState({ started: true }));
    expect(screen.getByRole('button', { name: /tema/i })).toBeTruthy();
  });

  it('the label names the theme you switch to, translated', async () => {
    setTheme('dark');
    render(<App />);
    expect(screen.getByRole('button', { name: 'Svetla tema' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Svetla tema' }));
    expect(screen.getByRole('button', { name: 'Tamna tema' })).toBeTruthy();
    await act(() => i18n.changeLanguage('en'));
    expect(screen.getByRole('button', { name: 'Dark theme' })).toBeTruthy();
    expect(localStorage.getItem('kerfly.theme')).toBe('light');
  });
});

describe('landing backdrop', () => {
  it('is decorative: hidden from assistive tech, two layers', () => {
    const { container } = render(<App />);
    const layers = container.querySelectorAll('svg.tools-bg');
    expect(layers).toHaveLength(2);
    layers.forEach((l) => expect(l.getAttribute('aria-hidden')).toBe('true'));
  });
});
