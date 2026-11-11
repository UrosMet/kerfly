import { handleNameOf } from './handles';
import { partsForModule } from './parts';
import { slideLength } from './parts/drawer';
import type { Module, Settings } from './types';

export interface Hardware {
  hinges: number;
  slides: Record<number, number>; // slide length (mm) -> pairs
  legs: number;
  handles: { name: string; qty: number }[]; // by handle type; an empty name is the unnamed default
  shelfPins: number;
  wallHangers: number;
  confirmats: { qty: number; estimate: true };
  worktop: { pieces: number; trimMeters: number };
}

/** Hinges per door by door height (mm). */
export const hingesPerDoor = (h: number): number => (h <= 900 ? 2 : h <= 1600 ? 3 : h <= 2000 ? 4 : 5);

const LEG_TYPES = new Set<Module['type']>(['base', 'drawer', 'sink', 'tall']);

/**
 * Hardware from the table in CLAUDE.md. Counts are derived from the generated parts
 * (single source of truth for doors, fronts, shelves, rails), with nominal sizes.
 */
export function generateHardware(modules: Module[], s: Settings): Hardware {
  const nominal = { ...s, subtractEdge: false };
  const hw: Hardware = {
    hinges: 0,
    slides: {},
    legs: 0,
    handles: [],
    shelfPins: 0,
    wallHangers: 0,
    confirmats: { qty: 0, estimate: true },
    worktop: { pieces: 0, trimMeters: 0 },
  };

  for (const m of modules) {
    const parts = partsForModule(m, nominal);
    const qty = (...keys: string[]) => parts.filter((p) => keys.includes(p.nameKey)).reduce((a, p) => a + p.qty, 0);

    for (const p of parts) if (p.nameKey === 'part.door') hw.hinges += hingesPerDoor(p.Wd) * p.qty; // Wd = door height

    const drawers = qty('part.drawerFront');
    if (drawers > 0) {
      const Lv = slideLength(m.D);
      hw.slides[Lv] = (hw.slides[Lv] ?? 0) + drawers;
    }
    const handleName = handleNameOf(s, m);
    const fronts = handleName === null ? 0 : qty('part.door', 'part.drawerFront');
    if (fronts > 0) {
      const name = handleName ?? '';
      const group = hw.handles.find((h) => h.name.toLowerCase() === name.toLowerCase());
      if (group) group.qty += fronts;
      else hw.handles.push({ name, qty: fronts });
    }
    if (LEG_TYPES.has(m.type)) hw.legs += m.W > 1000 ? 6 : 4;
    hw.shelfPins += 4 * qty('part.shelf');
    if (m.type === 'wall') hw.wallHangers += 2;

    // estimate: a rail has 2 joints x 2 screws; a bottom/top/fixed shelf has 2 joints x (ceil(D/200)+1)
    hw.confirmats.qty += qty('part.rail') * 2 * 2 + qty('part.bottom', 'part.bottomTop', 'part.fixedShelf') * 2 * (Math.ceil(m.D / 200) + 1);
  }

  // Worktop covers the lower row except tall cabinets.
  const run = modules.filter((m) => m.row === 'lower' && m.type !== 'tall').reduce((a, m) => a + m.W, 0);
  hw.worktop = { pieces: Math.ceil(run / s.worktopLength), trimMeters: Math.ceil(run / 1000) };
  return hw;
}
