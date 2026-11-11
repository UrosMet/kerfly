import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { buildReport, cuttingListCsv, type CutRow } from '../../core/report';
import { formatLength } from '../../core/units';
import { useStore } from '../../store';
import { boardTitle, kindsLabel } from '../boardLabels';
import SheetLayout from '../components/SheetLayout';
import { dimNum, downloadCsv, downloadText, meters } from '../format';
import { reportText, shoppingGroups, type TFn } from '../reportText';

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

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
      return null; // validation errors: the builder explains them
    }
  }, [modules, settings]);

  if (!report) {
    return (
      <section className="report">
        <div className="page-head">
          <h2>{t('report.title')}</h2>
        </div>
        <div className="card empty-state">
          <p>{t('report.notReady')}</p>
          <button type="button" className="primary" onClick={() => setStep(1)}>
            {t('report.goBuilder')}
          </button>
        </div>
      </section>
    );
  }

  const tx = t as unknown as TFn;
  const { shopping, cuttingList, layouts } = report;
  const hw = shopping.hardware;
  const wt = shopping.worktop;
  const hardwareRows: [string, number][] = [
    [t('report.hinges'), hw.hinges],
    ...Object.entries(hw.slides).map(([len, pairs]): [string, number] => [t('report.slides', { length: formatLength(Number(len), units) }), pairs]),
    [t('report.legs'), hw.legs],
    [t('report.handles'), hw.handles],
    [t('report.shelfPins'), hw.shelfPins],
    [t('report.wallHangers'), hw.wallHangers],
    [t('report.confirmats'), hw.confirmats.qty],
  ];

  const exportCsv = (i: number) => {
    const table = cuttingList[i];
    const rows: CutRow[] = table.rows.map((r) => ({ ...r, L: dimNum(r.L, units), Wd: dimNum(r.Wd, units) }));
    // length and width are exported in the selected units; say which in the header
    const tr = (k: string) => (k === 'csv.length' || k === 'csv.width' ? `${t(k)} (${units})` : t(k));
    const name = slug(`${kindsLabel(table.kinds, tx)} ${table.board.name}`) || table.board.id;
    downloadCsv(`kerfly-${i + 1}-${name}.csv`, cuttingListCsv(rows, tr));
  };
  const exportText = () => downloadText('kerfly-spisak.txt', reportText(report, settings, tx), 'text/plain;charset=utf-8', true);

  return (
    <section className="report">
      <div className="page-head report-title">
        <div>
          <h2>{t('report.title')}</h2>
          <p className="lede">{t('report.lede')}</p>
        </div>
        <div className="report-actions no-print">
          <button type="button" className="primary" onClick={exportText}>
            {t('report.exportText')}
          </button>
          <button type="button" onClick={() => window.print()}>
            {t('report.print')}
          </button>
        </div>
      </div>

      <p className="notice" role="note">
        {t('notice.corner')}
      </p>

      <section className="card need" aria-labelledby="need-heading">
        <h3 id="need-heading">{t('need.heading')}</h3>
        <div className="need-grid">
          {shoppingGroups(report, settings, tx).map((group) => (
            <div key={group.key} className={`need-group need-${group.key}`}>
              <h4>{group.title}</h4>
              <ul>
                {group.items.map((item, i) => (
                  <li key={i} className="need-item" data-sentence={item.text}>
                    <strong className="need-qty">{item.qty}</strong>
                    <span className="need-body">
                      <span className="need-title">{item.title}</span>
                      {item.detail && <span className="need-detail">{item.detail}</span>}
                      {item.note && <span className="need-note">{item.note}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <h3 className="section-title">{t('report.shopping')}</h3>
      <div className="shopping-grid">
        <div className="card wide-card">
          <div className="table-wrap">
            <table>
              <caption>{t('report.sheets')}</caption>
              <thead>
                <tr>
                  <th>{t('report.material')}</th>
                  <th>{t('report.decor')}</th>
                  <th>{t('report.thickness')}</th>
                  <th>{t('report.format')}</th>
                  <th>{t('report.sheetCount')}</th>
                  <th>{t('report.utilization')}</th>
                </tr>
              </thead>
              <tbody>
                {shopping.sheets.map((line) => (
                  <tr key={line.boardId}>
                    <td>{kindsLabel(line.kinds, tx)}</td>
                    <td>{line.name}</td>
                    <td>{`${dimNum(line.thickness, units)} ${units}`}</td>
                    <td>{`${dimNum(line.sheet.length, units)} × ${dimNum(line.sheet.width, units)} ${units}`}</td>
                    <td>{line.count}</td>
                    <td>{`${line.utilization.toFixed(1)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
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
        </div>

        <div className="card">
          <table>
            <caption>{t('report.worktop')}</caption>
            <tbody>
              <tr>
                <th scope="row">{t('report.worktopPieces')}</th>
                <td>{wt.pieces}</td>
              </tr>
              {wt.decor && (
                <tr>
                  <th scope="row">{t('report.worktopDecor')}</th>
                  <td>{wt.decor}</td>
                </tr>
              )}
              <tr>
                <th scope="row">{t('report.worktopSize')}</th>
                <td>{`${dimNum(wt.length, units)} × ${dimNum(wt.depth, units)} × ${dimNum(wt.thickness, units)} ${units}`}</td>
              </tr>
              <tr>
                <th scope="row">{t('report.worktopTrim')}</th>
                <td>{meters(wt.trimMeters, units)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card">
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
        </div>
      </div>

      <h3 className="section-title">{t('report.cuttingList')}</h3>
      {cuttingList.map((table, i) => {
        const title = boardTitle(table.board, table.kinds, units, tx);
        return (
          <div key={table.board.id} className="cutting-list card">
            <div className="cutting-head">
              <h4>{title}</h4>
              <button type="button" className="no-print" disabled={table.rows.length === 0} onClick={() => exportCsv(i)}>
                {t('report.exportCsv')}
              </button>
            </div>
            <div className="table-wrap">
              <table className="cuts" aria-label={title}>
                <thead>
                  <tr>
                    {['name', 'length', 'width', 'qty', 'L1', 'L2', 'W1', 'W2', 'grain'].map((c) => (
                      <th key={c}>{t(`csv.${c}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((r, j) => (
                    <tr key={j}>
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
          </div>
        );
      })}

      <h3 className="section-title layouts-title">{t('report.layouts')}</h3>
      {layouts.map(({ board, result }, i) => (
        <div key={board.id} className="layout-group">
          <h4>{boardTitle(board, cuttingList[i].kinds, units, tx)}</h4>
          <SheetLayout result={result} sheet={board.sheet} trim={settings.trim} units={units} />
        </div>
      ))}
    </section>
  );
}
