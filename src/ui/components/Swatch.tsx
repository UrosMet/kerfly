import { useTranslation } from 'react-i18next';
import { colorHex } from '../../core/palette';

/** A small square in the color of a board (given as a palette key); nothing when there is no color. */
export default function Swatch({ color }: { color: string | undefined }) {
  const { t } = useTranslation();
  const hex = colorHex(color);
  return hex ? <i className="swatch" style={{ background: hex }} title={t(`color.names.${color}`)} aria-hidden="true" /> : null;
}
