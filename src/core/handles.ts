import type { Module, Settings } from './types';

/** Value of Module.handle for a cabinet without handles (push to open, integrated). */
export const NO_HANDLES = 'none';

/**
 * The handle on a cabinet's fronts: null for none, otherwise its name ("" when the handle is the
 * unnamed default). A deleted or unknown id falls back to the project's default handle.
 */
export function handleNameOf(s: Settings, m: Module): string | null {
  if (m.handle === NO_HANDLES) return null;
  const find = (id: string | undefined) => s.handles.find((h) => h.id === id);
  return (find(m.handle) ?? find(s.defaultHandle))?.name.trim() ?? '';
}

/** Cabinets that used a handle go back to the project's default once it is deleted. */
export const withoutHandle = (modules: Module[], id: string): Module[] => modules.map((m) => (m.handle === id ? { ...m, handle: undefined } : m));
