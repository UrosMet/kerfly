import type { Board, MaterialKey, Module, Part, Settings } from './types';

export const CARCASS = 'carcass';
export const FRONT = 'front';
export const HDF = 'hdf';
export const DEFAULT_IDS: string[] = [CARCASS, FRONT, HDF];

/** The project defaults, built from the flat settings. */
export function defaultBoards(s: Settings): Record<MaterialKey, Board> {
  return {
    carcass: { id: CARCASS, name: s.decor.carcass, thickness: s.t, sheet: s.sheet, grain: s.grain.carcass },
    front: { id: FRONT, name: s.decor.front, thickness: s.frontT, sheet: s.sheet, grain: s.grain.front },
    hdf: { id: HDF, name: '', thickness: s.hdfT, sheet: s.hdfSheet, grain: false },
  };
}

/** Boards a module can pick for its carcass or fronts: the two defaults, then the user's own. */
export const selectableBoards = (s: Settings): Board[] => {
  const d = defaultBoards(s);
  return [d.carcass, d.front, ...s.boards];
};

/** Every board, in the order they are packed and listed. HDF last. */
export const allBoards = (s: Settings): Board[] => [...selectableBoards(s), defaultBoards(s).hdf];

/** A module's board; an unknown or deleted id falls back to the default of that material. */
export function boardById(s: Settings, id: string | undefined, fallback: 'carcass' | 'front'): Board {
  return selectableBoards(s).find((b) => b.id === id) ?? defaultBoards(s)[fallback];
}

/** The board a part is cut from. */
export function boardOfPart(s: Settings, p: Part): Board {
  if (p.material === 'hdf') return defaultBoards(s).hdf;
  return boardById(s, p.board, p.material);
}

/** Modules that used a board fall back to the default once it is deleted. */
export const withoutBoard = (modules: Module[], id: string): Module[] =>
  modules.map((m) => {
    if (m.carcassBoard !== id && m.frontBoard !== id) return m;
    return { ...m, carcassBoard: m.carcassBoard === id ? undefined : m.carcassBoard, frontBoard: m.frontBoard === id ? undefined : m.frontBoard };
  });

/** A new board starts as a copy of a default board (the carcass one unless told otherwise), with no name. */
export const newBoard = (s: Settings, id: string, base: Board = defaultBoards(s).carcass): Board => ({
  id,
  name: '',
  thickness: base.thickness,
  sheet: { ...base.sheet },
  grain: base.grain,
});

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Sets the carcass or front board of a module from a typed name (type and color, e.g. "Iverica Egger bela"):
 * an empty name or the project default's name means the default; a name that is already a board's name means
 * that board, so cabinets with the same name share sheets; a new name creates a board like the default one.
 * `newId` is only used when a board is created.
 */
export function assignBoardByName(
  s: Settings,
  modules: Module[],
  moduleId: string,
  kind: 'carcass' | 'front',
  name: string,
  newId: string,
): { settings: Settings; modules: Module[] } {
  const d = defaultBoards(s);
  const typed = name.trim();
  let boards = s.boards;
  let id: string | undefined;

  if (typed) {
    const found = [d.carcass, d.front, ...s.boards].find((b) => b.name.trim() && same(b.name, typed));
    if (found) id = found.id === kind ? undefined : found.id;
    else {
      boards = [...s.boards, { ...newBoard(s, newId, d[kind]), name: typed }];
      id = newId;
    }
  }

  const key = kind === 'carcass' ? 'carcassBoard' : 'frontBoard';
  return {
    settings: boards === s.boards ? s : { ...s, boards },
    modules: modules.map((m) => (m.id === moduleId ? { ...m, [key]: id } : m)),
  };
}
