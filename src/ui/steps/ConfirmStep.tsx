import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { rowModules } from '../../core/modules';
import { formatLength } from '../../core/units';
import { validate, type Issue } from '../../core/validate';
import { useStore } from '../../store';
import { dimNum } from '../format';

export default function ConfirmStep() {
  const { t } = useTranslation();
  const modules = useStore((st) => st.modules);
  const settings = useStore((st) => st.settings);
  const setStep = useStore((st) => st.setStep);
  const { errors, warnings } = useMemo(() => validate(modules, settings), [modules, settings]);

  const moduleLabel = (id?: string) => {
    if (id === 'plinth') return t('confirm.plinth');
    const m = modules.find((x) => x.id === id);
    if (!m) return '';
    const pos = rowModules(modules, m.row).findIndex((x) => x.id === m.id) + 1;
    return `${t(`builder.types.${m.type}`)} ${dimNum(m.W, settings.units)} (${t(`builder.rows.${m.row}`)} #${pos})`;
  };

  // Lengths in the issue params are mm; show them in the selected units.
  const text = (i: Issue) => {
    const params = Object.fromEntries(
      Object.entries(i.params ?? {}).map(([k, v]) => [
        k,
        k === 'part' ? t(String(v)) : typeof v === 'number' && k !== 'drawer' ? formatLength(v, settings.units) : v,
      ]),
    );
    return t(i.code, { ...params, module: moduleLabel(i.moduleId) });
  };

  const empty = modules.length === 0;
  const blocked = empty || errors.length > 0;

  return (
    <section className="confirm">
      <h2>{t('confirm.title')}</h2>

      {empty && <p className="hint">{t('confirm.noModules')}</p>}
      {!empty && errors.length === 0 && warnings.length === 0 && <p className="ok">{t('confirm.noIssues')}</p>}

      {errors.length > 0 && (
        <div className="issues errors">
          <h3>
            {t('confirm.errors')} ({errors.length})
          </h3>
          <ul>
            {errors.map((e, i) => (
              <li key={i}>{text(e)}</li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="issues warnings">
          <h3>
            {t('confirm.warnings')} ({warnings.length})
          </h3>
          <ul>
            {warnings.map((w, i) => (
              <li key={i}>{text(w)}</li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" className="primary" disabled={blocked} onClick={() => setStep(3)}>
        {t('confirm.button')}
      </button>
      {blocked && !empty && <p className="hint">{t('confirm.blocked')}</p>}
    </section>
  );
}
