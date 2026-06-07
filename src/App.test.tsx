import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import App from './App';

describe('App tabs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('switches between calculation and EIT standards tabs', () => {
    render(<App />);

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
