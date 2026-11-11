import { useTranslation } from 'react-i18next';
import { colorHex, PALETTE } from '../../core/palette';
import Swatch from './Swatch';

/** Choose the color of a board from the list of named colors; "" is no color (the drawing's default look). */
export default function ColorField({ label, value, onChange }: { label: string; value: string | undefined; onChange: (key: string) => void }) {
  const { t } = useTranslation();
  const known = colorHex(value) ? value! : '';
  return (
    <span className="color-field">
      <Swatch color={known} />
      <select aria-label={label} value={known} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t('color.none')}</option>
        {PALETTE.map((c) => (
          <option key={c.key} value={c.key}>
            {t(`color.names.${c.key}`)}
          </option>
        ))}
      </select>
    </span>
  );
}
