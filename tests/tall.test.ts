import { describe, expect, it } from 'vitest';
import { tallParts } from '../src/core/parts/tall';
import { mod, settings, summary } from './helpers';

describe('tallParts', () => {
  it('default 600x2100x560, 4 shelves, 1 door (no split)', () => {
    expect(summary(tallParts(mod('tall'), settings))).toEqual({
      'side 2100x560': 2,
      'bottomTop 564x560': 2,
      'shelf 562x540': 4,
      'back 596x2096': 1,
      'door 597x2097': 1,
    });
  });

  it('doorSplitH=900: two door levels + fixed shelf', () => {
    const parts = tallParts(mod('tall', { doorSplitH: 900, shelves: 2 }), settings);
    expect(summary(parts)).toEqual({
      'side 2100x560': 2,
      'bottomTop 564x560': 2,
      'shelf 562x540': 2,
      'fixedShelf 564x560': 1,
      'back 596x2096': 1,
      'door 597x897': 1, // 900 - 3
      'door 597x1197': 1, // 2100 - 900 - 3
    });
    expect(parts.find((p) => p.nameKey === 'part.fixedShelf')!.edges.L1).toBe('thin');
  });

  it('doorSplitH with 2 doors per level', () => {
    const s = summary(tallParts(mod('tall', { doorSplitH: 900, doors: 2 }), settings));
    expect(s['door 297x897']).toBe(2);
    expect(s['door 297x1197']).toBe(2);
  });

  it('split door heights + gaps add up to H (g=2)', () => {
    const doors = tallParts(mod('tall', { doorSplitH: 900 }), { ...settings, gap: 2 }).filter((p) => p.nameKey === 'part.door');
    expect(doors.reduce((a, d) => a + d.Wd + 2, 0)).toBe(2100);
  });

  it('doorSplitH ignored when unset: no fixed shelf', () => {
    expect(tallParts(mod('tall'), settings).some((p) => p.nameKey === 'part.fixedShelf')).toBe(false);
  });
});
