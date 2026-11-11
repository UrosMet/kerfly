// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../src/App';
import { DEFAULT_SETTINGS } from '../src/core/defaults';
import i18n from '../src/i18n';
import { useStore } from '../src/store';

const settings = () => useStore.getState().settings;
const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const type = (label: string, v: string) => fireEvent.change(input(label), { target: { value: v } });

beforeEach(async () => {
  localStorage.clear();
  useStore.setState({ settings: DEFAULT_SETTINGS, modules: [], step: 0 });
  await i18n.changeLanguage('sr');
});
afterEach(cleanup);

describe('SettingsStep', () => {
  it('market change updates units and sheet fields', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Tržište'), { target: { value: 'us' } });
    expect(settings()).toMatchObject({ market: 'us', units: 'in', sheet: { length: 2440, width: 1220 } });
    expect(screen.getByLabelText('Jedinice')).toHaveProperty('value', 'in');
    expect(input('Debljina korpusa').value).toBe('0.709'); // 18 mm in inches
    expect(screen.getAllByLabelText('Dužina')[0]).toHaveProperty('value', '96.063');
  });

  it('accepts a decimal comma and stores mm', () => {
    render(<App />);
    type('Debljina korpusa', '19,5');
    expect(settings().t).toBe(19.5);
  });

  it('in inches, typed values are converted to mm', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Jedinice'), { target: { value: 'in' } });
    type('Fuga između fronti', '0.1');
    expect(settings().gap).toBeCloseTo(2.54, 10);
  });

  it('invalid input is flagged and not stored; blur restores the stored value', () => {
    render(<App />);
    type('Debljina korpusa', 'abc');
    expect(settings().t).toBe(18);
    expect(input('Debljina korpusa').getAttribute('aria-invalid')).toBe('true');
    type('Debljina korpusa', '0'); // thickness must be > 0
    expect(settings().t).toBe(18);
    fireEvent.blur(input('Debljina korpusa'));
    expect(input('Debljina korpusa').value).toBe('18');
  });

  it('gap may be 0 but not negative', () => {
    render(<App />);
    type('Fuga između fronti', '0');
    expect(settings().gap).toBe(0);
    type('Fuga između fronti', '-1');
    expect(settings().gap).toBe(0);
  });

  it('wall length is optional', () => {
    render(<App />);
    type('Dužina zida', '3000');
    expect(settings().wallLength).toBe(3000);
    type('Dužina zida', '');
    expect(settings().wallLength).toBeUndefined();
  });

  it('decors, grain and subtractEdge', () => {
    render(<App />);
    fireEvent.change(input('Dekor korpusa'), { target: { value: 'Hrast' } });
    fireEvent.click(screen.getByLabelText('Front ima šaru (bez rotacije delova)'));
    fireEvent.click(screen.getByLabelText('Oduzmi debljinu kanta od mere sečenja'));
    expect(settings().decor.carcass).toBe('Hrast');
    expect(settings().grain).toEqual({ carcass: false, front: true });
    expect(settings().subtractEdge).toBe(true);
  });

  it('changes are saved to localStorage', () => {
    render(<App />);
    type('Fuga između fronti', '4');
    expect(JSON.parse(localStorage.getItem('kerfly.project')!).settings.gap).toBe(4);
  });
});

describe('App shell', () => {
  it('steps are clickable and the language switches', () => {
    render(<App />);
    fireEvent.click(screen.getByText('4. Izveštaj'));
    expect(screen.getByText(/Izveštaj nije dostupan/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Jezik'), { target: { value: 'en' } });
    expect(screen.getByText('4. Report')).toBeTruthy();
    expect(localStorage.getItem('kerfly.lang')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });
});
