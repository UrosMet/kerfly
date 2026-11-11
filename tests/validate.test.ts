import { describe, expect, it } from 'vitest';
import { validate } from '../src/core/validate';
import type { Module, Settings } from '../src/core/types';
import { mod, settings } from './helpers';

const run = (modules: Module[], s: Settings = settings) => validate(modules, s);
const codes = (issues: { code: string }[]) => issues.map((i) => i.code.replace('validation.', ''));
const bases = (n: number, over: Partial<Module> = {}) =>
  Array.from({ length: n }, (_, i) => mod('base', { id: `b${i}`, order: i, ...over }));

describe('validate', () => {
  it('a default project has no issues', () => {
    expect(run([mod('base'), mod('drawer', { id: 'd' }), mod('wall', { id: 'w' })])).toEqual({ errors: [], warnings: [] });
  });

  it('width: error below 150 and above 1200', () => {
    for (const [W, bad] of [[149, true], [150, false], [1200, false], [1201, true]] as const) {
      expect(codes(run([mod('base', { W })]).errors).includes('width')).toBe(bad);
    }
  });

  it('single door wider than 600 -> warning (door width = W - gap)', () => {
    const warn = (m: Module) => codes(run([m]).warnings).includes('doorTooWide');
    expect(warn(mod('base', { W: 603 }))).toBe(false); // door 600
    expect(warn(mod('base', { W: 604 }))).toBe(true); // door 601
    expect(warn(mod('base', { W: 1000, doors: 2 }))).toBe(false);
  });

  it('part larger than the sheet -> error, depends on grain', () => {
    const tall = (H: number) => mod('tall', { id: 't', H });
    expect(codes(run([tall(2780)]).errors)).not.toContain('partTooLarge'); // door and back fit rotated
    const r = run([tall(2781)]);
    expect(codes(r.errors)).toContain('partTooLarge'); // side 2781 > 2780
    expect(r.errors.find((e) => e.code === 'validation.partTooLarge')!.moduleId).toBe('t');
    // with front grain the 2777 mm door cannot be rotated onto the 2050 mm width
    const grain = { ...settings, grain: { carcass: false, front: true } };
    expect(run([tall(2780)], grain).errors.some((e) => e.params?.part === 'part.door')).toBe(true);
  });

  it('lower row longer than the wall -> error (tall counts, wall row does not)', () => {
    const s = { ...settings, wallLength: 3000 };
    expect(codes(run(bases(5), s).errors)).not.toContain('rowTooLong'); // exactly 3000
    expect(codes(run(bases(6), s).errors)).toContain('rowTooLong');
    expect(codes(run([...bases(5), mod('tall', { id: 't' })], s).errors)).toContain('rowTooLong');
    expect(codes(run([...bases(5), mod('wall', { id: 'w', W: 900 })], s).errors)).not.toContain('rowTooLong');
  });

  it('lower row shorter than wallLength - 50 -> warning', () => {
    const s = { ...settings, wallLength: 3000 };
    const row = (last: number) => [...bases(4), mod('base', { id: 'x', W: last })];
    expect(codes(run(row(550), s).warnings)).not.toContain('rowShort'); // 2950 = wallLength - 50
    expect(codes(run(row(549), s).warnings)).toContain('rowShort'); // 2949
    expect(codes(run(bases(5), s).warnings)).not.toContain('rowShort');
    expect(codes(run(bases(1)).warnings)).not.toContain('rowShort'); // no wallLength set
  });

  it('drawer fronts + gaps must equal H -> error', () => {
    const err = (m: Module) => codes(run([m]).errors).includes('drawerHeights');
    expect(err(mod('drawer'))).toBe(false); // 3 x 237 + 9 = 720
    expect(err(mod('drawer', { drawers: [140, 280, 280] }))).toBe(true); // 709
    expect(err(mod('drawer', { drawers: [] }))).toBe(true);
  });

  it('wall deeper than the base -> warning', () => {
    const warn = (wallD: number, others: Module[]) =>
      codes(run([...others, mod('wall', { id: 'w', D: wallD })]).warnings).includes('wallDeeper');
    expect(warn(561, [mod('base')])).toBe(true);
    expect(warn(560, [mod('base')])).toBe(false);
    expect(warn(600, [])).toBe(false); // no base to compare with
  });

  it('drawer box height below 80 (front below 120) -> error', () => {
    const err = (h: number) => codes(run([mod('drawer', { H: h + 3, drawers: [h] })]).errors).includes('drawerBoxTooLow');
    expect(err(119)).toBe(true); // box 79
    expect(err(120)).toBe(false); // box 80
  });

  it('drawer too shallow for any slide -> error, does not throw', () => {
    const err = (D: number) => codes(run([mod('drawer', { D })]).errors).includes('drawerTooShallow');
    expect(err(259)).toBe(true);
    expect(err(260)).toBe(false);
  });

  it('tall doorSplitH must be inside (0, H) -> error', () => {
    const err = (doorSplitH: number) => codes(run([mod('tall', { doorSplitH })]).errors).includes('doorSplit');
    expect(err(0)).toBe(true);
    expect(err(2100)).toBe(true);
    expect(err(900)).toBe(false);
  });
});
