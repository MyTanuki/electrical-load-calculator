import type { ChangeEvent } from 'react';

import { INSTALLATION_METHODS } from '../domain/standards';
import type { ElectricalProject, InstallationMethod, ProjectInfo, SystemSettings } from '../domain/types';

interface ProjectSettingsProps {
  project: ElectricalProject;
  label: (key: string) => string;
  onChange: (project: ElectricalProject) => void;
}

function ProjectSettings({ project, label, onChange }: ProjectSettingsProps) {
  function updateProjectInfo(key: keyof ProjectInfo, value: string) {
    onChange({
      ...project,
      projectInfo: {
        ...project.projectInfo,
        [key]: value,
      },
    });
  }

  function updateSystemSettings(key: keyof SystemSettings, value: number) {
    onChange({
      ...project,
      systemSettings: {
        ...project.systemSettings,
        [key]: value,
      },
    });
  }

  function handleTextChange(key: keyof ProjectInfo) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      updateProjectInfo(key, event.currentTarget.value);
    };
  }

  function handleNumberChange(key: keyof SystemSettings, percent = false) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.currentTarget.value);

      if (!Number.isFinite(value)) {
        return;
      }

      updateSystemSettings(key, percent ? value / 100 : value);
    };
  }

  function handleMethodChange(event: ChangeEvent<HTMLSelectElement>) {
    onChange({
      ...project,
      systemSettings: {
        ...project.systemSettings,
        installationMethod: event.currentTarget.value as InstallationMethod,
      },
    });
  }

  return (
    <section className="panel">
      <h2>{label('projectSettings')}</h2>
      <div className="form-grid">
        <label>
          {label('projectName')}
          <input
            type="text"
            value={project.projectInfo.projectName}
            onChange={handleTextChange('projectName')}
          />
        </label>
        <label>
          {label('location')}
          <input type="text" value={project.projectInfo.location} onChange={handleTextChange('location')} />
        </label>
        <label>
          {label('preparedBy')}
          <input
            type="text"
            value={project.projectInfo.preparedBy}
            onChange={handleTextChange('preparedBy')}
          />
        </label>
        <label>
          {label('date')}
          <input type="date" value={project.projectInfo.date} onChange={handleTextChange('date')} />
        </label>
        <label>
          {label('voltageSinglePhase')}
          <input
            type="number"
            value={project.systemSettings.voltageSinglePhase}
            onChange={handleNumberChange('voltageSinglePhase')}
          />
        </label>
        <label>
          {label('voltageThreePhase')}
          <input
            type="number"
            value={project.systemSettings.voltageThreePhase}
            onChange={handleNumberChange('voltageThreePhase')}
          />
        </label>
        <label>
          {label('defaultDemandFactor')}
          <input
            type="number"
            value={project.systemSettings.defaultDemandFactor * 100}
            onChange={handleNumberChange('defaultDemandFactor', true)}
          />
        </label>
        <label>
          {label('unbalanceThreshold')}
          <input
            type="number"
            value={project.systemSettings.unbalanceWarningPercent}
            onChange={handleNumberChange('unbalanceWarningPercent')}
          />
        </label>
        <label>
          {label('installationMethod')}
          <select value={project.systemSettings.installationMethod} onChange={handleMethodChange}>
            {INSTALLATION_METHODS.map((method) => (
              <option key={method} value={method}>
                {label(`method.${method}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {label('ambientTempC')}
          <input
            type="number"
            value={project.systemSettings.ambientTempC}
            onChange={handleNumberChange('ambientTempC')}
          />
        </label>
        <label>
          {label('conductorsInGroup')}
          <input
            type="number"
            min={1}
            value={project.systemSettings.conductorsInGroup}
            onChange={handleNumberChange('conductorsInGroup')}
          />
        </label>
        <label>
          {label('branchVdLimit')}
          <input
            type="number"
            value={project.systemSettings.branchVoltageDropLimitPercent}
            onChange={handleNumberChange('branchVoltageDropLimitPercent')}
          />
        </label>
        <label>
          {label('totalVdLimit')}
          <input
            type="number"
            value={project.systemSettings.totalVoltageDropLimitPercent}
            onChange={handleNumberChange('totalVoltageDropLimitPercent')}
          />
        </label>
        <label>
          {label('feederDemandFactor')}
          <input
            type="number"
            value={project.systemSettings.feederDemandFactor * 100}
            onChange={handleNumberChange('feederDemandFactor', true)}
          />
        </label>
      </div>
    </section>
  );
}

export default ProjectSettings;
