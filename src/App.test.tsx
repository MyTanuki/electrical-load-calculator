import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';
import { createStarterProject } from './domain/presets';
import { saveDraft } from './domain/storage';

const defaultSchedule = {
  project: 'บ้านพักอาศัย 1 ชั้น',
  panel: 'LP-1',
  system: '1P',
  designer: '',
  meter: 'PEA 30(100)A',
  circuits: [
    {
      id: 1,
      desc: 'Lighting 1',
      va: 240,
      phase: 'L1',
      cb: '16',
      wire: '2.5',
    },
  ],
};

function mockDefaultScheduleFetch() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue(defaultSchedule),
  });

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

describe('App tabs', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('loads the public default load schedule when no draft is saved', async () => {
    const fetchMock = mockDefaultScheduleFetch();

    render(<App />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/default-loadschedule.json'));
    await waitFor(() => expect(screen.getByDisplayValue('บ้านพักอาศัย 1 ชั้น')).toBeTruthy());
  });

  it('uses the saved draft without fetching the public default load schedule', () => {
    const draft = createStarterProject(new Date('2026-06-07T00:00:00.000Z'));
    saveDraft({
      ...draft,
      projectInfo: {
        ...draft.projectInfo,
        projectName: 'Saved project',
      },
    });
    const fetchMock = mockDefaultScheduleFetch();

    render(<App />);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Saved project')).toBeTruthy();
  });

  it('switches between calculation and EIT standards tabs', async () => {
    mockDefaultScheduleFetch();

    render(<App />);

    await waitFor(() => expect(screen.getByRole('tab', { name: 'การคำนวณ' })).toBeTruthy());

    expect(screen.getByRole('tab', { name: 'การคำนวณ' }).getAttribute('aria-selected')).toBe('true');
    expect(
      within(screen.getByRole('tabpanel', { name: 'การคำนวณ' })).getByRole('heading', { name: 'ตารางโหลด' }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'ข้อมูลมาตรฐาน วสท.' }));

    expect(screen.getByRole('tab', { name: 'ข้อมูลมาตรฐาน วสท.' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByRole('tabpanel', { name: 'การคำนวณ' })).toBeNull();

    const standardsPanel = screen.getByRole('tabpanel', { name: 'ข้อมูลมาตรฐาน วสท.' });
    expect(within(standardsPanel).getByRole('heading', { name: 'ข้อมูลมาตรฐาน วสท.' })).toBeTruthy();
    expect(within(standardsPanel).getByRole('heading', { name: 'พิกัดกระแสสายทองแดง' })).toBeTruthy();
  });
});
