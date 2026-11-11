import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/core/defaults';
import { loadProject, useStore } from '../src/store';

let data: Map<string, string>;
beforeEach(() => {
  data = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  });
  useStore.setState({ settings: DEFAULT_SETTINGS, modules: [], step: 0 });
});
afterEach(() => vi.unstubAllGlobals());

describe('store', () => {
  it('setMarket applies the preset and keeps the other settings', () => {
    useStore.getState().setSettings({ decor: { carcass: 'Hrast', front: 'Bela' }, gap: 2 });
    useStore.getState().setMarket('us');
    const s = useStore.getState().settings;
    expect([s.market, s.units, s.sheet.length, s.sheet.width, s.hdfSheet.length, s.t]).toEqual(['us', 'in', 2440, 1220, 2440, 18]);
    expect(s.decor).toEqual({ carcass: 'Hrast', front: 'Bela' });
    expect(s.gap).toBe(2);
    useStore.getState().setMarket('eu');
    expect(useStore.getState().settings.sheet).toEqual({ length: 2800, width: 2070 });
  });

  it('saves on change and loads it back', () => {
    useStore.getState().setSettings({ gap: 5, wallLength: 3000 });
    useStore.getState().setStep(2); // not part of the saved project
    const loaded = loadProject();
    expect(loaded.settings.gap).toBe(5);
    expect(loaded.settings.wallLength).toBe(3000);
    expect(JSON.parse(data.get('kerfly.project')!)).not.toHaveProperty('step');
  });

  it('fills settings missing from an older save with defaults', () => {
    data.set('kerfly.project', JSON.stringify({ settings: { gap: 4, grain: { carcass: true } }, modules: [] }));
    const s = loadProject().settings;
    expect(s.gap).toBe(4);
    expect(s.grain).toEqual({ carcass: true, front: false });
    expect(s.sheet).toEqual(DEFAULT_SETTINGS.sheet);
  });

  it('bad JSON, wrong shapes or no storage give the defaults', () => {
    data.set('kerfly.project', '{not json');
    expect(loadProject().settings).toEqual(DEFAULT_SETTINGS);
    data.set('kerfly.project', 'null');
    expect(loadProject()).toEqual({ settings: DEFAULT_SETTINGS, modules: [] });
    data.set('kerfly.project', JSON.stringify({ modules: 'x' }));
    expect(loadProject().modules).toEqual([]);
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
    });
    expect(loadProject().settings).toEqual(DEFAULT_SETTINGS);
  });

  it('a failing setItem does not break the app', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    });
    expect(() => useStore.getState().setSettings({ gap: 6 })).not.toThrow();
    expect(useStore.getState().settings.gap).toBe(6);
  });
});
