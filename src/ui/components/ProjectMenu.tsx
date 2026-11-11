import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProjectError, parseProjectText, serializeProject } from '../../core/project';
import { useStore } from '../../store';
import { downloadText, readText } from '../format';

/** A small menu for exporting and importing the whole project (settings + cabinets) as a JSON file. */
export default function ProjectMenu() {
  const { t } = useTranslation();
  const menu = useRef<HTMLDetailsElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (menu.current) menu.current.open = false;
  };

  // closes on a tap outside the menu and on Escape
  useEffect(() => {
    const outside = (e: Event) => {
      if (menu.current?.open && !menu.current.contains(e.target as Node)) close();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  const exportProject = () => {
    const { settings, modules } = useStore.getState();
    downloadText('kerfly-project.json', serializeProject({ settings, modules }), 'application/json');
    close();
  };

  const importProject = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const project = parseProjectText(await readText(file));
      if (useStore.getState().modules.length > 0 && !window.confirm(t('project.confirmReplace'))) return;
      useStore.getState().setProject(project);
      close();
    } catch (e) {
      setError(t('project.importError', { detail: e instanceof ProjectError ? e.message : String(e) }));
    } finally {
      if (fileInput.current) fileInput.current.value = ''; // allow importing the same file again
    }
  };

  return (
    <>
      <details className="project-menu" ref={menu}>
        <summary aria-label={t('project.menu')} title={t('project.menu')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
          </svg>
          <span className="menu-label">{t('project.menu')}</span>
        </summary>
        <div className="project-panel">
          <button type="button" onClick={exportProject}>
            {t('project.export')}
          </button>
          <button type="button" onClick={() => fileInput.current?.click()}>
            {t('project.import')}
          </button>
          <input
            ref={fileInput}
            data-testid="import-input"
            type="file"
            accept=".json,application/json"
            hidden
            tabIndex={-1}
            onChange={(e) => importProject(e.target.files?.[0])}
          />
        </div>
      </details>
      {error && (
        <p role="alert" className="import-error">
          {error}
        </p>
      )}
    </>
  );
}
