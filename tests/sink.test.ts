import { describe, expect, it } from 'vitest';
import { sinkParts } from '../src/core/parts/sink';
import { mod, settings, summary } from './helpers';

describe('sinkParts', () => {
  it('default sink 800x720x560, 2 doors: base without back and shelves', () => {
    expect(summary(sinkParts(mod('sink'), settings))).toEqual({
      'side 720x560': 2,
      'bottom 764x560': 1,
      'rail 764x100': 2,
      'door 397x717': 2,
    });
  });

  it('ignores shelves even if set', () => {
    const parts = sinkParts(mod('sink', { shelves: 3 }), settings);
    expect(parts.some((p) => p.nameKey === 'part.shelf' || p.nameKey === 'part.back')).toBe(false);
  });
});
