import { describe, expect, it } from 'vitest';
import { allBoards, boardById, boardOfPart, defaultBoards, newBoard, selectableBoards, withoutBoard } from '../src/core/boards';
import { partsForModule, plinthParts } from '../src/core/parts';
import { packBoards } from '../src/core/packing';
import { validate } from '../src/core/validate';
import type { Board, Part, Settings } from '../src/core/types';
import { mod, settings } from './helpers';

const bela: Board = { id: 'x', name: 'Bela', thickness: 19, sheet: { length: 2800, width: 2070 }, grain: false };
const s: Settings = { ...settings, decor: { carcass: 'Hrast', front: 'Siva' }, boards: [bela] };
const part = (over: Partial<Part>): Part => ({
  moduleId: 'm', nameKey: 'part.x', material: 'carcass', L: 100, Wd: 100, qty: 1,
  edges: { L1: 'none', L2: 'none', W1: 'none', W2: 'none' }, ...over,
});

describe('boards catalog', () => {
  it('the default boards come from the flat settings', () => {
    const d = defaultBoards({ ...s, t: 16, frontT: 19, hdfT: 4, grain: { carcass: true, front: false }, hdfSheet: { length: 2440, width: 1220 } });
    expect(d.carcass).toEqual({ id: 'carcass', name: 'Hrast', thickness: 16, sheet: s.sheet, grain: true });
    expect(d.front).toEqual({ id: 'front', name: 'Siva', thickness: 19, sheet: s.sheet, grain: false });
    expect(d.hdf).toEqual({ id: 'hdf', name: '', thickness: 4, sheet: { length: 2440, width: 1220 }, grain: false });
  });

  it('modules can pick carcass, front and the user\'s boards, in that order; HDF is listed last', () => {
    expect(selectableBoards(s).map((b) => b.id)).toEqual(['carcass', 'front', 'x']);
    expect(allBoards(s).map((b) => b.id)).toEqual(['carcass', 'front', 'x', 'hdf']);
  });

  it('boardById: found, undefined and unknown ids', () => {
    expect(boardById(s, 'x', 'carcass')).toBe(bela);
    expect(boardById(s, undefined, 'carcass').id).toBe('carcass');
    expect(boardById(s, undefined, 'front').id).toBe('front');
    expect(boardById(s, 'deleted', 'front').id).toBe('front');
    expect(boardById(s, 'front', 'carcass').id).toBe('front'); // a carcass may be cut from the front board
  });

  it('boardOfPart: hdf is always the HDF board; unknown ids fall back by material', () => {
    expect(boardOfPart(s, part({ material: 'hdf', board: 'x' })).id).toBe('hdf');
    expect(boardOfPart(s, part({ board: 'x' }))).toBe(bela);
    expect(boardOfPart(s, part({ material: 'front', board: 'gone' })).id).toBe('front');
    expect(boardOfPart(s, part({ material: 'carcass' })).id).toBe('carcass');
  });

  it('withoutBoard clears only the references to that board', () => {
    const a = mod('base', { id: 'a', carcassBoard: 'x', frontBoard: 'y' });
    const b = mod('base', { id: 'b', carcassBoard: 'y' });
    const c = mod('base', { id: 'c' });
    const r = withoutBoard([a, b, c], 'x');
    expect(r[0]).toMatchObject({ carcassBoard: undefined, frontBoard: 'y' });
    expect(r[1]).toBe(b); // untouched modules keep their identity
    expect(r[2]).toBe(c);
  });

  it('a new board starts as a copy of the default carcass board, unnamed, without grain', () => {
    const n = newBoard({ ...s, t: 16 }, 'z');
    expect(n).toEqual({ id: 'z', name: '', thickness: 16, sheet: s.sheet, grain: false });
    expect(n.sheet).not.toBe(s.sheet);
  });
});

