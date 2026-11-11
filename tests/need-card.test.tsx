// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../src/App';
import { DEFAULT_SETTINGS } from '../src/core/defaults';
import { normalize } from '../src/core/modules';
import type { Module, Settings } from '../src/core/types';
import i18n from '../src/i18n';
import { useStore } from '../src/store';
import { mod } from './helpers';

const load = (modules: Module[], settings: Partial<Settings> = {}) =>
  act(() => useStore.setState({ modules: normalize(modules), settings: { ...DEFAULT_SETTINGS, ...settings }, step: 2, started: true, selectedId: null }));
const card = (name = 'Treba da kupiš') => screen.getByRole('region', { name });
const kitchen = [mod('base', { id: 'a', order: 0 }), mod('drawer', { id: 'd', order: 1 }), mod('wall', { id: 'w', order: 0 })];

beforeEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage('sr');
});
afterEach(cleanup);

describe('shopping list card', () => {
  it('has a block for each kind of thing to buy', () => {
    load(kitchen, { decor: { carcass: 'Hrast', front: 'Bela' } });
    render(<App />);
    const heads = within(card()).getAllByRole('heading', { level: 4 }).map((h) => h.textContent);
    expect(heads).toEqual(['Ploče', 'Kant', 'Radna ploča', 'Okovi']);
  });

  it('every line shows a big quantity apart from the name and the size', () => {
    load(kitchen, { decor: { carcass: 'Hrast', front: 'Bela' } });
    const { container } = render(<App />);
    const first = container.querySelector('.need-sheets .need-item')!;
    expect(first.querySelector('.need-qty')!.textContent).toBe('1');
    expect(first.querySelector('.need-title')!.textContent).toBe('ploča korpusa (Hrast)');
    expect(first.querySelector('.need-detail')!.textContent).toBe('2800 × 2070 × 18 mm');
    expect(first.querySelector('.need-note')!.textContent).toMatch(/^Iskorišćenje: \d+%$/);
    expect(first.getAttribute('data-sentence')).toBe('1 ploča korpusa (Hrast), 2800 × 2070 × 18 mm');
  });

  it('things bought by length show the length as the quantity', () => {
    load(kitchen);
    const { container } = render(<App />);
    const qty = [...container.querySelectorAll('.need-edging .need-qty')].map((q) => q.textContent);
    expect(qty.length).toBeGreaterThan(0);
    expect(qty.every((q) => /^\d+ m$/.test(q!))).toBe(true);
    expect(container.querySelector('.need-worktop .need-item:last-child .need-qty')!.textContent).toMatch(/^\d+ m$/);
  });

  it('there is no block for what is not needed (no worktop for wall cabinets only)', () => {
    load([mod('wall', { id: 'w' })]);
    render(<App />);
    const heads = within(card()).getAllByRole('heading', { level: 4 }).map((h) => h.textContent);
    expect(heads).toEqual(['Ploče', 'Kant', 'Okovi']);
  });

  it('uses the right plural in the title', () => {
    load([mod('base', { id: 'a' })]);
    const { container } = render(<App />);
    expect(container.querySelector('.need-sheets .need-title')!.textContent).toBe('ploča korpusa'); // 1 sheet
  });

  it('English', async () => {
    await i18n.changeLanguage('en');
    load(kitchen, { decor: { carcass: 'Oak', front: '' } });
    const { container } = render(<App />);
    expect(within(card('You need to buy')).getAllByRole('heading', { level: 4 }).map((h) => h.textContent)).toEqual(['Sheets', 'Edge banding', 'Worktop', 'Hardware']);
    expect(container.querySelector('.need-sheets .need-title')!.textContent).toBe('carcass sheet (Oak)');
  });

  it('inches', () => {
    load(kitchen, { units: 'in' });
    const { container } = render(<App />);
    expect(container.querySelector('.need-sheets .need-detail')!.textContent).toBe('110.24 × 81.5 × 0.71 in');
    expect(container.querySelector('.need-edging .need-qty')!.textContent).toMatch(/ft$/);
  });
});
