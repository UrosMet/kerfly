// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../src/App';
import { DEFAULT_SETTINGS } from '../src/core/defaults';
import { addModule } from '../src/core/modules';
import en from '../src/i18n/en.json';
import i18n from '../src/i18n';
import sr from '../src/i18n/sr.json';
import { useStore } from '../src/store';

// plural forms differ by language (sr has _few), so compare keys without the plural suffix
const keys = (o: object, prefix = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`.replace(/_(zero|one|two|few|many|other)$/, '')]));

beforeEach(async () => {
  localStorage.clear();
  useStore.setState({ settings: DEFAULT_SETTINGS, modules: [], step: 0, started: false, selectedId: null });
  await i18n.changeLanguage('sr');
});
afterEach(cleanup);

describe('i18n', () => {
  it('sr and en have exactly the same keys', () => {
    expect([...new Set(keys(sr))].sort()).toEqual([...new Set(keys(en))].sort());
  });
});

describe('landing page', () => {
  it('is shown first and explains what Kerfly does and how', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Složi kuhinju. Dobij tačan spisak za kupovinu i sečenje.');
    for (const h of ['Kako radi', 'Šta dobijaš', 'Bez naloga i bez servera', 'Ograničenja']) {
      expect(screen.getByRole('heading', { name: h })).toBeTruthy();
    }
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(9); // 3 steps + 6 features
    expect(screen.getByText('Ugaoni elementi nisu podržani u ovoj verziji.')).toBeTruthy();
    expect(screen.queryByRole('navigation')).toBeNull(); // the stepper belongs to the app
  });

  it('the start button opens the settings step', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Počni projekat' })[0]);
    expect(useStore.getState()).toMatchObject({ started: true, step: 0 });
    expect(screen.getByRole('heading', { name: 'Podešavanja' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Koraci' })).toBeTruthy();
  });

  it('offers to continue a saved project, straight to the builder', () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: 'Nastavi projekat' })).toBeNull();
    cleanup();
    act(() => useStore.setState({ modules: addModule([], 'base', 'a') }));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Nastavi projekat' }));
    expect(useStore.getState()).toMatchObject({ started: true, step: 1 });
    expect(screen.getByRole('heading', { name: 'Sastavljanje' })).toBeTruthy();
  });

  it('the brand in the app header goes back to the landing page, keeping the project', () => {
    act(() => useStore.setState({ started: true, modules: addModule([], 'base', 'a') }));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Početna' }));
    expect(useStore.getState().started).toBe(false);
    expect(useStore.getState().modules).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
  });

  it('is translated: switching language on the landing page', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Design your kitchen. Get the exact shopping and cutting list.');
    expect(screen.getByRole('heading', { name: 'How it works' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Start a project' })).toHaveLength(2); // hero and closing call to action
    expect(screen.queryByText('Kako radi')).toBeNull();
  });
});

describe('App', () => {
  beforeEach(() => act(() => useStore.setState({ started: true })));

  it('has 3 steps (the check lives inside the builder), Serbian by default', () => {
    render(<App />);
    const stepper = screen.getByRole('navigation', { name: 'Koraci' });
    expect(Array.from(stepper.querySelectorAll('button')).map((b) => b.textContent)).toEqual(['1Podešavanja', '2Sastavljanje', '3Izveštaj']);
    for (const w of ['Tržište', 'Dekor korpusa', 'Dužina zida']) expect(screen.getByLabelText(w)).toBeTruthy();
  });

  it('marks the current step', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Sastavljanje/ }));
    expect(screen.getByRole('button', { name: /Sastavljanje/ }).getAttribute('aria-current')).toBe('step');
    expect(screen.getByRole('button', { name: /Podešavanja/ }).getAttribute('aria-current')).toBeNull();
  });

  it('switches to English', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    const stepper = screen.getByRole('navigation', { name: 'Steps' });
    expect(Array.from(stepper.querySelectorAll('button')).map((b) => b.textContent)).toEqual(['1Settings', '2Builder', '3Report']);
    for (const w of ['Market', 'Carcass decor', 'Wall length']) expect(screen.getByLabelText(w)).toBeTruthy();
    expect(screen.queryByText('Tržište')).toBeNull();
  });

  it('the builder has the confirm bar with the status of the check', () => {
    act(() => useStore.setState({ step: 1 }));
    render(<App />);
    expect(screen.getByRole('button', { name: 'Potvrdi i izračunaj' })).toBeTruthy();
    expect(screen.getByText('Dodaj bar jedan element da bi nastavio.')).toBeTruthy();
  });
});
