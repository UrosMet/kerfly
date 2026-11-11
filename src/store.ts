import { create } from 'zustand';
import { DEFAULT_SETTINGS, MARKET_PRESETS } from './core/defaults';
import { assignBoardByName, DEFAULT_IDS, newBoard, pruneAutoBoards, withoutBoard } from './core/boards';
import { withoutHandle } from './core/handles';
import * as ops from './core/modules';
import { parseProject, type Project } from './core/project';
import type { Board, Market, Module, ModuleType, Settings } from './core/types';

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
  started: boolean; // false = landing page; not saved
  step: number; // 0..2 (settings, builder, report)
  setStarted: (started: boolean) => void;
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
  /** Sets a module's carcass or front board from a typed name; see assignBoardByName. */
  chooseBoard: (moduleId: string, kind: 'carcass' | 'front' | 'hdf', name: string) => void;
  /** Color of a board in the drawing; for the default boards it is stored in the settings. */
  setBoardColor: (id: string, color: string) => void;
  addHandle: () => void;
  updateHandle: (id: string, name: string) => void;
  /** Cabinets that used the handle go back to the project's default. */
  deleteHandle: (id: string) => void;
  addBoard: () => void;
  updateBoard: (id: string, patch: Partial<Board>) => void;
  /** Modules that used the board go back to the project default. */
  deleteBoard: (id: string) => void;
}

// crypto.randomUUID needs a secure context, so it is not used here.
let counter = 0;
const newId = () => `m${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const useStore = create<State>()((set) => ({
  ...loadProject(),
  started: false,
  step: 0,
  selectedId: null,
  setStarted: (started) => set({ started }),
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
  chooseBoard: (moduleId, kind, name) =>
    set((st) => assignBoardByName(st.settings, st.modules, moduleId, kind, name, newId())),
  setBoardColor: (id, color) =>
    set((st) =>
      DEFAULT_IDS.includes(id)
        ? { settings: { ...st.settings, decorColor: { ...st.settings.decorColor, [id]: color } } }
        : { settings: { ...st.settings, boards: st.settings.boards.map((b) => (b.id === id ? { ...b, color, auto: false } : b)) } },
    ),
  addHandle: () => set((st) => ({ settings: { ...st.settings, handles: [...st.settings.handles, { id: newId(), name: '' }] } })),
  updateHandle: (id, name) => set((st) => ({ settings: { ...st.settings, handles: st.settings.handles.map((h) => (h.id === id ? { ...h, name } : h)) } })),
  deleteHandle: (id) =>
    set((st) => ({
      settings: { ...st.settings, handles: st.settings.handles.filter((h) => h.id !== id), defaultHandle: st.settings.defaultHandle === id ? '' : st.settings.defaultHandle },
      modules: withoutHandle(st.modules, id),
    })),
  addBoard: () => set((st) => ({ settings: { ...st.settings, boards: [...st.settings.boards, newBoard(st.settings, newId())] } })),
  updateBoard: (id, patch) =>
    set((st) => ({ settings: { ...st.settings, boards: st.settings.boards.map((b) => (b.id === id ? { ...b, ...patch, auto: false } : b)) } })),
  deleteBoard: (id) =>
    set((st) => ({ settings: { ...st.settings, boards: st.settings.boards.filter((b) => b.id !== id) }, modules: withoutBoard(st.modules, id) })),
  deleteModule: (id) =>
    set((st) => {
      const modules = ops.deleteModule(st.modules, id);
      return { modules, settings: pruneAutoBoards(st.settings, modules), selectedId: st.selectedId === id ? null : st.selectedId };
    }),
}));

useStore.subscribe((st, prev) => {
  if (st.settings !== prev.settings || st.modules !== prev.modules) saveProject({ settings: st.settings, modules: st.modules });
});
