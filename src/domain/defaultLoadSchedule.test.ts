import { describe, expect, it } from 'vitest';

import { legacyDefaultLoadScheduleToProject, type LegacyDefaultLoadSchedule } from './defaultLoadSchedule';

describe('legacyDefaultLoadScheduleToProject', () => {
  it('converts the root default-loadschedule shape into an ElectricalProject', () => {
    const schedule: LegacyDefaultLoadSchedule = {
      project: 'บ้านพักอาศัย 1 ชั้น',
      panel: 'LP-1',
      system: '1P',
      designer: 'Designer',
      meter: 'PEA 30(100)A',
      circuits: [
        { id: 1, desc: 'Lighting 1', va: 240, inputUnit: 'W', loadCategory: 'lighting_led', phase: 'L1', cb: '16', wire: '2.5' },
        { id: 2, desc: 'ตู้แช่ 1', va: 1500, loadCategory: 'freezer', phase: 'L2', cb: '20', wire: '4', gnd: '4' },
      ],
    };

    const project = legacyDefaultLoadScheduleToProject(schedule, new Date('2026-06-07T00:00:00.000Z'));

    expect(project.schemaVersion).toBe(2);
    expect(project.language).toBe('th');
    expect(project.projectInfo).toEqual({
      projectName: 'บ้านพักอาศัย 1 ชั้น',
      location: 'Panel LP-1 / Meter PEA 30(100)A',
      preparedBy: 'Designer',
      date: '2026-06-07',
    });
    expect(project.rows).toHaveLength(2);
    expect(project.rows[0]).toMatchObject({
      id: 'default-1',
      circuitNo: '1',
      description: 'Lighting 1',
      loadTypeId: 'lighting',
      phase: 'L1',
      quantity: 1,
      vaPerUnit: 240,
      inputUnit: 'W',
      powerFactor: 0.95,
      breaker: '16 A',
      wireSize: '2.5 sq.mm',
    });
    expect(project.rows[1]).toMatchObject({
      loadTypeId: 'general',
      phase: 'L2',
      powerFactor: 0.9,
      groundSize: '4 sq.mm',
    });
  });
});
