import type {
  ElectricalProject,
  InstallationMethod,
  LoadInputUnit,
  LoadPreset,
  LoadRow,
  ProjectInfo,
  SystemSettings,
} from './types';
import { INSTALLATION_METHODS } from './standards';

/** Latest schema version produced by this app. */
const CURRENT_SCHEMA_VERSION = 2 as const;
/** Schema versions this app can read (older ones are migrated forward). */
const SUPPORTED_SCHEMA_VERSIONS = [1, 2];

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

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked or full; callers treat persistence as best effort.
  }
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage can be blocked; delete operations are best effort.
  }
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
    (value.inputUnit === undefined || value.inputUnit === 'VA' || value.inputUnit === 'W') &&
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
    typeof value.schemaVersion === 'number' &&
    SUPPORTED_SCHEMA_VERSIONS.includes(value.schemaVersion) &&
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

function numberOr(value: unknown, fallback: number): number {
  return isNumber(value) ? value : fallback;
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function stringOr(value: unknown, fallback: string): string {
  return isString(value) ? value : fallback;
}

function installationMethodOr(value: unknown, fallback: InstallationMethod): InstallationMethod {
  return INSTALLATION_METHODS.includes(value as InstallationMethod)
    ? (value as InstallationMethod)
    : fallback;
}

function loadInputUnitOr(value: unknown, fallback: LoadInputUnit): LoadInputUnit {
  return value === 'VA' || value === 'W' ? value : fallback;
}

/**
 * Fill any fields added after schema v1 with sensible defaults so older saved
 * projects keep working, then stamp the current schema version.
 */
function migrateProject(project: ElectricalProject): ElectricalProject {
  const raw = project as unknown as Record<string, unknown>;
  const rawSettings = (raw.systemSettings ?? {}) as Record<string, unknown>;

  const systemSettings: SystemSettings = {
    voltageSinglePhase: project.systemSettings.voltageSinglePhase,
    voltageThreePhase: project.systemSettings.voltageThreePhase,
    defaultDemandFactor: project.systemSettings.defaultDemandFactor,
    unbalanceWarningPercent: project.systemSettings.unbalanceWarningPercent,
    installationMethod: installationMethodOr(rawSettings.installationMethod, 'conduit_wall'),
    ambientTempC: numberOr(rawSettings.ambientTempC, 40),
    conductorsInGroup: numberOr(rawSettings.conductorsInGroup, 1),
    branchVoltageDropLimitPercent: numberOr(rawSettings.branchVoltageDropLimitPercent, 3),
    totalVoltageDropLimitPercent: numberOr(rawSettings.totalVoltageDropLimitPercent, 5),
    feederDemandFactor: numberOr(rawSettings.feederDemandFactor, 1),
  };

  const presets: LoadPreset[] = project.presets.map((preset) => {
    const rawPreset = preset as unknown as Record<string, unknown>;
    return {
      ...preset,
      defaultPowerFactor: numberOr(rawPreset.defaultPowerFactor, 1),
      defaultContinuous: booleanOr(rawPreset.defaultContinuous, false),
      isMotor: booleanOr(rawPreset.isMotor, false),
    };
  });

  const rows: LoadRow[] = project.rows.map((row) => {
    const rawRow = row as unknown as Record<string, unknown>;
    return {
      ...row,
      inputUnit: loadInputUnitOr(rawRow.inputUnit, 'VA'),
      powerFactor: numberOr(rawRow.powerFactor, 1),
      lengthM: numberOr(rawRow.lengthM, 0),
      continuous: booleanOr(rawRow.continuous, false),
      isMotor: booleanOr(rawRow.isMotor, false),
      groundSize: stringOr(rawRow.groundSize, ''),
    };
  });

  return {
    ...project,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    systemSettings,
    presets,
    rows,
  };
}

function readProject(key: string): ElectricalProject | null {
  const content = safeGetItem(key);

  if (content === null) {
    return null;
  }

  const result = parseImportedProject(content);

  return result.ok ? result.project : null;
}

function readSavedProjectSummaries(): SavedProjectSummary[] {
  const content = safeGetItem(SAVED_PROJECTS_INDEX_KEY);

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
  safeSetItem(SAVED_PROJECTS_INDEX_KEY, JSON.stringify(summaries, null, 2));
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

  if (
    !isRecord(parsed) ||
    typeof parsed.schemaVersion !== 'number' ||
    !SUPPORTED_SCHEMA_VERSIONS.includes(parsed.schemaVersion)
  ) {
    return { ok: false, errorKey: 'error.unsupportedSchema' };
  }

  if (!isElectricalProject(parsed)) {
    return { ok: false, errorKey: 'error.invalidProject' };
  }

  return { ok: true, project: migrateProject(parsed) };
}

export function saveDraft(project: ElectricalProject): void {
  safeSetItem(DRAFT_KEY, serializeProject(project));
}

export function loadDraft(): ElectricalProject | null {
  return readProject(DRAFT_KEY);
}

export function saveNamedProject(id: string, name: string, project: ElectricalProject): void {
  safeSetItem(namedProjectKey(id), serializeProject(project));

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
  safeRemoveItem(namedProjectKey(id));
  writeSavedProjectSummaries(readSavedProjectSummaries().filter((summary) => summary.id !== id));
}

function sortSavedProjectSummaries(summaries: SavedProjectSummary[]): SavedProjectSummary[] {
  return [...summaries].sort((left, right) => {
    const updatedAtComparison = right.updatedAt.localeCompare(left.updatedAt);

    return updatedAtComparison === 0 ? left.id.localeCompare(right.id) : updatedAtComparison;
  });
}
