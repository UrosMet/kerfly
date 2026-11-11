// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../src/App';
import { DEFAULT_SETTINGS } from '../src/core/defaults';
import { normalize } from '../src/core/modules';
import { parseProject, ProjectError, parseProjectText, serializeProject } from '../src/core/project';
import type { Module, Settings } from '../src/core/types';
import i18n from '../src/i18n';
import { useStore } from '../src/store';
import { mod } from './helpers';

const st = () => useStore.getState();
const CATALOG: Partial<Settings> = {
  handles: [
    { id: 'h1', name: 'Ručka 128 crna' },
    { id: 'h2', name: 'Ručka 160 inox' },
  ],
  defaultHandle: 'h1',
};
const load = (modules: Module[], settings: Partial<Settings> = {}, step = 1) =>
  act(() => useStore.setState({ modules: normalize(modules), settings: { ...DEFAULT_SETTINGS, ...settings }, step, started: true, selectedId: null }));
const type = (label: string, v: string) => fireEvent.change(screen.getByLabelText(label), { target: { value: v } });
const pick = (label: string, v: string) => fireEvent.change(screen.getByLabelText(label), { target: { value: v } });
const options = (label: string) => within(screen.getByLabelText(label)).getAllByRole('option').map((o) => [o.getAttribute('value'), o.textContent]);
const open = (name: RegExp = /Donji element · 600/) => fireEvent.click(screen.getAllByRole('button', { name })[0]);
const needSentences = () => within(screen.getByRole('region', { name: 'Treba da kupiš' })).getAllByRole('listitem').map((li) => li.getAttribute('data-sentence'));
const table = (name: string) => screen.getByRole('table', { name });

beforeEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage('sr');
});
afterEach(cleanup);

