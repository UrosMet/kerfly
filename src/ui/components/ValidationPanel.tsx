import { useTranslation } from 'react-i18next';
import { rowModules } from '../../core/modules';
import { formatLength } from '../../core/units';
import type { Issue, ValidationResult } from '../../core/validate';
import { useStore } from '../../store';
import { dimNum } from '../format';

/** Turns an issue from validate() into a sentence, with lengths in the selected units. */
function useIssueText() {
  const { t } = useTranslation();
  const modules = useStore((st) => st.modules);
  const units = useStore((st) => st.settings.units);

  const moduleLabel = (id?: string) => {
    if (id === 'plinth') return t('check.plinth');
    const m = modules.find((x) => x.id === id);
    if (!m) return '';
    const pos = rowModules(modules, m.row).findIndex((x) => x.id === m.id) + 1;
    return `${t(`builder.types.${m.type}`)} ${dimNum(m.W, units)} (${t(`builder.rows.${m.row}`)} #${pos})`;
  };

  return (i: Issue) => {
    const params = Object.fromEntries(
      Object.entries(i.params ?? {}).map(([k, v]) => [
        k,
        k === 'part' ? t(String(v)) : typeof v === 'number' && k !== 'drawer' ? formatLength(v, units) : v,
      ]),
    );
    return t(i.code, { ...params, module: moduleLabel(i.moduleId) });
  };
}

/** Errors and warnings, shown right under the row summary. Renders nothing when everything is fine. */
export function IssueList({ result }: { result: ValidationResult }) {
  const { t } = useTranslation();
  const text = useIssueText();
  const { errors, warnings } = result;
  if (errors.length === 0 && warnings.length === 0) return null;

  return (
    <div className="issue-list">
      {errors.length > 0 && (
        <div className="issues errors">
          <h4>
            {t('check.errors')} ({errors.length})
          </h4>
          <ul>
            {errors.map((e, i) => (
              <li key={i}>{text(e)}</li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="issues warnings">
          <h4>
            {t('check.warnings')} ({warnings.length})
          </h4>
          <ul>
            {warnings.map((w, i) => (
              <li key={i}>{text(w)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Sticky bar at the bottom of the builder: how the check went, and the button that opens the report. */
export function ConfirmBar({ result }: { result: ValidationResult }) {
  const { t } = useTranslation();
  const empty = useStore((st) => st.modules.length === 0);
  const setStep = useStore((st) => st.setStep);
  const { errors, warnings } = result;
  const blocked = empty || errors.length > 0;

  let kind: 'ok' | 'warn' | 'err' | 'idle' = 'ok';
  let message = t('check.noIssues');
  if (empty) [kind, message] = ['idle', t('check.noModules')];
  else if (errors.length > 0) [kind, message] = ['err', t('check.blocked')];
  else if (warnings.length > 0) [kind, message] = ['warn', t('check.readyWithWarnings')];

  return (
    <div className="confirm-bar no-print">
      <p className={`bar-status ${kind}`}>{message}</p>
      <button type="button" className="primary big" disabled={blocked} onClick={() => setStep(2)}>
        {t('check.button')}
      </button>
    </div>
  );
}
