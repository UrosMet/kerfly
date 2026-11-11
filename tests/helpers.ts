import { DEFAULT_SETTINGS, MODULE_DEFAULTS } from '../src/core/defaults';
import type { Module, ModuleType, Part } from '../src/core/types';

export const settings = { ...DEFAULT_SETTINGS, t: 18, gap: 3, subtractEdge: false };

export const mod = (type: ModuleType, over: Partial<Module> = {}): Module => ({
  ...MODULE_DEFAULTS[type],
  id: 'm1',
  order: 0,
  ...over,
});

// "side 720x560" -> total qty; parts differing only by edges are merged.
export const summary = (parts: Part[]) => {
  const map = new Map<string, number>();
  for (const p of parts) {
    const k = `${p.nameKey.replace('part.', '')} ${p.L}x${p.Wd}`;
    map.set(k, (map.get(k) ?? 0) + p.qty);
  }
  return Object.fromEntries(map);
};
