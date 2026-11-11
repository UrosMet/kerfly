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
