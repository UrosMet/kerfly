import { describe, expect, it } from 'vitest';
import { baseParts } from '../src/core/parts/base';
import type { Module } from '../src/core/types';
import { mod as mk, settings, summary } from './helpers';

const mod = (over: Partial<Module> = {}) => mk("base", over);

describe('baseParts', () => {
  it('reference case: 600x720x560, 1 shelf, 1 door', () => {
    expect(summary(baseParts(mod({ doors: 1, shelves: 1 }), settings))).toEqual({
      'side 720x560': 2,
      'bottom 564x560': 1,
      'rail 564x100': 2,
      'shelf 562x540': 1,
      'back 596x716': 1,
      'door 597x717': 1,
    });
  });

  it('2 doors: (600-2*3)/2 = 297 wide each', () => {
    const s = summary(baseParts(mod({ doors: 2, shelves: 1 }), settings));
    expect(s['door 297x717']).toBe(2);
    expect(Object.keys(s).filter((k) => k.startsWith('door'))).toHaveLength(1);
  });

  it('0 shelves: no shelf part', () => {
    const parts = baseParts(mod({ shelves: 0 }), settings);
    expect(parts.some((p) => p.nameKey === 'part.shelf')).toBe(false);
  });

  it('3 shelves: one shelf part with qty 3', () => {
    const shelf = baseParts(mod({ shelves: 3 }), settings).filter((p) => p.nameKey === 'part.shelf');
    expect(shelf).toHaveLength(1);
    expect(shelf[0]).toMatchObject({ L: 562, Wd: 540, qty: 3 });
  });

  it('edges: front rail only, thin on front edges, thick all around doors, none on back', () => {
    const parts = baseParts(mod(), settings);
    const rails = parts.filter((p) => p.nameKey === 'part.rail');
    expect(rails.map((r) => r.edges.L1).sort()).toEqual(['none', 'thin']);
    expect(parts.find((p) => p.nameKey === 'part.side')!.edges).toEqual({ L1: 'thin', L2: 'none', W1: 'none', W2: 'none' });
    expect(parts.find((p) => p.nameKey === 'part.door')!.edges).toEqual({ L1: 'thick', L2: 'thick', W1: 'thick', W2: 'thick' });
    expect(parts.find((p) => p.nameKey === 'part.back')!.edges.L1).toBe('none');
  });

  it('uses settings, not hard-coded values (t=19, gap=2)', () => {
    const s = summary(baseParts(mod(), { ...settings, t: 19, gap: 2 }));
    expect(s['bottom 562x560']).toBe(1);
    expect(s['door 598x718']).toBe(1);
  });
});
