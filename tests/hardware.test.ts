import { describe, expect, it } from 'vitest';
import { generateHardware, hingesPerDoor } from '../src/core/hardware';
import type { Settings } from '../src/core/types';
import { mod, settings } from './helpers';

describe('hingesPerDoor boundaries', () => {
  it.each([
    [900, 2], [901, 3], [1600, 3], [1601, 4], [2000, 4], [2001, 5], [2100, 5],
  ])('door height %i -> %i hinges', (h, n) => expect(hingesPerDoor(h)).toBe(n));

  it('module H is converted to door height (H - gap): H=903 -> door 900, H=904 -> door 901', () => {
    expect(generateHardware([mod('base', { H: 903 })], settings).hinges).toBe(2);
    expect(generateHardware([mod('base', { H: 904 })], settings).hinges).toBe(3);
  });

  it('subtractEdge does not change hinge counts', () => {
    const s = { ...settings, subtractEdge: true, edgeThick: 2 };
    expect(generateHardware([mod('base', { H: 903 })], s).hinges).toBe(2);
  });
});

describe('generateHardware', () => {
  it('reference base cabinet', () => {
    expect(generateHardware([mod('base')], settings)).toEqual({
      hinges: 2,
      slides: {},
      legs: 4,
      handles: [{ name: '', qty: 1 }],
      shelfPins: 4,
      wallHangers: 0,
      confirmats: { qty: 16, estimate: true }, // rails 2*2*2=8 + bottom 1*2*(3+1)=8
      worktop: { pieces: 1, trimMeters: 1 },
    });
  });

  it('drawer cabinet: 3 pairs of 550 slides, 3 handles, no hinges', () => {
    const hw = generateHardware([mod('drawer')], settings);
    expect(hw).toMatchObject({ hinges: 0, slides: { 550: 3 }, handles: [{ name: '', qty: 3 }], legs: 4, shelfPins: 0 });
  });

  it('wall cabinet: 2 hangers, no legs, no rails (2 panels * 2 * (2+1) = 12 confirmats)', () => {
    const hw = generateHardware([mod('wall', { row: 'upper' })], settings);
    expect(hw).toMatchObject({ wallHangers: 2, legs: 0, hinges: 2, shelfPins: 4, confirmats: { qty: 12 } });
    expect(hw.worktop.pieces).toBe(0);
  });

  it('tall with doorSplitH=900: 897 -> 2 + 1197 -> 3 hinges, 2 handles, 4 shelves of pins', () => {
    const hw = generateHardware([mod('tall', { doorSplitH: 900 })], settings);
    // panels: bottomTop 2 + fixed shelf 1 = 3 * 2 * (3+1) = 24
    expect(hw).toMatchObject({ hinges: 5, handles: [{ name: '', qty: 2 }], legs: 4, shelfPins: 16, confirmats: { qty: 24 } });
  });

  it('legs: 6 when W > 1000, 4 at exactly 1000', () => {
    expect(generateHardware([mod('base', { W: 1001 })], settings).legs).toBe(6);
    expect(generateHardware([mod('base', { W: 1000 })], settings).legs).toBe(4);
  });

  it('sums over modules and slide lengths are grouped', () => {
    const hw = generateHardware([mod('drawer'), mod('drawer', { D: 460 }), mod('base')], settings);
    expect(hw.slides).toEqual({ 550: 3, 450: 3 });
    expect(hw.handles).toEqual([{ name: '', qty: 7 }]);
  });

  it('worktop: pieces by worktopLength, tall excluded, trim in whole meters', () => {
    const row = (n: number) => Array.from({ length: n }, (_, i) => mod('base', { id: `b${i}` }));
    expect(generateHardware([...row(3), mod('tall')], settings).worktop).toEqual({ pieces: 1, trimMeters: 2 }); // 1800 mm
    expect(generateHardware(row(7), settings).worktop).toEqual({ pieces: 2, trimMeters: 5 }); // 4200 > 4100
  });
});

describe('handles', () => {
  const catalog: Settings = {
    ...settings,
    handles: [
      { id: 'h1', name: 'Ručka 128 crna' },
      { id: 'h2', name: 'Ručka 160 inox' },
    ],
    defaultHandle: 'h1',
  };
  const handles = (modules: ReturnType<typeof mod>[], st: Settings = settings) => generateHardware(modules, st).handles;

  it('without any handles added they are just "handles": one per door and per drawer front', () => {
    expect(handles([mod('base', { id: 'a', doors: 2 }), mod('drawer', { id: 'd', order: 1 })])).toEqual([{ name: '', qty: 5 }]);
  });

  it('the default handle of the project goes on every cabinet that does not pick its own', () => {
    expect(handles([mod('base', { id: 'a' }), mod('drawer', { id: 'd', order: 1 })], catalog)).toEqual([{ name: 'Ručka 128 crna', qty: 4 }]);
  });

  it('a cabinet can pick another handle; they are counted by type', () => {
    const r = handles(
      [mod('base', { id: 'a', order: 0 }), mod('base', { id: 'b', order: 1, handle: 'h2' }), mod('drawer', { id: 'd', order: 2, handle: 'h2' }), mod('wall', { id: 'w', order: 0 })],
      catalog,
    );
    expect(r).toEqual([{ name: 'Ručka 128 crna', qty: 2 }, { name: 'Ručka 160 inox', qty: 4 }]);
  });

  it('without a default handle, a cabinet that picks none has the unnamed handles', () => {
    const r = handles([mod('base', { id: 'a' }), mod('base', { id: 'b', order: 1, handle: 'h2' })], { ...catalog, defaultHandle: '' });
    expect(r).toEqual([{ name: '', qty: 1 }, { name: 'Ručka 160 inox', qty: 1 }]);
  });

  it('two handles in the list with the same name are one line', () => {
    const st: Settings = { ...catalog, handles: [{ id: 'h1', name: 'Inox' }, { id: 'h2', name: ' inox ' }] };
    expect(handles([mod('base', { id: 'a', handle: 'h1' }), mod('base', { id: 'b', order: 1, handle: 'h2' })], st)).toEqual([{ name: 'Inox', qty: 2 }]);
  });

  it('"none" means no handles on that cabinet', () => {
    expect(handles([mod('base', { id: 'a', handle: 'none' }), mod('base', { id: 'b', order: 1 })])).toEqual([{ name: '', qty: 1 }]);
    expect(handles([mod('base', { id: 'a', handle: 'none' })], catalog)).toEqual([]);
  });

  it('a handle that was deleted falls back to the default', () => {
    expect(handles([mod('base', { id: 'a', handle: 'gone' })], catalog)).toEqual([{ name: 'Ručka 128 crna', qty: 1 }]);
    expect(handles([mod('base', { id: 'a', handle: 'gone' })], { ...catalog, defaultHandle: 'also-gone' })).toEqual([{ name: '', qty: 1 }]);
  });

  it('a cabinet without fronts has no handles', () => {
    expect(handles([mod('wall', { id: 'w', doors: 0 })], catalog)).toEqual([]);
  });

  it('the tall cabinet with two door levels has a handle on each door', () => {
    expect(handles([mod('tall', { id: 't', doorSplitH: 900, doors: 2 })])).toEqual([{ name: '', qty: 4 }]);
  });
});
