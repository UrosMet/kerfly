import { useTranslation } from 'react-i18next';
import { evenDrawers, rowModules } from '../../core/modules';
import type { Module } from '../../core/types';
import { formatLength, fromMm, toMm } from '../../core/units';
import { useStore } from '../../store';
import BoardField from './BoardField';
import NumberField from './NumberField';

const isInt = (min: number, max = Infinity) => (n: number) => Number.isInteger(n) && n >= min && n <= max;

export default function ModuleCard({ module: m }: { module: Module }) {
  const { t } = useTranslation();
  const s = useStore((st) => st.settings);
  const modules = useStore((st) => st.modules);
  const update = useStore((st) => st.updateModule);
  const move = useStore((st) => st.moveModule);
  const duplicate = useStore((st) => st.duplicateModule);
  const remove = useStore((st) => st.deleteModule);
  const select = useStore((st) => st.select);

  const row = rowModules(modules, m.row);
  const index = row.findIndex((x) => x.id === m.id);
  const show = (mm: number) => fromMm(mm, s.units);
  const mm = (n: number | undefined) => toMm(n as number, s.units);
  const drawers = m.drawers ?? [];
  const drawerTotal = drawers.reduce((a, h) => a + h, 0) + drawers.length * s.gap;

  const dim = (id: string, label: string, key: 'W' | 'H' | 'D') => (
    <NumberField id={id} label={label} unit={s.units} value={show(m[key])} onCommit={(n) => update(m.id, { [key]: mm(n) })} />
  );

  return (
    <section className="module-card" aria-label={t(`builder.types.${m.type}`)}>
      <header>
        <h3>{t(`builder.types.${m.type}`)}</h3>
        <div className="actions">
          <button type="button" disabled={index <= 0} onClick={() => move(m.id, -1)}>
            {t('builder.moveLeft')}
          </button>
          <button type="button" disabled={index >= row.length - 1} onClick={() => move(m.id, 1)}>
            {t('builder.moveRight')}
          </button>
          <button type="button" onClick={() => duplicate(m.id)}>
            {t('builder.duplicate')}
          </button>
          <button type="button" onClick={() => remove(m.id)}>
            {t('builder.delete')}
          </button>
          <button type="button" onClick={() => select(null)}>
            {t('builder.close')}
          </button>
        </div>
      </header>

      <div className="card-fields">
        {dim('mod-W', t('builder.width'), 'W')}
        {dim('mod-H', t('builder.height'), 'H')}
        {dim('mod-D', t('builder.depth'), 'D')}

        {m.type !== 'drawer' && (
          <NumberField id="mod-doors" label={t('builder.doors')} value={m.doors} valid={isInt(0, 2)} onCommit={(n) => update(m.id, { doors: n })} />
        )}
        {(m.type === 'base' || m.type === 'wall' || m.type === 'tall') && (
          <NumberField id="mod-shelves" label={t('builder.shelves')} value={m.shelves} valid={isInt(0)} onCommit={(n) => update(m.id, { shelves: n })} />
        )}
        {m.type === 'tall' && (
          <NumberField
            id="mod-split"
            label={t('builder.doorSplit')}
            hint={t('builder.doorSplitHint')}
            unit={s.units}
            optional
            value={m.doorSplitH === undefined ? undefined : show(m.doorSplitH)}
            onCommit={(n) => update(m.id, { doorSplitH: n === undefined ? undefined : mm(n) })}
          />
        )}
      </div>

      <div className="card-fields boards-fields">
        <BoardField module={m} kind="carcass" />
        <BoardField module={m} kind="front" />
      </div>
      <small className="hint">{t('builder.boardHint')}</small>

      {m.type === 'drawer' && (
        <fieldset>
          <legend>{t('builder.drawers')}</legend>
          {drawers.map((h, i) => (
            <NumberField
              key={i}
              id={`mod-drawer-${i}`}
              label={t('builder.drawerFront', { n: i + 1 })}
              unit={s.units}
              value={show(h)}
              onCommit={(n) => update(m.id, { drawers: drawers.map((x, j) => (j === i ? mm(n) : x)) })}
            />
          ))}
          <p className="hint">{t('builder.drawerSum', { sum: formatLength(drawerTotal, s.units), H: formatLength(m.H, s.units) })}</p>
          <div className="actions">
            <button type="button" onClick={() => update(m.id, { drawers: evenDrawers(m.H, drawers.length + 1, s.gap) })}>
              {t('builder.addDrawer')}
            </button>
            <button
              type="button"
              disabled={drawers.length <= 1}
              onClick={() => update(m.id, { drawers: evenDrawers(m.H, drawers.length - 1, s.gap) })}
            >
              {t('builder.removeDrawer')}
            </button>
          </div>
        </fieldset>
      )}
    </section>
  );
}
