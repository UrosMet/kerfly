import { describe, expect, it } from 'vitest';
import { MODULE_DEFAULTS } from '../src/core/defaults';
import { addModule, deleteModule, duplicateModule, evenDrawers, moveModule, rowModules, updateModule } from '../src/core/modules';
import type { Module } from '../src/core/types';

const build = (...specs: [string, 'base' | 'wall' | 'drawer' | 'sink' | 'tall'][]): Module[] =>
  specs.reduce<Module[]>((acc, [id, type]) => addModule(acc, type, id), []);
const ids = (modules: Module[], row: 'lower' | 'upper') => rowModules(modules, row).map((m) => m.id);

describe('modules', () => {
  it('addModule puts each type in its row and appends', () => {
    const m = build(['a', 'base'], ['w', 'wall'], ['t', 'tall'], ['b', 'base']);
    expect(ids(m, 'lower')).toEqual(['a', 't', 'b']);
    expect(ids(m, 'upper')).toEqual(['w']);
    expect(rowModules(m, 'lower').map((x) => x.order)).toEqual([0, 1, 2]);
  });

  it('addModule copies defaults (drawers are not shared)', () => {
    const [d] = build(['d', 'drawer']);
    expect(d.drawers).toEqual([237, 237, 237]);
    expect(d.drawers).not.toBe(MODULE_DEFAULTS.drawer.drawers);
  });

  it('moveModule swaps with the neighbour inside the row only', () => {
    const m = build(['a', 'base'], ['w', 'wall'], ['b', 'base'], ['c', 'sink']);
    expect(ids(moveModule(m, 'b', -1), 'lower')).toEqual(['b', 'a', 'c']);
    expect(ids(moveModule(m, 'b', 1), 'lower')).toEqual(['a', 'c', 'b']);
    expect(ids(moveModule(m, 'b', 1), 'upper')).toEqual(['w']);
  });

  it('moveModule at the edge or with an unknown id returns the same list', () => {
    const m = build(['a', 'base'], ['b', 'base']);
    expect(moveModule(m, 'a', -1)).toBe(m);
    expect(moveModule(m, 'b', 1)).toBe(m);
    expect(moveModule(m, 'zzz', 1)).toBe(m);
  });

  it('duplicateModule inserts the copy right after the original, independent of it', () => {
    const m = build(['a', 'base'], ['d', 'drawer'], ['b', 'base']);
    const r = duplicateModule(m, 'a', 'a2');
    expect(ids(r, 'lower')).toEqual(['a', 'a2', 'd', 'b']);
    expect(rowModules(r, 'lower').map((x) => x.order)).toEqual([0, 1, 2, 3]);
    const r2 = duplicateModule(m, 'd', 'd2');
    const [d, d2] = [r2.find((x) => x.id === 'd')!, r2.find((x) => x.id === 'd2')!];
    expect(d2.drawers).toEqual(d.drawers);
    expect(d2.drawers).not.toBe(d.drawers);
  });

  it('deleteModule removes and renumbers', () => {
    const m = deleteModule(build(['a', 'base'], ['b', 'base'], ['c', 'base']), 'b');
    expect(rowModules(m, 'lower').map((x) => [x.id, x.order])).toEqual([['a', 0], ['c', 1]]);
  });

  it('updateModule patches one module only', () => {
    const m = updateModule(build(['a', 'base'], ['b', 'base']), 'a', { W: 450, doors: 2 });
    expect(m.find((x) => x.id === 'a')).toMatchObject({ W: 450, doors: 2 });
    expect(m.find((x) => x.id === 'b')!.W).toBe(600);
  });
});

describe('evenDrawers', () => {
  it('fills the height exactly with the gaps', () => {
    for (const [H, n] of [[720, 1], [720, 2], [720, 3], [720, 4], [700, 3], [713, 5]] as const) {
      const d = evenDrawers(H, n, 3);
      expect(d).toHaveLength(n);
      expect(d.reduce((a, b) => a + b, 0) + n * 3).toBe(H);
    }
    expect(evenDrawers(720, 3, 3)).toEqual([237, 237, 237]);
    expect(evenDrawers(700, 3, 3)).toEqual([230, 230, 231]); // remainder goes to the last
  });

  it('no drawers', () => {
    expect(evenDrawers(720, 0, 3)).toEqual([]);
  });
});
