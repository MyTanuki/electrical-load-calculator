import { useMemo, useState } from 'react';

import {
  deleteNamedProject,
  listSavedProjects,
  loadNamedProject,
  saveNamedProject,
  type SavedProjectSummary,
} from '../domain/storage';
import type { ElectricalProject } from '../domain/types';

interface SaveLoadDialogProps {
  project: ElectricalProject;
  label: (key: string) => string;
  onClose: () => void;
  onLoadProject: (project: ElectricalProject) => void;
}

function fallbackLabel(label: (key: string) => string, key: string, fallback: string): string {
  const translated = label(key);

  return translated === key ? fallback : translated;
}

function formatModifiedAt(updatedAt: string): string {
  const modifiedAt = new Date(updatedAt);

  return Number.isNaN(modifiedAt.getTime()) ? updatedAt : modifiedAt.toLocaleString();
}

function SaveLoadDialog({ project, label, onClose, onLoadProject }: SaveLoadDialogProps) {
  const untitledProject = useMemo(() => fallbackLabel(label, 'untitledProject', 'Untitled project'), [label]);
  const initialSaveName = project.projectInfo.projectName.trim() || untitledProject;
  const [saveName, setSaveName] = useState(initialSaveName);
  const [savedProjects, setSavedProjects] = useState<SavedProjectSummary[]>(() => listSavedProjects());

  function refreshSavedProjects() {
    setSavedProjects(listSavedProjects());
  }

  function handleSave() {
    const trimmedSaveName = saveName.trim();

    saveNamedProject(`save-${Date.now()}`, trimmedSaveName || untitledProject, project);
    refreshSavedProjects();
  }

  function handleLoad(id: string) {
    const savedProject = loadNamedProject(id);

    if (savedProject) {
      onLoadProject(savedProject);
    }
  }

  function handleDelete(id: string) {
    deleteNamedProject(id);
    refreshSavedProjects();
  }

  return (
    <div className="modal-overlay" role="presentation">
      <section className="save-load-dialog" role="dialog" aria-modal="true" aria-labelledby="save-load-title">
        <header className="dialog-header">
          <h2 id="save-load-title">{fallbackLabel(label, 'saveLoad', 'Save / Load')}</h2>
          <button type="button" onClick={onClose}>
            {fallbackLabel(label, 'close', 'Close')}
          </button>
        </header>

        <form
          className="save-form"
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
        >
          <label>
            {fallbackLabel(label, 'saveName', 'Save name')}
            <input value={saveName} onChange={(event) => setSaveName(event.currentTarget.value)} />
          </label>
          <button type="submit">{label('save')}</button>
        </form>

        <section>
          <h3>{fallbackLabel(label, 'savedProjects', 'Saved projects')}</h3>
          <ul className="saved-project-list">
            {savedProjects.map((savedProject) => (
              <li key={savedProject.id} className="saved-project-item">
                <div>
                  <strong>{savedProject.name}</strong>
                  <span>{savedProject.projectName.trim() || untitledProject}</span>
                  <time dateTime={savedProject.updatedAt}>
                    {fallbackLabel(label, 'modified', 'Modified')}: {formatModifiedAt(savedProject.updatedAt)}
                  </time>
                </div>
                <div className="saved-project-actions">
                  <button type="button" onClick={() => handleLoad(savedProject.id)}>
                    {label('load')}
                  </button>
                  <button type="button" onClick={() => handleDelete(savedProject.id)}>
                    {label('delete')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </div>
  );
}

export default SaveLoadDialog;
