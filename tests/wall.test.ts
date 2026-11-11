import { describe, expect, it } from 'vitest';
import { wallParts } from '../src/core/parts/wall';
import { mod, settings, summary } from './helpers';

describe('wallParts', () => {
  it('default 600x720x320, 1 shelf, 1 door', () => {
    expect(summary(wallParts(mod('wall'), settings))).toEqual({
      'side 720x320': 2,
      'bottomTop 564x320': 2,
      'shelf 562x300': 1,
      'back 596x716': 1,
      'door 597x717': 1,
    });
  });

  it('2 doors, 0 shelves', () => {
    const s = summary(wallParts(mod('wall', { doors: 2, shelves: 0 }), settings));
    expect(s['door 297x717']).toBe(2);
    expect(Object.keys(s).some((k) => k.startsWith('shelf'))).toBe(false);
  });

  it('3 shelves: qty 3', () => {
    expect(summary(wallParts(mod('wall', { shelves: 3 }), settings))['shelf 562x300']).toBe(3);
  });

  it('has no rails, edges on front only, thick doors', () => {
    const parts = wallParts(mod('wall'), settings);
    expect(parts.some((p) => p.nameKey === 'part.rail')).toBe(false);
    expect(parts.find((p) => p.nameKey === 'part.bottomTop')!.edges).toEqual({ L1: 'thin', L2: 'none', W1: 'none', W2: 'none' });
    expect(parts.find((p) => p.nameKey === 'part.door')!.edges.W2).toBe('thick');
    expect(parts.find((p) => p.nameKey === 'part.back')!.edges.L1).toBe('none');
  });
});
