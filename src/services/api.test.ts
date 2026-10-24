import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ClinicProfileInput, ClinicServiceInput } from '../types/api';
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

const serviceInput: ClinicServiceInput = {
  name: 'Limpieza dental',
  description: 'Profilaxis ficticia.',
  estimatedDurationMinutes: 45,
};

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

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

describe('api clinic services', () => {
  it('lists services with the bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await api.clinicServices('clinic-1', 'token');

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/clinics/clinic-1/services');
    expect(options.method).toBeUndefined();
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer token');
  });

  it('creates, updates and changes status with the expected verbs and bodies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await api.createClinicService('clinic-1', serviceInput, 'token');
    await api.updateClinicService('clinic-1', 'service-1', serviceInput, 'token');
    await api.setClinicServiceStatus('clinic-1', 'service-1', false, 'token');

    const calls = fetchMock.mock.calls as Array<[string, RequestInit]>;
    expect(calls[0][0]).toContain('/clinics/clinic-1/services');
    expect(calls[0][1].method).toBe('POST');
    expect(JSON.parse(String(calls[0][1].body))).toEqual(serviceInput);
    expect(new Headers(calls[0][1].headers).get('Authorization')).toBe('Bearer token');
    expect(calls[1][0]).toContain('/clinics/clinic-1/services/service-1');
    expect(calls[1][1].method).toBe('PUT');
    expect(JSON.parse(String(calls[1][1].body))).toEqual(serviceInput);
    expect(calls[2][0]).toContain('/clinics/clinic-1/services/service-1/status');
    expect(calls[2][1].method).toBe('PATCH');
    expect(JSON.parse(String(calls[2][1].body))).toEqual({ isActive: false });
  });

  it('exposes field errors from a service validation response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: {
              message: 'Datos inválidos',
              details: {
                fieldErrors: {
                  estimatedDurationMinutes: ['La duración debe ser un entero positivo en minutos'],
                },
              },
            },
          },
          400,
        ),
      ),
    );

    const error = await api
      .createClinicService('clinic-1', { ...serviceInput, estimatedDurationMinutes: 0 }, 'token')
      .catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      fieldErrors: {
        estimatedDurationMinutes: ['La duración debe ser un entero positivo en minutos'],
      },
    });
  });
});
