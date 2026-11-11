import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../src/App';
import { DEFAULT_SETTINGS } from '../src/core/defaults';
import en from '../src/i18n/en.json';
import i18n from '../src/i18n';
import sr from '../src/i18n/sr.json';
import { useStore } from '../src/store';

const keys = (o: object, prefix = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

afterEach(async () => {
  await i18n.changeLanguage('sr');
  useStore.setState({ settings: DEFAULT_SETTINGS, step: 0 });
});

describe('i18n', () => {
  it('sr and en have exactly the same keys', () => {
    expect(keys(sr).sort()).toEqual(keys(en).sort());
  });
});

describe('App', () => {
  it('renders header, 4 steps and the settings step in Serbian by default', () => {
    const html = renderToString(<App />);
    for (const w of ['Kerfly', 'Podešavanja', 'Sastavljanje', 'Potvrda', 'Izveštaj', 'Tržište', 'Dekor korpusa', 'Dužina zida']) {
      expect(html).toContain(w);
    }
  });

  it('switches to English', async () => {
    await i18n.changeLanguage('en');
    const html = renderToString(<App />);
    for (const w of ['Settings', 'Builder', 'Confirm', 'Report', 'Market', 'Carcass decor', 'Wall length']) {
      expect(html).toContain(w);
    }
    expect(html).not.toContain('Tržište');
  });
});
