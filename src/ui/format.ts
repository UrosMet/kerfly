import type { Units } from '../core/types';
import { fromMm } from '../core/units';

/** Number for tables, cut lists and drawings: mm to 1 decimal, inches to 2. */
export const dimNum = (mm: number, units: Units): number => Number(fromMm(mm, units).toFixed(units === 'in' ? 2 : 1));

/** Material quantities that are bought by length (edge banding, wall trim): meters, or feet with inches. */
export const meters = (m: number, units: Units): string => (units === 'in' ? `${Number((m * 3.28084).toFixed(1))} ft` : `${m} m`);

/** Saves text as a file; `bom` makes Excel read UTF-8 diacritics in CSV. */
export function downloadText(filename: string, text: string, type: string, bom = false): void {
  const url = URL.createObjectURL(new Blob(bom ? ['\uFEFF', text] : [text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const downloadCsv = (filename: string, csv: string): void => downloadText(filename, csv, 'text/csv;charset=utf-8', true);

export const readText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
