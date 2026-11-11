// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { DEFAULT_SETTINGS } from '../src/core/defaults';
import { normalize } from '../src/core/modules';
import type { Board, Module, Settings } from '../src/core/types';
import i18n from '../src/i18n';
import { useStore } from '../src/store';
import { mod } from './helpers';

const st = () => useStore.getState();
const bela: Board = { id: 'x', name: 'Bela', thickness: 19, sheet: { length: 2800, width: 2070 }, grain: false };

const load = (modules: Module[], settings: Partial<Settings> = {}, step = 2) =>
  act(() => useStore.setState({ modules: normalize(modules), settings: { ...DEFAULT_SETTINGS, ...settings }, step, started: true, selectedId: null }));
const type = (label: string, v: string) => fireEvent.change(screen.getByLabelText(label), { target: { value: v } });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const table = (name: string | RegExp) => screen.getByRole('table', { name });
const cells = (row: HTMLElement) => within(row).getAllByRole('cell').map((c) => c.textContent);
const rowWith = (t: HTMLElement, text: string) => within(t).getAllByRole('row').find((r) => r.textContent?.includes(text))!;
const needSentences = () => within(screen.getByRole('region', { name: 'Treba da kupiš' })).getAllByRole('listitem').map((li) => li.getAttribute('data-sentence'));
const options = (select: HTMLElement) => within(select).getAllByRole('option').map((o) => o.textContent);

let blob: Blob | undefined;
let filename = '';
const readText = (b: Blob) =>
  new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.readAsText(b);
  });

