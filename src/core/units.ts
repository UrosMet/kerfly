import type { Units } from './types';

const MM_PER_IN = 25.4;

export const mmToIn = (mm: number): number => mm / MM_PER_IN;
export const inToMm = (inches: number): number => inches * MM_PER_IN;

/** UI value in the given units -> internal mm. */
export const toMm = (value: number, units: Units): number => (units === 'in' ? inToMm(value) : value);

/** Internal mm -> value in the given units (unrounded). */
export const fromMm = (mm: number, units: Units): number => (units === 'in' ? mmToIn(mm) : mm);

/** Display string: mm up to 1 decimal, inches 2 decimals. */
export const formatLength = (mm: number, units: Units): string =>
  units === 'in' ? `${mmToIn(mm).toFixed(2)} in` : `${Number(mm.toFixed(1))} mm`;
