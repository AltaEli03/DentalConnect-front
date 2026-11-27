import { describe, expect, it } from 'vitest';
import { friendlyAuthError } from './authErrors';

describe('friendlyAuthError', () => {
  it('explains a rejected login without exposing internals', () => {
    const error = Object.assign(new Error('Incorrect username or password.'), {
      code: 'NotAuthorizedException',
    });
    expect(friendlyAuthError(error, 'fallback')).toContain(
      'correo o la contraseña no son correctos',
    );
  });

  it('explains an unverified account', () => {
    expect(friendlyAuthError(new Error('El usuario no está confirmado.'), 'fallback')).toContain(
      'todavía no está verificada',
    );
  });

  it('explains a temporary lockout', () => {
    const error = Object.assign(new Error('Too many requests'), {
      code: 'LimitExceededException',
    });
    expect(friendlyAuthError(error, 'fallback')).toContain('Demasiados intentos');
  });

  it('keeps the connection message for network failures', () => {
    expect(friendlyAuthError(new TypeError('Failed to fetch'), 'fallback')).toContain(
      'No pudimos conectar',
    );
  });

  it('uses the fallback for unknown values', () => {
    expect(friendlyAuthError('sin detalle', 'Inténtalo de nuevo.')).toBe('Inténtalo de nuevo.');
  });
});
