import { describe, expect, it } from 'vitest';
import { formatLength, fromMm, inToMm, mmToIn, toMm } from '../src/core/units';

describe('units', () => {
  it('converts known values', () => {
    expect(mmToIn(25.4)).toBe(1);
    expect(inToMm(1)).toBe(25.4);
    expect(inToMm(96)).toBeCloseTo(2438.4, 10); // 8 ft
    expect(mmToIn(600)).toBeCloseTo(23.622, 3);
  });

  it('round-trips', () => {
    for (const mm of [0, 0.45, 3, 597, 2800]) expect(inToMm(mmToIn(mm))).toBeCloseTo(mm, 10);
  });

  it('toMm / fromMm are identity for mm', () => {
    expect(toMm(597, 'mm')).toBe(597);
    expect(fromMm(597, 'mm')).toBe(597);
    expect(toMm(1, 'in')).toBe(25.4);
    expect(fromMm(25.4, 'in')).toBe(1);
  });

  it('formats', () => {
    expect(formatLength(597, 'mm')).toBe('597 mm');
    expect(formatLength(596.56, 'mm')).toBe('596.6 mm');
    expect(formatLength(600, 'in')).toBe('23.62 in');
  });
});
