// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../src/App';
import { DEFAULT_SETTINGS } from '../src/core/defaults';
import { edgeMeters } from '../src/core/edging';
import { normalize } from '../src/core/modules';
import { generateParts } from '../src/core/parts';
import type { Board, Module, Settings } from '../src/core/types';
import i18n from '../src/i18n';
import { useStore } from '../src/store';
import { mod } from './helpers';

const st = () => useStore.getState();
const load = (modules: Module[], settings: Partial<Settings> = {}, step = 1) =>
  act(() => useStore.setState({ modules: normalize(modules), settings: { ...DEFAULT_SETTINGS, ...settings }, step, started: true, selectedId: null }));
const type = (label: string, v: string) => fireEvent.change(screen.getByLabelText(label), { target: { value: v } });
const typeBlur = (label: string, v: string) => {
  type(label, v);
  fireEvent.blur(screen.getByLabelText(label));
};
const table = (name: string | RegExp) => screen.getByRole('table', { name });
const cells = (row: HTMLElement) => within(row).getAllByRole('cell').map((c) => c.textContent);
const rowWith = (t: HTMLElement, text: string) => within(t).getAllByRole('row').find((r) => r.textContent?.includes(text))!;
const open = (name: RegExp = /Donji element · 600/) => fireEvent.click(screen.getAllByRole('button', { name })[0]);
const needSentences = () => within(screen.getByRole('region', { name: 'Treba da kupiš' })).getAllByRole('listitem').map((li) => li.getAttribute('data-sentence'));
const COLOR_CARCASS = 'Boja na crtežu: Ploča korpusa (tip i boja)';
const COLOR_FRONT = 'Boja na crtežu: Ploča fronta (tip i boja)';

beforeEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage('sr');
});
afterEach(cleanup);

describe('HDF per cabinet', () => {
  it('the card has an HDF field, except for the sink (it has no HDF parts)', () => {
    load([mod('base', { id: 'a' }), mod('sink', { id: 's', order: 1 })]);
    render(<App />);
    open();
    expect(screen.getByLabelText('Ploča HDF (tip i boja)')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Sudopera · 800/ }));
    expect(screen.queryByLabelText('Ploča HDF (tip i boja)')).toBeNull();
  });

  it('typing an HDF name makes an HDF board (3 mm) for the cabinet; the report lists it apart', () => {
    load([mod('base', { id: 'a', order: 0 }), mod('base', { id: 'b', order: 1 })]);
    render(<App />);
    open();
    typeBlur('Ploča HDF (tip i boja)', 'HDF bela');
    expect(st().settings.boards[0]).toMatchObject({ name: 'HDF bela', thickness: 3, auto: true });
    expect(st().modules[0].hdfBoard).toBe(st().settings.boards[0].id);
    act(() => st().setStep(2));
    expect(cells(rowWith(table('Ploče'), 'HDF bela')).slice(0, 4)).toEqual(['HDF', 'HDF bela', '3 mm', '2800 × 2070 mm']);
    expect(table('HDF — HDF bela · 3 mm')).toBeTruthy(); // its own cutting list
    expect(table('HDF · 3 mm')).toBeTruthy(); // the other cabinet keeps the default HDF
  });

  it('the project\'s default HDF has a type and color in the settings', () => {
    load([mod('base', { id: 'a' })], {}, 0);
    render(<App />);
    type('Tip i boja HDF-a', 'HDF smeđi');
    expect(st().settings.decor.hdf).toBe('HDF smeđi');
    act(() => st().setStep(1));
    open();
    expect((screen.getByLabelText('Ploča HDF (tip i boja)') as HTMLInputElement).value).toBe('HDF smeđi');
  });
});

