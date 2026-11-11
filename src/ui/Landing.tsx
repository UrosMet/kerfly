import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store';
import LanguageToggle from './components/LanguageToggle';
import Logo from './components/Logo';
import ThemeToggle from './components/ThemeToggle';
import ToolsBackdrop from './components/ToolsBackdrop';

const FEATURES = ['sheets', 'edging', 'hardware', 'cutting', 'layouts', 'check'] as const;
const STEPS = [
  { key: 'one', icon: 'M5 7h14M5 12h14M5 17h14M9 5v4M15 10v4M8 15v4' },
  { key: 'two', icon: 'M4 5h7v14H4zM13 5h7v6h-7zM13 13h7v6h-7z' },
  { key: 'three', icon: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7' },
] as const;

/** A sheet with parts laid out on it: the thing Kerfly produces. Decorative. */
function HeroArt() {
  const piece = (x: number, y: number, w: number, h: number, label: string, alt = false) => (
    <g key={`${x}-${y}`}>
      <rect className={alt ? 'ill-piece alt' : 'ill-piece'} x={x} y={y} width={w} height={h} rx="4" />
      <text x={x + w / 2} y={y + h / 2 + 6} textAnchor="middle">
        {label}
      </text>
    </g>
  );
  return (
    <svg className="hero-art" viewBox="0 0 560 400" aria-hidden="true">
      <rect className="ill-sheet" x="14" y="14" width="532" height="372" rx="12" />
      <rect className="ill-trim" x="26" y="26" width="508" height="348" rx="6" />
      {piece(32, 32, 242, 170, '720 × 560')}
      {piece(278, 32, 250, 170, '720 × 560', true)}
      {piece(32, 206, 160, 162, '564 × 560', true)}
      {piece(196, 206, 160, 80, '562 × 540')}
      {piece(196, 290, 160, 78, '597 × 717', true)}
      {piece(360, 206, 168, 162, '596 × 716')}
      <path className="ill-edge" d="M36 34h234M282 34h242M36 208h152" />
    </svg>
  );
}

const Section = ({ id, title, children }: { id: string; title: string; children: ReactNode }) => (
  <section className="landing-section container" aria-labelledby={id}>
    <h2 id={id}>{title}</h2>
    {children}
  </section>
);

export default function Landing() {
  const { t } = useTranslation();
  const savedCount = useStore((st) => st.modules.length);
  const setStarted = useStore((st) => st.setStarted);
  const setStep = useStore((st) => st.setStep);
  const open = (step: number) => {
    setStep(step);
    setStarted(true);
  };

  return (
    <div className="landing">
      <ToolsBackdrop />
      <header className="landing-header container">
        <span className="brand">
          <Logo size={32} />
          <span className="brand-name">{t('app.name')}</span>
        </span>
        <div className="header-actions">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </header>

      <section className="hero container">
        <div className="hero-text">
          <p className="eyebrow">{t('landing.eyebrow')}</p>
          <h1>{t('landing.title')}</h1>
          <p className="lede">{t('landing.subtitle')}</p>
          <div className="hero-actions">
            <button type="button" className="primary big" onClick={() => open(0)}>
              {t('landing.start')}
            </button>
            {savedCount > 0 && (
              <button type="button" className="big" onClick={() => open(1)}>
                {t('landing.continue')}
              </button>
            )}
          </div>
        </div>
        <HeroArt />
      </section>

      <Section id="how" title={t('landing.howTitle')}>
        <ol className="how">
          {STEPS.map(({ key, icon }, i) => (
            <li key={key} className="card">
              <span className="step-no">{i + 1}</span>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={icon} />
              </svg>
              <h3>{t(`landing.steps.${key}.title`)}</h3>
              <p>{t(`landing.steps.${key}.text`)}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="what" title={t('landing.whatTitle')}>
        <ul className="features">
          {FEATURES.map((f) => (
            <li key={f} className="card">
              <svg className="tick" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              <h3>{t(`landing.features.${f}.title`)}</h3>
              <p>{t(`landing.features.${f}.text`)}</p>
            </li>
          ))}
        </ul>
      </Section>

      <section className="landing-section container two-col">
        <div className="card">
          <h3>{t('landing.privacyTitle')}</h3>
          <p>{t('landing.privacyText')}</p>
        </div>
        <div className="card">
          <h3>{t('landing.limitsTitle')}</h3>
          <p>{t('notice.corner')}</p>
        </div>
      </section>

      <section className="cta container">
        <h2>{t('landing.ctaTitle')}</h2>
        <p>{t('landing.ctaText')}</p>
        <button type="button" className="primary big" onClick={() => open(0)}>
          {t('landing.start')}
        </button>
      </section>

      <footer className="landing-footer container">
        <span className="brand">
          <Logo size={20} />
          <span className="brand-name">{t('app.name')}</span>
        </span>
        <small>{t('landing.kerfNote')}</small>
      </footer>
      <ToolsBackdrop flip />
    </div>
  );
}
