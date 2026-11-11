import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../../i18n';

export default function LanguageToggle() {
  const { t, i18n } = useTranslation();
  return (
    <div className="lang-toggle" role="group" aria-label={t('app.language')}>
      {LANGUAGES.map((l) => (
        <button key={l} type="button" lang={l} aria-label={t(`lang.${l}`)} aria-pressed={i18n.resolvedLanguage === l} onClick={() => i18n.changeLanguage(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