describe('edge banding per board', () => {
  it('settings: thicknesses and the banding of the carcass and the fronts', () => {
    load([], {}, 0);
    render(<App />);
    type('Debljina tankog kanta', '0,8');
    type('Debljina debelog kanta', '1');
    type('Kant korpusa (tip i boja)', 'ABS bela');
    type('Kant fronta (tip i boja)', 'ABS siva');
    expect(st().settings).toMatchObject({ edgeThin: 0.8, edgeThick: 1, edgeName: { carcass: 'ABS bela', front: 'ABS siva' } });
    type('Debljina tankog kanta', '0'); // must be positive
    expect(st().settings.edgeThin).toBe(0.8);
  });

  it('a board of its own has its banding: name and both thicknesses', () => {
    load([mod('base', { id: 'a' })], { boards: [{ id: 'x', name: 'Hrast', thickness: 18, sheet: { length: 2800, width: 2070 }, grain: false }] });
    render(<App />);
    type('Kant (tip i boja)', 'ABS hrast');
    expect(st().settings.boards[0].edge).toEqual({ name: 'ABS hrast', thin: 0.45, thick: 2 }); // the project's thicknesses to begin with
    type('Debljina tankog kanta', '1');
    type('Debljina debelog kanta', '2,5');
    expect(st().settings.boards[0].edge).toEqual({ name: 'ABS hrast', thin: 1, thick: 2.5 });
  });

  it('the report lists each banding and the shopping list names it', () => {
    const modules = [mod('base', { id: 'a', order: 0 }), mod('base', { id: 'b', order: 1, frontBoard: 'x' })];
    const x: Board = { id: 'x', name: 'Siva', thickness: 18, sheet: { length: 2800, width: 2070 }, grain: false, edge: { name: 'ABS siva', thin: 0.45, thick: 2 } };
    const settings = { ...DEFAULT_SETTINGS, boards: [x], decor: { carcass: 'Hrast', front: 'Bela', hdf: '' }, edgeName: { carcass: 'ABS hrast', front: '' } };
    load(modules, settings, 2);
    render(<App />);
    const lines = edgeMeters(generateParts(normalize(modules), settings), settings);
    expect(lines.map((l) => l.name)).toEqual(['ABS hrast', 'Bela', 'ABS siva']);
    const edging = table('Kant');
    expect(cells(rowWith(edging, 'ABS hrast')).slice(0, 2)).toEqual(['ABS hrast', `${lines[0].thin} m`]);
    expect(within(edging).getAllByRole('row')).toHaveLength(1 + 3);
    const items = needSentences();
    expect(items).toContain(`Tanki kant, ABS hrast: ${lines[0].thin} m`);
    expect(items).toContain(`Debeli kant, ABS siva: ${lines[2].thick} m`);
  });

  it('banding with the same name on carcass and front is bought together', () => {
    load([mod('base', { id: 'a' })], { edgeName: { carcass: 'ABS bela', front: 'abs bela' } }, 2);
    render(<App />);
    expect(within(table('Kant')).getAllByRole('row')).toHaveLength(1 + 1); // one line
    expect(needSentences().filter((s) => s?.includes('ABS bela'))).toHaveLength(2); // thin and thick
  });

  it('subtractEdge uses the banding thickness of the cabinet\'s board', () => {
    const x: Board = { id: 'x', name: 'Debeli', thickness: 18, sheet: { length: 2800, width: 2070 }, grain: false, edge: { name: '', thin: 0.45, thick: 3 } };
    load([mod('base', { id: 'a', frontBoard: 'x' })], { boards: [x], subtractEdge: true, edgeThick: 2 }, 2);
    render(<App />);
    const door = cells(rowWith(table(/^Front — Debeli/), 'Vrata'));
    expect(door.slice(1, 3)).toEqual(['591', '711']); // 597 - 2 x 3, 717 - 2 x 3 (the project's 2 mm would give 593 and 713)
  });

  it('is translated', async () => {
    await i18n.changeLanguage('en');
    load([], {}, 0);
    render(<App />);
    expect(screen.getByLabelText('Thin banding thickness')).toBeTruthy();
    expect(screen.getByLabelText('Carcass edge banding (type and color)')).toBeTruthy();
    expect(screen.getByLabelText('HDF type and color')).toBeTruthy();
  });
});

