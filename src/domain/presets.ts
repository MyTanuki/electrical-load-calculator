import type { ElectricalProject, LoadPreset, LoadRow } from './types';

export const DEFAULT_PRESETS = [
  {
    id: 'lighting',
    labelKey: 'preset.lighting',
    defaultVaPerUnit: 12,
    defaultDemandFactor: 1,
    defaultBreaker: '10 A',
    defaultWireSize: '1.5 sq.mm',
  },
  {
    id: 'socket',
    labelKey: 'preset.socket',
    defaultVaPerUnit: 180,
    defaultDemandFactor: 1,
    defaultBreaker: '16 A',
    defaultWireSize: '2.5 sq.mm',
  },
  {
    id: 'aircon',
    labelKey: 'preset.aircon',
    defaultVaPerUnit: 1500,
    defaultDemandFactor: 1,
    defaultBreaker: '20 A',
    defaultWireSize: '4 sq.mm',
  },
  {
    id: 'motor',
    labelKey: 'preset.motor',
    defaultVaPerUnit: 750,
    defaultDemandFactor: 1,
    defaultBreaker: '16 A',
    defaultWireSize: '2.5 sq.mm',
  },
  {
    id: 'water_heater',
    labelKey: 'preset.waterHeater',
    defaultVaPerUnit: 3500,
    defaultDemandFactor: 1,
    defaultBreaker: '20 A',
    defaultWireSize: '4 sq.mm',
  },
  {
    id: 'ev_charger',
    labelKey: 'preset.evCharger',
    defaultVaPerUnit: 7400,
    defaultDemandFactor: 1,
    defaultBreaker: '40 A',
    defaultWireSize: '10 sq.mm',
  },
  {
    id: 'general',
    labelKey: 'preset.general',
    defaultVaPerUnit: 1000,
    defaultDemandFactor: 1,
    defaultBreaker: '16 A',
    defaultWireSize: '2.5 sq.mm',
  },
  {
    id: 'other',
    labelKey: 'preset.other',
    defaultVaPerUnit: null,
    defaultDemandFactor: 1,
    defaultBreaker: '',
    defaultWireSize: '',
  },
] as const satisfies readonly LoadPreset[];

export function createId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);

  return `${prefix}_${timestamp}_${random}`;
}

export function createLoadRow(preset: Readonly<LoadPreset> = DEFAULT_PRESETS[0]): LoadRow {
  return {
    id: createId('row'),
    circuitNo: '',
    description: '',
    loadTypeId: preset.id,
    phaseMode: 'single',
    phase: 'L1',
    quantity: 1,
    vaPerUnit: preset.defaultVaPerUnit ?? 0,
    demandFactor: preset.defaultDemandFactor,
    voltage: 230,
    breaker: preset.defaultBreaker,
    wireSize: preset.defaultWireSize,
    notes: '',
  };
}

export function createStarterProject(now = new Date()): ElectricalProject {
  const isoTimestamp = now.toISOString();
  const projectDate = isoTimestamp.slice(0, 10);

  return {
    schemaVersion: 1,
    language: 'en',
    projectInfo: {
      projectName: '',
      location: '',
      preparedBy: '',
      date: projectDate,
    },
    systemSettings: {
      voltageSinglePhase: 230,
      voltageThreePhase: 400,
      defaultDemandFactor: 1,
      unbalanceWarningPercent: 15,
    },
    presets: DEFAULT_PRESETS.map((preset) => ({ ...preset })),
    rows: [createLoadRow()],
    createdAt: isoTimestamp,
    updatedAt: isoTimestamp,
  };
}