beforeEach(async () => {
  localStorage.clear();
  blob = undefined;
  URL.createObjectURL = vi.fn((b: Blob) => ((blob = b), 'blob:test'));
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    filename = this.download;
  });
  useStore.setState({ settings: DEFAULT_SETTINGS, modules: [], step: 1, started: true, selectedId: null });
  await i18n.changeLanguage('sr');
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('materials panel', () => {
  it('lists how many extra boards there are, with the right plural', () => {
    render(<App />);
    expect(screen.getByText('nema dodatnih ploča')).toBeTruthy();
    click('+ Dodaj ploču');
    expect(screen.getByText('1 dodatna ploča')).toBeTruthy();
    click('+ Dodaj ploču');
    expect(screen.getByText('2 dodatne ploče')).toBeTruthy();
    for (let i = 0; i < 3; i++) click('+ Dodaj ploču');
    expect(screen.getByText('5 dodatnih ploča')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Ploča 5' })).toBeTruthy();
  });

  it('a board has decor, thickness, sheet size and grain', () => {
    render(<App />);
    click('+ Dodaj ploču');
    type('Tip i boja ploče', 'Hrast Sonoma');
    type('Debljina', '16');
    type('Dužina ploče', '2440');
    type('Širina ploče', '1220,5');
    fireEvent.click(screen.getByLabelText('Ima šaru (bez rotacije delova)'));
    expect(st().settings.boards[0]).toMatchObject({ name: 'Hrast Sonoma', thickness: 16, sheet: { length: 2440, width: 1220.5 }, grain: true });
  });

  it('in inches the board fields take inches and store mm', () => {
    load([], { units: 'in' }, 1);
    render(<App />);
    click('+ Dodaj ploču');
    type('Debljina', '0.75');
    expect(st().settings.boards[0].thickness).toBeCloseTo(19.05, 10);
    expect((screen.getByLabelText('Dužina ploče') as HTMLInputElement).value).toBe('110.236');
  });

  it('removing a board sends the modules that used it back to the defaults', () => {
    load([mod('base', { id: 'a', carcassBoard: 'x', frontBoard: 'x' })], { boards: [bela] }, 1);
    render(<App />);
    click('Ukloni ploču');
    expect(st().settings.boards).toEqual([]);
    expect(st().modules[0]).toMatchObject({ carcassBoard: undefined, frontBoard: undefined });
  });

  it('worktop: decor, thickness, length and depth', () => {
    render(<App />);
    type('Tip i boja radne ploče', 'Beton');
    type('Debljina radne ploče', '40');
    type('Dužina radne ploče', '3000');
    type('Dubina radne ploče', '650');
    expect(st().settings).toMatchObject({ worktopDecor: 'Beton', worktopT: 40, worktopLength: 3000, worktopDepth: 650 });
    type('Dužina radne ploče', '0'); // must be positive
    expect(st().settings.worktopLength).toBe(3000);
  });

  it('is translated', async () => {
    await i18n.changeLanguage('en');
    render(<App />);
    expect(screen.getByText('Materials and worktop')).toBeTruthy();
    expect(screen.getByText('no extra boards')).toBeTruthy();
    click('+ Add board');
    expect(screen.getByText('1 extra board')).toBeTruthy();
    expect(screen.getByLabelText('Board type and color')).toBeTruthy();
    expect(screen.getByLabelText('Worktop depth')).toBeTruthy();
  });
});

describe('typing the board of a cabinet', () => {
  const LABEL = { carcass: 'Ploča korpusa (tip i boja)', front: 'Ploča fronta (tip i boja)' };
  const field = (kind: 'carcass' | 'front') => screen.getByLabelText(LABEL[kind]) as HTMLInputElement;
  const typeBoard = (kind: 'carcass' | 'front', v: string) => {
    fireEvent.change(field(kind), { target: { value: v } });
    fireEvent.blur(field(kind));
  };
  const open = (n = 0) => fireEvent.click(screen.getAllByRole('button', { name: /Donji element · 600/ })[n]);

  it('shows the default board of the project, with its thickness and sheet', () => {
    load([mod('base', { id: 'a' })], { decor: { carcass: 'Hrast', front: '' } }, 1);
    render(<App />);
    open();
    expect(field('carcass').value).toBe('Hrast');
    expect(field('front').value).toBe('');
    expect(field('front').placeholder).toBe('Kao u projektu, ili upiši npr. Iverica Egger bela');
    expect(field('carcass').parentElement!.querySelector('small')!.textContent).toBe('18 mm · 2800 × 2070 mm');
  });

  it('a new name creates a board like the default one and sets it on the cabinet, when the field loses focus', () => {
    load([mod('base', { id: 'a' })], { frontT: 16 }, 1);
    render(<App />);
    open();
    fireEvent.change(field('carcass'), { target: { value: 'Iverica Egger bela' } });
    expect(st().settings.boards).toHaveLength(0); // still typing
    fireEvent.blur(field('carcass'));
    expect(st().settings.boards).toHaveLength(1);
    const b = st().settings.boards[0];
    expect(b).toMatchObject({ name: 'Iverica Egger bela', thickness: 18, sheet: { length: 2800, width: 2070 } });
    expect(st().modules[0].carcassBoard).toBe(b.id);
    expect(st().modules[0].frontBoard).toBeUndefined();
    expect(field('carcass').value).toBe('Iverica Egger bela');

    typeBoard('front', 'MDF crni');
    expect(st().settings.boards[1]).toMatchObject({ name: 'MDF crni', thickness: 16 }); // like the default front board
    expect(st().modules[0].frontBoard).toBe(st().settings.boards[1].id);
  });

  it('Enter applies the name too', () => {
    load([mod('base', { id: 'a' })], {}, 1);
    render(<App />);
    open();
    fireEvent.change(field('carcass'), { target: { value: 'Hrast' } });
    fireEvent.keyDown(field('carcass'), { key: 'Enter' });
    expect(st().settings.boards[0].name).toBe('Hrast');
  });

  it('the same name in another cabinet is the same board, whatever the case or spaces', () => {
    load([mod('base', { id: 'a', order: 0 }), mod('base', { id: 'b', order: 1 })], {}, 1);
    render(<App />);
    open(0);
    typeBoard('carcass', 'Iverica bela');
    open(1);
    typeBoard('carcass', '  iverica BELA ');
    expect(st().settings.boards).toHaveLength(1);
    expect(st().modules[0].carcassBoard).toBe(st().modules[1].carcassBoard);
  });

  it('an empty name or the name of the project default goes back to the default board', () => {
    load([mod('base', { id: 'a', carcassBoard: 'x', frontBoard: 'x' })], { boards: [bela], decor: { carcass: 'Hrast', front: 'Siva' } }, 1);
    render(<App />);
    open();
    typeBoard('carcass', '');
    expect(st().modules[0].carcassBoard).toBeUndefined();
    typeBoard('front', 'siva'); // the default front's own name
    expect(st().modules[0].frontBoard).toBeUndefined();
    expect(field('front').value).toBe('Siva');
    expect(st().settings.boards).toHaveLength(1); // nothing was created
  });

  it('typing the name of the other default board uses that board (sheets are shared)', () => {
    load([mod('base', { id: 'a' })], { decor: { carcass: 'Hrast', front: 'Siva' } }, 1);
    render(<App />);
    open();
    typeBoard('carcass', 'Siva');
    expect(st().modules[0].carcassBoard).toBe('front');
    expect(st().settings.boards).toHaveLength(0);
  });

  it('only blanks do nothing', () => {
    load([mod('base', { id: 'a' })], {}, 1);
    render(<App />);
    open();
    typeBoard('carcass', '   ');
    expect(st().settings.boards).toHaveLength(0);
    expect(st().modules[0].carcassBoard).toBeUndefined();
  });

  it('suggests the names that already exist, once each', () => {
    load([mod('base', { id: 'a' })], { decor: { carcass: 'Hrast', front: 'Hrast' }, boards: [bela, { ...bela, id: 'y', name: ' bela ' }, { ...bela, id: 'z', name: '' }] }, 1);
    render(<App />);
    open();
    const list = document.getElementById('mod-carcass-board-names')!;
    expect([...list.querySelectorAll('option')].map((o) => o.getAttribute('value'))).toEqual(['Hrast', 'Bela', 'bela']);
  });

  it('every cabinet type has the fields', () => {
    load([mod('drawer', { id: 'd' })], {}, 1);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Fiokar · 600/ }));
    expect(field('carcass')).toBeTruthy();
    expect(field('front')).toBeTruthy();
  });

  it('is translated', async () => {
    await i18n.changeLanguage('en');
    load([mod('base', { id: 'a' })], {}, 1);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Base cabinet · 600/ }));
    expect(screen.getByLabelText('Carcass board (type and color)')).toBeTruthy();
    expect(screen.getByLabelText('Front board (type and color)')).toBeTruthy();
  });

  it('the panel says how many cabinets use each board', () => {
    load([mod('base', { id: 'a', order: 0, carcassBoard: 'x' }), mod('base', { id: 'b', order: 1, frontBoard: 'x' })], { boards: [bela, { ...bela, id: 'y', name: 'Mala' }] }, 1);
    render(<App />);
    expect(screen.getByText('Elemenata na ovoj ploči: 2')).toBeTruthy();
    expect(screen.getByText('Ne koristi se ni u jednom elementu.')).toBeTruthy();
  });

  it('end to end: two cabinets, two typed boards, the report says how many of each to buy', () => {
    load([mod('base', { id: 'a', order: 0 }), mod('base', { id: 'b', order: 1 })], {}, 1);
    render(<App />);
    open(0);
    typeBoard('carcass', 'Iverica bela');
    open(1);
    typeBoard('carcass', 'Iverica hrast');
    act(() => st().setStep(2));
    const items = needSentences();
    expect(items).toContain('1 ploča korpusa (Iverica bela), 2800 × 2070 × 18 mm');
    expect(items).toContain('1 ploča korpusa (Iverica hrast), 2800 × 2070 × 18 mm');
    expect(table('Ploče')).toBeTruthy();
    expect(within(table('Ploče')).getAllByRole('row')).toHaveLength(1 + 4); // header + 2 typed + default front + HDF
  });
});