describe('colors', () => {
  const pick = (label: string, key: string) => fireEvent.change(screen.getByLabelText(label), { target: { value: key } });
  const options = (label: string) => within(screen.getByLabelText(label)).getAllByRole('option').map((o) => [o.getAttribute('value'), o.textContent]);

  it('a list of named colors next to every board field, not a free picker', () => {
    load([mod('base', { id: 'a' })]);
    render(<App />);
    open();
    expect(screen.getByLabelText(COLOR_CARCASS).tagName).toBe('SELECT');
    expect(options(COLOR_CARCASS)[0]).toEqual(['', 'Bez boje']);
    expect(options(COLOR_CARCASS).slice(1, 8).map((o) => o[1])).toEqual(['Bela', 'Krem', 'Bež', 'Svetlosiva', 'Siva', 'Antracit', 'Crna']);
    expect(options(COLOR_CARCASS)).toHaveLength(1 + 14);
    expect(document.querySelector('input[type="color"]')).toBeNull();
  });

  it('the color of the default board is a project setting', () => {
    load([mod('base', { id: 'a' })]);
    render(<App />);
    open();
    pick(COLOR_CARCASS, 'oak');
    expect(st().settings.decorColor.carcass).toBe('oak');
    pick(COLOR_FRONT, 'white');
    expect(st().settings.decorColor.front).toBe('white');
  });

  it('"No color" removes the color', () => {
    load([mod('base', { id: 'a' })], { decorColor: { carcass: 'oak', front: '', hdf: '' } });
    render(<App />);
    open();
    expect((screen.getByLabelText(COLOR_CARCASS) as HTMLSelectElement).value).toBe('oak');
    pick(COLOR_CARCASS, '');
    expect(st().settings.decorColor.carcass).toBe('');
  });

  it('a typed board gets its own color', () => {
    load([mod('base', { id: 'a' })]);
    render(<App />);
    open();
    typeBlur('Ploča fronta (tip i boja)', 'Sonoma');
    pick(COLOR_FRONT, 'cream');
    expect(st().settings.boards[0]).toMatchObject({ name: 'Sonoma', color: 'cream', auto: false }); // coloring keeps the board
    expect(st().settings.decorColor.front).toBe(''); // the default is untouched
  });

  it('the same color chosen in two cabinets is exactly the same color', () => {
    load([mod('base', { id: 'a', order: 0 }), mod('base', { id: 'b', order: 1 })], { decorColor: { carcass: '', front: 'cream', hdf: '' } });
    render(<App />);
    expect(screen.getByTestId('elev-a').style.getPropertyValue('--mod-fill')).toBe(screen.getByTestId('elev-b').style.getPropertyValue('--mod-fill'));
  });

  it('the panel has a color for every board, settings for the default decors', () => {
    load([], { boards: [{ id: 'x', name: 'Hrast', thickness: 18, sheet: { length: 2800, width: 2070 }, grain: false }] });
    render(<App />);
    pick('Boja na crtežu: Tip i boja ploče', 'anthracite');
    expect(st().settings.boards[0].color).toBe('anthracite');
    cleanup();
    load([], {}, 0);
    render(<App />);
    pick('Boja na crtežu: Dekor korpusa', 'walnut');
    pick('Boja na crtežu: Dekor fronta', 'white');
    pick('Boja na crtežu: Tip i boja HDF-a', 'beige');
    expect(st().settings.decorColor).toEqual({ carcass: 'walnut', front: 'white', hdf: 'beige' });
  });

  it('the drawing paints each cabinet in the color of its fronts, with readable lines', () => {
    load([mod('base', { id: 'a', order: 0 }), mod('base', { id: 'b', order: 1, frontBoard: 'x' })], {
      decorColor: { carcass: '', front: 'cream', hdf: '' },
      boards: [{ id: 'x', name: 'Crna', thickness: 18, sheet: { length: 2800, width: 2070 }, grain: false, color: 'black' }],
    });
    render(<App />);
    const a = screen.getByTestId('elev-a');
    const b = screen.getByTestId('elev-b');
    expect([a.style.getPropertyValue('--mod-fill'), a.style.getPropertyValue('--mod-ink')]).toEqual(['#eadcc0', '#2b2218']); // light fill, dark lines
    expect([b.style.getPropertyValue('--mod-fill'), b.style.getPropertyValue('--mod-ink')]).toEqual(['#1b1b1d', '#ffffff']); // dark fill, light lines
  });

  it('a cabinet without fronts shows the color of its carcass', () => {
    load([mod('wall', { id: 'w', doors: 0 })], { decorColor: { carcass: 'blue', front: 'red', hdf: '' } });
    render(<App />);
    expect(screen.getByTestId('elev-w').style.getPropertyValue('--mod-fill')).toBe('#2f5d8a');
  });

  it('without a color the drawing keeps its default look; an unknown stored color is ignored', () => {
    load([mod('base', { id: 'a' })]);
    const { unmount } = render(<App />);
    expect(screen.getByTestId('elev-a').style.getPropertyValue('--mod-fill')).toBe('');
    unmount();
    load([mod('base', { id: 'a' })], { decorColor: { carcass: '', front: 'purple', hdf: '' } });
    render(<App />);
    expect(screen.getByTestId('elev-a').style.getPropertyValue('--mod-fill')).toBe('');
  });

  it('the report marks each board with its color, and the swatch has the name as a tooltip', () => {
    load([mod('base', { id: 'a' })], { decorColor: { carcass: 'walnut', front: '', hdf: '' } }, 2);
    const { container } = render(<App />);
    const swatches = [...container.querySelectorAll('.need-sheets .swatch')] as HTMLElement[];
    expect(swatches).toHaveLength(1); // only the carcass has a color
    expect(swatches[0].style.background).toBe('rgb(90, 61, 43)');
    expect(swatches[0].getAttribute('title')).toBe('Orah (tamno drvo)');
    expect(container.querySelectorAll('.cutting-list h4 .swatch')).toHaveLength(1);
    expect(container.querySelectorAll('.layout-group h4 .swatch')).toHaveLength(1);
    expect(within(table('Ploče')).getAllByRole('row')[1].querySelector('.swatch')).toBeTruthy();
  });

  it('swatches add no text to the headings', () => {
    load([mod('base', { id: 'a' })], { decorColor: { carcass: 'walnut', front: '', hdf: '' } }, 2);
    render(<App />);
    expect(table('Korpus · 18 mm')).toBeTruthy();
    expect(screen.getAllByRole('heading', { name: 'Korpus · 18 mm' })).toHaveLength(2);
  });

  it('is translated', async () => {
    await i18n.changeLanguage('en');
    load([mod('base', { id: 'a' })], { decorColor: { carcass: 'walnut', front: '', hdf: '' } });
    render(<App />);
    open(/Base cabinet · 600/);
    const label = 'Color in the drawing: Carcass board (type and color)';
    expect((screen.getByLabelText(label) as HTMLSelectElement).value).toBe('walnut');
    expect(options(label)[0]).toEqual(['', 'No color']);
    expect(options(label).map((o) => o[1])).toContain('Walnut (dark wood)');
  });
});
