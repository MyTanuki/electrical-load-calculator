import { describe, expect, it } from 'vitest';

import { calculateProject, calculateRow } from './calculations';
import { DEFAULT_PRESETS, createLoadRow, createStarterProject } from './presets';
import type { ElectricalProject, LoadRow } from './types';

function loadRow(overrides: Partial<LoadRow> = {}): LoadRow {
  return {
    ...createLoadRow(DEFAULT_PRESETS[0]),
    id: 'row_1',
    description: 'Lighting',
    quantity: 1,
    vaPerUnit: 100,
    demandFactor: 1,
    voltage: 230,
    breaker: '10 A',
    wireSize: '1.5 sq.mm',
    ...overrides,
  };
}

function projectWithRows(rows: LoadRow[], overrides: Partial<ElectricalProject> = {}): ElectricalProject {
  return {
    ...createStarterProject(new Date('2026-06-05T06:15:30.000Z')),
    rows,
    ...overrides,
  };
}

describe('domain calculations', () => {
  it('calculates single-phase connected VA, demand VA, current, and selected phase total', () => {
    const result = calculateRow(
      loadRow({
        quantity: 4,
        vaPerUnit: 250,
        demandFactor: 0.8,
        voltage: 200,
        phase: 'L2',
      }),
    );

    expect(result.totalVa).toBe(1000);
    expect(result.demandVa).toBe(800);
    expect(result.currentA).toBe(4);
    expect(result.phaseVa).toEqual({ L1: 0, L2: 800, L3: 0 });
    expect(result.warnings).toEqual([]);
  });

  it('splits three-phase demand equally and uses three-phase current formula', () => {
    const result = calculateRow(
      loadRow({
        phaseMode: 'three',
        quantity: 3,
        vaPerUnit: 1200,
        demandFactor: 0.75,
        voltage: 400,
      }),
    );

    expect(result.totalVa).toBe(3600);
    expect(result.demandVa).toBe(2700);
    expect(result.phaseVa).toEqual({ L1: 900, L2: 900, L3: 900 });
    expect(result.currentA).toBeCloseTo(2700 / (Math.sqrt(3) * 400));
  });

  it('calculates phase unbalance percent and warns when above the project threshold', () => {
    const project = projectWithRows(
      [
        loadRow({ id: 'row_1', quantity: 1, vaPerUnit: 1000, phase: 'L1' }),
        loadRow({ id: 'row_2', quantity: 1, vaPerUnit: 500, phase: 'L2' }),
        loadRow({ id: 'row_3', quantity: 1, vaPerUnit: 500, phase: 'L3' }),
      ],
      {
        systemSettings: {
          voltageSinglePhase: 230,
          voltageThreePhase: 400,
          defaultDemandFactor: 1,
          unbalanceWarningPercent: 20,
        },
      },
    );

    const result = calculateProject(project);

    expect(result.phaseTotals).toEqual({ L1: 1000, L2: 500, L3: 500 });
    expect(result.averagePhaseVa).toBeCloseTo(2000 / 3);
    expect(result.unbalancePercent).toBeCloseTo(50);
    expect(result.warnings).toContain('warning.phaseUnbalance');
  });

  it('calculates unbalance from max phase above average, not largest absolute deviation', () => {
    const result = calculateProject(
      projectWithRows([
        loadRow({ id: 'row_1', quantity: 1, vaPerUnit: 100, phase: 'L1' }),
        loadRow({ id: 'row_2', quantity: 1, vaPerUnit: 100, phase: 'L2' }),
      ]),
    );

    expect(result.phaseTotals).toEqual({ L1: 100, L2: 100, L3: 0 });
    expect(result.averagePhaseVa).toBeCloseTo(200 / 3);
    expect(result.unbalancePercent).toBeCloseTo(50);
  });

  it('keeps empty project phase totals, average, and unbalance at zero', () => {
    const result = calculateProject(projectWithRows([]));

    expect(result.totalConnectedVa).toBe(0);
    expect(result.totalDemandVa).toBe(0);
    expect(result.phaseTotals).toEqual({ L1: 0, L2: 0, L3: 0 });
    expect(result.averagePhaseVa).toBe(0);
    expect(result.unbalancePercent).toBe(0);
  });

  it('validates row inputs while clamping invalid values for math', () => {
    const rowResult = calculateRow(
      loadRow({
        description: '  ',
        quantity: -2,
        vaPerUnit: -100,
        demandFactor: 1.2,
        voltage: 0,
        breaker: '',
        wireSize: '  ',
      }),
    );

    expect(rowResult.totalVa).toBe(0);
    expect(rowResult.demandVa).toBe(0);
    expect(rowResult.currentA).toBe(0);
    expect(rowResult.phaseVa).toEqual({ L1: 0, L2: 0, L3: 0 });
    expect(rowResult.warnings).toEqual([
      'warning.quantity',
      'warning.vaPerUnit',
      'warning.demandFactor',
      'warning.voltage',
      'warning.breaker',
      'warning.wireSize',
      'warning.description',
    ]);

    const zeroRowResult = calculateRow(loadRow({ quantity: 0, vaPerUnit: 0 }));

    expect(zeroRowResult.totalVa).toBe(0);
    expect(zeroRowResult.demandVa).toBe(0);
    expect(zeroRowResult.currentA).toBe(0);
    expect(zeroRowResult.warnings).toEqual([]);

    const projectResult = calculateProject(projectWithRows([loadRow(), { ...loadRow(), id: 'row_2', quantity: -1 }]));

    expect(projectResult.warnings).toContain('warning.rowIssues');
  });
});
