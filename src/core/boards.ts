import type { Board, EdgeSpec, MaterialKey, Module, Part, Settings } from './types';

export const CARCASS = 'carcass';
export const FRONT = 'front';
export const HDF = 'hdf';
export const DEFAULT_IDS: string[] = [CARCASS, FRONT, HDF];

/** The project defaults, built from the flat settings. */
export function defaultBoards(s: Settings): Record<MaterialKey, Board> {
  const edge = (name: string): EdgeSpec => ({ name, thin: s.edgeThin, thick: s.edgeThick });
  return {
    carcass: { id: CARCASS, name: s.decor.carcass, thickness: s.t, sheet: s.sheet, grain: s.grain.carcass, color: s.decorColor.carcass, edge: edge(s.edgeName.carcass) },
    front: { id: FRONT, name: s.decor.front, thickness: s.frontT, sheet: s.sheet, grain: s.grain.front, color: s.decorColor.front, edge: edge(s.edgeName.front) },
    // HDF has no edge banding; the edge is only there to keep the type uniform
    hdf: { id: HDF, name: s.decor.hdf, thickness: s.hdfT, sheet: s.hdfSheet, grain: false, color: s.decorColor.hdf, edge: edge('') },
  };
}

/** The two default boards that carcass and fronts can pick, then the user's own. */
export const selectableBoards = (s: Settings): Board[] => {
  const d = defaultBoards(s);
  return [d.carcass, d.front, ...s.boards];
};

/** Every board, in the order they are packed and listed. HDF last. */
export const allBoards = (s: Settings): Board[] => [...selectableBoards(s), defaultBoards(s).hdf];

/** A part's board; an unknown or deleted id falls back to the default board of that material. */
export function boardById(s: Settings, id: string | undefined, fallback: MaterialKey): Board {
  return allBoards(s).find((b) => b.id === id) ?? defaultBoards(s)[fallback];
}

/** The board a part is cut from. */
export const boardOfPart = (s: Settings, p: Part): Board => boardById(s, p.board, p.material);

/** The edge banding of a board; boards without their own use the project's thicknesses. */
export const boardEdge = (s: Settings, b: Board): EdgeSpec => b.edge ?? { name: '', thin: s.edgeThin, thick: s.edgeThick };

type BoardKey = 'carcassBoard' | 'frontBoard' | 'hdfBoard';
const KEYS: BoardKey[] = ['carcassBoard', 'frontBoard', 'hdfBoard'];

/** Modules that used a board fall back to the default once it is deleted. */
export const withoutBoard = (modules: Module[], id: string): Module[] =>
  modules.map((m) => {
    if (!KEYS.some((k) => m[k] === id)) return m;
    const next = { ...m };
    for (const k of KEYS) if (next[k] === id) next[k] = undefined;
    return next;
  });

/** Boards that were made by typing a name and are not used by any cabinet any more are dropped. */
export function pruneAutoBoards(s: Settings, modules: Module[]): Settings {
  const used = new Set(modules.flatMap((m) => KEYS.map((k) => m[k])));
  const boards = s.boards.filter((b) => !b.auto || used.has(b.id));
  return boards.length === s.boards.length ? s : { ...s, boards };
}

/** A new board starts as a copy of a default board (the carcass one unless told otherwise), with no name or color. */
export const newBoard = (s: Settings, id: string, base: Board = defaultBoards(s).carcass): Board => ({
  id,
  name: '',
  thickness: base.thickness,
  sheet: { ...base.sheet },
  grain: base.grain,
  color: '',
  edge: { name: '', thin: boardEdge(s, base).thin, thick: boardEdge(s, base).thick },
});

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const KEY_OF: Record<'carcass' | 'front' | 'hdf', BoardKey> = { carcass: 'carcassBoard', front: 'frontBoard', hdf: 'hdfBoard' };

/**
 * Sets the carcass, front or HDF board of a module from a typed name (type and color, e.g. "Iverica Egger bela"):
 * an empty name or the project default's name means the default; a name that is already a board's name means
 * that board, so cabinets with the same name share sheets; a new name creates a board like the default one.
 * A board that was created this way and is no longer used by any cabinet is removed.
 * `newId` is only used when a board is created.
 */
export function assignBoardByName(
  s: Settings,
  modules: Module[],
  moduleId: string,
  kind: 'carcass' | 'front' | 'hdf',
  name: string,
  newId: string,
): { settings: Settings; modules: Module[] } {
  const d = defaultBoards(s);
  const typed = name.trim();
  let boards = s.boards;
  let id: string | undefined;

  if (typed) {
    const found = [d.carcass, d.front, ...s.boards, d.hdf].find((b) => b.name.trim() && same(b.name, typed));
    if (found) id = found.id === kind ? undefined : found.id;
    else {
      boards = [...s.boards, { ...newBoard(s, newId, d[kind]), name: typed, auto: true }];
      id = newId;
    }
  }

  const key = KEY_OF[kind];
  const nextModules = modules.map((m) => (m.id === moduleId ? { ...m, [key]: id } : m));
  const nextSettings = boards === s.boards ? s : { ...s, boards };
  return { settings: pruneAutoBoards(nextSettings, nextModules), modules: nextModules };
}
