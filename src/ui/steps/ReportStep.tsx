import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { buildReport, cuttingListCsv, type CutRow } from '../../core/report';
import type { MaterialKey } from '../../core/types';
import { formatLength } from '../../core/units';
import { useStore } from '../../store';
import SheetLayout from '../components/SheetLayout';
import { dimNum, downloadCsv, meters } from '../format';

const MATERIALS: MaterialKey[] = ['carcass', 'front', 'hdf'];

export default function ReportStep() {
  const { t } = useTranslation();
  const modules = useStore((st) => st.modules);
  const settings = useStore((st) => st.settings);
  const setStep = useStore((st) => st.setStep);
  const { units } = settings;

  const report = useMemo(() => {
    if (modules.length === 0) return null;
    try {
      return buildReport(modules, settings);
    } catch {
      return null; // validation errors: the Confirm step explains them
    }
  }, [modules, settings]);

  if (!report) {
    return (
      <section>
        <h2>{t('report.title')}</h2>
        <p>{t('report.notReady')}</p>
        <button type="button" onClick={() => setStep(2)}>
          {t('report.goConfirm')}
        </button>
      </section>
    );
  }

  const { shopping, cuttingList, layouts } = report;
  const hw = shopping.hardware;
  const hardwareRows: [string, number][] = [
    [t('report.hinges'), hw.hinges],
    ...Object.entries(hw.slides).map(([len, pairs]): [string, number] => [t('report.slides', { length: formatLength(Number(len), units) }), pairs]),
    [t('report.legs'), hw.legs],
    [t('report.handles'), hw.handles],
    [t('report.shelfPins'), hw.shelfPins],
    [t('report.wallHangers'), hw.wallHangers],
    [`${t('report.confirmats')}`, hw.confirmats.qty],
  ];

  const exportCsv = (m: MaterialKey) => {
    const rows: CutRow[] = cuttingList[m].map((r) => ({ ...r, L: dimNum(r.L, units), Wd: dimNum(r.Wd, units) }));
    // length and width are exported in the selected units; say which in the header
    const tr = (k: string) => (k === 'csv.length' || k === 'csv.width' ? `${t(k)} (${units})` : t(k));
    downloadCsv(`kerfly-${m}.csv`, cuttingListCsv(rows, tr));
  };

  return (
    <section className="report">
      <div className="report-title">
        <h2>{t('report.title')}</h2>
        <button type="button" className="no-print" onClick={() => window.print()}>
          {t('report.print')}
        </button>
      </div>

      <p className="notice" role="note">
        {t('notice.corner')}
      </p>

      <h3>{t('report.shopping')}</h3>
      <table>
        <caption>{t('report.sheets')}</caption>
        <thead>
          <tr>
            <th>{t('report.material')}</th>
            <th>{t('report.decor')}</th>
            <th>{t('report.sheetCount')}</th>
            <th>{t('report.utilization')}</th>
          </tr>
        </thead>
        <tbody>
          {MATERIALS.map((m) => (
            <tr key={m}>
              <td>{t(`report.materials.${m}`)}</td>
              <td>{shopping.sheets[m].decor ?? ''}</td>
              <td>{shopping.sheets[m].count}</td>
              <td>{shopping.sheets[m].count ? `${shopping.sheets[m].utilization.toFixed(1)}%` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table>
        <caption>{t('report.edging')}</caption>
        <thead>
          <tr>
            <th>{t('report.material')}</th>
            <th>{t('edge.thin')}</th>
            <th>{t('edge.thick')}</th>
          </tr>
        </thead>
        <tbody>
          {(['carcass', 'front'] as const).map((m) => (
            <tr key={m}>
              <td>{t(`report.materials.${m}`)}</td>
              <td>{meters(shopping.edging[m].thin, units)}</td>
              <td>{meters(shopping.edging[m].thick, units)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table>
        <caption>{t('report.worktop')}</caption>
        <tbody>
          <tr>
            <th scope="row">{t('report.worktopPieces')}</th>
            <td>{shopping.worktop.pieces}</td>
          </tr>
          <tr>
            <th scope="row">{t('report.worktopTrim')}</th>
            <td>{meters(shopping.worktop.trimMeters, units)}</td>
          </tr>
        </tbody>
      </table>

      <table>
        <caption>{t('report.hardware')}</caption>
        <tbody>
          {hardwareRows.map(([label, qty]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{qty}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>{t('report.cuttingList')}</h3>
      {MATERIALS.map((m) => (
        <div key={m} className="cutting-list">
          <div className="cutting-head">
            <h4>
              {t(`report.materials.${m}`)}
              {m !== 'hdf' && settings.decor[m] ? ` — ${settings.decor[m]}` : ''}
            </h4>
            <button type="button" className="no-print" disabled={cuttingList[m].length === 0} onClick={() => exportCsv(m)}>
              {t('report.exportCsv')}
            </button>
          </div>
          {cuttingList[m].length === 0 ? (
            <p className="hint">{t('report.noParts')}</p>
          ) : (
            <div className="table-wrap">
            <table className="cuts" aria-label={t(`report.materials.${m}`)}>
              <thead>
                <tr>
                  {['name', 'length', 'width', 'qty', 'L1', 'L2', 'W1', 'W2', 'grain'].map((c) => (
                    <th key={c}>{t(`csv.${c}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cuttingList[m].map((r, i) => (
                  <tr key={i}>
                    <td>{t(r.nameKey)}</td>
                    <td>{dimNum(r.L, units)}</td>
                    <td>{dimNum(r.Wd, units)}</td>
                    <td>{r.qty}</td>
                    <td>{t(`edge.${r.edges.L1}`)}</td>
                    <td>{t(`edge.${r.edges.L2}`)}</td>
                    <td>{t(`edge.${r.edges.W1}`)}</td>
                    <td>{t(`edge.${r.edges.W2}`)}</td>
                    <td>{t(r.grain ? 'csv.grainYes' : 'csv.grainNo')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      ))}

      <h3 className="layouts-title">{t('report.layouts')}</h3>
      {MATERIALS.map((m) =>
        layouts[m].sheets.length === 0 ? null : (
          <div key={m} className="layout-group">
            <h4>{t(`report.materials.${m}`)}</h4>
            <SheetLayout result={layouts[m]} sheet={m === 'hdf' ? settings.hdfSheet : settings.sheet} trim={settings.trim} units={units} />
          </div>
        ),
      )}
    </section>
  );
}
