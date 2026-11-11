import { useTranslation } from 'react-i18next';
import { NO_HANDLES } from '../../core/handles';
import type { Module } from '../../core/types';
import { useStore } from '../../store';

/** Pick the handle on a cabinet's fronts from the ones added in the settings, or none. */
export default function HandleField({ module: m }: { module: Module }) {
  const { t } = useTranslation();
  const s = useStore((st) => st.settings);
  const update = useStore((st) => st.updateModule);

  const label = (id: string) => {
    const i = s.handles.findIndex((h) => h.id === id);
    return s.handles[i].name.trim() || t('settings.handleUnnamed', { n: i + 1 });
  };
  const defaultName = s.handles.some((h) => h.id === s.defaultHandle) ? label(s.defaultHandle) : '';
  const known = m.handle === NO_HANDLES || s.handles.some((h) => h.id === m.handle) ? m.handle! : '';

  return (
    <div className="field handle-field">
      <label htmlFor="mod-handle">{t('builder.handle')}</label>
      <select id="mod-handle" value={known} onChange={(e) => update(m.id, { handle: e.target.value === '' ? undefined : e.target.value })}>
        <option value="">{`${t('builder.handleSame')}${defaultName ? `: ${defaultName}` : ''}`}</option>
        {s.handles.map((h) => (
          <option key={h.id} value={h.id}>
            {label(h.id)}
          </option>
        ))}
        <option value={NO_HANDLES}>{t('builder.handleNone')}</option>
      </select>
      <small>{t('builder.handleHint')}</small>
    </div>
  );
}
