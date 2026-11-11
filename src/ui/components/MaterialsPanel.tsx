import { useTranslation } from 'react-i18next';
import { boardEdge } from '../../core/boards';
import { fromMm, toMm } from '../../core/units';
import { useStore } from '../../store';
import ColorField from './ColorField';
import NumberField from './NumberField';

/** Extra boards (decors with their own thickness and sheet size) and the worktop. */
export default function MaterialsPanel() {
  const { t } = useTranslation();
  const s = useStore((st) => st.settings);
  const setSettings = useStore((st) => st.setSettings);
  const addBoard = useStore((st) => st.addBoard);
  const updateBoard = useStore((st) => st.updateBoard);
  const deleteBoard = useStore((st) => st.deleteBoard);
  const setBoardColor = useStore((st) => st.setBoardColor);
  const modules = useStore((st) => st.modules);
  const usedBy = (id: string) => modules.filter((m) => m.carcassBoard === id || m.frontBoard === id).length;

  const u = s.units;
  const show = (mm: number) => fromMm(mm, u);
  const store = (n: number | undefined) => toMm(n as number, u);
  const extra = s.boards.length;

  return (
    <details className="card materials">
      <summary>
        <span className="summary-title">{t('materials.title')}</span>
        <small>{extra > 0 ? t('materials.extra', { count: extra }) : t('materials.extraNone')}</small>
      </summary>
      <p className="hint">{t('materials.hint')}</p>

      <div className="boards">
        {s.boards.map((b, i) => (
          <fieldset key={b.id} className="board">
            <legend>{t('materials.boardTitle', { n: i + 1 })}</legend>
            <div className="field">
              <label htmlFor={`board-${b.id}-name`}>{t('materials.decor')}</label>
              <div className="input-row">
                <input id={`board-${b.id}-name`} value={b.name} placeholder={t('settings.decorPlaceholder')} onChange={(e) => updateBoard(b.id, { name: e.target.value })} />
                <ColorField label={t('color.of', { what: t('materials.decor') })} value={b.color} onChange={(c) => setBoardColor(b.id, c)} />
              </div>
            </div>
            <NumberField id={`board-${b.id}-t`} label={t('materials.thickness')} unit={u} value={show(b.thickness)} onCommit={(n) => updateBoard(b.id, { thickness: store(n) })} />
            <NumberField
              id={`board-${b.id}-length`}
              label={t('materials.sheetLength')}
              unit={u}
              value={show(b.sheet.length)}
              onCommit={(n) => updateBoard(b.id, { sheet: { ...b.sheet, length: store(n) } })}
            />
            <NumberField
              id={`board-${b.id}-width`}
              label={t('materials.sheetWidth')}
              unit={u}
              value={show(b.sheet.width)}
              onCommit={(n) => updateBoard(b.id, { sheet: { ...b.sheet, width: store(n) } })}
            />
            <div className="field">
              <label htmlFor={`board-${b.id}-edge`}>{t('materials.edgeName')}</label>
              <input
                id={`board-${b.id}-edge`}
                value={boardEdge(s, b).name}
                placeholder={t('materials.edgePlaceholder')}
                onChange={(e) => updateBoard(b.id, { edge: { ...boardEdge(s, b), name: e.target.value } })}
              />
            </div>
            <NumberField
              id={`board-${b.id}-edge-thin`}
              label={t('materials.edgeThin')}
              unit={u}
              value={show(boardEdge(s, b).thin)}
              onCommit={(n) => updateBoard(b.id, { edge: { ...boardEdge(s, b), thin: store(n) } })}
            />
            <NumberField
              id={`board-${b.id}-edge-thick`}
              label={t('materials.edgeThick')}
              unit={u}
              value={show(boardEdge(s, b).thick)}
              onCommit={(n) => updateBoard(b.id, { edge: { ...boardEdge(s, b), thick: store(n) } })}
            />
            <label className="check">
              <input type="checkbox" checked={b.grain} onChange={(e) => updateBoard(b.id, { grain: e.target.checked })} />
              {t('materials.grain')}
            </label>
            <small>{usedBy(b.id) > 0 ? t('materials.usage', { count: usedBy(b.id) }) : t('materials.unused')}</small>
            <button type="button" onClick={() => deleteBoard(b.id)}>
              {t('materials.remove')}
            </button>
          </fieldset>
        ))}

        <fieldset className="board worktop">
          <legend>{t('materials.worktopTitle')}</legend>
          <div className="field">
            <label htmlFor="worktop-decor">{t('materials.worktopDecor')}</label>
            <input id="worktop-decor" value={s.worktopDecor} placeholder={t('settings.decorPlaceholder')} onChange={(e) => setSettings({ worktopDecor: e.target.value })} />
          </div>
          <NumberField id="worktop-t" label={t('materials.worktopThickness')} unit={u} value={show(s.worktopT)} onCommit={(n) => setSettings({ worktopT: store(n) })} />
          <NumberField id="worktop-length" label={t('materials.worktopLength')} unit={u} value={show(s.worktopLength)} onCommit={(n) => setSettings({ worktopLength: store(n) })} />
          <NumberField id="worktop-depth" label={t('materials.worktopDepth')} unit={u} value={show(s.worktopDepth)} onCommit={(n) => setSettings({ worktopDepth: store(n) })} />
        </fieldset>
      </div>

      <button type="button" onClick={addBoard}>
        + {t('materials.add')}
      </button>
    </details>
  );
}
