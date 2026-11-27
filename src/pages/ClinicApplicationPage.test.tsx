import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClinicApplicationPage } from './ClinicApplicationPage';

const auth = vi.hoisted(() => ({
  value: {
    user: null as null | { role: string },
    loading: false,
    refresh: vi.fn(),
  },
}));

vi.mock('../auth/AuthContext', () => ({ useAuth: () => auth.value }));
vi.mock('../services/cognito', () => ({ currentIdToken: vi.fn() }));
vi.mock('../services/api', () => ({ apiBaseUrl: () => 'https://api.test.invalid/api' }));

import { currentIdToken } from '../services/cognito';

const renderPage = () =>
  render(
    <MemoryRouter>
      <ClinicApplicationPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  auth.value = { user: null, loading: false, refresh: vi.fn() };
  vi.mocked(currentIdToken).mockResolvedValue('token');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ClinicApplicationPage', () => {
  it('explains how to register a clinic before signing in', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { name: 'Solicita el registro de tu consultorio' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toBeInTheDocument();
  });

  it('shows a loading state while the platform queue is in flight', async () => {
    auth.value = { user: { role: 'PLATFORM_ADMIN' }, loading: false, refresh: vi.fn() };
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined)));

    renderPage();

    expect(await screen.findByText('Cargando solicitudes…')).toBeInTheDocument();
    expect(screen.queryByText('No hay solicitudes pendientes.')).not.toBeInTheDocument();
  });

  it('shows the platform review queue', async () => {
    auth.value = { user: { role: 'PLATFORM_ADMIN' }, loading: false, refresh: vi.fn() };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const data = url.includes('/platform/clinic-applications')
          ? [
              {
                id: 'application-1',
                ownerEmail: 'dueno@example.com',
                clinicName: 'Clínica Norte',
                phone: '555',
                address: 'Calle 1',
                municipality: 'Puebla',
                state: 'Puebla',
                postalCode: '72000',
                status: 'PENDING',
                createdAt: new Date().toISOString(),
              },
            ]
          : null;
        return { ok: true, json: async () => ({ data }) } as Response;
      }),
    );

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Solicitudes por revisar' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Clínica Norte')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aprobar consultorio' })).toBeInTheDocument();
  });
});
