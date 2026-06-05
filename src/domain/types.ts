export type Language = 'en' | 'th';

export type Phase = 'L1' | 'L2' | 'L3';

export type LoadPhaseMode = 'single' | 'three';

export interface ProjectInfo {
  projectName: string;
  location: string;
  preparedBy: string;
  date: string;
}

export interface SystemSettings {
  voltageSinglePhase: number;
  voltageThreePhase: number;
  defaultDemandFactor: number;
  unbalanceWarningPercent: number;
}

export interface LoadPreset {
  id: string;
  labelKey: string;
  defaultVaPerUnit: number | null;
  defaultDemandFactor: number;
  defaultBreaker: string;
  defaultWireSize: string;
}

export interface LoadRow {
  id: string;
  circuitNo: string;
  description: string;
  loadTypeId: string;
  phaseMode: LoadPhaseMode;
  phase: Phase;
  quantity: number;
  vaPerUnit: number;
  demandFactor: number;
  voltage: number;
  breaker: string;
  wireSize: string;
  notes: string;
}

export interface ElectricalProject {
  schemaVersion: 1;
  language: Language;
  projectInfo: ProjectInfo;
  systemSettings: SystemSettings;
  presets: LoadPreset[];
  rows: LoadRow[];
  createdAt: string;
  updatedAt: string;
}

export interface RowCalculation {
  rowId: string;
  totalVa: number;
  demandVa: number;
  currentA: number;
  phaseVa: Record<Phase, number>;
  warnings: string[];
}

export interface ProjectCalculation {
  rowCalculations: RowCalculation[];
  totalConnectedVa: number;
  totalDemandVa: number;
  phaseTotals: Record<Phase, number>;
  averagePhaseVa: number;
  unbalancePercent: number;
  warnings: string[];
}
