import type { ElectricalProject, LoadPreset, LoadRow, ProjectInfo, SystemSettings } from './types';

export type ImportErrorKey = 'error.invalidJson' | 'error.unsupportedSchema' | 'error.invalidProject';

export type ImportedProjectResult =
  | { ok: true; project: ElectricalProject }
  | { ok: false; errorKey: ImportErrorKey };

export interface SavedProjectSummary {
  id: string;
  name: string;
  projectName: string;
  updatedAt: string;
}

const STORAGE_PREFIX = 'electrical-load-calculator';
const DRAFT_KEY = `${STORAGE_PREFIX}:draft`;
const SAVED_PROJECTS_INDEX_KEY = `${STORAGE_PREFIX}:saved-projects`;

function namedProjectKey(id: string): string {
  return `${STORAGE_PREFIX}:project:${id}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isProjectInfo(value: unknown): value is ProjectInfo {
  return (
    isRecord(value) &&
    isString(value.projectName) &&
    isString(value.location) &&
    isString(value.preparedBy) &&
    isString(value.date)
  );
}

function isSystemSettings(value: unknown): value is SystemSettings {
  return (
    isRecord(value) &&
    isNumber(value.voltageSinglePhase) &&
    isNumber(value.voltageThreePhase) &&
    isNumber(value.defaultDemandFactor) &&
    isNumber(value.unbalanceWarningPercent)
  );
}

function isLoadPreset(value: unknown): value is LoadPreset {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.labelKey) &&
    (isNumber(value.defaultVaPerUnit) || value.defaultVaPerUnit === null) &&
    isNumber(value.defaultDemandFactor) &&
    isString(value.defaultBreaker) &&
    isString(value.defaultWireSize)
  );
}

function isLoadRow(value: unknown): value is LoadRow {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.circuitNo) &&
    isString(value.description) &&
    isString(value.loadTypeId) &&
    (value.phaseMode === 'single' || value.phaseMode === 'three') &&
    (value.phase === 'L1' || value.phase === 'L2' || value.phase === 'L3') &&
    isNumber(value.quantity) &&
    isNumber(value.vaPerUnit) &&
    isNumber(value.demandFactor) &&
    isNumber(value.voltage) &&
    isString(value.breaker) &&
    isString(value.wireSize) &&
    isString(value.notes)
  );
}

function isElectricalProject(value: unknown): value is ElectricalProject {
  return (
    isRecord(value) &&
    value.schemaVersion === 1 &&
    (value.language === 'en' || value.language === 'th') &&
    isProjectInfo(value.projectInfo) &&
    isSystemSettings(value.systemSettings) &&
    Array.isArray(value.presets) &&
    value.presets.every(isLoadPreset) &&
    Array.isArray(value.rows) &&
    value.rows.every(isLoadRow) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function readProject(key: string): ElectricalProject | null {
  const content = localStorage.getItem(key);

  if (content === null) {
    return null;
  }

  const result = parseImportedProject(content);

  return result.ok ? result.project : null;
}

function readSavedProjectSummaries(): SavedProjectSummary[] {
  const content = localStorage.getItem(SAVED_PROJECTS_INDEX_KEY);

  if (content === null) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(content);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (summary): summary is SavedProjectSummary =>
        isRecord(summary) &&
        isString(summary.id) &&
        isString(summary.name) &&
        isString(summary.projectName) &&
        isString(summary.updatedAt),
    );
  } catch {
    return [];
  }
}

function writeSavedProjectSummaries(summaries: SavedProjectSummary[]): void {
  localStorage.setItem(SAVED_PROJECTS_INDEX_KEY, JSON.stringify(summaries, null, 2));
}

export function serializeProject(project: ElectricalProject): string {
  return `${JSON.stringify(project, null, 2)}\n`;
}

export function parseImportedProject(content: string): ImportedProjectResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    return { ok: false, errorKey: 'error.invalidJson' };
  }

  if (!isRecord(parsed) || parsed.schemaVersion !== 1) {
    return { ok: false, errorKey: 'error.unsupportedSchema' };
  }

  if (!isElectricalProject(parsed)) {
    return { ok: false, errorKey: 'error.invalidProject' };
  }

  return { ok: true, project: parsed };
}

export function saveDraft(project: ElectricalProject): void {
  localStorage.setItem(DRAFT_KEY, serializeProject(project));
}

export function loadDraft(): ElectricalProject | null {
  return readProject(DRAFT_KEY);
}

export function saveNamedProject(id: string, name: string, project: ElectricalProject): void {
  localStorage.setItem(namedProjectKey(id), serializeProject(project));

  const summaries = readSavedProjectSummaries().filter((summary) => summary.id !== id);
  summaries.push({
    id,
    name,
    projectName: project.projectInfo.projectName,
    updatedAt: project.updatedAt,
  });

  writeSavedProjectSummaries(sortSavedProjectSummaries(summaries));
}

export function listSavedProjects(): SavedProjectSummary[] {
  return sortSavedProjectSummaries(readSavedProjectSummaries());
}

export function loadNamedProject(id: string): ElectricalProject | null {
  return readProject(namedProjectKey(id));
}

export function deleteNamedProject(id: string): void {
  localStorage.removeItem(namedProjectKey(id));
  writeSavedProjectSummaries(readSavedProjectSummaries().filter((summary) => summary.id !== id));
}

function sortSavedProjectSummaries(summaries: SavedProjectSummary[]): SavedProjectSummary[] {
  return [...summaries].sort((left, right) => {
    const updatedAtComparison = right.updatedAt.localeCompare(left.updatedAt);

    return updatedAtComparison === 0 ? left.id.localeCompare(right.id) : updatedAtComparison;
  });
}