describe('handles in the settings', () => {
  it('add the handles you use, name them, remove them', () => {
    load([], {}, 0);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '+ Dodaj ručku' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Dodaj ručku' }));
    expect(st().settings.handles).toHaveLength(2);
    type('Ručka 1 (tip i model)', 'Ručka 128 crna');
    type('Ručka 2 (tip i model)', 'Ručka 160 inox');
    expect(st().settings.handles.map((h) => h.name)).toEqual(['Ručka 128 crna', 'Ručka 160 inox']);
    fireEvent.click(screen.getByRole('button', { name: 'Ukloni ručku 1' }));
    expect(st().settings.handles.map((h) => h.name)).toEqual(['Ručka 160 inox']);
  });

  it('the default is picked from the list', () => {
    load([], CATALOG, 0);
    render(<App />);
    const select = screen.getByLabelText('Podrazumevana ručka') as HTMLSelectElement;
    expect(select.value).toBe('h1');
    expect(options('Podrazumevana ručka')).toEqual([['', 'Bez naziva (samo „Ručke“)'], ['h1', 'Ručka 128 crna'], ['h2', 'Ručka 160 inox']]);
    pick('Podrazumevana ručka', 'h2');
    expect(st().settings.defaultHandle).toBe('h2');
    pick('Podrazumevana ručka', '');
    expect(st().settings.defaultHandle).toBe('');
  });

  it('a handle without a name is called Handle N in the lists', () => {
    load([], { handles: [{ id: 'h1', name: 'Crna' }, { id: 'h2', name: '  ' }] }, 0);
    render(<App />);
    expect(options('Podrazumevana ručka').map((o) => o[1])).toEqual(['Bez naziva (samo „Ručke“)', 'Crna', 'Ručka 2']);
  });

  it('removing a handle sends the cabinets that used it back to the default, and clears it as the default', () => {
    load([mod('base', { id: 'a', handle: 'h2' }), mod('base', { id: 'b', order: 1, handle: 'h1' })], CATALOG, 0);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Ukloni ručku 2' }));
    expect(st().modules.find((m) => m.id === 'a')!.handle).toBeUndefined();
    expect(st().modules.find((m) => m.id === 'b')!.handle).toBe('h1');
    fireEvent.click(screen.getByRole('button', { name: 'Ukloni ručku 1' }));
    expect(st().settings.defaultHandle).toBe('');
    expect(st().modules.find((m) => m.id === 'b')!.handle).toBeUndefined();
  });

  it('is translated', async () => {
    await i18n.changeLanguage('en');
    load([], CATALOG, 0);
    render(<App />);
    expect(screen.getByLabelText('Handle 1 (type and model)')).toBeTruthy();
    expect(options('Default handle')[0]).toEqual(['', 'Unnamed (just "Handles")']);
    expect(screen.getByRole('button', { name: '+ Add handle' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove handle 2' })).toBeTruthy();
  });
});

describe('choosing the handle of a cabinet', () => {
  it('the card has a list: same as the project, the added handles, no handles', () => {
    load([mod('base', { id: 'a' })], CATALOG);
    render(<App />);
    open();
    expect(screen.getByLabelText('Ručke').tagName).toBe('SELECT');
    expect(options('Ručke')).toEqual([
      ['', 'Kao u projektu: Ručka 128 crna'],
      ['h1', 'Ručka 128 crna'],
      ['h2', 'Ručka 160 inox'],
      ['none', 'Bez ručki (npr. otvaranje pritiskom)'],
    ]);
    expect(screen.getByText('Ručke dodaješ u Podešavanjima.')).toBeTruthy();
  });

  it('without a default handle the first entry is just "same as the project"', () => {
    load([mod('base', { id: 'a' })], { ...CATALOG, defaultHandle: '' });
    render(<App />);
    open();
    expect(options('Ručke')[0]).toEqual(['', 'Kao u projektu']);
  });

  it('picking sets the handle of this cabinet only; the first entry goes back to the default', () => {
    load([mod('base', { id: 'a', order: 0 }), mod('base', { id: 'b', order: 1 })], CATALOG);
    render(<App />);
    open();
    pick('Ručke', 'h2');
    expect(st().modules[0].handle).toBe('h2');
    expect(st().modules[1].handle).toBeUndefined();
    pick('Ručke', '');
    expect(st().modules[0].handle).toBeUndefined();
  });

  it('"no handles" is a choice in the same list, and the drawing then has none on that cabinet', () => {
    load([mod('base', { id: 'a', order: 0 }), mod('base', { id: 'b', order: 1 })], CATALOG);
    render(<App />);
    open();
    pick('Ručke', 'none');
    expect(st().modules[0].handle).toBe('none');
    expect(screen.getByTestId('elev-a').querySelectorAll('.handle')).toHaveLength(0);
    expect(screen.getByTestId('elev-b').querySelectorAll('.handle')).toHaveLength(1);
    pick('Ručke', '');
    expect(screen.getByTestId('elev-a').querySelectorAll('.handle')).toHaveLength(1);
  });

  it('a nameless handle is listed as Handle N', () => {
    load([mod('base', { id: 'a' })], { handles: [{ id: 'h1', name: 'Crna' }, { id: 'h2', name: '' }], defaultHandle: 'h2' });
    render(<App />);
    open();
    expect(options('Ručke').map((o) => o[1])).toEqual(['Kao u projektu: Ručka 2', 'Crna', 'Ručka 2', 'Bez ručki (npr. otvaranje pritiskom)']);
  });

  it('a cabinet that points at a handle that no longer exists shows "same as the project"', () => {
    load([mod('base', { id: 'a', handle: 'gone' })], CATALOG);
    render(<App />);
    open();
    expect((screen.getByLabelText('Ručke') as HTMLSelectElement).value).toBe('');
  });

  it('a cabinet without fronts has no handle field; a drawer cabinet has', () => {
    load([mod('wall', { id: 'w', doors: 0 })], CATALOG);
    const { unmount } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Zidni element · 600/ }));
    expect(screen.queryByLabelText('Ručke')).toBeNull();
    unmount();
    load([mod('drawer', { id: 'd' })], CATALOG);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Fiokar · 600/ }));
    expect(screen.getByLabelText('Ručke')).toBeTruthy();
  });

  it('is translated', async () => {
    await i18n.changeLanguage('en');
    load([mod('base', { id: 'a' })], CATALOG);
    render(<App />);
    open(/Base cabinet · 600/);
    expect(options('Handles')).toEqual([
      ['', 'Same as the project: Ručka 128 crna'],
      ['h1', 'Ručka 128 crna'],
      ['h2', 'Ručka 160 inox'],
      ['none', 'No handles (e.g. push to open)'],
    ]);
    expect(screen.getByText('Add handles in Settings.')).toBeTruthy();
  });
});

