import { describe, expect, it } from 'vitest';
import { hasRole, isClinicAdmin, isPatientRole } from './roles';

describe('roles', () => {
  it('matches exact role tokens, not substrings', () => {
    expect(isClinicAdmin('CLINIC_ADMIN')).toBe(true);
    expect(isClinicAdmin('clinic_admin')).toBe(true);
    expect(isClinicAdmin('NOT_CLINIC_ADMIN')).toBe(false);
    expect(isClinicAdmin('CLINIC_ADMIN_PENDING')).toBe(false);
  });

  it('supports comma-separated groups', () => {
    expect(hasRole('PATIENT, CLINIC_ADMIN', 'CLINIC_ADMIN')).toBe(true);
    expect(isPatientRole('PACIENTE, CLINIC_ADMIN')).toBe(true);
  });

  it('returns false for missing roles', () => {
    expect(isClinicAdmin(undefined)).toBe(false);
    expect(isPatientRole(null)).toBe(false);
  });
});
