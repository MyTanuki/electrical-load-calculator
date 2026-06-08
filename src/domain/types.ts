import type { InstallationMethod } from './standards';

export type Language = 'en' | 'th';

export type Phase = 'L1' | 'L2' | 'L3';

export type LoadPhaseMode = 'single' | 'three';

export type LoadInputUnit = 'VA' | 'W';

export type { InstallationMethod };

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
  /** Default wiring installation method used for ampacity lookup. */
  installationMethod: InstallationMethod;
  /** Ambient temperature (°C) used for ampacity derating. */
  ambientTempC: number;
  /** Number of current-carrying circuits grouped together (derating). */
  conductorsInGroup: number;
  /** Maximum allowed voltage drop on a single branch circuit (%). */
  branchVoltageDropLimitPercent: number;
  /** Maximum allowed total voltage drop, feeder + branch (%). */
  totalVoltageDropLimitPercent: number;
  /** Panel-level diversity factor applied to total demand for feeder sizing. */
  feederDemandFactor: number;
}

export interface LoadPreset {
  id: string;
  labelKey: string;
  defaultVaPerUnit: number | null;
  defaultDemandFactor: number;
  defaultBreaker: string;
  defaultWireSize: string;
  /** Typical power factor for the load type (0..1). */
  defaultPowerFactor: number;
  /** Whether the load type is treated as a continuous load (3+ hours). */
  defaultContinuous: boolean;
  /** Whether the load type is a motor (largest-motor 125% feeder rule). */
  isMotor: boolean;
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
  /** Unit used for vaPerUnit input. W is converted to VA by dividing by PF. */
  inputUnit: LoadInputUnit;
  demandFactor: number;
  voltage: number;
  breaker: string;
  wireSize: string;
  notes: string;
  /** Power factor of the load (0..1). Used for kW and voltage drop. */
  powerFactor: number;
  /** One-way wire run length in metres. Used for voltage drop. */
  lengthM: number;
  /** Whether this circuit is a continuous load (breaker >= 1.25 x current). */
  continuous: boolean;
  /** Whether this circuit feeds a motor (largest-motor 125% feeder rule). */
  isMotor: boolean;
  /** Equipment grounding conductor size as free text (sq.mm). */
  groundSize: string;
}

export interface ElectricalProject {
  schemaVersion: 2;
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
  /** Real power (W) = demand VA x power factor. */
  demandW: number;
  currentA: number;
  /** Design current including continuous-load 1.25x where applicable. */
  designCurrentA: number;
  phaseVa: Record<Phase, number>;
  /** Breaker rating parsed from the breaker text (A), or null. */
  breakerAmp: number | null;
  /** Conductor area parsed from the wire text (sq.mm), or null. */
  wireSqmm: number | null;
  /** Derated ampacity of the selected conductor (A), or null. */
  wireAmpacityA: number | null;
  /** Voltage drop on this branch (V) and percent of supply voltage. */
  voltageDropVolts: number;
  voltageDropPercent: number;
  /** Minimum equipment grounding conductor size required (sq.mm), or null. */
  requiredEgcSqmm: number | null;
  warnings: string[];
}

export interface ProjectCalculation {
  rowCalculations: RowCalculation[];
  totalConnectedVa: number;
  totalDemandVa: number;
  /** Total real power (W) across all rows. */
  totalDemandW: number;
  /** Total demand VA after applying the panel-level feeder demand factor. */
  feederDemandVa: number;
  phaseTotals: Record<Phase, number>;
  averagePhaseVa: number;
  /** NEMA-style unbalance: max deviation from average / average (%). */
  unbalancePercent: number;
  /** Estimated neutral current from phase imbalance (A). */
  neutralCurrentA: number;
  /** Feeder design current including largest-motor 25% adder (A). */
  feederDesignCurrentA: number;
  /** Recommended main breaker size (A), next standard size up. */
  recommendedMainBreakerA: number;
  /** Highest branch voltage drop across all rows (%). */
  maxBranchVoltageDropPercent: number;
  warnings: string[];
}