describe('handles on the shopping list', () => {
  const kitchen = () => [
    mod('base', { id: 'a', order: 0 }),
    mod('base', { id: 'b', order: 1, handle: 'h2' }),
    mod('drawer', { id: 'd', order: 2, handle: 'h2' }),
    mod('base', { id: 'c', order: 3, handle: 'none' }),
  ];

  it('each handle type is a line with its count', () => {
    load(kitchen(), CATALOG, 2);
    render(<App />);
    const items = needSentences();
    expect(items).toContain('Ručke — Ručka 128 crna: 1');
    expect(items).toContain('Ručke — Ručka 160 inox: 4');
    expect(items.some((i) => i?.startsWith('Ručke: '))).toBe(false); // no unnamed line
  });

  it('the hardware table lists them too', () => {
    load(kitchen(), CATALOG, 2);
    render(<App />);
    const rows = within(table('Okovi')).getAllByRole('row').map((r) => [within(r).getByRole('rowheader').textContent, within(r).getByRole('cell').textContent]);
    expect(rows).toContainEqual(['Ručke — Ručka 128 crna', '1']);
    expect(rows).toContainEqual(['Ručke — Ručka 160 inox', '4']);
  });

  it('without any handles added it is one line, "Ručke"', () => {
    load([mod('base', { id: 'a' }), mod('drawer', { id: 'd', order: 1 })], {}, 2);
    render(<App />);
    expect(needSentences()).toContain('Ručke: 4');
  });

  it('no line when no cabinet has handles', () => {
    load([mod('base', { id: 'a', handle: 'none' })], CATALOG, 2);
    render(<App />);
    expect(needSentences().some((i) => i?.startsWith('Ručke'))).toBe(false);
  });

  it('English', async () => {
    await i18n.changeLanguage('en');
    load(kitchen(), CATALOG, 2);
    render(<App />);
    const items = within(screen.getByRole('region', { name: 'You need to buy' })).getAllByRole('listitem').map((li) => li.getAttribute('data-sentence'));
    expect(items).toContain('Handles — Ručka 128 crna: 1');
  });
});

describe('store: handles', () => {
  beforeEach(() => useStore.setState({ settings: DEFAULT_SETTINGS, modules: [], selectedId: null }));

  it('addHandle gives each handle its own id, never "none"', () => {
    st().addHandle();
    st().addHandle();
    const ids = st().settings.handles.map((h) => h.id);
    expect(new Set(ids).size).toBe(2);
    expect(ids).not.toContain('none');
    expect(st().settings.handles[0].name).toBe('');
  });

  it('updateHandle renames one handle', () => {
    st().addHandle();
    st().addHandle();
    const [a, b] = st().settings.handles;
    st().updateHandle(a.id, 'Inox');
    expect(st().settings.handles).toEqual([{ id: a.id, name: 'Inox' }, b]);
  });

  it('deleteHandle resets the cabinets and the default', () => {
    st().addHandle();
    const id = st().settings.handles[0].id;
    st().setSettings({ defaultHandle: id });
    st().addModule('base');
    st().updateModule(st().modules[0].id, { handle: id });
    st().deleteHandle(id);
    expect(st().settings.handles).toEqual([]);
    expect(st().settings.defaultHandle).toBe('');
    expect(st().modules[0].handle).toBeUndefined();
  });

  it('a cabinet set to "none" keeps it when a handle is deleted', () => {
    st().addHandle();
    st().addModule('base');
    st().updateModule(st().modules[0].id, { handle: 'none' });
    st().deleteHandle(st().settings.handles[0].id);
    expect(st().modules[0].handle).toBe('none');
  });
});

describe('project file with handles', () => {
  it('round-trips the list, the default and the cabinets\' choices', () => {
    const modules: Module[] = [
      { id: 'a', type: 'base', row: 'lower', order: 0, W: 600, H: 720, D: 560, doors: 1, shelves: 1, handle: 'h2' },
      { id: 'b', type: 'base', row: 'lower', order: 1, W: 600, H: 720, D: 560, doors: 1, shelves: 1, handle: 'none' },
    ];
    const p = { settings: { ...DEFAULT_SETTINGS, ...CATALOG } as Settings, modules };
    expect(parseProjectText(serializeProject(p))).toEqual(p);
  });

  it('older files have no handles', () => {
    const p = parseProject({ settings: {} });
    expect(p.settings.handles).toEqual([]);
    expect(p.settings.defaultHandle).toBe('');
  });

  it('rejects bad values, naming the field', () => {
    const bad = (data: unknown, path: string) => expect(() => parseProject(data)).toThrow(new ProjectError(path));
    bad({ settings: { handles: 'x' } }, 'settings.handles');
    bad({ settings: { handles: [5] } }, 'settings.handles[0]');
    bad({ settings: { handles: [{}] } }, 'settings.handles[0].id');
    bad({ settings: { handles: [{ id: '' }] } }, 'settings.handles[0].id');
    bad({ settings: { handles: [{ id: 'none' }] } }, 'settings.handles[0].id'); // "none" means no handles
    bad({ settings: { handles: [{ id: 'a' }, { id: 'a' }] } }, 'settings.handles[1].id');
    bad({ settings: { handles: [{ id: 'a', name: 3 }] } }, 'settings.handles[0].name');
    bad({ settings: { defaultHandle: 5 } }, 'settings.defaultHandle');
    bad({ modules: [{ id: 'a', type: 'base', handle: 5 }] }, 'modules[0].handle');
  });

  it('a handle named only by its id gets an empty name', () => {
    expect(parseProject({ settings: { handles: [{ id: 'a' }] } }).settings.handles).toEqual([{ id: 'a', name: '' }]);
  });
});
