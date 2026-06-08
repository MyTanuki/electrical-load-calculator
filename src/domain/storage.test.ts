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

  it('serializes and parses a valid current-schema project', () => {
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
    expect(parseImportedProject(JSON.stringify({ ...project(), schemaVersion: 99 }))).toEqual({
      ok: false,
      errorKey: 'error.unsupportedSchema',
    });
  });

  it('migrates a legacy schema version 1 project to the current schema', () => {
    const current = project();
    const legacy = {
      ...current,
      schemaVersion: 1,
      systemSettings: {
        voltageSinglePhase: 230,
        voltageThreePhase: 400,
        defaultDemandFactor: 1,
        unbalanceWarningPercent: 15,
      },
      presets: current.presets.map(
        ({ defaultPowerFactor: _pf, defaultContinuous: _c, isMotor: _m, ...rest }) => rest,
      ),
      rows: current.rows.map(
        ({ inputUnit: _u, powerFactor: _pf, lengthM: _l, continuous: _c, isMotor: _m, groundSize: _g, ...rest }) => rest,
      ),
    };

    const result = parseImportedProject(JSON.stringify(legacy));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.schemaVersion).toBe(2);
      expect(result.project.systemSettings.installationMethod).toBe('conduit_wall');
      expect(result.project.systemSettings.ambientTempC).toBe(40);
      expect(result.project.systemSettings.feederDemandFactor).toBe(1);
      expect(result.project.rows[0].inputUnit).toBe('VA');
      expect(result.project.rows[0].powerFactor).toBe(1);
      expect(result.project.rows[0].continuous).toBe(false);
      expect(result.project.rows[0].groundSize).toBe('');
    }
  });

  it('rejects schema version objects missing required arrays', () => {
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
