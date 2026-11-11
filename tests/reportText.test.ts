import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/core/defaults';
import { edgeMeters } from '../src/core/edging';
import { generateParts } from '../src/core/parts';
import { buildReport } from '../src/core/report';
import type { Module, Settings } from '../src/core/types';
import i18n from '../src/i18n';
import { reportText, shoppingGroups, shoppingLines, type TFn } from '../src/ui/reportText';
import { mod } from './helpers';

const kitchen: Module[] = [
  ...[0, 1, 2, 3].map((i) => mod('base', { id: `b${i}`, order: i })),
  mod('sink', { id: 's', order: 4 }),
  mod('drawer', { id: 'd', order: 5 }),
  ...[0, 1, 2, 3, 4].map((i) => mod('wall', { id: `w${i}`, order: i })),
  mod('tall', { id: 't', order: 6 }),
];
const settings: Settings = { ...DEFAULT_SETTINGS, decor: { carcass: 'Hrast', front: 'Bela', hdf: '' } };
const tr = (lng: string) => i18n.getFixedT(lng) as unknown as TFn;

describe('written shopping list', () => {
  const report = buildReport(kitchen, settings);

  it('says how many sheets to buy, per material, with decor and sheet size', () => {
    const lines = shoppingLines(report, settings, tr('sr'));
    expect(lines).toContain('4 ploče korpusa (Hrast), 2800 × 2070 × 18 mm');
    expect(lines).toContain('2 ploče fronta (Bela), 2800 × 2070 × 18 mm');
    expect(lines).toContain('2 HDF ploče, 2800 × 2070 × 3 mm');
  });

  it('edge banding, worktop and hardware are written out too', () => {
    const lines = shoppingLines(report, settings, tr('sr'));
    const e = edgeMeters(generateParts(kitchen, settings), settings);
    expect(lines).toContain(`Tanki kant, Hrast: ${e[0].thin} m`);
    expect(lines).toContain(`Debeli kant, Bela: ${e[1].thick} m`);
    expect(lines).toContain('1 komad radne ploče, 4100 × 600 × 38 mm');
    expect(lines.some((l) => /^Šarke: \d+$/.test(l))).toBe(true);
    expect(lines).toContain('Vođice fioka 550 mm (parova): 3');
    expect(lines.some((l) => l.startsWith('Konfirmati (procena): '))).toBe(true);
  });

  it('zero quantities are left out', () => {
    const lines = shoppingLines(buildReport([mod('base', { id: 'a' })], settings), settings, tr('sr'));
    expect(lines.some((l) => l.startsWith('Vešalice'))).toBe(false); // no wall cabinets
    expect(lines.some((l) => l.startsWith('Vođice'))).toBe(false); // no drawers
    expect(lines.some((l) => l.startsWith('Tanki kant, Bela'))).toBe(false); // doors have thick edges only
  });

  it.each([
    [1, '1 ploča'], [2, '2 ploče'], [4, '4 ploče'], [5, '5 ploča'], [11, '11 ploča'], [12, '12 ploča'], [21, '21 ploča'], [22, '22 ploče'],
  ])('Serbian plural: %i sheets', (count, text) => {
    expect(tr('sr')('need.sheet', { count, what: 'korpusa', decor: '', size: 'X' })).toBe(`${text} korpusa, X`);
  });

  it('English plural and wording', () => {
    expect(tr('en')('need.sheet', { count: 1, what: 'carcass', decor: '', size: 'X' })).toBe('1 carcass sheet, X');
    expect(tr('en')('need.sheet', { count: 3, what: 'carcass', decor: ' (Oak)', size: 'X' })).toBe('3 carcass sheets (Oak), X');
    expect(shoppingLines(report, settings, tr('en'))).toContain('2 HDF sheets, 2800 × 2070 × 3 mm');
  });

  it('inches: sheet sizes in inches, banding in feet', () => {
    const s = { ...settings, units: 'in' as const };
    const lines = shoppingLines(buildReport(kitchen, s), s, tr('sr'));
    expect(lines).toContain('4 ploče korpusa (Hrast), 110.24 × 81.5 × 0.71 in');
    expect(lines.some((l) => /^Tanki kant, Hrast: [\d.]+ ft$/.test(l))).toBe(true);
    expect(lines.join('\n')).not.toMatch(/\bmm\b/);
  });
});

