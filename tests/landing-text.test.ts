import { describe, expect, it } from 'vitest';
import en from '../src/i18n/en.json';
import sr from '../src/i18n/sr.json';

describe('landing copy', () => {
  it('is addressed to cabinet makers only', () => {
    expect(sr.landing.eyebrow).toBe('Planer kuhinje za majstore');
    expect(en.landing.eyebrow).toBe('Kitchen planner for cabinet makers');
    const all = JSON.stringify([sr.landing, en.landing]).toLowerCase();
    expect(all).not.toMatch(/domaćin|diy/);
  });
});
