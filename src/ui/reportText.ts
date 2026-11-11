import { HDF } from '../core/boards';
import type { Report } from '../core/report';
import type { Settings } from '../core/types';
import { formatLength } from '../core/units';
import { boardTitle, type TFn } from './boardLabels';
import { dimNum, meters } from './format';

export type { TFn };

/** One thing to buy: a quantity and what it is, and the same as a sentence for the text export. */
export interface ShoppingItem {
  qty: number | string; // "4", or "30 m" for things bought by length
  title: string; // "ploče korpusa (Hrast)"
  detail?: string; // "2800 × 2070 × 18 mm"
  note?: string; // "Iskorišćenje: 66%"
  color?: string; // color of the board, for a swatch
  text: string; // "4 ploče korpusa (Hrast), 2800 × 2070 × 18 mm"
}
export interface ShoppingGroup {
  key: 'sheets' | 'edging' | 'worktop' | 'hardware';
  title: string;
  items: ShoppingItem[];
}

/** Hardware as label and quantity; handles are listed by type. */
export function hardwareRows(hardware: Report['shopping']['hardware'], units: Settings['units'], t: TFn): [string, number][] {
  return [
    [t('report.hinges'), hardware.hinges],
    ...Object.entries(hardware.slides).map(([len, pairs]): [string, number] => [t('report.slides', { length: formatLength(Number(len), units) }), pairs]),
    [t('report.legs'), hardware.legs],
    ...hardware.handles.map((h): [string, number] => [h.name ? `${t('report.handles')} — ${h.name}` : t('report.handles'), h.qty]),
    [t('report.shelfPins'), hardware.shelfPins],
    [t('report.wallHangers'), hardware.wallHangers],
    [t('report.confirmats'), hardware.confirmats.qty],
  ];
}

/** The shopping list, grouped: sheets, edge banding, worktop, hardware. Empty groups are left out. */
export function shoppingGroups(report: Report, s: Settings, t: TFn): ShoppingGroup[] {
  const u = s.units;
  const { sheets, edging, worktop, hardware } = report.shopping;
  const dim = (n: number) => dimNum(n, u);

  const sheetItems = sheets.map((line): ShoppingItem => {
    const detail = `${dim(line.sheet.length)} × ${dim(line.sheet.width)} × ${dim(line.thickness)} ${u}`;
    const note = `${t('report.utilization')}: ${line.utilization.toFixed(0)}%`;
    if (line.boardId === HDF) {
      return { qty: line.count, title: t('need.hdfItem', { count: line.count }), detail, note, color: line.color, text: t('need.hdf', { count: line.count, size: detail }) };
    }
    const carcass = line.kinds.includes('carcass');
    const front = line.kinds.includes('front');
    const what = t(carcass && front ? 'need.kindBoth' : carcass ? 'need.kindCarcass' : 'need.kindFront');
    const decor = line.name ? ` (${line.name})` : '';
    return {
      qty: line.count,
      title: t('need.sheetItem', { count: line.count, what, decor }),
      detail,
      note,
      color: line.color,
      text: t('need.sheet', { count: line.count, what, decor, size: detail }),
    };
  });

  const edgeItems: ShoppingItem[] = [];
  for (const line of edging) {
    const carcass = line.kinds.includes('carcass');
    const front = line.kinds.includes('front');
    const what = line.name || t(carcass && front ? 'need.whatBoth' : carcass ? 'need.whatCarcass' : 'need.whatFront');
    for (const type of ['Thin', 'Thick'] as const) {
      const v = type === 'Thin' ? line.thin : line.thick;
      if (v) edgeItems.push({ qty: meters(v, u), title: t(`need.titleEdge${type}`, { what }), text: t(`need.edge${type}`, { what, amount: meters(v, u) }) });
    }
  }

  const worktopItems: ShoppingItem[] = [];
  if (worktop.pieces) {
    const detail = `${dim(worktop.length)} × ${dim(worktop.depth)} × ${dim(worktop.thickness)} ${u}`;
    const decor = worktop.decor ? ` (${worktop.decor})` : '';
    worktopItems.push({
      qty: worktop.pieces,
      title: t('need.worktopItem', { count: worktop.pieces, decor }),
      detail,
      text: t('need.worktop', { count: worktop.pieces, decor, size: detail }),
    });
  }
  if (worktop.trimMeters) {
    const amount = meters(worktop.trimMeters, u);
    worktopItems.push({ qty: amount, title: t('report.worktopTrim'), text: t('need.trim', { amount }) });
  }

  const hardwareItems = hardwareRows(hardware, u, t)
    .filter(([, qty]) => qty)
    .map(([label, qty]): ShoppingItem => ({ qty, title: label, text: t('need.item', { label, qty }) }));

  const groups: ShoppingGroup[] = [
    { key: 'sheets', title: t('report.sheets'), items: sheetItems },
    { key: 'edging', title: t('report.edging'), items: edgeItems },
    { key: 'worktop', title: t('report.worktop'), items: worktopItems },
    { key: 'hardware', title: t('report.hardware'), items: hardwareItems },
  ];
  return groups.filter((g) => g.items.length > 0);
}

/** The shopping list written out in sentences, e.g. "4 ploče korpusa (Hrast), 2800 × 2070 × 18 mm". */
export const shoppingLines = (report: Report, s: Settings, t: TFn): string[] => shoppingGroups(report, s, t).flatMap((g) => g.items.map((i) => i.text));

/** Plain-text export: the written shopping list, then the cutting list of every board. */
export function reportText(report: Report, s: Settings, t: TFn): string {
  const u = s.units;
  const out: string[] = [t('need.title'), '', `${t('need.heading')}:`, ...shoppingLines(report, s, t).map((l) => `• ${l}`)];

  out.push('', t('report.cuttingList').toUpperCase());
  for (const table of report.cuttingList) {
    if (!table.rows.length) continue;
    out.push('', boardTitle(table.board, table.kinds, u, t));
    for (const r of table.rows) {
      const e = r.edges;
      out.push(
        [
          t(r.nameKey),
          `${dimNum(r.L, u)} × ${dimNum(r.Wd, u)} ${u}`,
          `${r.qty} ${t('need.pcs')}`,
          `${t('csv.L1')} ${t(`edge.${e.L1}`)}, ${t('csv.L2')} ${t(`edge.${e.L2}`)}, ${t('csv.W1')} ${t(`edge.${e.W1}`)}, ${t('csv.W2')} ${t(`edge.${e.W2}`)}`,
          `${t('csv.grain')}: ${t(r.grain ? 'csv.grainYes' : 'csv.grainNo')}`,
        ].join(' | '),
      );
    }
  }
  out.push('', t('notice.corner'), '');
  return out.join('\n');
}
