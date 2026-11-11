// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { DEFAULT_SETTINGS } from '../src/core/defaults';
import { generateHardware } from '../src/core/hardware';
import { addModule, updateModule } from '../src/core/modules';
import { generateParts } from '../src/core/parts';
import type { Module, ModuleType, Settings } from '../src/core/types';
import i18n from '../src/i18n';
import { useStore } from '../src/store';

const build = (...specs: [string, ModuleType, Partial<Module>?][]): Module[] =>
  specs.reduce<Module[]>((acc, [id, type, over]) => updateModule(addModule(acc, type, id), id, over ?? {}), []);
const kitchen = (): Module[] => [
  ...[0, 1, 2, 3].map((i) => build([`b${i}`, 'base'])[0]),
  ...build(['s', 'sink'], ['d', 'drawer']),
  ...[0, 1, 2, 3, 4].map((i) => build([`w${i}`, 'wall'])[0]),
  ...build(['t', 'tall']),
];
// normalise `order` the way the store would
const load = (modules: Module[], settings: Partial<Settings> = {}) => {
  let list: Module[] = [];
  for (const m of modules) list = updateModule(addModule(list, m.type, m.id), m.id, m);
  act(() => useStore.setState({ modules: list, settings: { ...DEFAULT_SETTINGS, ...settings }, step: 2, started: true }));
  return list;
};
const table = (name: string) => screen.getByRole('table', { name });
const cells = (row: HTMLElement) => within(row).getAllByRole('cell').map((c) => c.textContent);
const rowWith = (t: HTMLElement, text: string) => within(t).getAllByRole('row').find((r) => r.textContent?.includes(text))!;

const needSentences = () => within(screen.getByRole('region', { name: 'Treba da kupiš' })).getAllByRole('listitem').map((li) => li.getAttribute('data-sentence'));

// capture what would be downloaded
let blob: Blob | undefined;
let filename = '';
const readBytes = (b: Blob) =>
  new Promise<Uint8Array>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(new Uint8Array(r.result as ArrayBuffer));
    r.readAsArrayBuffer(b);
  });