describe('text export', () => {
  for (const lng of ['sr', 'en']) {
    it(`${lng}: shopping list, then the cutting list of every material, fully translated`, () => {
      const settings2: Settings = { ...settings };
      const text = reportText(buildReport(kitchen, settings2), settings2, tr(lng));
      const lines = text.split('\n');
      expect(lines[0]).toBe(lng === 'sr' ? 'Spisak za kupovinu i krojna lista' : 'Shopping list and cutting list');
      expect(text).toContain(lng === 'sr' ? 'Treba da kupiš:' : 'You need to buy:');
      expect(lines.filter((l) => l.startsWith('• ')).length).toBeGreaterThan(8);
      expect(text).toContain(lng === 'sr' ? 'KROJNA LISTA' : 'CUTTING LIST');
      expect(text).toContain(lng === 'sr' ? 'Korpus — Hrast · 18 mm' : 'Carcass — Hrast · 18 mm');
      expect(text).toContain('Front — Bela · 18 mm');
      expect(text).toContain('HDF · 3 mm');
      expect(text).not.toMatch(/\b(need|part|csv|edge|report|notice)\.[A-Za-z]/); // no raw translation keys
    });
  }

  it('cutting-list rows have name, size, quantity, edges and grain', () => {
    const text = reportText(buildReport(kitchen, settings), settings, tr('sr'));
    expect(text).toContain('Bok | 720 × 560 mm | 12 kom | Kant L1 Tanak, Kant L2 Bez, Kant W1 Bez, Kant W2 Bez | Šara: Ne');
    expect(text).toContain('Ugaoni elementi nisu podržani u ovoj verziji.');
  });
});

describe('shoppingGroups', () => {
  const report = buildReport(kitchen, settings);
  const groups = shoppingGroups(report, settings, tr('sr'));

  it('groups: sheets, edge banding, worktop, hardware', () => {
    expect(groups.map((g) => [g.key, g.title])).toEqual([['sheets', 'Ploče'], ['edging', 'Kant'], ['worktop', 'Radna ploča'], ['hardware', 'Okovi']]);
  });

  it('a sheet item has the quantity, what it is, its size and its utilization apart', () => {
    const [carcass, front, hdf] = groups[0].items;
    expect(carcass).toMatchObject({ qty: 4, title: 'ploče korpusa (Hrast)', detail: '2800 × 2070 × 18 mm', text: '4 ploče korpusa (Hrast), 2800 × 2070 × 18 mm' });
    expect(carcass.note).toMatch(/^Iskorišćenje: \d+%$/);
    expect(front).toMatchObject({ qty: 2, title: 'ploče fronta (Bela)' });
    expect(hdf).toMatchObject({ qty: 2, title: 'HDF ploče', detail: '2800 × 2070 × 3 mm' });
  });

  it('edge banding items carry the length in the quantity', () => {
    const e = edgeMeters(generateParts(kitchen, settings), settings);
    expect(groups[1].items.map((i) => [i.qty, i.title])).toEqual([
      [`${e[0].thin} m`, 'Tanki kant, Hrast'],
      [`${e[1].thick} m`, 'Debeli kant, Bela'],
    ]);
  });

  it('worktop and wall trim', () => {
    expect(groups[2].items.map((i) => [i.qty, i.title, i.detail])).toEqual([
      [1, 'komad radne ploče', '4100 × 600 × 38 mm'],
      ['4 m', 'Zidna lajsna', undefined],
    ]);
  });

  it('hardware items are label and number; zero quantities are left out', () => {
    expect(groups[3].items.map((i) => i.title)).toContain('Šarke');
    expect(groups[3].items.every((i) => typeof i.qty === 'number' && i.qty > 0)).toBe(true);
    const one = shoppingGroups(buildReport([mod('base', { id: 'a' })], settings), settings, tr('sr'));
    expect(one.find((g) => g.key === 'hardware')!.items.map((i) => i.title)).not.toContain('Vešalice');
  });

  it('a group without items is not there (only wall cabinets: no worktop)', () => {
    const wallOnly = shoppingGroups(buildReport([mod('wall', { id: 'w' })], settings), settings, tr('sr'));
    expect(wallOnly.map((g) => g.key)).toEqual(['sheets', 'edging', 'hardware']);
  });

  it('the sentences are the same as before', () => {
    expect(shoppingLines(report, settings, tr('sr'))).toEqual(groups.flatMap((g) => g.items.map((i) => i.text)));
  });

  it.each([[1, 'ploča'], [2, 'ploče'], [5, 'ploča'], [22, 'ploče']])('Serbian plural of the sheet title: %i', (count, word) => {
    expect(tr('sr')('need.sheetItem', { count, what: 'korpusa', decor: '' })).toBe(`${word} korpusa`);
  });

  it('English', () => {
    const en = shoppingGroups(report, settings, tr('en'));
    expect(en[0].items[0]).toMatchObject({ qty: 4, title: 'carcass sheets (Hrast)' });
    expect(en.map((g) => g.title)).toEqual(['Sheets', 'Edge banding', 'Worktop', 'Hardware']);
    expect(shoppingGroups(buildReport([mod('base', { id: 'a' })], settings), settings, tr('en'))[0].items[0].title).toBe('carcass sheet (Hrast)');
  });

  it('inches: sizes in inches, lengths in feet', () => {
    const s = { ...settings, units: 'in' as const };
    const g = shoppingGroups(buildReport(kitchen, s), s, tr('sr'));
    expect(g[0].items[0].detail).toBe('110.24 × 81.5 × 0.71 in');
    expect(g[1].items.every((i) => /^[\d.]+ ft$/.test(String(i.qty)))).toBe(true);
  });
});
