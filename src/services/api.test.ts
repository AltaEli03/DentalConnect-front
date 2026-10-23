import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ClinicProfileInput } from '../types/api';
import { api, ApiError } from './api';

const payload: ClinicProfileInput = {
  name: 'Sonrisa del Centro',
  description: 'Consultorio ficticio.',
  phone: '2225550101',
  email: 'centro@ejemplo.dental',
  address: 'Av. Ejemplo 101',
  city: 'Puebla',
  neighborhood: 'Centro',
  municipality: 'Puebla',
  state: 'Puebla',
  postalCode: '72000',
  latitude: 19.0433,
  longitude: -98.2019,
  websiteUrl: 'https://sonrisa.example',
  facebookUrl: null,
  instagramUrl: null,
};

afterEach(() => vi.unstubAllGlobals());

describe('api.updateClinic', () => {
  it('exposes field errors from a 400 response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos inválidos',
          details: { fieldErrors: { websiteUrl: ['La URL debe ser absoluta y usar https'] } },
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const error = await api.updateClinic('clinic-1', payload, 'token').catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      fieldErrors: { websiteUrl: ['La URL debe ser absoluta y usar https'] },
    });
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe('PUT');
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer token');
    expect(JSON.parse(String(options.body))).toEqual(payload);
  });

  it('asks for a new session on 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => {
          throw new Error('empty body');
        },
      }),
    );

    const error = await api.updateClinic('clinic-1', payload, 'token').catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as Error).message).toBe('Tu sesión expiró. Inicia sesión de nuevo.');
  });
});
