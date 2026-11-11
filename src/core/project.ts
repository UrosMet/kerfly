import { DEFAULT_SETTINGS, MODULE_DEFAULTS } from './defaults';
import { normalize } from './modules';
import type { Module, ModuleType, Settings } from './types';

export interface Project {
  settings: Settings;
  modules: Module[];
}

/** `message` is the path of the offending value, e.g. "settings.t" or "modules[2].W". */
export class ProjectError extends Error {}

const FORMAT_VERSION = 1;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const fail = (path: string): never => {
  throw new ProjectError(path);
};

const pick = <T>(path: string, v: unknown, ok: (x: unknown) => x is T): T => (ok(v) ? v : fail(path));
const num = (min: number, exclusive = false) => (x: unknown): x is number =>
  typeof x === 'number' && Number.isFinite(x) && (exclusive ? x > min : x >= min);
const oneOf = <T extends string>(...values: T[]) => (x: unknown): x is T => values.includes(x as T);
const int = (min: number, max = Infinity) => (x: unknown): x is number => Number.isInteger(x) && (x as number) >= min && (x as number) <= max;
const bool = (x: unknown): x is boolean => typeof x === 'boolean';
const str = (x: unknown): x is string => typeof x === 'string';

const positive = num(0, true);
const nonNegative = num(0);

function group<T extends object>(raw: Record<string, unknown>, key: string, fields: { [K in keyof T]: (x: unknown) => boolean }, base: T): T {
  const g = raw[key];
  if (g === undefined) return base;
  if (!isObj(g)) return fail(`settings.${key}`);
  const out = { ...base };
  for (const f of Object.keys(fields) as (keyof T & string)[]) {
    if (g[f] === undefined) continue;
    if (!fields[f](g[f])) fail(`settings.${key}.${f}`);
    out[f] = g[f] as T[keyof T & string];
  }
  return out;
}

function parseSettings(raw: unknown): Settings {
  if (raw === undefined) return DEFAULT_SETTINGS;
  if (!isObj(raw)) return fail('settings');
  const s: Settings = { ...DEFAULT_SETTINGS };
  const set = <K extends keyof Settings>(key: K, ok: (x: unknown) => x is Settings[K]) => {
    if (raw[key] !== undefined) s[key] = pick(`settings.${key}`, raw[key], ok);
  };

  set('units', oneOf('mm', 'in'));
  set('market', oneOf('eu', 'us', 'uk'));
  set('plinth', oneOf('none', 'board', 'pvc'));
  set('subtractEdge', bool);
  for (const k of ['kerf', 'trim', 'edgeThin', 'edgeThick', 'plinthHeight', 'gap'] as const) set(k, nonNegative);
  for (const k of ['t', 'worktopLength', 'worktopDepth'] as const) set(k, positive);
  set('wallLength', positive);

  s.sheet = group(raw, 'sheet', { length: positive, width: positive }, DEFAULT_SETTINGS.sheet);
  s.hdfSheet = group(raw, 'hdfSheet', { length: positive, width: positive }, DEFAULT_SETTINGS.hdfSheet);
  s.grain = group(raw, 'grain', { carcass: bool, front: bool }, DEFAULT_SETTINGS.grain);
  s.decor = group(raw, 'decor', { carcass: str, front: str }, DEFAULT_SETTINGS.decor);
  return s;
}

function parseModules(raw: unknown): Module[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return fail('modules');
  const ids = new Set<string>();
  const modules = raw.map((m, i): Module => {
    const at = `modules[${i}]`;
    if (!isObj(m)) return fail(at);
    const type = pick<ModuleType>(`${at}.type`, m.type, oneOf('base', 'drawer', 'sink', 'wall', 'tall'));
    const d = MODULE_DEFAULTS[type];
    const id = pick(`${at}.id`, m.id, str);
    if (!id || ids.has(id)) fail(`${at}.id`);
    ids.add(id);
    const field = <T>(key: string, ok: (x: unknown) => x is T, fallback: T): T => (m[key] === undefined ? fallback : pick(`${at}.${key}`, m[key], ok));

    const out: Module = {
      id,
      type,
      row: field('row', oneOf('lower', 'upper'), d.row),
      order: field('order', num(-Infinity), i),
      W: field('W', positive, d.W),
      H: field('H', positive, d.H),
      D: field('D', positive, d.D),
      doors: field('doors', int(0, 2), d.doors),
      shelves: field('shelves', int(0), d.shelves),
    };
    if (out.row !== d.row) fail(`${at}.row`); // tall belongs to the lower row, wall to the upper
    if (m.drawers !== undefined) {
      if (!Array.isArray(m.drawers) || !m.drawers.every(positive)) fail(`${at}.drawers`);
      out.drawers = [...(m.drawers as number[])];
    } else if (d.drawers) out.drawers = [...d.drawers];
    if (m.doorSplitH !== undefined) out.doorSplitH = pick(`${at}.doorSplitH`, m.doorSplitH, positive);
    return out;
  });
  return normalize(modules);
}

/** Validates untrusted data (a saved project or an imported file). Throws ProjectError. */
export function parseProject(data: unknown): Project {
  if (!isObj(data)) return fail('root');
  if (data.settings === undefined && data.modules === undefined) fail('root');
  if (data.app !== undefined && data.app !== 'kerfly') fail('app');
  if (data.version !== undefined && !(Number.isInteger(data.version) && (data.version as number) <= FORMAT_VERSION)) fail('version');
  return { settings: parseSettings(data.settings), modules: parseModules(data.modules) };
}

export function parseProjectText(text: string): Project {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fail('json');
  }
  return parseProject(data);
}

export const serializeProject = (p: Project): string =>
  JSON.stringify({ app: 'kerfly', version: FORMAT_VERSION, settings: p.settings, modules: p.modules }, null, 2);