describe('boards in the parts', () => {
  it('parts are tagged with the board they are cut from', () => {
    const parts = partsForModule(mod('base', { id: 'a', carcassBoard: 'x', frontBoard: 'front' }), s);
    expect(new Set(parts.filter((p) => p.material === 'carcass').map((p) => p.board))).toEqual(new Set(['x']));
    expect(new Set(parts.filter((p) => p.material === 'front').map((p) => p.board))).toEqual(new Set(['front']));
    expect(new Set(parts.filter((p) => p.material === 'hdf').map((p) => p.board))).toEqual(new Set(['hdf']));
  });

  it('by default carcass parts use the carcass board and fronts the front board', () => {
    const parts = partsForModule(mod('drawer', { id: 'd' }), settings);
    expect(parts.filter((p) => p.material === 'front').every((p) => p.board === 'front')).toBe(true);
    expect(parts.filter((p) => p.material === 'carcass').every((p) => p.board === 'carcass')).toBe(true);
  });

  it('the carcass thickness of the module comes from its carcass board', () => {
    const sizes = (m: ReturnType<typeof mod>, st: Settings) =>
      Object.fromEntries(partsForModule(m, st).map((p) => [p.nameKey.replace('part.', '') + (p.Wd === 100 ? '100' : ''), `${p.L}x${p.Wd}`]));
    const thin = sizes(mod('base', { id: 'a' }), s);
    const thick = sizes(mod('base', { id: 'a', carcassBoard: 'x' }), s); // 19 mm board
    expect(thin.bottom).toBe('564x560'); // 600 - 2*18
    expect(thick.bottom).toBe('562x560'); // 600 - 2*19
    expect(thick.rail100).toBe('562x100');
    expect(thick.shelf).toBe('560x540');
    expect(thick.side).toBe(thin.side); // sides do not depend on thickness
    expect(thick.back).toBe(thin.back);
  });

  it('two modules in one kitchen can have different thicknesses', () => {
    const [a, b] = [mod('base', { id: 'a' }), mod('base', { id: 'b', carcassBoard: 'x' })].map((m) =>
      partsForModule(m, s).find((p) => p.nameKey === 'part.bottom')!.L,
    );
    expect([a, b]).toEqual([564, 562]);
  });

  it('the front thickness does not change any size', () => {
    const doors = (st: Settings) => partsForModule(mod('base', { id: 'a' }), st).find((p) => p.nameKey === 'part.door')!;
    expect(doors({ ...s, frontT: 16 })).toEqual(doors({ ...s, frontT: 19 }));
  });

  it('a module that points at a deleted board uses the default thickness', () => {
    const p = partsForModule(mod('base', { id: 'a', carcassBoard: 'deleted' }), s).find((q) => q.nameKey === 'part.bottom')!;
    expect(p.L).toBe(564);
    expect(p.board).toBe('carcass');
  });

  it('plinth is cut from the default front board and limited by its sheet', () => {
    const modules = Array.from({ length: 10 }, (_, i) => mod('base', { id: `m${i}`, order: i }));
    const p = plinthParts(modules, { ...settings, sheet: { length: 2440, width: 1220 } });
    expect(p.every((x) => x.board === 'front')).toBe(true);
    expect(p[0].L).toBe(2420); // 2440 - 2*10
  });
});

describe('boards in packing and validation', () => {
  it('modules on different boards are packed on different sheets, each board by its own sheet size', () => {
    const small: Board = { id: 'x', name: 'Mala', thickness: 18, sheet: { length: 1000, width: 1000 }, grain: false };
    const st: Settings = { ...settings, boards: [small] };
    const parts = [...partsForModule(mod('base', { id: 'a' }), st), ...partsForModule(mod('base', { id: 'b', carcassBoard: 'x', frontBoard: 'x' }), st).filter((p) => p.nameKey !== 'part.side')];
    const packed = packBoards(parts, st);
    expect(packed.map((b) => b.board.id)).toEqual(['carcass', 'front', 'x', 'hdf']);
    expect(packed.find((b) => b.board.id === 'x')!.board.sheet).toEqual({ length: 1000, width: 1000 });
  });

  it('validation checks a part against the sheet of its own board', () => {
    const tiny: Board = { id: 'x', name: 'Mala', thickness: 18, sheet: { length: 600, width: 600 }, grain: false };
    const st: Settings = { ...settings, boards: [tiny] };
    const r = validate([mod('base', { id: 'a' }), mod('base', { id: 'b', order: 1, carcassBoard: 'x' })], st);
    const bad = r.errors.filter((e) => e.code === 'validation.partTooLarge');
    expect(bad.length).toBeGreaterThan(0);
    expect(bad.every((e) => e.moduleId === 'b')).toBe(true); // the 720 mm sides do not fit 600 x 600
  });

  it('grain of a board is respected by validation', () => {
    const grained = (grain: boolean): Settings => ({ ...settings, boards: [{ id: 'x', name: '', thickness: 18, sheet: { length: 2800, width: 2070 }, grain }] });
    // sides 720 x 2700 fit the sheet only when rotated
    const tooLarge = (st: Settings) => validate([mod('base', { id: 'a', D: 2700, carcassBoard: 'x' })], st).errors.some((e) => e.code === 'validation.partTooLarge');
    expect(tooLarge(grained(false))).toBe(false);
    expect(tooLarge(grained(true))).toBe(true);
  });
});
