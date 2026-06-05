import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStarterProject } from './presets';
import {
  deleteNamedProject,
  listSavedProjects,
  loadDraft,
  loadNamedProject,
  parseImportedProject,
  saveDraft,
  saveNamedProject,
  serializeProject,
} from './storage';
import type { ElectricalProject } from './types';

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

describe('domain storage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('serializes and parses a valid schema version 1 project', () => {
    const original = project();
    const content = serializeProject(original);

    expect(content).toBe(`${JSON.stringify(original, null, 2)}\n`);

    const result = parseImportedProject(content);

    expect(result).toEqual({ ok: true, project: original });
  });

  it('rejects malformed JSON', () => {
    expect(parseImportedProject('{bad json')).toEqual({
      ok: false,
      errorKey: 'error.invalidJson',
    });
  });

  it('rejects unsupported schema versions', () => {
    expect(parseImportedProject(JSON.stringify({ ...project(), schemaVersion: 2 }))).toEqual({
      ok: false,
      errorKey: 'error.unsupportedSchema',
    });
  });

  it('rejects schema version 1 objects missing required arrays', () => {
    const missingArrays = { ...project(), presets: undefined, rows: undefined };

    expect(parseImportedProject(JSON.stringify(missingArrays))).toEqual({
      ok: false,
      errorKey: 'error.invalidProject',
    });
  });

  it('saves and loads the draft project', () => {
    const original = project();

    saveDraft(original);

    expect(loadDraft()).toEqual(original);
  });

  it('returns null when stored draft data is invalid', () => {
    localStorage.setItem('electrical-load-calculator:draft', '{bad json');

    expect(loadDraft()).toBeNull();
  });

  it('saves, lists, loads, and deletes named projects', () => {
    const first = project({ updatedAt: '2026-06-05T06:15:30.000Z' });
    const second = project({
      projectInfo: { ...project().projectInfo, projectName: 'Warehouse' },
      updatedAt: '2026-06-06T06:15:30.000Z',
    });

    saveNamedProject('main', 'Main saved file', first);
    saveNamedProject('warehouse', 'Warehouse saved file', second);

    expect(listSavedProjects()).toEqual([
      {
        id: 'warehouse',
        name: 'Warehouse saved file',
        projectName: 'Warehouse',
        updatedAt: '2026-06-06T06:15:30.000Z',
      },
      {
        id: 'main',
        name: 'Main saved file',
        projectName: 'Main Office',
        updatedAt: '2026-06-05T06:15:30.000Z',
      },
    ]);
    expect(loadNamedProject('main')).toEqual(first);

    deleteNamedProject('main');

    expect(loadNamedProject('main')).toBeNull();
    expect(listSavedProjects()).toHaveLength(1);
  });

  it('returns safe fallbacks when localStorage getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });

    expect(loadDraft()).toBeNull();
    expect(listSavedProjects()).toEqual([]);
    expect(loadNamedProject('main')).toBeNull();
  });

  it('does not throw when localStorage setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(() => saveDraft(project())).not.toThrow();
    expect(() => saveNamedProject('main', 'Main saved file', project())).not.toThrow();
  });

  it('does not throw when named project index reads fail during writes', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });

    expect(() => saveNamedProject('main', 'Main saved file', project())).not.toThrow();
    expect(() => deleteNamedProject('main')).not.toThrow();
  });

  it('does not throw when deleting named projects and localStorage writes fail', () => {
    saveNamedProject('main', 'Main saved file', project());

    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(() => deleteNamedProject('main')).not.toThrow();
  });
});
