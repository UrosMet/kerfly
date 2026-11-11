/**
 * The colors a board can be given in the drawing. A fixed list instead of a free color picker, so that
 * "cream" always means the same thing. Boards store the key; the name is translated in the UI.
 */
export const PALETTE = [
  { key: 'white', hex: '#f4f1ea' },
  { key: 'cream', hex: '#eadcc0' },
  { key: 'beige', hex: '#d8c3a0' },
  { key: 'lightgrey', hex: '#c9c9c6' },
  { key: 'grey', hex: '#8e8e8c' },
  { key: 'anthracite', hex: '#3a3d42' },
  { key: 'black', hex: '#1b1b1d' },
  { key: 'oak', hex: '#c9a26b' },
  { key: 'walnut', hex: '#5a3d2b' },
  { key: 'brown', hex: '#6b4a2f' },
  { key: 'red', hex: '#b3362f' },
  { key: 'blue', hex: '#2f5d8a' },
  { key: 'green', hex: '#4f7a4b' },
  { key: 'yellow', hex: '#e0b83a' },
] as const;

export type ColorKey = (typeof PALETTE)[number]['key'];

export const COLOR_KEYS: string[] = PALETTE.map((c) => c.key);

/** True for "" (no color) and for the keys of the palette. */
export const isColorKey = (x: unknown): x is '' | ColorKey => x === '' || (typeof x === 'string' && COLOR_KEYS.includes(x));

/** The "#rrggbb" of a color key; undefined for no color or an unknown key. */
export const colorHex = (key: string | undefined): string | undefined => PALETTE.find((c) => c.key === key)?.hex;
