import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import sr from './sr.json';

const LANG_KEY = 'kerfly.lang';

export const LANGUAGES = ['sr', 'en'] as const;

function savedLanguage(): string {
  try {
    const l = localStorage.getItem(LANG_KEY);
    if (l && (LANGUAGES as readonly string[]).includes(l)) return l;
  } catch {
    // storage unavailable: fall through to the default
  }
  return 'sr';
}

i18n.use(initReactI18next).init({
  resources: { sr: { translation: sr }, en: { translation: en } },
  lng: savedLanguage(),
  fallbackLng: 'en',
  initAsync: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(LANG_KEY, lng);
  } catch {
    // ignore
  }
  if (typeof document !== 'undefined') document.documentElement.lang = lng;
});
if (typeof document !== 'undefined') document.documentElement.lang = i18n.language;

export default i18n;
