import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/core/defaults';
import { ProjectError, parseProject, parseProjectText, serializeProject } from '../src/core/project';
import type { Module } from '../src/core/types';
import { useStore } from '../src/store';

const bad = (data: unknown, path: string) => expect(() => parseProject(data)).toThrow(new ProjectError(path));
const board = { id: 'x', name: 'Bela', thickness: 19, sheet: { length: 2440, width: 1220 }, grain: true };

describe('project JSON with materials', () => {
  it('round-trips boards, worktop settings and the boards chosen by modules', () => {
    const modules: Module[] = [{ id: 'a', type: 'base', row: 'lower', order: 0, W: 600, H: 720, D: 560, doors: 1, shelves: 1, carcassBoard: 'x', frontBoard: 'front' }];
    const p = { settings: { ...DEFAULT_SETTINGS, boards: [board], frontT: 16, hdfT: 4, worktopDecor: 'Beton', worktopT: 40 }, modules };
    expect(parseProjectText(serializeProject(p))).toEqual(p);
  });

  it('files from before materials existed get the new defaults', () => {
    const p = parseProject({ settings: { gap: 3 }, modules: [{ id: 'a', type: 'base' }] });
    expect(p.settings).toMatchObject({ frontT: 18, hdfT: 3, worktopDecor: '', worktopT: 38, boards: [] });
    expect(p.modules[0].carcassBoard).toBeUndefined();
  });

  it('a board missing fields gets defaults', () => {
    const p = parseProject({ settings: { boards: [{ id: 'x' }] } });
    expect(p.settings.boards[0]).toEqual({ id: 'x', name: '', thickness: 18, sheet: { length: 2800, width: 2070 }, grain: false });
  });

  it('a module may name a board that does not exist (it falls back to the default)', () => {
    expect(parseProject({ modules: [{ id: 'a', type: 'base', carcassBoard: 'gone' }] }).modules[0].carcassBoard).toBe('gone');
  });

  it('rejects bad boards, naming the field', () => {
    bad({ settings: { boards: 'x' } }, 'settings.boards');
    bad({ settings: { boards: [5] } }, 'settings.boards[0]');
    bad({ settings: { boards: [{}] } }, 'settings.boards[0].id');
    bad({ settings: { boards: [{ id: '' }] } }, 'settings.boards[0].id');
    bad({ settings: { boards: [{ id: 'carcass' }] } }, 'settings.boards[0].id'); // the defaults' ids are taken
    bad({ settings: { boards: [{ id: 'front' }] } }, 'settings.boards[0].id');
    bad({ settings: { boards: [{ id: 'hdf' }] } }, 'settings.boards[0].id');
    bad({ settings: { boards: [{ id: 'x' }, { id: 'x' }] } }, 'settings.boards[1].id');
    bad({ settings: { boards: [{ id: 'x', name: 3 }] } }, 'settings.boards[0].name');
    bad({ settings: { boards: [{ id: 'x', thickness: 0 }] } }, 'settings.boards[0].thickness');
    bad({ settings: { boards: [{ id: 'x', thickness: '18' }] } }, 'settings.boards[0].thickness');
    bad({ settings: { boards: [{ id: 'x', sheet: 5 }] } }, 'settings.boards[0].sheet');
    bad({ settings: { boards: [{ id: 'x', sheet: { length: -1 } }] } }, 'settings.boards[0].sheet.length');
    bad({ settings: { boards: [{ id: 'x', sheet: { width: 'a' } }] } }, 'settings.boards[0].sheet.width');
    bad({ settings: { boards: [{ id: 'x', grain: 'yes' }] } }, 'settings.boards[0].grain');
  });

  it('rejects bad material settings and module choices', () => {
    bad({ settings: { frontT: 0 } }, 'settings.frontT');
    bad({ settings: { hdfT: -3 } }, 'settings.hdfT');
    bad({ settings: { worktopT: '38' } }, 'settings.worktopT');
    bad({ settings: { worktopDecor: 5 } }, 'settings.worktopDecor');
    bad({ modules: [{ id: 'a', type: 'base', carcassBoard: 5 }] }, 'modules[0].carcassBoard');
    bad({ modules: [{ id: 'a', type: 'base', frontBoard: {} }] }, 'modules[0].frontBoard');
  });

  it('extra keys on a board do not get through', () => {
    const p = parseProject({ settings: { boards: [{ id: 'x', evil: 1 }] } });
    expect(p.settings.boards[0]).not.toHaveProperty('evil');
  });
});

