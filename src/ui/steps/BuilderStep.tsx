import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MODULE_DEFAULTS } from '../../core/defaults';
import { rowModules } from '../../core/modules';
import type { ModuleType } from '../../core/types';
import { formatLength } from '../../core/units';
import { validate } from '../../core/validate';
import { useStore } from '../../store';
import KitchenElevation from '../components/KitchenElevation';
import ModuleCard from '../components/ModuleCard';
import MaterialsPanel from '../components/MaterialsPanel';
import ModuleIcon from '../components/ModuleIcon';
import { ConfirmBar, IssueList } from '../components/ValidationPanel';
import { dimNum } from '../format';

const TYPES = Object.keys(MODULE_DEFAULTS) as ModuleType[];

function RowStrip({ row }: { row: 'lower' | 'upper' }) {
  const { t } = useTranslation();
  const modules = useStore((st) => st.modules);
  const units = useStore((st) => st.settings.units);
  const selectedId = useStore((st) => st.selectedId);
  const select = useStore((st) => st.select);
  const list = rowModules(modules, row);

  return (
    <section className="row-strip">
      <h3>{t(`builder.rows.${row}`)}</h3>
      {list.length === 0 ? (
        <p className="hint">{t('builder.rowEmpty')}</p>
      ) : (
        <ul className="tiles">
          {list.map((m) => (
            <li key={m.id}>
              <button type="button" aria-pressed={m.id === selectedId} onClick={() => select(m.id)}>
                {t(`builder.types.${m.type}`)} · {dimNum(m.W, units)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function BuilderStep() {
  const { t } = useTranslation();
  const modules = useStore((st) => st.modules);
  const settings = useStore((st) => st.settings);
  const selectedId = useStore((st) => st.selectedId);
  const add = useStore((st) => st.addModule);

  const selected = modules.find((m) => m.id === selectedId);
  const result = useMemo(() => validate(modules, settings), [modules, settings]);
  const { errors, warnings } = result;

  const sum = rowModules(modules, 'lower').reduce((a, m) => a + m.W, 0);
  const wall = settings.wallLength;
  const fmt = (mm: number) => formatLength(mm, settings.units);
  let status: { kind: 'over' | 'short' | 'ok'; text: string } | undefined;
  if (wall !== undefined) {
    if (errors.some((e) => e.code === 'validation.rowTooLong')) status = { kind: 'over', text: t('builder.rowOver', { diff: fmt(sum - wall) }) };
    else if (warnings.some((w) => w.code === 'validation.rowShort')) status = { kind: 'short', text: t('builder.rowShort', { diff: fmt(wall - sum) }) };
    else status = { kind: 'ok', text: t('builder.rowOk') };
  }

  return (
    <section className="builder">
      <div className="page-head">
        <h2>{t('builder.title')}</h2>
        <p className="lede">{t('builder.lede')}</p>
      </div>
      <p className="notice" role="note">
        {t('notice.corner')}
      </p>

      <div className="builder-main">
          <div className="palette" role="group" aria-label={t('builder.palette')}>
            {TYPES.map((type) => (
              <button key={type} type="button" onClick={() => add(type)}>
                <ModuleIcon type={type} />+ {t(`builder.types.${type}`)}
              </button>
            ))}
          </div>

          <p className={`row-sum${status ? ` ${status.kind}` : ''}`} role="status">
            {wall === undefined ? t('builder.rowSum', { sum: fmt(sum) }) : t('builder.rowSumWall', { sum: fmt(sum), wall: fmt(wall) })}
            {status && <> — {status.text}</>}
          </p>

          <IssueList result={result} />

          {modules.length > 0 ? (
            <KitchenElevation />
          ) : (
            <div className="empty-state card">
              <h3>{t('builder.emptyTitle')}</h3>
              <p className="hint">{t('builder.empty')}</p>
            </div>
          )}

          <RowStrip row="upper" />
          <RowStrip row="lower" />

          {selected ? <ModuleCard key={selected.id} module={selected} /> : modules.length > 0 && <p className="hint">{t('builder.noSelection')}</p>}

          <MaterialsPanel />
      </div>

      <ConfirmBar result={result} />
    </section>
  );
}
