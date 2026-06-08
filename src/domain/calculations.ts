import type {
  ElectricalProject,
  LoadRow,
  Phase,
  ProjectCalculation,
  RowCalculation,
  SystemSettings,
} from './types';
import {
  ambientCorrectionFactor,
  baseAmpacity,
  groupingFactor,
  nextStandardBreaker,
  parseAmpere,
  parseWireSqmm,
  requiredEgcSqmm,
  voltageDropVolts,
} from './standards';

const PHASES: Phase[] = ['L1', 'L2', 'L3'];

/** Continuous loads must be served by an OCPD rated >= 1.25 x load current. */
const CONTINUOUS_LOAD_FACTOR = 1.25;

function emptyPhaseVa(): Record<Phase, number> {
  return { L1: 0, L2: 0, L3: 0 };
}

function clampMinimum(value: number, minimum: number): number {
  return Number.isFinite(value) ? Math.max(minimum, value) : minimum;
}

function clampDemandFactor(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function clampPowerFactor(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return Math.min(1, value);
}

function getRowWarnings(row: LoadRow): string[] {
  const warnings: string[] = [];

  if (!Number.isFinite(row.quantity) || row.quantity < 0) {
    warnings.push('warning.quantity');
  }

  if (!Number.isFinite(row.vaPerUnit) || row.vaPerUnit < 0) {
    warnings.push('warning.vaPerUnit');
  }

  if (!Number.isFinite(row.demandFactor) || row.demandFactor < 0 || row.demandFactor > 1) {
    warnings.push('warning.demandFactor');
  }

  if (!Number.isFinite(row.voltage) || row.voltage <= 0) {
    warnings.push('warning.voltage');
  }

  if (!row.breaker.trim()) {
    warnings.push('warning.breaker');
  }

  if (!row.wireSize.trim()) {
    warnings.push('warning.wireSize');
  }

  if (!row.description.trim()) {
    warnings.push('warning.description');
  }

  return warnings;
}

export function calculateRow(row: LoadRow, settings?: SystemSettings): RowCalculation {
  const quantity = clampMinimum(row.quantity, 0);
  const vaPerUnit = clampMinimum(row.vaPerUnit, 0);
  const demandFactor = clampDemandFactor(row.demandFactor);
  const voltage = clampMinimum(row.voltage, 0);
  const powerFactor = clampPowerFactor(row.powerFactor);
  const apparentVaPerUnit = row.inputUnit === 'W' ? vaPerUnit / powerFactor : vaPerUnit;
  const totalVa = quantity * apparentVaPerUnit;
  const demandVa = totalVa * demandFactor;
  const demandW = demandVa * powerFactor;
  const phaseVa = emptyPhaseVa();
  const isThreePhase = row.phaseMode === 'three';
  const currentA =
    voltage === 0
      ? 0
      : isThreePhase
        ? demandVa / (Math.sqrt(3) * voltage)
        : demandVa / voltage;

  if (isThreePhase) {
    const phaseShare = demandVa / PHASES.length;
    for (const phase of PHASES) {
      phaseVa[phase] = phaseShare;
    }
  } else {
    phaseVa[row.phase] = demandVa;
  }

  // --- Short-term: continuous-load 125% design current ----------------------
  const designCurrentA = row.continuous ? currentA * CONTINUOUS_LOAD_FACTOR : currentA;

  const warnings = getRowWarnings(row);

  // --- Short-term: breaker <-> wire <-> current coordination ----------------
  const breakerAmp = parseAmpere(row.breaker);
  const wireSqmm = parseWireSqmm(row.wireSize);

  const method = settings?.installationMethod ?? 'conduit_wall';
  const ambient = settings?.ambientTempC ?? 40;
  const group = settings?.conductorsInGroup ?? 1;
  const deratingFactor = ambientCorrectionFactor(ambient) * groupingFactor(group);

  let wireAmpacityA: number | null = null;
  if (wireSqmm !== null) {
    const base = baseAmpacity(wireSqmm, method);
    wireAmpacityA = base === null ? null : base * deratingFactor;
  }

  if (breakerAmp !== null && currentA > 0 && breakerAmp < designCurrentA - 1e-6) {
    warnings.push('warning.breakerBelowLoad');
  }

  if (wireAmpacityA !== null && currentA > 0 && wireAmpacityA < currentA - 1e-6) {
    warnings.push('warning.wireBelowLoad');
  }

  if (breakerAmp !== null && wireAmpacityA !== null && breakerAmp > wireAmpacityA + 1e-6) {
    warnings.push('warning.breakerAboveAmpacity');
  }

  // --- Short-term: branch voltage drop --------------------------------------
  const supplyVoltage = voltage > 0 ? voltage : isThreePhase ? 400 : 230;
  const vDropVolts =
    wireSqmm === null
      ? 0
      : voltageDropVolts({
          currentA,
          lengthM: clampMinimum(row.lengthM, 0),
          sqmm: wireSqmm,
          phases: isThreePhase ? 'three' : 'single',
          powerFactor,
        });
  const vDropPercent = supplyVoltage > 0 ? (vDropVolts / supplyVoltage) * 100 : 0;

  const branchLimit = settings?.branchVoltageDropLimitPercent ?? 3;
  if (vDropPercent > branchLimit + 1e-9) {
    warnings.push('warning.voltageDropBranch');
  }

  // --- Medium-term: equipment grounding conductor sizing --------------------
  const reqEgc = breakerAmp !== null ? requiredEgcSqmm(breakerAmp) : null;
  const enteredEgc = parseWireSqmm(row.groundSize);
  if (reqEgc !== null && enteredEgc !== null && enteredEgc < reqEgc - 1e-6) {
    warnings.push('warning.egcUndersized');
  }

  return {
    rowId: row.id,
    totalVa,
    demandVa,
    demandW,
    currentA,
    designCurrentA,
    phaseVa,
    breakerAmp,
    wireSqmm,
    wireAmpacityA,
    voltageDropVolts: vDropVolts,
    voltageDropPercent: vDropPercent,
    requiredEgcSqmm: reqEgc,
    warnings,
  };
}

export function calculateProject(project: ElectricalProject): ProjectCalculation {
  const settings = project.systemSettings;
  const rowCalculations = project.rows.map((row) => calculateRow(row, settings));
  const phaseTotals = emptyPhaseVa();
  let totalConnectedVa = 0;
  let totalDemandVa = 0;
  let totalDemandW = 0;
  let hasRowIssues = false;
  let maxBranchVoltageDropPercent = 0;
  let largestMotorCurrentA = 0;

  for (let i = 0; i < rowCalculations.length; i += 1) {
    const rowCalculation = rowCalculations[i];
    const row = project.rows[i];

    totalConnectedVa += rowCalculation.totalVa;
    totalDemandVa += rowCalculation.demandVa;
    totalDemandW += rowCalculation.demandW;
    hasRowIssues ||= rowCalculation.warnings.length > 0;
    maxBranchVoltageDropPercent = Math.max(
      maxBranchVoltageDropPercent,
      rowCalculation.voltageDropPercent,
    );

    if (row.isMotor) {
      largestMotorCurrentA = Math.max(largestMotorCurrentA, rowCalculation.currentA);
    }

    for (const phase of PHASES) {
      phaseTotals[phase] += rowCalculation.phaseVa[phase];
    }
  }

  // --- Medium-term: NEMA-style unbalance + neutral current ------------------
  const averagePhaseVa = (phaseTotals.L1 + phaseTotals.L2 + phaseTotals.L3) / PHASES.length;
  const maxDeviation = Math.max(...PHASES.map((phase) => Math.abs(phaseTotals[phase] - averagePhaseVa)));
  const unbalancePercent = averagePhaseVa === 0 ? 0 : (maxDeviation / averagePhaseVa) * 100;

  // Neutral current estimate from the three phase load currents (balanced V).
  const phaseVoltage = settings.voltageSinglePhase > 0 ? settings.voltageSinglePhase : 230;
  const ia = phaseTotals.L1 / phaseVoltage;
  const ib = phaseTotals.L2 / phaseVoltage;
  const ic = phaseTotals.L3 / phaseVoltage;
  const neutralCurrentA = Math.sqrt(
    Math.max(0, ia * ia + ib * ib + ic * ic - ia * ib - ib * ic - ic * ia),
  );

  // --- Long-term: panel diversity, feeder + main breaker sizing -------------
  const feederDemandFactor = clampDemandFactor(settings.feederDemandFactor);
  const feederDemandVa = totalDemandVa * feederDemandFactor;
  const isThreePhaseSystem = phaseTotals.L2 > 0 || phaseTotals.L3 > 0;
  const feederVoltage = isThreePhaseSystem
    ? settings.voltageThreePhase > 0
      ? settings.voltageThreePhase
      : 400
    : phaseVoltage;
  const feederBaseCurrentA =
    feederVoltage <= 0
      ? 0
      : isThreePhaseSystem
        ? feederDemandVa / (Math.sqrt(3) * feederVoltage)
        : feederDemandVa / feederVoltage;
  // Largest-motor rule: feeder current = sum of loads + 25% of largest motor.
  const feederDesignCurrentA = feederBaseCurrentA + 0.25 * largestMotorCurrentA;
  const recommendedMainBreakerA = nextStandardBreaker(feederDesignCurrentA);

  const warnings: string[] = [];

  if (unbalancePercent > settings.unbalanceWarningPercent) {
    warnings.push('warning.phaseUnbalance');
  }

  if (maxBranchVoltageDropPercent > settings.totalVoltageDropLimitPercent + 1e-9) {
    warnings.push('warning.voltageDropTotal');
  }

  if (hasRowIssues) {
    warnings.push('warning.rowIssues');
  }

  return {
    rowCalculations,
    totalConnectedVa,
    totalDemandVa,
    totalDemandW,
    feederDemandVa,
    phaseTotals,
    averagePhaseVa,
    unbalancePercent,
    neutralCurrentA,
    feederDesignCurrentA,
    recommendedMainBreakerA,
    maxBranchVoltageDropPercent,
    warnings,
  };
}
