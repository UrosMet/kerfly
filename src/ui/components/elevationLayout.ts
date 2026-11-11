import { MODULE_DEFAULTS } from '../../core/defaults';
import { rowModules } from '../../core/modules';
import type { Module, Settings } from '../../core/types';

/** Drawing only: gap between the top of the base cabinets and the bottom of the wall cabinets (mm). */
export const UPPER_CLEARANCE = 550;

export interface Box {
  module: Module;
  x: number; // mm along the wall
  y: number; // mm above the floor (bottom of the box)
  w: number;
  h: number;
  layer: 0 | 1 | 2; // draw order: wall cabinets, base cabinets, tall cabinets on top
}

export interface Layout {
  boxes: Box[];
  width: number;
  height: number;
  plinthH: number;
}

/** Positions every module on the wall. Rows are laid out left to right in `order`, independently. */
export function layoutKitchen(modules: Module[], s: Settings): Layout {
  const plinthH = s.plinthHeight;
  const boxes: Box[] = [];

  let x = 0;
  for (const m of rowModules(modules, 'lower')) {
    boxes.push({ module: m, x, y: plinthH, w: m.W, h: m.H, layer: m.type === 'tall' ? 2 : 1 });
    x += m.W;
  }
  const lowerWidth = x;

  // Wall cabinets hang above the base cabinets (tall cabinets don't count: they are drawn over both rows).
  const tops = boxes.filter((b) => b.layer === 1).map((b) => b.y + b.h);
  const lowerTop = tops.length ? Math.max(...tops) : plinthH + MODULE_DEFAULTS.base.H;
  const upperBottom = lowerTop + UPPER_CLEARANCE;

  x = 0;
  for (const m of rowModules(modules, 'upper')) {
    boxes.push({ module: m, x, y: upperBottom, w: m.W, h: m.H, layer: 0 });
    x += m.W;
  }

  return {
    boxes,
    width: Math.max(lowerWidth, x, s.wallLength ?? 0, 1),
    height: Math.max(0, ...boxes.map((b) => b.y + b.h)),
    plinthH,
  };
}
