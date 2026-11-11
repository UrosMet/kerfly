import type { Module, Part, Settings } from '../types';
import { baseParts } from './base';

/** Sink cabinet: base without back and without shelves. */
export const sinkParts = (m: Module, s: Settings): Part[] =>
  baseParts(m, s).filter((p) => p.nameKey !== 'part.back' && p.nameKey !== 'part.shelf');
