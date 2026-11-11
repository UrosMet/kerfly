export type MaterialKey = 'carcass' | 'front' | 'hdf';
export type EdgeType = 'none' | 'thin' | 'thick';
export type Units = 'mm' | 'in';
export type Market = 'eu' | 'us' | 'uk';

export interface SheetSize {
  length: number;
  width: number;
}

/** A kind of sheet material: a decor with its own thickness, sheet size and grain. */
export interface Board {
  id: string; // 'carcass', 'front' and 'hdf' are the project defaults; others are added by the user
  name: string; // decor, e.g. "Hrast Sonoma"
  thickness: number;
  sheet: SheetSize;
  grain: boolean; // true = parts are not rotated
}

export interface Settings {
  units: Units;
  market: Market;
  sheet: SheetSize; // EU default 2800 x 2070
  hdfSheet: SheetSize; // default 2800 x 2070
  kerf: number; // 4
  trim: number; // 10, trimmed off every sheet edge
  t: number; // carcass thickness 18
  frontT: number; // front thickness 18
  hdfT: number; // HDF thickness 3
  gap: number; // front gap 3
  edgeThin: number; // 0.45
  edgeThick: number; // 2
  subtractEdge: boolean; // subtract banding thickness from cut size
  grain: { carcass: boolean; front: boolean }; // true = no rotation
  decor: { carcass: string; front: string };
  worktopLength: number; // 4100
  worktopDepth: number; // 600
  worktopDecor: string;
  worktopT: number; // worktop thickness 38
  /** Extra boards the user adds; modules can pick them. The defaults come from sheet/t/decor/grain above. */
  boards: Board[];
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
  carcassBoard?: string; // board id; undefined = the project's default carcass board
  frontBoard?: string; // board id; undefined = the project's default front board
}

export interface Part {
  moduleId: string;
  nameKey: string; // i18n key, e.g. "part.side"
  material: MaterialKey;
  board?: string; // board id the part is cut from; undefined = the default board of its material
  L: number; // dimension along grain (along sheet length)
  Wd: number;
  qty: number;
  edges: { L1: EdgeType; L2: EdgeType; W1: EdgeType; W2: EdgeType };
}
