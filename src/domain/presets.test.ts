import { describe, expect, it } from 'vitest';

import { DEFAULT_PRESETS, createLoadRow, createStarterProject } from './presets';

describe('domain presets', () => {
  it('defines the approved default preset ids and label keys', () => {
    expect(DEFAULT_PRESETS.map((preset) => [preset.id, preset.labelKey])).toEqual([
      ['lighting', 'preset.lighting'],
      ['socket', 'preset.socket'],
      ['aircon', 'preset.aircon'],
      ['motor', 'preset.motor'],
      ['water_heater', 'preset.waterHeater'],
      ['ev_charger', 'preset.evCharger'],
      ['general', 'preset.general'],
      ['other', 'preset.other'],
    ]);
  });

  it('creates a load row from the selected preset defaults', () => {
    const row = createLoadRow(DEFAULT_PRESETS[2]);

    expect(row.loadTypeId).toBe('aircon');
    expect(row.vaPerUnit).toBe(DEFAULT_PRESETS[2].defaultVaPerUnit);
    expect(row.demandFactor).toBe(DEFAULT_PRESETS[2].defaultDemandFactor);
    expect(row.breaker).toBe(DEFAULT_PRESETS[2].defaultBreaker);
    expect(row.wireSize).toBe(DEFAULT_PRESETS[2].defaultWireSize);
  });

  it('uses zero VA per unit when a preset has no default VA', () => {
    const row = createLoadRow(DEFAULT_PRESETS[7]);

    expect(row.loadTypeId).toBe('other');
    expect(row.vaPerUnit).toBe(0);
  });

  it('creates a starter project with stable defaults and ISO timestamps', () => {
    const now = new Date('2026-06-05T06:15:30.000Z');
    const project = createStarterProject(now);

    expect(project.schemaVersion).toBe(1);
    expect(project.language).toBe('en');
    expect(project.projectInfo.date).toBe('2026-06-05');
    expect(project.systemSettings).toEqual({
      voltageSinglePhase: 230,
      voltageThreePhase: 400,
      defaultDemandFactor: 1,
      unbalanceWarningPercent: 15,
    });
    expect(project.rows).toHaveLength(1);
    expect(project.createdAt).toBe(now.toISOString());
    expect(project.updatedAt).toBe(now.toISOString());
  });

  it('clones presets when creating a starter project', () => {
    const project = createStarterProject();

    expect(project.presets).toEqual(DEFAULT_PRESETS);
    expect(project.presets).not.toBe(DEFAULT_PRESETS);
    expect(project.presets[0]).not.toBe(DEFAULT_PRESETS[0]);
  });
});
