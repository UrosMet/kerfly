import { create } from 'zustand';
import { DEFAULT_SETTINGS, MARKET_PRESETS } from './core/defaults';
import * as ops from './core/modules';
import { parseProject, type Project } from './core/project';
import type { Market, Module, ModuleType, Settings } from './core/types';

const KEY = 'kerfly.project';

export type { Project };

/** Reads the saved project; any problem (no storage, bad data) gives the defaults. */
export function loadProject(): Project {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return parseProject(JSON.parse(raw));
  } catch {
    // fall through to the defaults
  }
  return { settings: DEFAULT_SETTINGS, modules: [] };
}

export function saveProject(p: Project): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage full or blocked: the app keeps working in memory
  }
}

interface State extends Project {
  step: number; // 0..3
  selectedId: string | null; // builder selection, not saved
  setStep: (step: number) => void;
  setSettings: (patch: Partial<Settings>) => void;
  /** Applies the market preset (units, sheets, thickness); other settings are kept. */
  setMarket: (market: Market) => void;
  setModules: (modules: Module[]) => void;
  /** Replaces the whole project (import). */
  setProject: (project: Project) => void;
  select: (id: string | null) => void;
  addModule: (type: ModuleType) => void;
  updateModule: (id: string, patch: Partial<Module>) => void;
  moveModule: (id: string, dir: -1 | 1) => void;
  duplicateModule: (id: string) => void;
  deleteModule: (id: string) => void;
}

// crypto.randomUUID needs a secure context, so it is not used here.
let counter = 0;
const newId = () => `m${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const useStore = create<State>()((set) => ({
  ...loadProject(),
  step: 0,
  selectedId: null,
  setStep: (step) => set({ step }),
  setSettings: (patch) => set((st) => ({ settings: { ...st.settings, ...patch } })),
  setMarket: (market) => set((st) => ({ settings: { ...st.settings, ...MARKET_PRESETS[market] } })),
  setModules: (modules) => set({ modules }),
  setProject: (p) => set({ settings: p.settings, modules: p.modules, selectedId: null }),
  select: (selectedId) => set({ selectedId }),
  addModule: (type) =>
    set((st) => {
      const id = newId();
      return { modules: ops.addModule(st.modules, type, id), selectedId: id };
    }),
  updateModule: (id, patch) => set((st) => ({ modules: ops.updateModule(st.modules, id, patch) })),
  moveModule: (id, dir) => set((st) => ({ modules: ops.moveModule(st.modules, id, dir) })),
  duplicateModule: (id) =>
    set((st) => {
      const copy = newId();
      return { modules: ops.duplicateModule(st.modules, id, copy), selectedId: copy };
    }),
  deleteModule: (id) =>
    set((st) => ({ modules: ops.deleteModule(st.modules, id), selectedId: st.selectedId === id ? null : st.selectedId })),
}));

useStore.subscribe((st, prev) => {
  if (st.settings !== prev.settings || st.modules !== prev.modules) saveProject({ settings: st.settings, modules: st.modules });
});
