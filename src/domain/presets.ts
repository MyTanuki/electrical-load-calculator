import type { ElectricalProject, LoadPreset, LoadRow } from './types';

export const DEFAULT_PRESETS = [
  {
    id: 'lighting',
    labelKey: 'preset.lighting',
    defaultVaPerUnit: 12,
    defaultDemandFactor: 1,
    defaultBreaker: '10 A',
    defaultWireSize: '1.5 sq.mm',
    defaultPowerFactor: 0.9,
    defaultContinuous: true,
    isMotor: false,
  },
  {
    id: 'socket',
    labelKey: 'preset.socket',
    defaultVaPerUnit: 180,
    defaultDemandFactor: 1,
    defaultBreaker: '16 A',
    defaultWireSize: '2.5 sq.mm',
    defaultPowerFactor: 1,
    defaultContinuous: false,
    isMotor: false,
  },
  {
    id: 'aircon',
    labelKey: 'preset.aircon',
    defaultVaPerUnit: 1500,
    defaultDemandFactor: 1,
    defaultBreaker: '20 A',
    defaultWireSize: '4 sq.mm',
    defaultPowerFactor: 0.9,
    defaultContinuous: true,
    isMotor: true,
  },
  {
    id: 'motor',
    labelKey: 'preset.motor',
    defaultVaPerUnit: 750,
    defaultDemandFactor: 1,
    defaultBreaker: '16 A',
    defaultWireSize: '2.5 sq.mm',
    defaultPowerFactor: 0.85,
    defaultContinuous: true,
    isMotor: true,
  },
  {
    id: 'water_heater',
    labelKey: 'preset.waterHeater',
    defaultVaPerUnit: 3500,
    defaultDemandFactor: 1,
    defaultBreaker: '20 A',
    defaultWireSize: '4 sq.mm',
    defaultPowerFactor: 1,
    defaultContinuous: true,
    isMotor: false,
  },
  {
    id: 'ev_charger',
    labelKey: 'preset.evCharger',
    defaultVaPerUnit: 7400,
    defaultDemandFactor: 1,
    defaultBreaker: '50 A',
    defaultWireSize: '10 sq.mm',
    defaultPowerFactor: 1,
    defaultContinuous: true,
    isMotor: false,
  },
  {
    id: 'general',
    labelKey: 'preset.general',
    defaultVaPerUnit: 1000,
    defaultDemandFactor: 1,
    defaultBreaker: '16 A',
    defaultWireSize: '2.5 sq.mm',
    defaultPowerFactor: 0.9,
    defaultContinuous: false,
    isMotor: false,
  },
  {
    id: 'other',
    labelKey: 'preset.other',
    defaultVaPerUnit: null,
    defaultDemandFactor: 1,
    defaultBreaker: '',
    defaultWireSize: '',
    defaultPowerFactor: 1,
    defaultContinuous: false,
    isMotor: false,
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
    powerFactor: preset.defaultPowerFactor,
    lengthM: 0,
    continuous: preset.defaultContinuous,
    isMotor: preset.isMotor,
    groundSize: '',
  };
}

export function createStarterProject(now = new Date()): ElectricalProject {
  const isoTimestamp = now.toISOString();
  const projectDate = isoTimestamp.slice(0, 10);

  return {
    schemaVersion: 2,
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
      installationMethod: 'conduit_wall',
      ambientTempC: 40,
      conductorsInGroup: 1,
      branchVoltageDropLimitPercent: 3,
      totalVoltageDropLimitPercent: 5,
      feederDemandFactor: 1,
    },
    presets: DEFAULT_PRESETS.map((preset) => ({ ...preset })),
    rows: [createLoadRow()],
    createdAt: isoTimestamp,
    updatedAt: isoTimestamp,
  };
}
