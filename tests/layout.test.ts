import { describe, expect, it } from 'vitest';
import { addModule } from '../src/core/modules';
import type { Module } from '../src/core/types';
import { layoutKitchen, UPPER_CLEARANCE } from '../src/ui/components/elevationLayout';
import { settings } from './helpers';

const kitchen = (): Module[] => {
  let m: Module[] = [];
  for (const [id, type] of [['b', 'base'], ['s', 'sink'], ['t', 'tall'], ['w', 'wall']] as const) m = addModule(m, type, id);
  return m;
};
const box = (id: string, l = layoutKitchen(kitchen(), settings)) => l.boxes.find((b) => b.module.id === id)!;

describe('layoutKitchen', () => {
  it('lays the lower row out left to right on the plinth', () => {
    expect([box('b').x, box('s').x, box('t').x]).toEqual([0, 600, 1400]);
    expect(box('b')).toMatchObject({ y: 100, w: 600, h: 720 });
  });

  it('tall cabinet is full height and drawn on top; wall cabinets are drawn first', () => {
    expect(box('t')).toMatchObject({ y: 100, h: 2100, layer: 2 });
    expect(box('w').layer).toBe(0);
  });

  it('wall cabinets hang above the base cabinets, ignoring the tall one', () => {
    expect(box('w').y).toBe(100 + 720 + UPPER_CLEARANCE);
  });

  it('size covers the tallest cabinet and the longest row; wallLength can widen it', () => {
    const l = layoutKitchen(kitchen(), settings);
    expect([l.width, l.height]).toEqual([2000, 2200]);
    expect(layoutKitchen(kitchen(), { ...settings, wallLength: 3500 }).width).toBe(3500);
  });

  it('upper row can be longer than the lower row', () => {
    let m: Module[] = addModule([], 'base', 'b');
    for (const id of ['w1', 'w2', 'w3']) m = addModule(m, 'wall', id);
    expect(layoutKitchen(m, settings).width).toBe(1800);
  });

  it('empty kitchen does not break', () => {
    expect(layoutKitchen([], settings)).toMatchObject({ boxes: [], width: 1, height: 0 });
  });
});
