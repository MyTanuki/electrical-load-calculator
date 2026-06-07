import type { ChangeEvent } from 'react';

import { createId, createLoadRow } from '../domain/presets';
import type { ElectricalProject, LoadPhaseMode, LoadRow, Phase } from '../domain/types';

interface LoadScheduleProps {
  project: ElectricalProject;
  label: (key: string) => string;
  onChange: (project: ElectricalProject) => void;
}

type TextField = 'circuitNo' | 'description' | 'breaker' | 'wireSize' | 'groundSize' | 'notes';
type NumberField = 'quantity' | 'vaPerUnit' | 'demandFactor' | 'voltage' | 'powerFactor' | 'lengthM';

function LoadSchedule({ project, label, onChange }: LoadScheduleProps) {
  function updateRows(rows: LoadRow[]) {
    onChange({
      ...project,
      rows,
    });
  }

  function updateRow(rowId: string, updater: (row: LoadRow) => LoadRow) {
    updateRows(project.rows.map((row) => (row.id === rowId ? updater(row) : row)));
  }

  function handleTextChange(rowId: string, field: TextField) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      updateRow(rowId, (row) => ({
        ...row,
        [field]: event.currentTarget.value,
      }));
    };
  }

  function handleNumberChange(rowId: string, field: NumberField, percent = false) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.currentTarget.value);

      if (!Number.isFinite(value)) {
        return;
      }

      updateRow(rowId, (row) => ({
        ...row,
        [field]: percent ? value / 100 : value,
      }));
    };
  }

  function handleContinuousChange(rowId: string) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      updateRow(rowId, (row) => ({
        ...row,
        continuous: event.currentTarget.checked,
      }));
    };
  }

  function handleLoadTypeChange(rowId: string) {
    return (event: ChangeEvent<HTMLSelectElement>) => {
      const loadTypeId = event.currentTarget.value;
      const preset = project.presets.find((candidate) => candidate.id === loadTypeId);

      updateRow(rowId, (row) => ({
        ...row,
        loadTypeId,
        // Keep the motor flag in sync so the largest-motor feeder rule applies.
        isMotor: preset?.isMotor ?? row.isMotor,
      }));
    };
  }

  function handlePhaseModeChange(rowId: string) {
    return (event: ChangeEvent<HTMLSelectElement>) => {
      updateRow(rowId, (row) => ({
        ...row,
        phaseMode: event.currentTarget.value as LoadPhaseMode,
      }));
    };
  }

  function handlePhaseChange(rowId: string) {
    return (event: ChangeEvent<HTMLSelectElement>) => {
      updateRow(rowId, (row) => ({
        ...row,
        phase: event.currentTarget.value as Phase,
      }));
    };
  }

  function handleAddRow() {
    updateRows([...project.rows, createLoadRow(project.presets[0])]);
  }

  function handleDuplicateRow(row: LoadRow) {
    updateRows([
      ...project.rows.slice(0, project.rows.indexOf(row) + 1),
      {
        ...row,
        id: createId('row'),
      },
      ...project.rows.slice(project.rows.indexOf(row) + 1),
    ]);
  }

  function handleDeleteRow(rowId: string) {
    updateRows(project.rows.filter((row) => row.id !== rowId));
  }

  return (
    <section className="panel load-panel">
      <div className="section-header">
        <h2>{label('loadSchedule')}</h2>
        <button type="button" onClick={handleAddRow}>
          {label('addRow')}
        </button>
      </div>
      <div className="table-wrap">
      <table className="load-table">
        <thead>
          <tr>
            <th>{label('circuitNo')}</th>
            <th>{label('description')}</th>
            <th>{label('loadType')}</th>
            <th>{label('phaseMode')}</th>
            <th>{label('phase')}</th>
            <th>{label('quantity')}</th>
            <th>{label('vaPerUnit')}</th>
            <th>{label('demandFactor')}</th>
            <th>{label('voltage')}</th>
            <th>{label('powerFactor')}</th>
            <th>{label('breaker')}</th>
            <th>{label('wireSize')}</th>
            <th>{label('groundSize')}</th>
            <th>{label('lengthM')}</th>
            <th>{label('continuous')}</th>
            <th>{label('notes')}</th>
            <th>{label('rowActions')}</th>
          </tr>
        </thead>
        <tbody>
          {project.rows.map((row) => (
            <tr key={row.id}>
              <td>
                <input
                  aria-label={label('circuitNo')}
                  type="text"
                  value={row.circuitNo}
                  onChange={handleTextChange(row.id, 'circuitNo')}
                />
              </td>
              <td>
                <input
                  aria-label={label('description')}
                  type="text"
                  value={row.description}
                  onChange={handleTextChange(row.id, 'description')}
                />
              </td>
              <td>
                <select aria-label={label('loadType')} value={row.loadTypeId} onChange={handleLoadTypeChange(row.id)}>
                  {project.presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {label(preset.labelKey)}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <select aria-label={label('phaseMode')} value={row.phaseMode} onChange={handlePhaseModeChange(row.id)}>
                  <option value="single">single</option>
                  <option value="three">three</option>
                </select>
              </td>
              <td>
                <select
                  aria-label={label('phase')}
                  value={row.phase}
                  onChange={handlePhaseChange(row.id)}
                  disabled={row.phaseMode === 'three'}
                >
                  <option value="L1">L1</option>
                  <option value="L2">L2</option>
                  <option value="L3">L3</option>
                </select>
              </td>
              <td>
                <input
                  aria-label={label('quantity')}
                  type="number"
                  value={row.quantity}
                  onChange={handleNumberChange(row.id, 'quantity')}
                />
              </td>
              <td>
                <input
                  aria-label={label('vaPerUnit')}
                  type="number"
                  value={row.vaPerUnit}
                  onChange={handleNumberChange(row.id, 'vaPerUnit')}
                />
              </td>
              <td>
                <input
                  aria-label={label('demandFactor')}
                  type="number"
                  value={row.demandFactor * 100}
                  onChange={handleNumberChange(row.id, 'demandFactor', true)}
                />
              </td>
              <td>
                <input
                  aria-label={label('voltage')}
                  type="number"
                  value={row.voltage}
                  onChange={handleNumberChange(row.id, 'voltage')}
                />
              </td>
              <td>
                <input
                  aria-label={label('powerFactor')}
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={row.powerFactor}
                  onChange={handleNumberChange(row.id, 'powerFactor')}
                />
              </td>
              <td>
                <input
                  aria-label={label('breaker')}
                  type="text"
                  value={row.breaker}
                  onChange={handleTextChange(row.id, 'breaker')}
                />
              </td>
              <td>
                <input
                  aria-label={label('wireSize')}
                  type="text"
                  value={row.wireSize}
                  onChange={handleTextChange(row.id, 'wireSize')}
                />
              </td>
              <td>
                <input
                  aria-label={label('groundSize')}
                  type="text"
                  value={row.groundSize}
                  onChange={handleTextChange(row.id, 'groundSize')}
                />
              </td>
              <td>
                <input
                  aria-label={label('lengthM')}
                  type="number"
                  min="0"
                  value={row.lengthM}
                  onChange={handleNumberChange(row.id, 'lengthM')}
                />
              </td>
              <td>
                <input
                  aria-label={label('continuous')}
                  type="checkbox"
                  checked={row.continuous}
                  onChange={handleContinuousChange(row.id)}
                />
              </td>
              <td>
                <input
                  aria-label={label('notes')}
                  type="text"
                  value={row.notes}
                  onChange={handleTextChange(row.id, 'notes')}
                />
              </td>
              <td>
                <div className="row-actions">
                  <button type="button" onClick={() => handleDuplicateRow(row)}>
                    {label('duplicate')}
                  </button>
                  <button type="button" onClick={() => handleDeleteRow(row.id)}>
                    {label('delete')}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </section>
  );
}

export default LoadSchedule;
