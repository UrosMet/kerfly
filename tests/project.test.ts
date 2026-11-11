import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/core/defaults';
import { addModule } from '../src/core/modules';
import { ProjectError, parseProject, parseProjectText, serializeProject } from '../src/core/project';
import type { Module } from '../src/core/types';

const modules = (): Module[] => ['base', 'drawer', 'wall', 'tall'].reduce<Module[]>((m, t, i) => addModule(m, t as Module['type'], `id${i}`), []);
const project = () => ({ settings: { ...DEFAULT_SETTINGS, wallLength: 3000, decor: { carcass: 'Hrast', front: 'Bela', hdf: '' } }, modules: modules() });
const bad = (data: unknown, path: string) => expect(() => parseProject(data)).toThrow(new ProjectError(path));

describe('project JSON', () => {
  it('round-trips through serialize/parse', () => {
    const p = project();
    expect(parseProjectText(serializeProject(p))).toEqual(p);
  });

  it('the file says what it is', () => {
    expect(JSON.parse(serializeProject(project()))).toMatchObject({ app: 'kerfly', version: 1 });
  });

  it('missing settings fields get defaults (older or partial files)', () => {
    const p = parseProject({ settings: { gap: 4, grain: { carcass: true }, sheet: { length: 2440 } }, modules: [] });
    expect(p.settings.gap).toBe(4);
    expect(p.settings.grain).toEqual({ carcass: true, front: false });
    expect(p.settings.sheet).toEqual({ length: 2440, width: 2070 });
    expect(p.settings.t).toBe(18);
  });

  it('missing module fields get the type defaults; order is renumbered', () => {
    const p = parseProject({ modules: [{ id: 'a', type: 'drawer', order: 7 }, { id: 'b', type: 'base', W: 450, order: 3 }] });
    expect(p.modules.find((m) => m.id === 'a')).toMatchObject({ W: 600, drawers: [237, 237, 237], order: 1, row: 'lower' });
    expect(p.modules.find((m) => m.id === 'b')).toMatchObject({ W: 450, order: 0 });
  });

  it('rejects things that are not a project', () => {
    bad(null, 'root');
    bad([], 'root');
    bad({}, 'root');
    bad({ app: 'other', settings: {} }, 'app');
    bad({ version: 2, settings: {} }, 'version');
    expect(() => parseProjectText('{nope')).toThrow(new ProjectError('json'));
  });

  it('rejects wrong types and out-of-range settings, naming the field', () => {
    bad({ settings: 5 }, 'settings');
    bad({ settings: { t: '18' } }, 'settings.t');
    bad({ settings: { t: 0 } }, 'settings.t');
    bad({ settings: { gap: -1 } }, 'settings.gap');
    bad({ settings: { units: 'cm' } }, 'settings.units');
    bad({ settings: { plinth: 'wood' } }, 'settings.plinth');
    bad({ settings: { subtractEdge: 'yes' } }, 'settings.subtractEdge');
    bad({ settings: { wallLength: 0 } }, 'settings.wallLength');
    bad({ settings: { sheet: { length: -5 } } }, 'settings.sheet.length');
    bad({ settings: { sheet: 7 } }, 'settings.sheet');
    bad({ settings: { decor: { front: 3 } } }, 'settings.decor.front');
    bad({ settings: { t: NaN } }, 'settings.t');
  });

  it('rejects bad modules, naming the index and field', () => {
    bad({ modules: 'x' }, 'modules');
    bad({ modules: [5] }, 'modules[0]');
    bad({ modules: [{ id: 'a', type: 'corner' }] }, 'modules[0].type');
    bad({ modules: [{ type: 'base' }] }, 'modules[0].id');
    bad({ modules: [{ id: '', type: 'base' }] }, 'modules[0].id');
    bad({ modules: [{ id: 'a', type: 'base' }, { id: 'a', type: 'base' }] }, 'modules[1].id');
    bad({ modules: [{ id: 'a', type: 'base', W: 0 }] }, 'modules[0].W');
    bad({ modules: [{ id: 'a', type: 'base', doors: 3 }] }, 'modules[0].doors');
    bad({ modules: [{ id: 'a', type: 'base', doors: 1.5 }] }, 'modules[0].doors');
    bad({ modules: [{ id: 'a', type: 'base', shelves: -1 }] }, 'modules[0].shelves');
    bad({ modules: [{ id: 'a', type: 'base', row: 'upper' }] }, 'modules[0].row');
    bad({ modules: [{ id: 'a', type: 'tall', row: 'upper' }] }, 'modules[0].row');
    bad({ modules: [{ id: 'a', type: 'drawer', drawers: [100, 'x'] }] }, 'modules[0].drawers');
    bad({ modules: [{ id: 'a', type: 'tall', doorSplitH: -1 }] }, 'modules[0].doorSplitH');
  });

  it('does not let extra keys through (prototype pollution, unknown fields)', () => {
    const p = parseProjectText('{"settings":{"__proto__":{"polluted":1},"extra":1},"modules":[{"id":"a","type":"base","evil":1}]}');
    expect(p.settings).not.toHaveProperty('extra');
    expect(p.modules[0]).not.toHaveProperty('evil');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
