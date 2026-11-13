import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { PatientAppointmentsPage } from './PatientAppointmentsPage';
import { currentUser } from '../services/cognito';
import { api } from '../services/api';
import type { PatientAppointment } from '../types/api';

vi.mock('../services/cognito', () => ({
  currentUser: vi.fn(),
  currentIdToken: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('../services/api', () => {
  class MockApiError extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
    }
  }
  return { api: { myAppointments: vi.fn() }, ApiError: MockApiError };
});

const appointment = (overrides: Partial<PatientAppointment> = {}): PatientAppointment => ({
  id: 'apt-1',
  folio: 'DC-1',
  status: 'CONFIRMED',
  startsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  endsAt: new Date(Date.now() + 7 * 86400000 + 1800000).toISOString(),
  clinic: { id: 'clinic-1', name: 'Clínica Sonrisa', municipality: 'Puebla' },
  dentist: { id: 'dentist-1', firstName: 'Luis', lastName: 'Mora' },
  service: { id: 'service-1', name: 'Limpieza' },
  ...overrides,
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/mis-citas']}>
      <AuthProvider>
        <PatientAppointmentsPage />
      </AuthProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(currentUser).mockResolvedValue({
    email: 'paciente@example.com',
    firstName: 'Ana',
    lastName: 'Pérez',
  });
  vi.mocked(api.myAppointments).mockResolvedValue({ data: [appointment()] } as never);
});

describe('PatientAppointmentsPage', () => {
  it('separates upcoming appointments from history', async () => {
    vi.mocked(api.myAppointments).mockResolvedValue({
      data: [
        appointment({ id: 'future', service: { id: 's1', name: 'Limpieza' } }),
        appointment({
          id: 'past',
          status: 'REJECTED',
          startsAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          service: { id: 's2', name: 'Ortodoncia' },
        }),
      ],
    } as never);
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Limpieza' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próximas (1)' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Historial (1)' }));

    expect(await screen.findByRole('heading', { name: 'Ortodoncia' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Limpieza' })).not.toBeInTheDocument();
  });

  it('links a proposed appointment to the response page', async () => {
    vi.mocked(api.myAppointments).mockResolvedValue({
      data: [
        appointment({
          id: 'apt-proposed',
          status: 'PROPOSED',
          proposedStartsAt: new Date(Date.now() + 8 * 86400000).toISOString(),
          proposedEndsAt: new Date(Date.now() + 8 * 86400000 + 1800000).toISOString(),
        }),
      ],
    } as never);
    renderPage();

    expect(await screen.findByRole('link', { name: 'Responder propuesta' })).toHaveAttribute(
      'href',
      '/mi-solicitud/apt-proposed',
    );
  });

  it('retries after an error', async () => {
    vi.mocked(api.myAppointments)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ data: [appointment()] } as never);
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar con tus citas');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('heading', { name: 'Limpieza' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('asks for a session without calling the API', async () => {
    vi.mocked(currentUser).mockResolvedValue(null);
    renderPage();

    expect(
      await screen.findByRole('link', { name: 'Iniciar sesión para ver mis citas' }),
    ).toHaveAttribute('href', '/iniciar-sesion');
    expect(api.myAppointments).not.toHaveBeenCalled();
  });
});
