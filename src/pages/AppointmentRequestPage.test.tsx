import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../routes/App';
import { currentUser } from '../services/cognito';
import { api } from '../services/api';

vi.mock('../services/cognito', () => ({
  currentUser: vi.fn(),
  currentIdToken: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('../services/api', () => {
  class ApiError extends Error {}
  return {
    apiBaseUrl: () => 'http://localhost:3000/api',
    ApiError,
    api: { clinic: vi.fn(), availability: vi.fn(), createAppointment: vi.fn() },
  };
});

const clinic = {
  id: 'clinic-1',
  name: 'Clínica Uno',
  description: 'Atención dental',
  phone: '555',
  email: 'clinica@example.com',
  address: 'Calle 1',
  municipality: 'Centro',
  state: 'CDMX',
  postalCode: '01000',
  services: [
    {
      id: 'service-1',
      name: 'Limpieza',
      description: 'Limpieza dental',
      estimatedDurationMinutes: 30,
      priceFrom: 500,
    },
  ],
  dentists: [
    {
      id: 'dentist-1',
      firstName: 'Luis',
      lastName: 'Mora',
      specialty: 'General',
      professionalLicense: '123',
      biography: 'Dentista',
      services: [
        {
          id: 'service-1',
          name: 'Limpieza',
          description: 'Limpieza dental',
          estimatedDurationMinutes: 30,
        },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(currentUser).mockResolvedValue({
    email: 'paciente@example.com',
    firstName: 'Ana',
    lastName: 'Pérez',
  });
  vi.mocked(api.clinic).mockResolvedValue({ data: clinic });
  vi.mocked(api.availability).mockResolvedValue({
    data: [{ startsAt: '2026-11-20T17:00:00Z', endsAt: '2026-11-20T17:30:00Z' }],
    timeZone: 'America/Mexico_City',
  });
  vi.mocked(api.createAppointment).mockResolvedValue({
    data: {
      id: 'apt-1',
      folio: 'DC-1',
      status: 'PENDING',
      clinicId: 'clinic-1',
      dentistId: 'dentist-1',
      dentalServiceId: 'service-1',
      startsAt: '2026-11-20T17:00:00Z',
      endsAt: '2026-11-20T17:30:00Z',
      timeZoneId: 'America/Mexico_City',
    },
  });
  vi.stubGlobal('crypto', { randomUUID: () => 'test-key-123' });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('HU-14 enlace al estado de la solicitud', () => {
  // DENT-14 R8
  it('muestra el enlace al estado de la solicitud creada', async () => {
    render(
      <MemoryRouter
        initialEntries={['/clinics/clinic-1/solicitar?serviceId=service-1&dentistId=dentist-1']}
      >
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /20 de noviembre de 2026/i }));
    const submit = await screen.findByRole('button', { name: 'Enviar solicitud pendiente' });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    const link = await screen.findByRole('link', { name: 'Ver el estado de mi solicitud' });
    expect(link).toHaveAttribute('href', '/mi-solicitud/apt-1');
    expect(api.createAppointment).toHaveBeenCalledWith(
      {
        clinicId: 'clinic-1',
        dentistId: 'dentist-1',
        dentalServiceId: 'service-1',
        startsAt: '2026-11-20T17:00:00Z',
      },
      'test-key-123',
    );
  });
});
