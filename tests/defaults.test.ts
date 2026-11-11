import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, MODULE_DEFAULTS, settingsForMarket } from '../src/core/defaults';

describe('defaults', () => {
  it('market presets', () => {
    const eu = settingsForMarket('eu');
    expect([eu.sheet.length, eu.sheet.width, eu.t, eu.units]).toEqual([2800, 2070, 18, 'mm']);
    for (const m of ['us', 'uk'] as const) {
      const s = settingsForMarket(m);
      expect([s.sheet.length, s.sheet.width, s.t, s.market]).toEqual([2440, 1220, 18, m]);
    }
    expect(settingsForMarket('us').units).toBe('in');
  });

  it('drawer default fronts fill the module height', () => {
    const d = MODULE_DEFAULTS.drawer;
    const sum = d.drawers!.reduce((a, b) => a + b, 0) + d.drawers!.length * DEFAULT_SETTINGS.gap;
    expect(sum).toBe(d.H);
  });

  it('module dimensions match the table', () => {
    const dims = Object.values(MODULE_DEFAULTS).map((m) => [m.type, m.W, m.H, m.D]);
    expect(dims).toEqual([
      ['base', 600, 720, 560],
      ['drawer', 600, 720, 560],
      ['sink', 800, 720, 560],
      ['wall', 600, 720, 320],
      ['tall', 600, 2100, 560],
    ]);
  });
});
