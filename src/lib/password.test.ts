import { describe, expect, it } from 'vitest';
import { passwordChecks } from './password';

describe('passwordChecks', () => {
  it('requires at least 12 characters and at most 128', () => {
    expect(passwordChecks('corta').length).toBe(false);
    expect(passwordChecks('DentConnect123!').length).toBe(true);
    expect(passwordChecks('x'.repeat(129)).maxLength).toBe(false);
  });

  it('compares confirmation only when provided', () => {
    expect(passwordChecks('DentConnect123!').matches).toBeUndefined();
    expect(passwordChecks('DentConnect123!', 'DentConnect123!').matches).toBe(true);
    expect(passwordChecks('DentConnect123!', 'otra').matches).toBe(false);
  });

  it('detects a varied password', () => {
    expect(passwordChecks('DentConnect123!').variety).toBe(true);
    expect(passwordChecks('dentconnect123').variety).toBe(false);
  });
});
