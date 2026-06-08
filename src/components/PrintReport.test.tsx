import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PrintReport from './PrintReport';
import { calculateProject } from '../domain/calculations';
import { createStarterProject } from '../domain/presets';

const label = (key: string) =>
  ({
    appTitle: 'Electrical load calculator',
    breaker: 'Breaker',
    circuitNo: 'Circuit no.',
    continuous: 'Continuous',
    continuousLoad: 'Continuous',
    date: 'Date',
    demandFactor: 'Demand factor',
    demandVa: 'Demand VA',
    description: 'Description',
    disclaimer: 'For review only.',
    inputUnit: 'Input unit',
    loadSchedule: 'Load schedule',
    location: 'Location',
    nonContinuousLoad: 'Non-continuous',
    phase: 'Phase',
    phaseBalance: 'Phase balance',
    preparedBy: 'Prepared by',
    projectName: 'Project name',
    quantity: 'Quantity',
    totalConnectedVa: 'Total connected VA',
    totalDemandVa: 'Total demand VA',
    totalVa: 'Total VA',
    unbalance: 'Unbalance',
    vaPerUnit: 'Load per unit',
    wireSize: 'Wire size',
  })[key] ?? key;

describe('PrintReport', () => {
  it('shows a placeholder when a load row has no matching calculation', () => {
    const project = createStarterProject(new Date('2026-06-05T06:15:30.000Z'));
    const calculation = {
      ...calculateProject(project),
      rowCalculations: [],
    };

    render(<PrintReport project={project} calculation={calculation} label={label} />);

    const bodyRow = screen.getAllByRole('row')[1];

    expect(within(bodyRow).getAllByRole('cell')[8].textContent).toBe('-');
  });
});
