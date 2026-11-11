import { describe, expect, it } from 'vitest';
import { assignBoardByName, pruneAutoBoards } from '../src/core/boards';
import type { Board, Settings } from '../src/core/types';
import { mod, settings } from './helpers';

const bela: Board = { id: 'x', name: 'Bela', thickness: 19, sheet: { length: 2440, width: 1220 }, grain: true };
const s: Settings = { ...settings, decor: { carcass: 'Hrast', front: 'Siva', hdf: '' }, frontT: 16, boards: [bela] };
const a = mod('base', { id: 'a' });
const b = mod('base', { id: 'b', order: 1 });
const assign = (name: string, kind: 'carcass' | 'front' = 'carcass', st = s, modules = [a, b]) => assignBoardByName(st, modules, 'a', kind, name, 'new1');

describe('assignBoardByName', () => {
  it('a new name creates a board like the default of that kind and assigns it', () => {
    const r = assign('Iverica Egger bela');
    expect(r.settings.boards).toHaveLength(2);
    expect(r.settings.boards[1]).toEqual({ id: 'new1', name: 'Iverica Egger bela', thickness: 18, sheet: s.sheet, grain: false, color: '', edge: { name: '', thin: 0.45, thick: 2 }, auto: true });
    expect(r.modules[0].carcassBoard).toBe('new1');
  });

  it('fronts copy the front thickness, and the grain of the default', () => {
    const r = assign('MDF crni', 'front', { ...s, grain: { carcass: false, front: true } });
    expect(r.settings.boards[1]).toMatchObject({ thickness: 16, grain: true });
    expect(r.modules[0].frontBoard).toBe('new1');
    expect(r.modules[0].carcassBoard).toBeUndefined();
  });

  it('the name is trimmed', () => {
    expect(assign('  Hrast Sonoma  ').settings.boards[1].name).toBe('Hrast Sonoma');
  });

  it('an existing name (any case, any spaces) means that board; none is created', () => {
    const r = assign(' BELA ');
    expect(r.settings.boards).toBe(s.boards);
    expect(r.settings).toBe(s);
    expect(r.modules[0].carcassBoard).toBe('x');
  });

  it('the same new name used twice is one board', () => {
    const first = assign('Egger');
    const second = assignBoardByName(first.settings, first.modules, 'b', 'carcass', 'egger', 'new2');
    expect(second.settings.boards).toHaveLength(2);
    expect(second.modules[1].carcassBoard).toBe('new1');
  });

  it('empty or blank means the project default', () => {
    const on = [mod('base', { id: 'a', carcassBoard: 'x', frontBoard: 'x' }), b];
    expect(assign('', 'carcass', s, on).modules[0].carcassBoard).toBeUndefined();
    expect(assign('   ', 'front', s, on).modules[0].frontBoard).toBeUndefined();
    expect(assign('', 'carcass', s, on).settings).toBe(s);
  });

  it('the name of the default board of the same kind means the default (nothing stored)', () => {
    const on = [mod('base', { id: 'a', carcassBoard: 'x' }), b];
    const r = assign('hrast', 'carcass', s, on);
    expect(r.modules[0].carcassBoard).toBeUndefined();
    expect(r.settings.boards).toBe(s.boards);
  });

  it('the name of the other default board uses that board, so their sheets are shared', () => {
    expect(assign('Siva', 'carcass').modules[0].carcassBoard).toBe('front');
    expect(assign('Hrast', 'front').modules[0].frontBoard).toBe('carcass');
  });

  it('an unnamed default board is not matched by an empty-looking name', () => {
    const r = assign('x', 'carcass', { ...s, decor: { carcass: '', front: '', hdf: '' } });
    expect(r.settings.boards).toHaveLength(2); // a board called "x" was created
  });

  it('only the chosen module changes', () => {
    const r = assign('Egger');
    expect(r.modules[1]).toBe(b);
  });
});

describe('assignBoardByName: boards made by typing go away when unused', () => {
  const two = [mod('base', { id: 'a' }), mod('base', { id: 'b', order: 1 })];
  const step = (st: Settings, modules: typeof two, id: string, name: string, kind: 'carcass' | 'front' | 'hdf' = 'carcass', newId = 'n') =>
    assignBoardByName(st, modules, id, kind, name, newId);

  it('a typo that is then corrected leaves only the right board', () => {
    const typo = step(s, two, 'a', 'Hrastt', 'carcass', 'typo');
    expect(typo.settings.boards.map((b) => b.id)).toEqual(['x', 'typo']);
    const fixed = step(typo.settings, typo.modules, 'a', 'Hrast sonoma', 'carcass', 'ok');
    expect(fixed.settings.boards.map((b) => b.id)).toEqual(['x', 'ok']); // 'typo' is gone
  });

  it('a board stays while one cabinet still uses it', () => {
    const first = step(s, two, 'a', 'Egger', 'carcass', 'e');
    const second = step(first.settings, first.modules, 'b', 'egger');
    const afterA = step(second.settings, second.modules, 'a', ''); // a leaves, b still has it
    expect(afterA.settings.boards.map((b) => b.id)).toEqual(['x', 'e']);
    const afterB = step(afterA.settings, afterA.modules, 'b', '');
    expect(afterB.settings.boards.map((b) => b.id)).toEqual(['x']);
  });

  it('a board counts as used by any of carcass, front and HDF', () => {
    const made = step(s, two, 'a', 'Egger', 'carcass', 'e');
    const alsoFront = step(made.settings, made.modules, 'a', 'Egger', 'front');
    const carcassGone = step(alsoFront.settings, alsoFront.modules, 'a', '', 'carcass');
    expect(carcassGone.settings.boards.map((b) => b.id)).toContain('e'); // the front still uses it
    const frontGone = step(carcassGone.settings, carcassGone.modules, 'a', '', 'front');
    expect(frontGone.settings.boards.map((b) => b.id)).not.toContain('e');
  });

  it('boards made by hand (not typed) are never removed automatically', () => {
    const made = step(s, two, 'a', 'Hand', 'carcass', 'h');
    const kept = { ...made.settings, boards: made.settings.boards.map((b) => (b.id === 'h' ? { ...b, auto: false } : b)) };
    const after = step(kept, made.modules, 'a', '');
    expect(after.settings.boards.map((b) => b.id)).toContain('h');
    expect(after.settings.boards.find((b) => b.id === 'x')).toBe(bela); // the board from the panel is untouched
  });

  it('pruneAutoBoards leaves the settings alone when nothing is removed', () => {
    expect(pruneAutoBoards(s, two)).toBe(s);
  });

  it('HDF: a name creates a board like the default HDF, and the default HDF name means the default', () => {
    const st: Settings = { ...s, decor: { ...s.decor, hdf: 'HDF bela' }, hdfT: 4 };
    const r = step(st, two, 'a', 'HDF crni', 'hdf', 'h1');
    expect(r.settings.boards[1]).toMatchObject({ name: 'HDF crni', thickness: 4, auto: true });
    expect(r.modules[0].hdfBoard).toBe('h1');
    expect(step(r.settings, r.modules, 'a', 'hdf bela', 'hdf').modules[0].hdfBoard).toBeUndefined();
  });
});
