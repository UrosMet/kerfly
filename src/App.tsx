import { useTranslation } from 'react-i18next';
import { LANGUAGES } from './i18n';
import { useStore } from './store';
import ProjectMenu from './ui/components/ProjectMenu';
import BuilderStep from './ui/steps/BuilderStep';
import ConfirmStep from './ui/steps/ConfirmStep';
import ReportStep from './ui/steps/ReportStep';
import SettingsStep from './ui/steps/SettingsStep';

const STEPS = [
  { key: 'settings', Component: SettingsStep },
  { key: 'builder', Component: BuilderStep },
  { key: 'confirm', Component: ConfirmStep },
  { key: 'report', Component: ReportStep },
];

export default function App() {
  const { t, i18n } = useTranslation();
  const step = useStore((st) => st.step);
  const setStep = useStore((st) => st.setStep);
  const { Component } = STEPS[step];

  return (
    <>
      <header className="app-header no-print">
        <h1>{t('app.name')}</h1>
        <nav aria-label={t('app.name')}>
          {STEPS.map(({ key }, i) => (
            <button key={key} type="button" aria-current={i === step ? 'step' : undefined} onClick={() => setStep(i)}>
              {i + 1}. {t(`steps.${key}`)}
            </button>
          ))}
        </nav>
        <ProjectMenu />
        <select aria-label={t('app.language')} value={i18n.resolvedLanguage} onChange={(e) => i18n.changeLanguage(e.target.value)}>
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {t(`lang.${l}`)}
            </option>
          ))}
        </select>
      </header>
      <main>
        <Component />
      </main>
    </>
  );
}
