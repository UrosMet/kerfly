import { useTranslation } from 'react-i18next';
import { dimNum } from '../format';
import { useStore } from '../../store';
import { layoutKitchen, type Box } from './elevationLayout';

export default function KitchenElevation() {
  const { t } = useTranslation();
  const modules = useStore((st) => st.modules);
  const s = useStore((st) => st.settings);
  const selectedId = useStore((st) => st.selectedId);
  const select = useStore((st) => st.select);

  const { boxes, width, height, plinthH } = layoutKitchen(modules, s);
  const f = Math.max(width, height * 1.2, 1000) / 38; // text size / spacing, scales with the drawing
  const sy = (y: number) => height - y; // mm above floor -> svg y
  const num = (mm: number) => dimNum(mm, s.units);

  const details = (b: Box) => {
    const { module: m } = b;
    const top = sy(b.y + b.h);
    const lines: [number, number, number, number][] = [];
    if (m.type === 'drawer') {
      let cut = 0;
      for (const h of (m.drawers ?? []).slice(0, -1)) {
        cut += h + s.gap;
        lines.push([b.x, top + cut, b.x + b.w, top + cut]);
      }
    } else {
      if (m.doors === 2) lines.push([b.x + b.w / 2, top, b.x + b.w / 2, top + b.h]);
      if (m.type === 'tall' && m.doorSplitH) lines.push([b.x, sy(b.y + m.doorSplitH), b.x + b.w, sy(b.y + m.doorSplitH)]);
    }
    const handles: [number, number, number, number][] = [];
    const hl = Math.min(b.w * 0.12, 120);
    if (m.type === 'drawer') {
      let y = top;
      for (const h of m.drawers ?? []) {
        handles.push([b.x + b.w / 2 - hl, y + h / 2, b.x + b.w / 2 + hl, y + h / 2]);
        y += h + s.gap;
      }
    } else if (m.doors > 0) {
      const dw = b.w / m.doors;
      const hy = m.type === 'wall' ? top + b.h - 140 : top + 140;
      for (let d = 0; d < m.doors; d++) {
        const hx = m.doors === 2 ? (d === 0 ? b.x + dw - 40 : b.x + dw + 40) : b.x + b.w - 50;
        handles.push([hx, hy, hx, hy + 120]);
      }
    }
    return (
      <>
        {lines.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="detail" />
        ))}
        {handles.map(([x1, y1, x2, y2], i) => (
          <line key={`h${i}`} x1={x1} y1={y1} x2={x2} y2={y2} className="handle" />
        ))}
      </>
    );
  };

  const dim = (b: Box, y: number) => (
    <g className="dim" key={`dim-${b.module.id}`}>
      <line x1={b.x + f * 0.1} x2={b.x + b.w - f * 0.1} y1={y} y2={y} />
      <line x1={b.x + f * 0.1} x2={b.x + f * 0.1} y1={y - f * 0.3} y2={y + f * 0.3} />
      <line x1={b.x + b.w - f * 0.1} x2={b.x + b.w - f * 0.1} y1={y - f * 0.3} y2={y + f * 0.3} />
      <text x={b.x + b.w / 2} y={y - f * 0.4} fontSize={f} textAnchor="middle">
        {num(b.module.W)}
      </text>
    </g>
  );

  const ordered = [...boxes].sort((a, b) => a.layer - b.layer);
  const lower = boxes.filter((b) => b.module.row === 'lower');
  const upper = boxes.filter((b) => b.module.row === 'upper');

  return (
    <svg
      className="elevation"
      role="group"
      aria-label={t('builder.elevation')}
      viewBox={`${-f} ${-3 * f} ${width + 2 * f} ${height + 6 * f}`}
    >
      {s.plinth !== 'none' && <rect className="plinth" x={0} y={sy(plinthH)} width={Math.max(...lower.map((b) => b.x + b.w), 0)} height={plinthH} />}
      <line className="floor" x1={-f} x2={width + f} y1={sy(0)} y2={sy(0)} />
      {s.wallLength !== undefined && <line className="wall-end" x1={s.wallLength} x2={s.wallLength} y1={sy(0)} y2={0} />}

      {ordered.map((b) => {
        const m = b.module;
        const label = `${t(`builder.types.${m.type}`)} ${num(m.W)}`;
        const pick = () => select(m.id);
        return (
          <g
            key={m.id}
            data-testid={`elev-${m.id}`}
            className={`mod mod-${m.type}${m.id === selectedId ? ' selected' : ''}`}
            role="button"
            tabIndex={0}
            aria-pressed={m.id === selectedId}
            aria-label={label}
            onClick={pick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                pick();
              }
            }}
          >
            <title>{label}</title>
            <rect x={b.x} y={sy(b.y + b.h)} width={b.w} height={b.h} />
            {details(b)}
          </g>
        );
      })}

      {lower.map((b) => dim(b, sy(0) + 1.8 * f))}
      {upper.map((b) => dim(b, sy(b.y + b.h) - f * 0.6))}
    </svg>
  );
}
