import { useTranslation } from 'react-i18next';
import { fromMm, toMm } from '../../core/units';
import type { Market, Units } from '../../core/types';
import { useStore } from '../../store';
import ColorField from '../components/ColorField';
import NumberField from '../components/NumberField';

const MARKETS: Market[] = ['eu', 'us', 'uk'];
const UNITS: Units[] = ['mm', 'in'];

export default function SettingsStep() {
  const { t } = useTranslation();
  const s = useStore((st) => st.settings);
  const setSettings = useStore((st) => st.setSettings);
  const setMarket = useStore((st) => st.setMarket);
  const setStep = useStore((st) => st.setStep);
  const setBoardColor = useStore((st) => st.setBoardColor);
  const addHandle = useStore((st) => st.addHandle);
  const updateHandle = useStore((st) => st.updateHandle);
  const deleteHandle = useStore((st) => st.deleteHandle);

  // Everything is stored in mm; fields show and accept the selected units.
  const show = (mm: number) => fromMm(mm, s.units);
  const store = (n: number | undefined) => toMm(n as number, s.units);
  const unit = s.units;

  return (
    <form className="settings" onSubmit={(e) => e.preventDefault()}>
      <div className="page-head">
        <h2>{t('settings.title')}</h2>
        <p className="lede">{t('settings.lede')}</p>
      </div>

      <div className="settings-grid">
      <fieldset>
        <legend>{t('settings.marketCard')}</legend>
        <div className="field">
          <label htmlFor="market">{t('settings.market')}</label>
          <select id="market" value={s.market} onChange={(e) => setMarket(e.target.value as Market)}>
            {MARKETS.map((m) => (
              <option key={m} value={m}>
                {t(`settings.markets.${m}`)}
              </option>
            ))}
          </select>
          <small>{t('settings.marketHint')}</small>
        </div>
        <div className="field">
          <label htmlFor="units">{t('settings.units')}</label>
          <select id="units" value={s.units} onChange={(e) => setSettings({ units: e.target.value as Units })}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {t(`settings.unitsOptions.${u}`)}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset>
        <legend>{t('settings.sheet')}</legend>
        <NumberField
          id="sheet-length"
          label={t('settings.length')}
          unit={unit}
          value={show(s.sheet.length)}
          onCommit={(n) => setSettings({ sheet: { ...s.sheet, length: store(n) } })}
        />
        <NumberField
          id="sheet-width"
          label={t('settings.width')}
          unit={unit}
          value={show(s.sheet.width)}
          onCommit={(n) => setSettings({ sheet: { ...s.sheet, width: store(n) } })}
        />
      </fieldset>

      <fieldset>
        <legend>{t('settings.hdfSheet')}</legend>
        <NumberField
          id="hdf-length"
          label={t('settings.length')}
          unit={unit}
          value={show(s.hdfSheet.length)}
          onCommit={(n) => setSettings({ hdfSheet: { ...s.hdfSheet, length: store(n) } })}
        />
        <NumberField
          id="hdf-width"
          label={t('settings.width')}
          unit={unit}
          value={show(s.hdfSheet.width)}
          onCommit={(n) => setSettings({ hdfSheet: { ...s.hdfSheet, width: store(n) } })}
        />
        <NumberField
          id="hdf-thickness"
          label={t('settings.hdfThickness')}
          unit={unit}
          value={show(s.hdfT)}
          onCommit={(n) => setSettings({ hdfT: store(n) })}
        />
        <div className="field">
          <label htmlFor="decor-hdf">{t('settings.decorHdf')}</label>
          <div className="input-row">
            <input id="decor-hdf" placeholder={t('settings.decorPlaceholder')} value={s.decor.hdf} onChange={(e) => setSettings({ decor: { ...s.decor, hdf: e.target.value } })} />
            <ColorField label={t('color.of', { what: t('settings.decorHdf') })} value={s.decorColor.hdf} onChange={(c) => setBoardColor('hdf', c)} />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>{t('settings.construction')}</legend>
        <NumberField
          id="thickness"
          label={t('settings.thickness')}
          unit={unit}
          value={show(s.t)}
          onCommit={(n) => setSettings({ t: store(n) })}
        />
        <NumberField
          id="front-thickness"
          label={t('settings.frontThickness')}
          unit={unit}
          value={show(s.frontT)}
          onCommit={(n) => setSettings({ frontT: store(n) })}
        />
        <NumberField
          id="gap"
          label={t('settings.gap')}
          unit={unit}
          value={show(s.gap)}
          valid={(n) => n >= 0}
          onCommit={(n) => setSettings({ gap: store(n) })}
        />
        <NumberField
          id="wall-length"
          label={t('settings.wallLength')}
          hint={t('settings.wallLengthHint')}
          unit={unit}
          optional
          value={s.wallLength === undefined ? undefined : show(s.wallLength)}
          onCommit={(n) => setSettings({ wallLength: n === undefined ? undefined : store(n) })}
        />
      </fieldset>

      <fieldset>
        <legend>{t('settings.edgeTitle')}</legend>
        <NumberField id="edge-thin" label={t('settings.edgeThin')} unit={unit} value={show(s.edgeThin)} onCommit={(n) => setSettings({ edgeThin: store(n) })} />
        <NumberField id="edge-thick" label={t('settings.edgeThick')} unit={unit} value={show(s.edgeThick)} onCommit={(n) => setSettings({ edgeThick: store(n) })} />
        <div className="field">
          <label htmlFor="edge-carcass">{t('settings.edgeNameCarcass')}</label>
          <input id="edge-carcass" placeholder={t('settings.edgePlaceholder')} value={s.edgeName.carcass} onChange={(e) => setSettings({ edgeName: { ...s.edgeName, carcass: e.target.value } })} />
        </div>
        <div className="field">
          <label htmlFor="edge-front">{t('settings.edgeNameFront')}</label>
          <input id="edge-front" placeholder={t('settings.edgePlaceholder')} value={s.edgeName.front} onChange={(e) => setSettings({ edgeName: { ...s.edgeName, front: e.target.value } })} />
        </div>
      </fieldset>

      <fieldset>
        <legend>{t('settings.handlesTitle')}</legend>
        {s.handles.map((h, i) => (
          <div className="field" key={h.id}>
            <label htmlFor={`handle-${h.id}`}>{t('settings.handleLabel', { n: i + 1 })}</label>
            <div className="input-row">
              <input id={`handle-${h.id}`} placeholder={t('settings.handlePlaceholder')} value={h.name} onChange={(e) => updateHandle(h.id, e.target.value)} />
              <button type="button" aria-label={t('settings.handleRemove', { n: i + 1 })} title={t('settings.handleRemove', { n: i + 1 })} onClick={() => deleteHandle(h.id)}>
                ×
              </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addHandle}>
          + {t('settings.handleAdd')}
        </button>
        <div className="field">
          <label htmlFor="handle-default">{t('settings.handleDefault')}</label>
          <select id="handle-default" value={s.handles.some((h) => h.id === s.defaultHandle) ? s.defaultHandle : ''} onChange={(e) => setSettings({ defaultHandle: e.target.value })}>
            <option value="">{t('settings.handleNone')}</option>
            {s.handles.map((h, i) => (
              <option key={h.id} value={h.id}>
                {h.name.trim() || t('settings.handleUnnamed', { n: i + 1 })}
              </option>
            ))}
          </select>
          <small>{t('settings.handleHint')}</small>
        </div>
      </fieldset>

      <fieldset>
        <legend>{t('settings.decor')}</legend>
        <div className="field">
          <label htmlFor="decor-carcass">{t('settings.decorCarcass')}</label>
          <div className="input-row">
            <input
              id="decor-carcass"
              placeholder={t('settings.decorPlaceholder')}
              value={s.decor.carcass}
              onChange={(e) => setSettings({ decor: { ...s.decor, carcass: e.target.value } })}
            />
            <ColorField label={t('color.of', { what: t('settings.decorCarcass') })} value={s.decorColor.carcass} onChange={(c) => setBoardColor('carcass', c)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="decor-front">{t('settings.decorFront')}</label>
          <div className="input-row">
            <input
              id="decor-front"
              placeholder={t('settings.decorPlaceholder')}
              value={s.decor.front}
              onChange={(e) => setSettings({ decor: { ...s.decor, front: e.target.value } })}
            />
            <ColorField label={t('color.of', { what: t('settings.decorFront') })} value={s.decorColor.front} onChange={(c) => setBoardColor('front', c)} />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>{t('settings.grain')}</legend>
        <label className="check">
          <input
            type="checkbox"
            checked={s.grain.carcass}
            onChange={(e) => setSettings({ grain: { ...s.grain, carcass: e.target.checked } })}
          />
          {t('settings.grainCarcass')}
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={s.grain.front}
            onChange={(e) => setSettings({ grain: { ...s.grain, front: e.target.checked } })}
          />
          {t('settings.grainFront')}
        </label>
        <label className="check">
          <input type="checkbox" checked={s.subtractEdge} onChange={(e) => setSettings({ subtractEdge: e.target.checked })} />
          {t('settings.subtractEdge')}
        </label>
      </fieldset>
      </div>

      <div className="step-actions">
        <button type="button" className="primary big" onClick={() => setStep(1)}>
          {t('settings.next')} →
        </button>
      </div>
    </form>
  );
}
