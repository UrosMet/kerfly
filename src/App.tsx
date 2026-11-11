import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from './store';
import LanguageToggle from './ui/components/LanguageToggle';
import Logo from './ui/components/Logo';
import ProjectMenu from './ui/components/ProjectMenu';
import ThemeToggle from './ui/components/ThemeToggle';
import Landing from './ui/Landing';
import BuilderStep from './ui/steps/BuilderStep';
import ReportStep from './ui/steps/ReportStep';
import SettingsStep from './ui/steps/SettingsStep';

const STEPS = [
  { key: 'settings', Component: SettingsStep },
  { key: 'builder', Component: BuilderStep },
  { key: 'report', Component: ReportStep },
];

export default function App() {
  const { t } = useTranslation();
  const started = useStore((st) => st.started);
  const step = useStore((st) => st.step);
  const setStep = useStore((st) => st.setStep);
  const setStarted = useStore((st) => st.setStarted);

  // a new step (or the landing page) starts at the top, not wherever the last page was scrolled to
  const first = useRef(true);
  useEffect(() => {
    if (first.current) first.current = false; // keep the browser's own scroll restoration on reload
    else window.scrollTo(0, 0);
  }, [step, started]);

  if (!started) return <Landing />;
  const { Component } = STEPS[step];

  return (
    <>
      <header className="app-header no-print">
        <div className="header-inner">
          <button type="button" className="brand" aria-label={t('app.home')} onClick={() => setStarted(false)}>
            <Logo />
            <span className="brand-name">{t('app.name')}</span>
          </button>
          <nav className="stepper" aria-label={t('app.steps')}>
            <ol>
              {STEPS.map(({ key }, i) => (
                <li key={key}>
                  <button type="button" aria-current={i === step ? 'step' : undefined} onClick={() => setStep(i)}>
                    <span className="num">{i + 1}</span>
                    <span className="label">{t(`steps.${key}`)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <div className="header-actions">
            <ProjectMenu />
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>
      </header>
      <main>
        <Component />
      </main>
    </>
  );
}
