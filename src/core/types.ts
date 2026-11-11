export type MaterialKey = 'carcass' | 'front' | 'hdf';
export type EdgeType = 'none' | 'thin' | 'thick';
export type Units = 'mm' | 'in';
export type Market = 'eu' | 'us' | 'uk';

export interface SheetSize {
  length: number;
  width: number;
}

export interface Settings {
  units: Units;
  market: Market;
  sheet: SheetSize; // EU default 2800 x 2070
  hdfSheet: SheetSize; // default 2800 x 2070
  kerf: number; // 4
  trim: number; // 10, trimmed off every sheet edge
  t: number; // carcass thickness 18
  gap: number; // front gap 3
  edgeThin: number; // 0.45
  edgeThick: number; // 2
  subtractEdge: boolean; // subtract banding thickness from cut size
  grain: { carcass: boolean; front: boolean }; // true = no rotation
  decor: { carcass: string; front: string };
  worktopLength: number; // 4100
  worktopDepth: number; // 600
  plinth: 'none' | 'board' | 'pvc';
  plinthHeight: number; // 100
  wallLength?: number;
}

export type ModuleType = 'base' | 'drawer' | 'sink' | 'wall' | 'tall';

export interface Module {
  id: string;
  type: ModuleType;
  row: 'lower' | 'upper'; // tall belongs to lower
  order: number;
  W: number;
  H: number;
  D: number;
  doors: number; // 0..2
  shelves: number;
  drawers?: number[]; // front heights, e.g. [140, 280, 280]
  doorSplitH?: number; // tall only: height of lower door section
}

export interface Part {
  moduleId: string;
  nameKey: string; // i18n key, e.g. "part.side"
  material: MaterialKey;
  L: number; // dimension along grain (along sheet length)
  Wd: number;
  qty: number;
  edges: { L1: EdgeType; L2: EdgeType; W1: EdgeType; W2: EdgeType };
}
