import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import LoadSchedule from './LoadSchedule';
import ProjectSettings from './ProjectSettings';
import { createStarterProject } from '../domain/presets';
import type { ElectricalProject } from '../domain/types';

const label = (key: string) =>
  ({
    addRow: 'Add row',
    breaker: 'Breaker',
    circuitNo: 'Circuit no.',
    date: 'Date',
    defaultDemandFactor: 'Default demand factor',
    delete: 'Delete',
    demandFactor: 'Demand factor',
    description: 'Description',
    duplicate: 'Duplicate',
    loadSchedule: 'Load schedule',
    loadType: 'Load type',
    location: 'Location',
    notes: 'Notes',
    phase: 'Phase',
    phaseMode: 'Phase mode',
    preparedBy: 'Prepared by',
    projectName: 'Project name',
    projectSettings: 'Project settings',
    quantity: 'Quantity',
    unbalanceThreshold: 'Unbalance threshold',
    vaPerUnit: 'VA per unit',
    voltage: 'Voltage',
    voltageSinglePhase: 'Single-phase voltage',
    voltageThreePhase: 'Three-phase voltage',
    wireSize: 'Wire size',
    'preset.lighting': 'Lighting',
    'preset.socket': 'Socket outlet',
  })[key] ?? key;

function changeInput(name: string, value: string) {
  fireEvent.change(screen.getByLabelText(name), { target: { value } });
}

function changeInputProgrammatically(name: string, value: string) {
  const input = screen.getByLabelText(name);
  let currentValue = value;

  Object.defineProperty(input, 'value', {
    configurable: true,
    get: () => currentValue,
    set: (nextValue) => {
      currentValue = String(nextValue);
    },
  });

  fireEvent.change(input);
}

function lastProject(onChange: ReturnType<typeof vi.fn<(project: ElectricalProject) => void>>) {
  return onChange.mock.calls[onChange.mock.calls.length - 1][0];
}

describe('project editing components', () => {
  it('updates project settings and stores percent values as decimals', () => {
    const project = createStarterProject(new Date('2026-06-05T06:15:30.000Z'));
    const onChange = vi.fn<(project: ElectricalProject) => void>();

    render(<ProjectSettings project={project} label={label} onChange={onChange} />);

    changeInput('Project name', 'Main Office');
    expect(onChange).toHaveBeenLastCalledWith({
      ...project,
      projectInfo: {
        ...project.projectInfo,
        projectName: 'Main Office',
      },
    });

    changeInput('Default demand factor', '75');
    expect(onChange).toHaveBeenLastCalledWith({
      ...project,
      systemSettings: {
        ...project.systemSettings,
        defaultDemandFactor: 0.75,
      },
    });
  });

  it('does not store non-finite project settings numbers', () => {
    const project = createStarterProject(new Date('2026-06-05T06:15:30.000Z'));
    const onChange = vi.fn<(project: ElectricalProject) => void>();

    render(<ProjectSettings project={project} label={label} onChange={onChange} />);

    changeInputProgrammatically('Single-phase voltage', '1e309');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('edits, adds, duplicates, and deletes load schedule rows', () => {
    const project = createStarterProject(new Date('2026-06-05T06:15:30.000Z'));
    const onChange = vi.fn<(project: ElectricalProject) => void>();

    const { rerender } = render(<LoadSchedule project={project} label={label} onChange={onChange} />);

    changeInput('Demand factor', '80');
    expect(onChange).toHaveBeenLastCalledWith({
      ...project,
      rows: [
        {
          ...project.rows[0],
          demandFactor: 0.8,
        },
      ],
    });

    const editedProject = lastProject(onChange);
    rerender(<LoadSchedule project={editedProject} label={label} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add row' }));
    const addedProject = lastProject(onChange);
    expect(addedProject.rows).toHaveLength(2);
    expect(addedProject.rows[1]).toMatchObject({
      loadTypeId: project.presets[0].id,
      quantity: 1,
      demandFactor: project.presets[0].defaultDemandFactor,
    });

    rerender(<LoadSchedule project={addedProject} label={label} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Duplicate' })[0]);
    const duplicatedProject = lastProject(onChange);
    expect(duplicatedProject.rows).toHaveLength(3);
    expect(duplicatedProject.rows[1]).toEqual({
      ...addedProject.rows[0],
      id: duplicatedProject.rows[1].id,
    });
    expect(duplicatedProject.rows[1].id).not.toBe(addedProject.rows[0].id);

    rerender(<LoadSchedule project={duplicatedProject} label={label} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    expect(lastProject(onChange).rows).toEqual(duplicatedProject.rows.slice(1));
  });

  it('does not store non-finite load schedule numbers', () => {
    const project = createStarterProject(new Date('2026-06-05T06:15:30.000Z'));
    const onChange = vi.fn<(project: ElectricalProject) => void>();

    render(<LoadSchedule project={project} label={label} onChange={onChange} />);

    changeInputProgrammatically('VA per unit', '1e309');
    expect(onChange).not.toHaveBeenCalled();
  });
});
