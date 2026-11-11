import type { Market, Module, ModuleType, Settings } from './types';

const EU_SHEET = { length: 2800, width: 2070 };
const US_SHEET = { length: 2440, width: 1220 }; // 4x8 ft

export const DEFAULT_SETTINGS: Settings = {
  units: 'mm',
  market: 'eu',
  sheet: EU_SHEET,
  hdfSheet: EU_SHEET,
  kerf: 4,
  trim: 10,
  t: 18,
  gap: 3,
  edgeThin: 0.45,
  edgeThick: 2,
  subtractEdge: false,
  grain: { carcass: false, front: false },
  decor: { carcass: '', front: '' },
  worktopLength: 4100,
  worktopDepth: 600,
  plinth: 'board',
  plinthHeight: 100,
};

export const MARKET_PRESETS: Record<Market, Partial<Settings>> = {
  eu: { market: 'eu', units: 'mm', sheet: EU_SHEET, hdfSheet: EU_SHEET, t: 18 },
  us: { market: 'us', units: 'in', sheet: US_SHEET, hdfSheet: US_SHEET, t: 18 },
  uk: { market: 'uk', units: 'mm', sheet: US_SHEET, hdfSheet: US_SHEET, t: 18 },
};

export const settingsForMarket = (market: Market): Settings => ({
  ...DEFAULT_SETTINGS,
  ...MARKET_PRESETS[market],
});

export type ModuleDefaults = Omit<Module, 'id' | 'order'>;

// Drawer fronts: (H - m*gap) / m with H=720, m=3, gap=3.
export const MODULE_DEFAULTS: Record<ModuleType, ModuleDefaults> = {
  base: { type: 'base', row: 'lower', W: 600, H: 720, D: 560, doors: 1, shelves: 1 },
  drawer: { type: 'drawer', row: 'lower', W: 600, H: 720, D: 560, doors: 0, shelves: 0, drawers: [237, 237, 237] },
  sink: { type: 'sink', row: 'lower', W: 800, H: 720, D: 560, doors: 2, shelves: 0 },
  wall: { type: 'wall', row: 'upper', W: 600, H: 720, D: 320, doors: 1, shelves: 1 },
  tall: { type: 'tall', row: 'lower', W: 600, H: 2100, D: 560, doors: 1, shelves: 4 },
};
