import type { ElectricalProject, LoadRow, Phase, ProjectCalculation, RowCalculation } from './types';

const PHASES: Phase[] = ['L1', 'L2', 'L3'];

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

export function calculateRow(row: LoadRow): RowCalculation {
  const quantity = clampMinimum(row.quantity, 0);
  const vaPerUnit = clampMinimum(row.vaPerUnit, 0);
  const demandFactor = clampDemandFactor(row.demandFactor);
  const voltage = clampMinimum(row.voltage, 0);
  const totalVa = quantity * vaPerUnit;
  const demandVa = totalVa * demandFactor;
  const phaseVa = emptyPhaseVa();
  const currentA =
    voltage === 0
      ? 0
      : row.phaseMode === 'three'
        ? demandVa / (Math.sqrt(3) * voltage)
        : demandVa / voltage;

  if (row.phaseMode === 'three') {
    const phaseShare = demandVa / PHASES.length;
    for (const phase of PHASES) {
      phaseVa[phase] = phaseShare;
    }
  } else {
    phaseVa[row.phase] = demandVa;
  }

  return {
    rowId: row.id,
    totalVa,
    demandVa,
    currentA,
    phaseVa,
    warnings: getRowWarnings(row),
  };
}

export function calculateProject(project: ElectricalProject): ProjectCalculation {
  const rowCalculations = project.rows.map(calculateRow);
  const phaseTotals = emptyPhaseVa();
  let totalConnectedVa = 0;
  let totalDemandVa = 0;
  let hasRowIssues = false;

  for (const rowCalculation of rowCalculations) {
    totalConnectedVa += rowCalculation.totalVa;
    totalDemandVa += rowCalculation.demandVa;
    hasRowIssues ||= rowCalculation.warnings.length > 0;

    for (const phase of PHASES) {
      phaseTotals[phase] += rowCalculation.phaseVa[phase];
    }
  }

  const averagePhaseVa = (phaseTotals.L1 + phaseTotals.L2 + phaseTotals.L3) / PHASES.length;
  const maxPhaseVa = Math.max(...PHASES.map((phase) => phaseTotals[phase]));
  const unbalancePercent = averagePhaseVa === 0 ? 0 : ((maxPhaseVa - averagePhaseVa) / averagePhaseVa) * 100;
  const warnings: string[] = [];

  if (unbalancePercent > project.systemSettings.unbalanceWarningPercent) {
    warnings.push('warning.phaseUnbalance');
  }

  if (hasRowIssues) {
    warnings.push('warning.rowIssues');
  }

  return {
    rowCalculations,
    totalConnectedVa,
    totalDemandVa,
    phaseTotals,
    averagePhaseVa,
    unbalancePercent,
    warnings,
  };
}
