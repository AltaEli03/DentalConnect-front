const tokens = (role?: string | null) =>
  (role ?? '')
    .toUpperCase()
    .split(/[,\s]+/)
    .filter(Boolean);

export function hasRole(role: string | null | undefined, expected: string) {
  return tokens(role).includes(expected.toUpperCase());
}

export function isClinicAdmin(role?: string | null) {
  return hasRole(role, 'CLINIC_ADMIN');
}

export function isPatientRole(role?: string | null) {
  return hasRole(role, 'PACIENTE') || hasRole(role, 'PATIENT');
}
