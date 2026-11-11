import type { Board, MaterialKey, Settings, Units } from '../core/types';
import { dimNum } from './format';

/** i18next's `t`, reduced to what is used here. */
export type TFn = (key: string, params?: Record<string, unknown>) => string;

/** What is cut from a board: "Korpus", "Front", "Korpus i front" or "HDF". */
export function kindsLabel(kinds: MaterialKey[], t: TFn): string {
  const carcass = kinds.includes('carcass');
  const front = kinds.includes('front');
  if (carcass && front) return t('report.kindBoth');
  if (carcass) return t('report.materials.carcass');
  if (front) return t('report.materials.front');
  return t('report.materials.hdf');
}

/** Heading of a board in the report: "Korpus — Hrast · 18 mm". */
export function boardTitle(b: { name: string; thickness: number }, kinds: MaterialKey[], units: Units, t: TFn): string {
  return `${kindsLabel(kinds, t)}${b.name ? ` — ${b.name}` : ''} · ${dimNum(b.thickness, units)} ${units}`;
}

/** Label of a board in a module's select: "Osnovni korpus: Hrast · 18 mm". */
export function boardOptionLabel(b: Board, s: Settings, t: TFn): string {
  const named = (key: string) => `${t(key)}${b.name ? `: ${b.name}` : ''}`;
  const label =
    b.id === 'carcass'
      ? named('materials.defaultCarcass')
      : b.id === 'front'
        ? named('materials.defaultFront')
        : b.name || t('materials.unnamed', { n: s.boards.findIndex((x) => x.id === b.id) + 1 });
  return `${label} · ${dimNum(b.thickness, s.units)} ${s.units}`;
}