describe('the report with several boards', () => {
  const twoBases = () => [mod('base', { id: 'a', order: 0 }), mod('base', { id: 'b', order: 1, carcassBoard: 'x', frontBoard: 'x' })];

  it('lists every board with decor, thickness and sheet size', () => {
    load(twoBases(), { boards: [bela], decor: { carcass: 'Hrast', front: 'Siva' } });
    render(<App />);
    const sheets = table('Ploče');
    expect(cells(rowWith(sheets, 'Korpus i front')).slice(0, 5)).toEqual(['Korpus i front', 'Bela', '19 mm', '2800 × 2070 mm', '1']);
    expect(cells(rowWith(sheets, 'Hrast')).slice(0, 3)).toEqual(['Korpus', 'Hrast', '18 mm']);
    expect(cells(rowWith(sheets, 'Siva')).slice(0, 3)).toEqual(['Front', 'Siva', '18 mm']);
    expect(within(sheets).getAllByRole('row')).toHaveLength(1 + 4); // header + carcass, front, Bela, HDF
  });

  it('the written list names the board, its decor and its thickness', () => {
    load(twoBases(), { boards: [bela], decor: { carcass: 'Hrast', front: 'Siva' } });
    render(<App />);
    const items = needSentences();
    expect(items).toContain('1 ploča korpusa i fronta (Bela), 2800 × 2070 × 19 mm');
    expect(items).toContain('1 ploča korpusa (Hrast), 2800 × 2070 × 18 mm');
    expect(items).toContain('1 ploča fronta (Siva), 2800 × 2070 × 18 mm');
  });

  it('the cabinet on the thicker board is cut with that thickness', () => {
    load(twoBases(), { boards: [bela] });
    render(<App />);
    const thick = table('Korpus i front — Bela · 19 mm');
    expect(cells(rowWith(thick, 'Dno'))[1]).toBe('562'); // 600 - 2 x 19
    expect(cells(rowWith(table('Korpus · 18 mm'), 'Dno'))[1]).toBe('564'); // 600 - 2 x 18
  });

  it('every board has its own cutting list, layouts and CSV file', async () => {
    load(twoBases(), { boards: [bela] });
    const { container } = render(<App />);
    expect(container.querySelectorAll('.cutting-list')).toHaveLength(4);
    expect(screen.getAllByRole('heading', { name: 'Korpus i front — Bela · 19 mm' })).toHaveLength(2); // list and layouts
    fireEvent.click(within(container.querySelectorAll('.cutting-list')[2] as HTMLElement).getByRole('button', { name: 'Izvezi CSV' }));
    expect(filename).toBe('kerfly-3-korpus-i-front-bela.csv');
    const text = await readText(blob!);
    expect(text).toContain('Dno,562,560,1,Tanak,Bez,Bez,Bez,Ne');
  });

  it('the TXT export has a section per board', async () => {
    load(twoBases(), { boards: [bela] });
    render(<App />);
    click('Izvezi spisak (TXT)');
    const text = await readText(blob!);
    expect(text).toContain('Korpus i front — Bela · 19 mm');
    expect(text).toContain('Korpus · 18 mm');
    expect(text).toContain('HDF · 3 mm');
  });

  it('a board no module uses is not in the report', () => {
    load([mod('base', { id: 'a' })], { boards: [bela] });
    render(<App />);
    expect(screen.queryByRole('table', { name: /Bela/ })).toBeNull();
  });

  it('a part that does not fit its board blocks the report and says which', () => {
    const tiny: Board = { ...bela, sheet: { length: 600, width: 600 } };
    load([mod('base', { id: 'a', carcassBoard: 'x' })], { boards: [tiny] }, 1);
    render(<App />);
    expect(screen.getByText(/ne staje na ploču/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Potvrdi i izračunaj' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('worktop: decor and size in the table and in the written list', () => {
    load(twoBases(), { worktopDecor: 'Beton', worktopT: 40, worktopLength: 3000, worktopDepth: 650 });
    render(<App />);
    const wt = table('Radna ploča');
    expect(cells(rowWith(wt, 'Dekor'))).toEqual(['Beton']);
    expect(cells(rowWith(wt, 'Dimenzije komada'))).toEqual(['3000 × 650 × 40 mm']);
    const items = needSentences();
    expect(items).toContain('1 komad radne ploče (Beton), 3000 × 650 × 40 mm');
  });

  it('inches: board sizes and thicknesses are in inches', () => {
    load(twoBases(), { boards: [bela], units: 'in', worktopLength: 3000, worktopDepth: 650, worktopT: 40 });
    render(<App />);
    expect(cells(rowWith(table('Ploče'), 'Korpus i front')).slice(2, 4)).toEqual(['0.75 in', '110.24 × 81.5 in']);
    const items = needSentences();
    expect(items).toContain('1 ploča korpusa i fronta (Bela), 110.24 × 81.5 × 0.75 in');
    expect(items).toContain('1 komad radne ploče, 118.11 × 25.59 × 1.57 in');
    expect(document.body.textContent).not.toMatch(/\d\s?mm\b/);
  });

  it('English', async () => {
    await i18n.changeLanguage('en');
    load(twoBases(), { boards: [bela] });
    render(<App />);
    expect(cells(rowWith(table('Sheets'), 'Carcass and front')).slice(0, 3)).toEqual(['Carcass and front', 'Bela', '19 mm']);
    expect(within(screen.getByRole('region', { name: 'You need to buy' })).getAllByRole('listitem').map((li) => li.getAttribute('data-sentence'))).toContain('1 carcass and front sheet (Bela), 2800 × 2070 × 19 mm');
  });
});

describe('settings: front and HDF thickness', () => {
  it('are separate fields and show up in the report', () => {
    load([mod('base', { id: 'a' })], {}, 0);
    render(<App />);
    type('Debljina fronta', '16');
    type('Debljina HDF-a', '4');
    expect(st().settings).toMatchObject({ frontT: 16, hdfT: 4 });
    act(() => st().setStep(2));
    expect(cells(rowWith(table('Ploče'), 'HDF')).slice(0, 3)).toEqual(['HDF', '', '4 mm']);
    expect(cells(rowWith(table('Ploče'), 'Front')).slice(0, 3)).toEqual(['Front', '', '16 mm']);
  });

  it('changing the market keeps the front thickness in line with the carcass thickness preset', () => {
    st().setMarket('us');
    expect(st().settings).toMatchObject({ t: 18, frontT: 18 });
  });
});
