import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SaveLoadDialog from './SaveLoadDialog';
import { createStarterProject } from '../domain/presets';
import { listSavedProjects, loadNamedProject, saveNamedProject } from '../domain/storage';
import type { ElectricalProject } from '../domain/types';

const label = (key: string) =>
  ({
    close: 'Close',
    delete: 'Delete',
    load: 'Load',
    modified: 'Modified',
    projectName: 'Project name',
    save: 'Save',
    saveLoad: 'Save / Load',
    saveName: 'Save name',
    savedProjects: 'Saved projects',
    untitledProject: 'Untitled project',
  })[key] ?? key;

function project(overrides: Partial<ElectricalProject> = {}): ElectricalProject {
  return {
    ...createStarterProject(new Date('2026-06-05T06:15:30.000Z')),
    projectInfo: {
      projectName: 'Main Office',
      location: 'Bangkok',
      preparedBy: 'Engineering',
      date: '2026-06-05',
    },
    ...overrides,
  };
}

describe('SaveLoadDialog', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('saves, refreshes, loads, deletes, and closes named projects', () => {
    vi.setSystemTime(new Date('2026-06-05T07:00:00.000Z'));
    const currentProject = project({ updatedAt: '2026-06-05T06:15:30.000Z' });
    const savedProject = project({
      projectInfo: { ...currentProject.projectInfo, projectName: '' },
      updatedAt: '2026-06-04T05:00:00.000Z',
    });
    const onLoadProject = vi.fn<(project: ElectricalProject) => void>();
    const onClose = vi.fn();

    saveNamedProject('existing', 'Existing save', savedProject);

    render(
      <SaveLoadDialog
        project={currentProject}
        label={label}
        onClose={onClose}
        onLoadProject={onLoadProject}
      />,
    );

    expect((screen.getByLabelText('Save name') as HTMLInputElement).value).toBe('Main Office');
    expect(screen.getByText('Existing save')).toBeTruthy();
    expect(screen.getByText('Untitled project')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Save name'), { target: { value: 'Current snapshot' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(listSavedProjects()[0]).toMatchObject({
      id: 'save-1780642800000',
      name: 'Current snapshot',
      projectName: 'Main Office',
      updatedAt: '2026-06-05T06:15:30.000Z',
    });
    expect(loadNamedProject('save-1780642800000')).toEqual(currentProject);
    expect(screen.getByText('Current snapshot')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: 'Load' })[1]);
    expect(onLoadProject).toHaveBeenCalledWith(savedProject);

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[1]);
    expect(loadNamedProject('existing')).toBeNull();
    expect(screen.queryByText('Existing save')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
