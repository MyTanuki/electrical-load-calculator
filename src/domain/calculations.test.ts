import { describe, expect, it } from 'vitest';

import { calculateProject, calculateRow } from './calculations';
import { DEFAULT_PRESETS, createLoadRow, createStarterProject } from './presets';
import { minimumWireSizeForAmpacity } from './standards';
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
          ...createStarterProject().systemSettings,
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

  it('calculates NEMA-style unbalance from the largest deviation from average', () => {
    const result = calculateProject(
      projectWithRows([
        loadRow({ id: 'row_1', quantity: 1, vaPerUnit: 100, phase: 'L1' }),
        loadRow({ id: 'row_2', quantity: 1, vaPerUnit: 100, phase: 'L2' }),
      ]),
    );

    expect(result.phaseTotals).toEqual({ L1: 100, L2: 100, L3: 0 });
    expect(result.averagePhaseVa).toBeCloseTo(200 / 3);
    // L3 deviates most: |0 - 66.7| / 66.7 = 100%.
    expect(result.unbalancePercent).toBeCloseTo(100);
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

describe('engineering checks (วสท. standards)', () => {
  it('selects the minimum conductor size from the actual protective-device rating', () => {
    expect(minimumWireSizeForAmpacity(16, 'conduit_wall')).toBe(1.5);
    expect(minimumWireSizeForAmpacity(20, 'conduit_wall')).toBe(2.5);
  });

  it('applies the 1.25x continuous-load factor to the design current', () => {
    const result = calculateRow(
      loadRow({ continuous: true, quantity: 1, vaPerUnit: 2300, voltage: 230, breaker: '16 A', wireSize: '2.5 sq.mm' }),
    );

    expect(result.currentA).toBeCloseTo(10);
    expect(result.designCurrentA).toBeCloseTo(12.5);
    expect(result.warnings).not.toContain('warning.breakerBelowLoad');
  });

  it('warns when the breaker is below the continuous design current', () => {
    const result = calculateRow(
      loadRow({ continuous: true, quantity: 1, vaPerUnit: 2300, voltage: 230, breaker: '10 A', wireSize: '2.5 sq.mm' }),
    );

    expect(result.breakerAmp).toBe(10);
    expect(result.warnings).toContain('warning.breakerBelowLoad');
  });

  it('warns when conductor ampacity is below load and breaker exceeds ampacity', () => {
    const result = calculateRow(
      loadRow({ continuous: false, quantity: 1, vaPerUnit: 4600, voltage: 230, breaker: '32 A', wireSize: '1.5 sq.mm' }),
    );

    expect(result.currentA).toBeCloseTo(20);
    expect(result.wireAmpacityA).toBeCloseTo(16); // 1.5 sq.mm, conduit in wall
    expect(result.warnings).toContain('warning.wireBelowLoad');
    expect(result.warnings).toContain('warning.breakerAboveAmpacity');
  });

  it('computes branch voltage drop and warns above the branch limit', () => {
    const result = calculateRow(
      loadRow({
        continuous: false,
        quantity: 1,
        vaPerUnit: 4600,
        voltage: 230,
        breaker: '32 A',
        wireSize: '6 sq.mm',
        lengthM: 50,
        powerFactor: 1,
      }),
    );

    // VD = 2 x 20A x 50m x 3.69 ohm/km / 1000 = 7.38 V -> 3.21%
    expect(result.voltageDropVolts).toBeCloseTo(7.38, 1);
    expect(result.voltageDropPercent).toBeCloseTo(3.21, 1);
    expect(result.warnings).toContain('warning.voltageDropBranch');
  });

  it('reports required EGC and warns when the entered ground is undersized', () => {
    const result = calculateRow(loadRow({ breaker: '20 A', wireSize: '2.5 sq.mm', groundSize: '1.5' }));

    expect(result.requiredEgcSqmm).toBe(2.5);
    expect(result.warnings).toContain('warning.egcUndersized');
  });

  it('derates conductor ampacity for ambient temperature and grouping', () => {
    const project = projectWithRows(
      [loadRow({ quantity: 1, vaPerUnit: 100, voltage: 230, breaker: '16 A', wireSize: '2.5 sq.mm' })],
      {
        systemSettings: {
          ...createStarterProject().systemSettings,
          ambientTempC: 50,
        },
      },
    );

    const result = calculateProject(project);

    // 2.5 sq.mm base 22 A x ambient factor 0.82 (50C) = 18.04 A
    expect(result.rowCalculations[0].wireAmpacityA).toBeCloseTo(18.04, 1);
  });

  it('sizes the feeder with the largest-motor 25% adder and recommends a main breaker', () => {
    const result = calculateProject(
      projectWithRows([
        loadRow({ id: 'm', quantity: 1, vaPerUnit: 2300, voltage: 230, isMotor: true, breaker: '20 A', wireSize: '4 sq.mm' }),
        loadRow({ id: 'g', quantity: 1, vaPerUnit: 1150, voltage: 230, isMotor: false, breaker: '10 A', wireSize: '2.5 sq.mm' }),
      ]),
    );

    // base = 3450 VA / 230 V = 15 A; + 0.25 x 10 A motor = 17.5 A
    expect(result.feederDesignCurrentA).toBeCloseTo(17.5, 1);
    expect(result.recommendedMainBreakerA).toBe(20);
  });

  it('estimates neutral current from phase imbalance', () => {
    const balanced = calculateProject(
      projectWithRows([
        loadRow({ id: 'a', quantity: 1, vaPerUnit: 2300, phase: 'L1' }),
        loadRow({ id: 'b', quantity: 1, vaPerUnit: 2300, phase: 'L2' }),
        loadRow({ id: 'c', quantity: 1, vaPerUnit: 2300, phase: 'L3' }),
      ]),
    );
    expect(balanced.neutralCurrentA).toBeCloseTo(0, 5);

    const single = calculateProject(
      projectWithRows([loadRow({ id: 'a', quantity: 1, vaPerUnit: 2300, phase: 'L1' })]),
    );
    expect(single.neutralCurrentA).toBeCloseTo(10, 5);
  });

  it('computes real power from the power factor', () => {
    const result = calculateRow(loadRow({ quantity: 1, vaPerUnit: 1000, demandFactor: 1, powerFactor: 0.8 }));

    expect(result.demandVa).toBe(1000);
    expect(result.demandW).toBeCloseTo(800);
  });
});
