import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { boardById, defaultBoards } from '../../core/boards';
import type { Module } from '../../core/types';
import { useStore } from '../../store';
import { dimNum } from '../format';
import ColorField from './ColorField';

/**
 * The board a cabinet is cut from, typed as type and color ("Iverica Egger bela"). The same name in several
 * cabinets is one board, so the report counts their sheets together. Applied when the field loses focus.
 */
const KEY = { carcass: 'carcassBoard', front: 'frontBoard', hdf: 'hdfBoard' } as const;
const LABEL = { carcass: 'builder.carcassBoard', front: 'builder.frontBoard', hdf: 'builder.hdfBoard' } as const;

export default function BoardField({ module: m, kind }: { module: Module; kind: 'carcass' | 'front' | 'hdf' }) {
  const { t } = useTranslation();
  const s = useStore((st) => st.settings);
  const chooseBoard = useStore((st) => st.chooseBoard);
  const setBoardColor = useStore((st) => st.setBoardColor);
  const [draft, setDraft] = useState<string | null>(null); // null = show what the store says

  const board = boardById(s, m[KEY[kind]], kind);
  const id = `mod-${kind}-board`;
  const listId = `${id}-names`;
  const d = defaultBoards(s);
  const names = [...new Set([d.carcass.name, d.front.name, d.hdf.name, ...s.boards.map((b) => b.name)].map((n) => n.trim()).filter(Boolean))];

  const commit = () => {
    if (draft !== null && draft.trim() !== board.name.trim()) chooseBoard(m.id, kind, draft);
    setDraft(null);
  };

  return (
    <div className="field">
      <label htmlFor={id}>{t(LABEL[kind])}</label>
      <div className="input-row">
      <input
        id={id}
        list={listId}
        value={draft ?? board.name}
        placeholder={t('builder.boardPlaceholder')}
        autoComplete="off"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
      />
      <ColorField label={t('color.of', { what: t(LABEL[kind]) })} value={board.color} onChange={(c) => setBoardColor(board.id, c)} />
      </div>
      <datalist id={listId}>
        {names.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <small>{`${dimNum(board.thickness, s.units)} ${s.units} · ${dimNum(board.sheet.length, s.units)} × ${dimNum(board.sheet.width, s.units)} ${s.units}`}</small>
    </div>
  );
}
