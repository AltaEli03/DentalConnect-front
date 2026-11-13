import { describe, expect, it } from 'vitest';
import { formatDateTime, formatTime, localToday, statusLabels, statusTone } from './appointments';

describe('appointments', () => {
  it('formats times in Mexico City', () => {
    expect(formatTime('2026-11-20T17:00:00Z')).toBe('11:00');
  });

  it('formats a readable date and time', () => {
    expect(formatDateTime('2026-11-20T17:00:00Z')).toMatch(/20 nov 2026/);
  });

  it('returns an empty fallback for missing values', () => {
    expect(formatDateTime(null)).toBe('No disponible');
    expect(formatTime(undefined)).toBe('No disponible');
  });

  it('returns an ISO date for today', () => {
    expect(localToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('maps statuses to labels and tones', () => {
    expect(statusLabels.PROPOSED).toBe('Con propuesta');
    expect(statusTone('proposed')).toBe('proposed');
    expect(statusTone('CONFIRMED')).toBe('confirmed');
    expect(statusTone('unknown')).toBe('pending');
  });
});
