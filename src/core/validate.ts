import { fitsSheet } from './packing';
import { generateParts } from './parts';
import { slideLength } from './parts/drawer';
import type { Module, Settings } from './types';

/** `code` is an i18n key; `params` fill its placeholders. */
export interface Issue {
  code: string;
  moduleId?: string;
  params?: Record<string, number | string>;
}
export interface ValidationResult {
  errors: Issue[];
  warnings: Issue[];
}

const sameNumber = (a: number, b: number) => Math.abs(a - b) < 1e-6;

export function validate(modules: Module[], s: Settings): ValidationResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const add = (list: Issue[], code: string, moduleId?: string, params?: Issue['params']) =>
    list.push({ code: `validation.${code}`, moduleId, params });

  const shallow = (m: Module) => {
    try {
      slideLength(m.D);
      return false;
    } catch {
      return true;
    }
  };

  for (const m of modules) {
    if (m.W < 150 || m.W > 1200) add(errors, 'width', m.id, { W: m.W });

    // single door: its width is W - gap
    if (m.type !== 'drawer' && m.doors === 1 && m.W - s.gap > 600) add(warnings, 'doorTooWide', m.id, { width: m.W - s.gap });

    if (m.type === 'tall' && m.doorSplitH !== undefined && !(m.doorSplitH > 0 && m.doorSplitH < m.H)) {
      add(errors, 'doorSplit', m.id, { doorSplitH: m.doorSplitH, H: m.H });
    }

    if (m.type === 'drawer') {
      if (shallow(m)) add(errors, 'drawerTooShallow', m.id, { D: m.D });
      const fronts = m.drawers ?? [];
      const total = fronts.reduce((a, h) => a + h, 0) + fronts.length * s.gap;
      if (!sameNumber(total, m.H)) add(errors, 'drawerHeights', m.id, { total, H: m.H });
      fronts.forEach((h, i) => {
        if (h - 40 < 80) add(errors, 'drawerBoxTooLow', m.id, { drawer: i + 1, boxHeight: h - 40 });
      });
    }
  }

  // Wall row sums (tall cabinets stand in the lower row).
  if (s.wallLength !== undefined) {
    const row = modules.filter((m) => m.row === 'lower').reduce((a, m) => a + m.W, 0);
    if (row > s.wallLength) add(errors, 'rowTooLong', undefined, { row, wallLength: s.wallLength });
    else if (row < s.wallLength - 50) add(warnings, 'rowShort', undefined, { row, wallLength: s.wallLength });
  }

  // Wall cabinets deeper than every base cabinet.
  const baseDepths = modules.filter((m) => m.type === 'base' || m.type === 'drawer' || m.type === 'sink').map((m) => m.D);
  if (baseDepths.length) {
    const maxBase = Math.max(...baseDepths);
    for (const m of modules) if (m.type === 'wall' && m.D > maxBase) add(warnings, 'wallDeeper', m.id, { D: m.D, baseD: maxBase });
  }

  // Parts larger than the sheet (rotation only for material without grain). Modules whose
  // part generation would throw (slides don't fit) are already reported above.
  const seen = new Set<string>();
  for (const p of generateParts(modules.filter((m) => !shallow(m)), s)) {
    const rotate = p.material === 'hdf' || !s.grain[p.material];
    if (fitsSheet(p, p.material === 'hdf' ? s.hdfSheet : s.sheet, s, rotate)) continue;
    const key = `${p.moduleId}|${p.nameKey}|${p.L}|${p.Wd}`;
    if (seen.has(key)) continue;
    seen.add(key);
    add(errors, 'partTooLarge', p.moduleId, { part: p.nameKey, L: p.L, Wd: p.Wd });
  }

  return { errors, warnings };
}
