import { describe, expect, it } from 'vitest';
import { drawerParts, slideLength } from '../src/core/parts/drawer';
import { mod, settings, summary } from './helpers';

describe('slideLength', () => {
  it('picks the largest slide <= D - 10', () => {
    expect(slideLength(560)).toBe(550);
    expect(slideLength(559)).toBe(500);
    expect(slideLength(300)).toBe(250);
    expect(slideLength(260)).toBe(250);
  });
  it('throws when nothing fits', () => {
    expect(() => slideLength(259)).toThrow(RangeError);
  });
});

describe('drawerParts', () => {
  it('default 600x720x560, 3 x 237: carcass + fronts + boxes', () => {
    // Lv=550, bw=600-36-26=538, bh=237-40=197, end=538-36=502
    expect(summary(drawerParts(mod('drawer'), settings))).toEqual({
      'side 720x560': 2,
      'bottom 564x560': 1,
      'rail 564x100': 2,
      'back 596x716': 1,
      'drawerFront 597x237': 3,
      'drawerSide 550x197': 6,
      'drawerEnd 502x197': 6,
      'drawerBottom 538x550': 3,
    });
  });

  it('no doors or shelves even if set', () => {
    const parts = drawerParts(mod('drawer', { doors: 2, shelves: 2 }), settings);
    expect(parts.some((p) => p.nameKey === 'part.door' || p.nameKey === 'part.shelf')).toBe(false);
  });

  it('box height is clamped to 80..200', () => {
    const bh = (h: number) => drawerParts(mod('drawer', { drawers: [h] }), settings).find((p) => p.nameKey === 'part.drawerSide')!.Wd;
    expect(bh(100)).toBe(80);
    expect(bh(140)).toBe(100);
    expect(bh(300)).toBe(200);
  });

  it('shallow cabinet uses a shorter slide', () => {
    const p = drawerParts(mod('drawer', { D: 300, drawers: [237] }), settings);
    expect(p.find((x) => x.nameKey === 'part.drawerSide')!.L).toBe(250);
    expect(p.find((x) => x.nameKey === 'part.drawerBottom')!.Wd).toBe(250);
  });

  it('edges: front thick, box sides/ends thin on top, bottom none', () => {
    const parts = drawerParts(mod('drawer', { drawers: [237] }), settings);
    const e = (n: string) => parts.find((p) => p.nameKey === n)!.edges;
    expect(e('part.drawerFront')).toEqual({ L1: 'thick', L2: 'thick', W1: 'thick', W2: 'thick' });
    expect(e('part.drawerSide')).toEqual({ L1: 'thin', L2: 'none', W1: 'none', W2: 'none' });
    expect(e('part.drawerEnd')).toEqual({ L1: 'thin', L2: 'none', W1: 'none', W2: 'none' });
    expect(e('part.drawerBottom').L1).toBe('none');
  });

  it('uses t from settings (t=19)', () => {
    const s = summary(drawerParts(mod('drawer', { drawers: [237] }), { ...settings, t: 19 }));
    expect(s['drawerEnd 498x197']).toBe(2); // bw = 600-38-26 = 536, minus 2*19
  });
});

describe('drawerParts, custom heights [140, 280, 280]', () => {
  it('lists every part', () => {
    // bh: 140-40=100, 280-40=240 -> clamped 200
    expect(summary(drawerParts(mod('drawer', { drawers: [140, 280, 280] }), settings))).toEqual({
      'side 720x560': 2,
      'bottom 564x560': 1,
      'rail 564x100': 2,
      'back 596x716': 1,
      'drawerFront 597x140': 1,
      'drawerFront 597x280': 2,
      'drawerSide 550x100': 2,
      'drawerSide 550x200': 4,
      'drawerEnd 502x100': 2,
      'drawerEnd 502x200': 4,
      'drawerBottom 538x550': 3,
    });
  });
});