describe('store: boards', () => {
  const st = () => useStore.getState();
  beforeEach(() => useStore.setState({ settings: DEFAULT_SETTINGS, modules: [], selectedId: null }));

  it('addBoard appends a new board with its own id', () => {
    st().addBoard();
    st().addBoard();
    const ids = st().settings.boards.map((b) => b.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(ids.every((i) => !['carcass', 'front', 'hdf'].includes(i))).toBe(true);
    expect(st().settings.boards[0]).toMatchObject({ name: '', thickness: 18, grain: false });
  });

  it('updateBoard changes only that board', () => {
    st().addBoard();
    st().addBoard();
    const [a, b] = st().settings.boards;
    st().updateBoard(a.id, { name: 'Hrast', thickness: 16 });
    expect(st().settings.boards[0]).toMatchObject({ name: 'Hrast', thickness: 16 });
    expect(st().settings.boards[1]).toEqual(b);
  });

  it('deleteBoard removes it and sends modules that used it back to the defaults', () => {
    st().addBoard();
    const id = st().settings.boards[0].id;
    st().addModule('base');
    st().addModule('base');
    const [m1, m2] = st().modules;
    st().updateModule(m1.id, { carcassBoard: id, frontBoard: id });
    st().deleteBoard(id);
    expect(st().settings.boards).toEqual([]);
    expect(st().modules.find((m) => m.id === m1.id)).toMatchObject({ carcassBoard: undefined, frontBoard: undefined });
    expect(st().modules.find((m) => m.id === m2.id)).toBe(m2);
  });
});

describe('project JSON: color, edge banding and HDF', () => {
  it('round-trips colors, edge banding, auto flag, HDF board and the new settings', () => {
    const modules: Module[] = [{ id: 'a', type: 'base', row: 'lower', order: 0, W: 600, H: 720, D: 560, doors: 1, shelves: 1, hdfBoard: 'x' }];
    const settings = {
      ...DEFAULT_SETTINGS,
      boards: [{ ...board, color: 'oak', auto: true, edge: { name: 'ABS bela', thin: 1, thick: 2 } }],
      decor: { carcass: 'Hrast', front: 'Bela', hdf: 'HDF bela' },
      decorColor: { carcass: 'walnut', front: 'white', hdf: '' },
      edgeName: { carcass: 'ABS hrast', front: '' },
      edgeThin: 0.8,
    };
    const p = { settings, modules };
    expect(parseProjectText(serializeProject(p))).toEqual(p);
  });

  it('files from before get empty colors and edge names', () => {
    const p = parseProject({ settings: { decor: { carcass: 'Hrast' } } });
    expect(p.settings.decor).toEqual({ carcass: 'Hrast', front: '', hdf: '' });
    expect(p.settings.decorColor).toEqual({ carcass: '', front: '', hdf: '' });
    expect(p.settings.edgeName).toEqual({ carcass: '', front: '' });
  });

  it('a board edge with missing fields takes the project defaults', () => {
    const p = parseProject({ settings: { boards: [{ id: 'x', edge: {} }] } });
    expect(p.settings.boards[0].edge).toEqual({ name: '', thin: 0.45, thick: 2 });
  });

  it('rejects bad colors, banding and HDF choices, naming the field', () => {
    bad({ settings: { decorColor: { carcass: 'purple' } } }, 'settings.decorColor.carcass'); // not in the palette
    bad({ settings: { decorColor: { front: '#ffffff' } } }, 'settings.decorColor.front'); // colors are named, not hex
    bad({ settings: { decorColor: { hdf: 'White' } } }, 'settings.decorColor.hdf');
    bad({ settings: { decorColor: 3 } }, 'settings.decorColor');
    bad({ settings: { edgeName: { carcass: 4 } } }, 'settings.edgeName.carcass');
    bad({ settings: { decor: { hdf: 5 } } }, 'settings.decor.hdf');
    bad({ settings: { boards: [{ id: 'x', color: '#336699' }] } }, 'settings.boards[0].color');
    bad({ settings: { boards: [{ id: 'x', auto: 'yes' }] } }, 'settings.boards[0].auto');
    bad({ settings: { boards: [{ id: 'x', edge: 5 }] } }, 'settings.boards[0].edge');
    bad({ settings: { boards: [{ id: 'x', edge: { thin: -1 } }] } }, 'settings.boards[0].edge.thin');
    bad({ settings: { boards: [{ id: 'x', edge: { name: 7 } }] } }, 'settings.boards[0].edge.name');
    bad({ modules: [{ id: 'a', type: 'base', hdfBoard: 5 }] }, 'modules[0].hdfBoard');
  });
});

describe('store: board colors and automatic clean-up', () => {
  const st = () => useStore.getState();
  beforeEach(() => useStore.setState({ settings: DEFAULT_SETTINGS, modules: [], selectedId: null }));

  it('the color of a default board is stored in the settings, the color of another board on the board', () => {
    st().setBoardColor('carcass', 'black');
    st().setBoardColor('hdf', 'grey');
    expect(st().settings.decorColor).toEqual({ carcass: 'black', front: '', hdf: 'grey' });
    st().addBoard();
    const id = st().settings.boards[0].id;
    st().setBoardColor(id, 'cream');
    expect(st().settings.boards[0].color).toBe('cream');
    st().setBoardColor(id, '');
    expect(st().settings.boards[0].color).toBe('');
  });

  it('typing a board name makes a board that goes away with its last cabinet, unless it was edited', () => {
    st().addModule('base');
    st().addModule('base');
    const [a, b] = st().modules;
    st().chooseBoard(a.id, 'carcass', 'Egger');
    st().chooseBoard(b.id, 'carcass', 'egger');
    expect(st().settings.boards).toHaveLength(1);
    st().deleteModule(a.id);
    expect(st().settings.boards).toHaveLength(1); // b still uses it
    st().deleteModule(b.id);
    expect(st().settings.boards).toHaveLength(0);
  });

  it('editing a typed board in the panel (or coloring it) makes it permanent', () => {
    st().addModule('base');
    const m = st().modules[0];
    st().chooseBoard(m.id, 'carcass', 'Egger');
    const id = st().settings.boards[0].id;
    st().updateBoard(id, { thickness: 16 });
    st().chooseBoard(m.id, 'carcass', '');
    expect(st().settings.boards.map((b) => b.id)).toEqual([id]); // kept

    st().chooseBoard(m.id, 'front', 'MDF');
    const id2 = st().settings.boards[1].id;
    st().setBoardColor(id2, 'black');
    st().deleteModule(m.id);
    expect(st().settings.boards.map((b) => b.id)).toEqual([id, id2]);
  });

  it('a typed board for HDF is used by the module', () => {
    st().addModule('base');
    const m = st().modules[0];
    st().chooseBoard(m.id, 'hdf', 'HDF crni');
    expect(st().modules[0].hdfBoard).toBe(st().settings.boards[0].id);
    expect(st().settings.boards[0]).toMatchObject({ name: 'HDF crni', thickness: 3 });
  });
});
