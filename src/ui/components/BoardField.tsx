import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { boardById, defaultBoards } from '../../core/boards';
import type { Module } from '../../core/types';
import { useStore } from '../../store';
import { dimNum } from '../format';

/**
 * The board a cabinet is cut from, typed as type and color ("Iverica Egger bela"). The same name in several
 * cabinets is one board, so the report counts their sheets together. Applied when the field loses focus.
 */
export default function BoardField({ module: m, kind }: { module: Module; kind: 'carcass' | 'front' }) {
  const { t } = useTranslation();
  const s = useStore((st) => st.settings);
  const chooseBoard = useStore((st) => st.chooseBoard);
  const [draft, setDraft] = useState<string | null>(null); // null = show what the store says

  const board = boardById(s, kind === 'carcass' ? m.carcassBoard : m.frontBoard, kind);
  const id = `mod-${kind}-board`;
  const listId = `${id}-names`;
  const d = defaultBoards(s);
  const names = [...new Set([d.carcass.name, d.front.name, ...s.boards.map((b) => b.name)].map((n) => n.trim()).filter(Boolean))];

  const commit = () => {
    if (draft !== null && draft.trim() !== board.name.trim()) chooseBoard(m.id, kind, draft);
    setDraft(null);
  };

  return (
    <div className="field">
      <label htmlFor={id}>{t(kind === 'carcass' ? 'builder.carcassBoard' : 'builder.frontBoard')}</label>
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
      <datalist id={listId}>
        {names.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <small>{`${dimNum(board.thickness, s.units)} ${s.units} · ${dimNum(board.sheet.length, s.units)} × ${dimNum(board.sheet.width, s.units)} ${s.units}`}</small>
    </div>
  );
}
