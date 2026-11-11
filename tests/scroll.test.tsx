// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { DEFAULT_SETTINGS } from '../src/core/defaults';
import { addModule } from '../src/core/modules';
import i18n from '../src/i18n';
import { useStore } from '../src/store';

let scrollTo: ReturnType<typeof vi.spyOn>;
const start = (over: Partial<ReturnType<typeof useStore.getState>> = {}) =>
  act(() => useStore.setState({ settings: DEFAULT_SETTINGS, modules: addModule([], 'base', 'a'), step: 0, started: true, selectedId: null, ...over }));

beforeEach(async () => {
  localStorage.clear();
  scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  await i18n.changeLanguage('sr');
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('a new step starts at the top of the page', () => {
  it('not on the first render (the browser keeps its own scroll position on reload)', () => {
    start();
    render(<App />);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('clicking another step', () => {
    start();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Sastavljanje/ }));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    fireEvent.click(screen.getByRole('button', { name: /Izveštaj/ }));
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });

  it('clicking the step you are already on does nothing', () => {
    start();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Podešavanja/ }));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('the Next button in the settings', () => {
    start();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Dalje/ }));
    expect(useStore.getState().step).toBe(1);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('"Confirm and calculate" in the builder', () => {
    start({ step: 1 });
    render(<App />);
    scrollTo.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Potvrdi i izračunaj' }));
    expect(useStore.getState().step).toBe(2);
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('the report\'s button back to the builder', () => {
    start({ step: 2, modules: [] });
    render(<App />);
    scrollTo.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Idi na Sastavljanje' }));
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('from the landing page into the app, and back to the landing page', () => {
    start({ started: false });
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Počni projekat' })[0]);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Početna' }));
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });

  it('a step changed from outside (the store) scrolls too', () => {
    start();
    render(<App />);
    act(() => useStore.getState().setStep(1));
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });
});

describe('other changes do not move the page', () => {
  it('language, theme, adding and selecting a cabinet, typing', () => {
    start({ step: 1 });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    fireEvent.click(screen.getByRole('button', { name: /theme/i }));
    fireEvent.click(screen.getByRole('button', { name: '+ Base cabinet' }));
    fireEvent.click(screen.getAllByRole('button', { name: /Base cabinet · 600/ })[0]);
    fireEvent.change(screen.getByLabelText('Width'), { target: { value: '700' } });
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
