import { boardById, defaultBoards, FRONT, HDF } from '../boards';
import { applySubtractEdge } from '../edging';
import type { Module, Part, Settings } from '../types';
import { baseParts } from './base';
import { drawerParts } from './drawer';
import { sinkParts } from './sink';
import { tallParts } from './tall';
import { wallParts } from './wall';

/**
 * Parts of one module. The carcass thickness comes from the module's carcass board, and every part
 * is tagged with the board it is cut from.
 */
export function partsForModule(m: Module, s: Settings): Part[] {
  const carcass = boardById(s, m.carcassBoard, 'carcass');
  const front = boardById(s, m.frontBoard, 'front');
  const ms = carcass.thickness === s.t ? s : { ...s, t: carcass.thickness };
  return BY_TYPE[m.type](m, ms).map((p) => ({ ...p, board: p.material === 'hdf' ? HDF : p.material === 'carcass' ? carcass.id : front.id }));
}

const BY_TYPE = {
  base: baseParts,
  drawer: drawerParts,
  sink: sinkParts,
  wall: wallParts,
  tall: tallParts,
} satisfies Record<Module['type'], (m: Module, s: Settings) => Part[]>;

/**
 * Plinth board: strip plinthHeight x lower row length, cut into pieces of at most
 * sheet.length - 2*trim of the default front board. 'pvc' / 'none' produce no board parts.
 */
export function plinthParts(modules: Module[], s: Settings): Part[] {
  if (s.plinth !== 'board') return [];
  const total = modules.filter((m) => m.row === 'lower').reduce((sum, m) => sum + m.W, 0);
  const max = defaultBoards(s).front.sheet.length - 2 * s.trim;
  const full = Math.floor(total / max);
  const rest = total - full * max;
  const mk = (L: number, qty: number): Part => ({
    moduleId: 'plinth',
    nameKey: 'part.plinth',
    material: 'front',
    board: FRONT,
    L,
    Wd: s.plinthHeight,
    qty,
    edges: { L1: 'none', L2: 'none', W1: 'none', W2: 'none' },
  });
  return [...(full > 0 ? [mk(max, full)] : []), ...(rest > 0 ? [mk(rest, 1)] : [])];
}

export const generateParts = (modules: Module[], s: Settings): Part[] =>
  [...modules.flatMap((m) => partsForModule(m, s)), ...plinthParts(modules, s)].map((p) => applySubtractEdge(p, s));
