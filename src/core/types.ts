export type MaterialKey = 'carcass' | 'front' | 'hdf';
export type EdgeType = 'none' | 'thin' | 'thick';
export type Units = 'mm' | 'in';
export type Market = 'eu' | 'us' | 'uk';

export interface SheetSize {
  length: number;
  width: number;
}

/** Edge banding that goes with a board: its type and color, and the two thicknesses. */
export interface EdgeSpec {
  name: string; // empty = named after the board
  thin: number; // mm
  thick: number; // mm
}

/** A kind of sheet material: a decor with its own thickness, sheet size and grain. */
export interface Board {
  id: string; // 'carcass', 'front' and 'hdf' are the project defaults; others are added by the user
  name: string; // decor, e.g. "Hrast Sonoma"
  thickness: number;
  sheet: SheetSize;
  grain: boolean; // true = parts are not rotated
  color?: string; // a key of the palette, for the drawing; empty or missing = no color
  edge?: EdgeSpec; // missing = the project's edgeThin / edgeThick and no name
  auto?: boolean; // created by typing a name in a cabinet: removed again when no cabinet uses it
}

/** A handle the user uses, to pick from in a cabinet's card. */
export interface Handle {
  id: string;
  name: string; // type and model, e.g. "Ručka 128 mm crna"
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
  decor: { carcass: string; front: string; hdf: string };
  decorColor: { carcass: string; front: string; hdf: string }; // palette keys; empty = no color
  edgeName: { carcass: string; front: string }; // edge banding of the default boards; empty = named after the decor
  worktopLength: number; // 4100
  worktopDepth: number; // 600
  worktopDecor: string;
  handles: Handle[]; // the handles to choose from
  defaultHandle: string; // id of the handle used when a cabinet does not pick one; empty = unnamed "handles"
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
  hdfBoard?: string; // board id for the back and drawer bottoms; undefined = the project's default HDF board
  handle?: string; // id of a handle, or "none" for no handles; undefined = the project's default
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
