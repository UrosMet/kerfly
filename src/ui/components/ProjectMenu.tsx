import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProjectError, parseProjectText, serializeProject } from '../../core/project';
import { useStore } from '../../store';
import { downloadText, readText } from '../format';

/** Export / import of the whole project (settings + modules) as a JSON file. */
export default function ProjectMenu() {
  const { t } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const exportProject = () => {
    const { settings, modules } = useStore.getState();
    downloadText('kerfly-project.json', serializeProject({ settings, modules }), 'application/json');
  };

  const importProject = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const project = parseProjectText(await readText(file));
      if (useStore.getState().modules.length > 0 && !window.confirm(t('project.confirmReplace'))) return;
      useStore.getState().setProject(project);
    } catch (e) {
      setError(t('project.importError', { detail: e instanceof ProjectError ? e.message : String(e) }));
    } finally {
      if (fileInput.current) fileInput.current.value = ''; // allow importing the same file again
    }
  };

  return (
    <div className="project-menu">
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
      {error && <p role="alert" className="import-error">{error}</p>}
    </div>
  );
}
