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
  loadCategory?: string;
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

function powerFactorFromLoadCategory(category: string | undefined): number {
  switch (category) {
    case 'lighting_led':
      return 0.95;
    case 'freezer':
    case 'aircon':
      return 0.9;
    case 'motor':
      return 0.85;
    case 'socket':
    case 'heater':
    case 'ev_charger':
    case 'general':
    case 'other':
    default:
      return 1;
  }
}

function inferLoadCategory(description: string): string {
  const normalized = description.toLowerCase();

  if (normalized.includes('lighting') || normalized.includes('แสง')) return 'lighting_led';
  if (normalized.includes('freezer') || normalized.includes('refriger') || normalized.includes('ตู้แช่')) return 'freezer';
  if (normalized.includes('air') || normalized.includes('a/c') || normalized.includes('แอร์')) return 'aircon';
  if (normalized.includes('motor') || normalized.includes('pump') || normalized.includes('มอเตอร์') || normalized.includes('ปั๊ม')) return 'motor';
  if (normalized.includes('heater') || normalized.includes('heat') || normalized.includes('น้ำร้อน')) return 'heater';
  if (normalized.includes('ev')) return 'ev_charger';
  if (normalized.includes('receptacle') || normalized.includes('socket') || normalized.includes('ปลั๊ก') || normalized.includes('เต้ารับ')) return 'socket';

  return 'general';
}

function powerFactorOrDefault(value: number | undefined, category: string | undefined, description: string): number {
  return Number.isFinite(value) ? Number(value) : powerFactorFromLoadCategory(category ?? inferLoadCategory(description));
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
    powerFactor: powerFactorOrDefault(circuit.pf, circuit.loadCategory, description),
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
