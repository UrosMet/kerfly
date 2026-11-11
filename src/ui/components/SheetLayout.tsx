import { useTranslation } from 'react-i18next';
import type { PackResult } from '../../core/packing';
import type { SheetSize, Units } from '../../core/types';
import { dimNum } from '../format';

interface Props {
  result: PackResult;
  sheet: SheetSize;
  trim: number;
  units: Units;
}

/** One SVG per sheet; every part is labeled with its name and placed size. */
export default function SheetLayout({ result, sheet, trim, units }: Props) {
  const { t } = useTranslation();
  const base = sheet.length / 90;

  return (
    <div className="sheet-layouts">
      {result.sheets.map((sh, n) => (
        <figure className="sheet-layout" key={n}>
          <figcaption>
            {t('report.sheetN', { n: n + 1 })} · {sh.utilization.toFixed(1)}%
          </figcaption>
          <svg viewBox={`0 0 ${sheet.length} ${sheet.width}`} role="img" aria-label={t('report.sheetN', { n: n + 1 })}>
            <rect className="sheet" x={0} y={0} width={sheet.length} height={sheet.width} />
            <rect className="trim" x={trim} y={trim} width={sheet.length - 2 * trim} height={sheet.width - 2 * trim} />
            {sh.placements.map((p, i) => {
              const part = result.parts[p.partRef];
              const name = t(part.nameKey);
              const dims = `${dimNum(p.w, units)} × ${dimNum(p.h, units)}${p.rotated ? ' ↻' : ''}`;
              const longest = Math.max(name.length, dims.length);
              const fs = Math.min(base, p.w / (longest * 0.6), p.h / 2.6);
              const cx = p.x + p.w / 2;
              const cy = p.y + p.h / 2;
              return (
                <g key={i} className="piece" data-testid="piece">
                  <title>{`${name} ${dims}`}</title>
                  <rect x={p.x} y={p.y} width={p.w} height={p.h} />
                  {fs >= sheet.length / 260 && (
                    <>
                      <text x={cx} y={cy - fs * 0.15} fontSize={fs} textAnchor="middle">
                        {name}
                      </text>
                      <text x={cx} y={cy + fs * 1.05} fontSize={fs} textAnchor="middle">
                        {dims}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </figure>
      ))}
    </div>
  );
}
