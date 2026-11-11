import { MODULE_DEFAULTS } from './defaults';
import type { Module, ModuleType } from './types';

// Pure list operations for the builder. `order` is the position inside the module's row.

export const rowModules = (modules: Module[], row: Module['row']): Module[] =>
  modules.filter((m) => m.row === row).sort((a, b) => a.order - b.order);

/** Renumbers `order` to 0..n-1 inside each row, keeping the current order. */
export function normalize(modules: Module[]): Module[] {
  const order = new Map<string, number>();
  for (const row of ['lower', 'upper'] as const) rowModules(modules, row).forEach((m, i) => order.set(m.id, i));
  return modules.map((m) => ({ ...m, order: order.get(m.id)! }));
}

const clone = (m: Module): Module => (m.drawers ? { ...m, drawers: [...m.drawers] } : { ...m });

export function addModule(modules: Module[], type: ModuleType, id: string): Module[] {
  const d = MODULE_DEFAULTS[type];
  const added = clone({ ...d, id, order: modules.filter((m) => m.row === d.row).length });
  return normalize([...modules, added]);
}

/** Swaps the module with its neighbour in the same row; returns the same array at the row's edge. */
export function moveModule(modules: Module[], id: string, dir: -1 | 1): Module[] {
  const m = modules.find((x) => x.id === id);
  if (!m) return modules;
  const row = rowModules(modules, m.row);
  const i = row.findIndex((x) => x.id === id);
  const other = row[i + dir];
  if (!other) return modules;
  return modules.map((x) => (x.id === m.id ? { ...x, order: other.order } : x.id === other.id ? { ...x, order: m.order } : x));
}

/** The copy is placed right after the original. */
export function duplicateModule(modules: Module[], id: string, newId: string): Module[] {
  const m = modules.find((x) => x.id === id);
  if (!m) return modules;
  return normalize([...modules, { ...clone(m), id: newId, order: m.order + 0.5 }]);
}

export const deleteModule = (modules: Module[], id: string): Module[] => normalize(modules.filter((m) => m.id !== id));

export const updateModule = (modules: Module[], id: string, patch: Partial<Module>): Module[] =>
  modules.map((m) => (m.id === id ? { ...m, ...patch } : m));

/** `count` drawer fronts that, with their gaps, fill height H exactly (remainder goes to the last). */
export function evenDrawers(H: number, count: number, gap: number): number[] {
  if (count <= 0) return [];
  const free = H - count * gap;
  const each = Math.floor(free / count);
  const heights = Array<number>(count).fill(each);
  heights[count - 1] += free - each * count;
  return heights;
}