beforeEach(async () => {
  localStorage.clear();
  blob = undefined;
  URL.createObjectURL = vi.fn((b: Blob) => ((blob = b), 'blob:test'));
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    filename = this.download;
  });
  useStore.setState({ settings: DEFAULT_SETTINGS, modules: [], step: 2, started: true, selectedId: null });
  await i18n.changeLanguage('sr');
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ReportStep', () => {
  it('not ready without modules or with errors; button goes to the builder', () => {
    render(<App />);
    expect(screen.getByText(/Izveštaj nije dostupan/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Idi na Sastavljanje' }));
    expect(useStore.getState().step).toBe(1);
    cleanup();
    load(build(['a', 'base', { W: 100 }]));
    render(<App />);
    expect(screen.getByText(/Izveštaj nije dostupan/)).toBeTruthy();
  });

  it('shopping list: sheets per board with decor, thickness and size, edging, worktop, hardware', () => {
    const modules = load(kitchen(), { decor: { carcass: 'Hrast', front: 'Bela', hdf: '' } });
    render(<App />);
    const sheets = table('Ploče');
    expect(cells(rowWith(sheets, 'Korpus')).slice(0, 5)).toEqual(['Korpus', 'Hrast', '18 mm', '2800 × 2070 mm', '4']);
    expect(cells(rowWith(sheets, 'Front')).slice(0, 5)).toEqual(['Front', 'Bela', '18 mm', '2800 × 2070 mm', '2']);
    expect(cells(rowWith(sheets, 'HDF')).slice(0, 5)).toEqual(['HDF', '', '3 mm', '2800 × 2070 mm', '2']);
    expect(cells(rowWith(sheets, 'Korpus'))[5]).toMatch(/^\d+\.\d%$/);

    expect(cells(rowWith(table('Kant'), 'Hrast')).slice(1)).toHaveLength(2);

    const hw = generateHardware(modules, { ...DEFAULT_SETTINGS });
    const hardware = table('Okovi');
    expect(cells(rowWith(hardware, 'Šarke'))).toEqual([String(hw.hinges)]);
    expect(cells(rowWith(hardware, 'Vođice fioka 550 mm'))).toEqual(['3']);
    expect(cells(rowWith(hardware, 'Konfirmati (procena)'))).toEqual([String(hw.confirmats.qty)]);
    expect(cells(rowWith(table('Radna ploča'), 'Komada'))).toEqual([String(hw.worktop.pieces)]);
  });

  it('cutting list per material as a table', () => {
    load(kitchen());
    render(<App />);
    const carcass = table('Korpus · 18 mm');
    expect(within(carcass).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Naziv', 'Dužina', 'Širina', 'Količina', 'Kant L1', 'Kant L2', 'Kant W1', 'Kant W2', 'Šara',
    ]);
    // 4 base + sink + drawer = 6 cabinets x 2 sides
    expect(cells(rowWith(carcass, 'Bok')).slice(0, 4)).toEqual(['Bok', '720', '560', '12']);
    expect(cells(rowWith(table('HDF · 3 mm'), 'Dno kutije'))[3]).toBe('3');
  });

  it('draws a layout for every sheet with every piece labeled', () => {
    const modules = load(kitchen());
    const { container } = render(<App />);
    expect(container.querySelectorAll('figure')).toHaveLength(4 + 2 + 2);
    const pieces = screen.getAllByTestId('piece');
    expect(pieces).toHaveLength(generateParts(modules, DEFAULT_SETTINGS).reduce((a, p) => a + p.qty, 0));
    const first = pieces.find((p) => /^Bok (720 × 560|560 × 720 ↻)$/.test(p.querySelector('title')!.textContent!))!; // may be rotated
    expect(first).toBeTruthy();
    expect(first.querySelectorAll('text')).toHaveLength(2);
  });

  it('CSV export: one file per board, UTF-8 with BOM, units in the header', async () => {
    load(kitchen());
    render(<App />);
    fireEvent.click(within(document.querySelector('.cutting-list') as HTMLElement).getByRole('button', { name: 'Izvezi CSV' }));
    expect(filename).toBe('kerfly-1-korpus.csv');
    const bytes = await readBytes(blob!);
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder().decode(bytes);
    expect(text.split('\n')[0]).toBe('Naziv,Dužina (mm),Širina (mm),Količina,Kant L1,Kant L2,Kant W1,Kant W2,Šara');
    expect(text).toContain('Bok,720,560,12,Tanak,Bez,Bez,Bez,Ne');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('inches: tables, layouts and CSV use the selected units', async () => {
    load(build(['a', 'base']), { units: 'in' });
    render(<App />);
    expect(cells(rowWith(table('Korpus · 0.71 in'), 'Bok')).slice(0, 3)).toEqual(['Bok', '28.35', '22.05']);
    fireEvent.click(screen.getAllByRole('button', { name: 'Izvezi CSV' })[0]);
    const text = new TextDecoder().decode(await readBytes(blob!));
    expect(text.split('\n')[0]).toContain('Dužina (in),Širina (in)');
    expect(text).toContain('Bok,28.35,22.05,2');
  });

  it('a board without parts is not listed (a wall cabinet without doors has no front)', () => {
    load(build(['w', 'wall', { doors: 0 }]));
    const { container } = render(<App />);
    expect(screen.getAllByRole('button', { name: 'Izvezi CSV' })).toHaveLength(2); // carcass + hdf
    expect(container.querySelectorAll('figure')).toHaveLength(2);
    expect(screen.queryByRole('table', { name: /^Front/ })).toBeNull();
  });

  it('print button calls window.print', () => {
    load(build(['a', 'base']));
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Štampaj' }));
    expect(print).toHaveBeenCalled();
  });

  it('English', async () => {
    await i18n.changeLanguage('en');
    load(build(['a', 'base']));
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Shopping list' })).toBeTruthy();
    expect(table('Edge banding')).toBeTruthy();
    expect(cells(rowWith(table('Carcass · 18 mm'), 'Side')).slice(0, 2)).toEqual(['Side', '720']);
  });
});

describe('written list', () => {
  it('the report starts with what to buy, in sentences', () => {
    load(kitchen(), { decor: { carcass: 'Hrast', front: 'Bela', hdf: '' } });
    render(<App />);
    const items = needSentences();
    expect(items).toContain('4 ploče korpusa (Hrast), 2800 × 2070 × 18 mm');
    expect(items).toContain('2 ploče fronta (Bela), 2800 × 2070 × 18 mm');
    expect(items).toContain('2 HDF ploče, 2800 × 2070 × 3 mm');
    expect(items.some((i) => i?.startsWith('Tanki kant, Hrast: '))).toBe(true);
  });

  it('TXT export: the same list plus the cutting list, next to the CSV files', async () => {
    load(kitchen(), { decor: { carcass: 'Hrast', front: 'Bela', hdf: '' } });
    render(<App />);
    expect(screen.getAllByRole('button', { name: 'Izvezi CSV' })).toHaveLength(3); // CSV is still there
    fireEvent.click(screen.getByRole('button', { name: 'Izvezi spisak (TXT)' }));
    expect(filename).toBe('kerfly-spisak.txt');
    const bytes = await readBytes(blob!);
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('Treba da kupiš:');
    expect(text).toContain('• 4 ploče korpusa (Hrast), 2800 × 2070 × 18 mm');
    expect(text).toContain('KROJNA LISTA');
    expect(text).toContain('Bok | 720 × 560 mm | 12 kom');
  });

  it('English', async () => {
    await i18n.changeLanguage('en');
    load(kitchen());
    render(<App />);
    expect(screen.getByRole('heading', { name: 'You need to buy' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export list (TXT)' })).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'You need to buy' })).getAllByRole('listitem').map((li) => li.getAttribute('data-sentence'))).toContain('4 carcass sheets, 2800 × 2070 × 18 mm');
  });
});
