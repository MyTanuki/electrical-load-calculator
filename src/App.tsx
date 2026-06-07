import { useEffect, useMemo, useState } from 'react';

import LoadSchedule from './components/LoadSchedule';
import PrintReport from './components/PrintReport';
import ProjectSettings from './components/ProjectSettings';
import SaveLoadDialog from './components/SaveLoadDialog';
import StandardsReference from './components/StandardsReference';
import SummaryPanel from './components/SummaryPanel';
import Toolbar, { type ToolbarLabels } from './components/Toolbar';
import { calculateProject } from './domain/calculations';
import { legacyDefaultLoadScheduleToProject, type LegacyDefaultLoadSchedule } from './domain/defaultLoadSchedule';
import { createStarterProject } from './domain/presets';
import { loadDraft, parseImportedProject, saveDraft, serializeProject } from './domain/storage';
import type { ElectricalProject, Language } from './domain/types';
import { t } from './i18n/translations';

type AppTab = 'calculation' | 'standards';

interface InitialProjectState {
  project: ElectricalProject;
  shouldLoadDefault: boolean;
}

function loadInitialProjectState(): InitialProjectState {
  const draft = loadDraft();

  if (draft) {
    return { project: draft, shouldLoadDefault: false };
  }

  return { project: createStarterProject(), shouldLoadDefault: true };
}

async function loadPublicDefaultProject(): Promise<ElectricalProject | null> {
  try {
    const response = await fetch('/default-loadschedule.json');

    if (!response.ok) {
      return null;
    }

    const data: unknown = await response.json();

    return legacyDefaultLoadScheduleToProject(data as LegacyDefaultLoadSchedule);
  } catch {
    return null;
  }
}

function safeFilename(projectName: string): string {
  const normalized = projectName.trim().replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-');

  return normalized || 'electrical-load-project';
}

function App() {
  const [initialState] = useState<InitialProjectState>(loadInitialProjectState);
  const [project, setProject] = useState<ElectricalProject>(initialState.project);
  const [defaultLoadPending, setDefaultLoadPending] = useState(initialState.shouldLoadDefault);
  const [message, setMessage] = useState('');
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('calculation');
  const language = project.language;
  const calculation = useMemo(() => calculateProject(project), [project]);

  const labels: ToolbarLabels = {
    new: t(language, 'new'),
    save: t(language, 'save'),
    load: t(language, 'load'),
    importJson: t(language, 'importJson'),
    exportJson: t(language, 'exportJson'),
    printPdf: t(language, 'printPdf'),
  };
  const label = (key: string) => t(language, key);

  useEffect(() => {
    if (defaultLoadPending) {
      return;
    }

    saveDraft(project);
  }, [defaultLoadPending, project]);

  useEffect(() => {
    if (!initialState.shouldLoadDefault) {
      return;
    }

    let cancelled = false;

    async function loadDefault() {
      const defaultProject = await loadPublicDefaultProject();

      if (!cancelled && defaultProject) {
        setProject(defaultProject);
      }

      if (!cancelled) {
        setDefaultLoadPending(false);
      }
    }

    void loadDefault();

    return () => {
      cancelled = true;
    };
  }, [initialState.shouldLoadDefault]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeoutId = window.setTimeout(() => setMessage(''), 2500);

    return () => window.clearTimeout(timeoutId);
  }, [message]);

  function updateProject(updater: (currentProject: ElectricalProject) => ElectricalProject) {
    setProject((currentProject) => ({
      ...updater(currentProject),
      updatedAt: new Date().toISOString(),
    }));
  }

  function handleLanguageChange(nextLanguage: Language) {
    updateProject((currentProject) => ({ ...currentProject, language: nextLanguage }));
  }

  function handleNew() {
    setProject(createStarterProject());
    setMessage(t(language, 'new'));
  }

  function handleSave() {
    setShowSaveLoad(true);
  }

  function handleLoad() {
    setShowSaveLoad(true);
  }

  function handleLoadProject(savedProject: ElectricalProject) {
    setProject({
      ...savedProject,
      updatedAt: new Date().toISOString(),
    });
    setShowSaveLoad(false);
    setMessage(t(savedProject.language, 'load'));
  }

  async function handleImport(file: File) {
    const content = await file.text();
    const result = parseImportedProject(content);

    if (!result.ok) {
      setMessage(t(language, result.errorKey));
      return;
    }

    if (window.confirm(t(language, 'importJson'))) {
      setProject({
        ...result.project,
        updatedAt: new Date().toISOString(),
      });
      setMessage(t(result.project.language, 'importJson'));
    }
  }

  function handleExport() {
    const content = serializeProject(project);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${safeFilename(project.projectInfo.projectName)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <Toolbar
        language={language}
        title={t(language, 'appTitle')}
        labels={labels}
        onLanguageChange={handleLanguageChange}
        onNew={handleNew}
        onSave={handleSave}
        onLoad={handleLoad}
        onImport={handleImport}
        onExport={handleExport}
        onPrint={() => window.print()}
      />

      {message ? (
        <p className="status-message" role="status">
          {message}
        </p>
      ) : null}

      <nav className="app-tabs" role="tablist" aria-label={label('mainTabs')}>
        <button
          type="button"
          role="tab"
          id="calculation-tab"
          aria-controls="calculation-panel"
          aria-selected={activeTab === 'calculation'}
          className={activeTab === 'calculation' ? 'active' : undefined}
          onClick={() => setActiveTab('calculation')}
        >
          {label('calculationTab')}
        </button>
        <button
          type="button"
          role="tab"
          id="standards-tab"
          aria-controls="standards-panel"
          aria-selected={activeTab === 'standards'}
          className={activeTab === 'standards' ? 'active' : undefined}
          onClick={() => setActiveTab('standards')}
        >
          {label('standardsTab')}
        </button>
      </nav>

      {activeTab === 'calculation' ? (
        <section
          id="calculation-panel"
          className="workspace-grid"
          role="tabpanel"
          aria-labelledby="calculation-tab"
        >
          <ProjectSettings project={project} label={label} onChange={(nextProject) => updateProject(() => nextProject)} />

          <LoadSchedule project={project} label={label} onChange={(nextProject) => updateProject(() => nextProject)} />

          <SummaryPanel calculation={calculation} label={label} />
        </section>
      ) : (
        <section id="standards-panel" role="tabpanel" aria-labelledby="standards-tab">
          <StandardsReference label={label} />
        </section>
      )}

      <PrintReport project={project} calculation={calculation} label={label} />

      {showSaveLoad ? (
        <SaveLoadDialog
          project={project}
          label={label}
          onClose={() => setShowSaveLoad(false)}
          onLoadProject={handleLoadProject}
        />
      ) : null}
    </main>
  );
}

export default App;
