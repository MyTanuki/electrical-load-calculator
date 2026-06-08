import { createStarterProject } from './presets';
import type { ElectricalProject, LoadInputUnit, LoadRow, Phase } from './types';

interface LegacyDefaultCircuit {
  id?: number | string;
  desc?: string;
  va?: number;
  inputUnit?: string;
  phase?: string;
  cb?: string;
  wire?: string;
  gnd?: string;
  pf?: number;
  length?: number;
  continuous?: boolean;
}

export interface LegacyDefaultLoadSchedule {
  project?: string;
  panel?: string;
  system?: string;
  designer?: string;
  meter?: string;
  circuits?: LegacyDefaultCircuit[];
}

function phaseOrDefault(value: string | undefined): Phase {
  return value === 'L2' || value === 'L3' ? value : 'L1';
}

function inputUnitOrDefault(value: string | undefined): LoadInputUnit {
  return value === 'W' ? 'W' : 'VA';
}

function loadTypeFromDescription(description: string): string {
  const normalized = description.toLowerCase();

  if (normalized.includes('lighting')) return 'lighting';
  if (normalized.includes('receptacle') || normalized.includes('socket')) return 'socket';
  return 'general';
}

function formatBreaker(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';

  return trimmed ? `${trimmed} A` : '';
}

function formatWireSize(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';

  return trimmed ? `${trimmed} sq.mm` : '';
}

function circuitToRow(circuit: LegacyDefaultCircuit, index: number): LoadRow {
  const description = circuit.desc?.trim() ?? '';
  const va = Number.isFinite(circuit.va) ? Number(circuit.va) : 0;

  return {
    id: `default-${circuit.id ?? index + 1}`,
    circuitNo: String(circuit.id ?? index + 1),
    description,
    loadTypeId: loadTypeFromDescription(description),
    phaseMode: 'single',
    phase: phaseOrDefault(circuit.phase),
    quantity: 1,
    vaPerUnit: va,
    inputUnit: inputUnitOrDefault(circuit.inputUnit),
    demandFactor: 1,
    voltage: 230,
    breaker: formatBreaker(circuit.cb),
    wireSize: formatWireSize(circuit.wire),
    notes: '',
    powerFactor: Number.isFinite(circuit.pf) ? Number(circuit.pf) : 1,
    lengthM: Number.isFinite(circuit.length) ? Number(circuit.length) : 0,
    continuous: Boolean(circuit.continuous),
    isMotor: false,
    groundSize: formatWireSize(circuit.gnd),
  };
}

export function legacyDefaultLoadScheduleToProject(
  schedule: LegacyDefaultLoadSchedule,
  now = new Date(),
): ElectricalProject {
  const project = createStarterProject(now);
  const panel = schedule.panel?.trim();
  const meter = schedule.meter?.trim();
  const rows = Array.isArray(schedule.circuits)
    ? schedule.circuits.map((circuit, index) => circuitToRow(circuit, index))
    : [];

  return {
    ...project,
    language: 'th',
    rows: rows.length > 0 ? rows : project.rows,
    updatedAt: project.createdAt,
    systemSettings: {
      ...project.systemSettings,
      voltageSinglePhase: schedule.system === '3P' ? 230 : 230,
      voltageThreePhase: 400,
    },
    projectInfo: {
      projectName: schedule.project?.trim() ?? '',
      location: [panel ? `Panel ${panel}` : '', meter ? `Meter ${meter}` : ''].filter(Boolean).join(' / '),
      preparedBy: schedule.designer?.trim() ?? '',
      date: now.toISOString().slice(0, 10),
    },
  };
}
