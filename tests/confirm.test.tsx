// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../src/App';
import { DEFAULT_SETTINGS } from '../src/core/defaults';
import { addModule, updateModule } from '../src/core/modules';
import type { Module, ModuleType, Settings } from '../src/core/types';
import i18n from '../src/i18n';
import { useStore } from '../src/store';

const build = (...specs: [string, ModuleType, Partial<Module>?][]): Module[] =>
  specs.reduce<Module[]>((acc, [id, type, over]) => updateModule(addModule(acc, type, id), id, over ?? {}), []);
const load = (modules: Module[], settings: Partial<Settings> = {}) =>
  act(() => useStore.setState({ modules, settings: { ...DEFAULT_SETTINGS, ...settings }, step: 1, started: true }));
const button = () => screen.getByRole('button', { name: 'Potvrdi i izračunaj' }) as HTMLButtonElement;

beforeEach(async () => {
  localStorage.clear();
  useStore.setState({ settings: DEFAULT_SETTINGS, modules: [], step: 1, started: true, selectedId: null });
  await i18n.changeLanguage('sr');
});
afterEach(cleanup);

describe('validation panel in the builder', () => {
  it('empty project: message, button disabled', () => {
    render(<App />);
    expect(screen.getByText('Dodaj bar jedan element da bi nastavio.')).toBeTruthy();
    expect(button().disabled).toBe(true);
  });

  it('valid project: no issues, button enabled, click opens the report', () => {
    load(build(['a', 'base']));
    render(<App />);
    expect(screen.getByText('Sve je u redu: nema grešaka ni upozorenja.')).toBeTruthy();
    expect(button().disabled).toBe(false);
    fireEvent.click(button());
    expect(useStore.getState().step).toBe(2);
  });

  it('errors are listed with the module and block the button', () => {
    load(build(['a', 'base', { W: 100 }]));
    render(<App />);
    expect(screen.getByText('Donji element 100 (Donji red #1): širina 100 mm je izvan dozvoljenog opsega.')).toBeTruthy();
    expect(screen.getByText('Greške (1)')).toBeTruthy();
    expect(screen.getByText('Ispravi greške da bi nastavio.')).toBeTruthy();
    expect(button().disabled).toBe(true);
    fireEvent.click(button());
    expect(useStore.getState().step).toBe(1); // blocked
  });

  it('warnings alone do not block', () => {
    load(build(['a', 'base']), { wallLength: 2000 });
    render(<App />);
    expect(screen.getByText('Upozorenja (1)')).toBeTruthy();
    expect(screen.getByText('Donji red (600 mm) je kraći od zida (2000 mm): potrebna je popuna.')).toBeTruthy();
    expect(button().disabled).toBe(false);
  });

  it('lengths follow the selected units; the drawer number stays a number', () => {
    load(build(['d', 'drawer', { drawers: [140, 280, 280] }]), { units: 'in' });
    render(<App />);
    expect(screen.getByText(/fronte fioka i fuge zajedno su 27\.91 in, a visina elementa je 28\.35 in/)).toBeTruthy();
    cleanup();
    load(build(['d', 'drawer', { H: 103, drawers: [100] }]));
    render(<App />);
    expect(screen.getByText(/kutija fioke 1 je preniska/)).toBeTruthy();
  });

  it('part names are translated', () => {
    load(build(['t', 'tall', { H: 2781 }]));
    render(<App />);
    expect(screen.getByText(/deo „Bok“ \(2781 mm × 560 mm\) ne staje na ploču/)).toBeTruthy();
  });

  it('English', async () => {
    await i18n.changeLanguage('en');
    load(build(['a', 'base', { W: 100 }]));
    render(<App />);
    expect(screen.getByText('Fix the errors to continue.')).toBeTruthy();
    expect(screen.getByText(/Base cabinet 100 \(Lower row #1\): width 100 mm is out of the allowed range\./)).toBeTruthy();
  });
});
