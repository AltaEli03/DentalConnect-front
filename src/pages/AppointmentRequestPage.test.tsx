import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../routes/App';
import { currentUser } from '../services/cognito';
import { api, ApiError } from '../services/api';

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
  return {
    apiBaseUrl: () => 'http://localhost:3000/api',
    ApiError: MockApiError,
    api: {
      clinic: vi.fn(),
      availability: vi.fn(),
      createAppointment: vi.fn(),
      proposal: vi.fn(),
    },
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

const renderPage = () =>
  render(
    <MemoryRouter
      initialEntries={['/clinics/clinic-1/solicitar?serviceId=service-1&dentistId=dentist-1']}
    >
      <App />
    </MemoryRouter>,
  );

const chooseSlot = async () =>
  fireEvent.click(await screen.findByRole('button', { name: /20 nov 2026/i }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(currentUser).mockResolvedValue({
    email: 'paciente@example.com',
    firstName: 'Ana',
    lastName: 'Pérez',
  });
  vi.mocked(api.clinic).mockResolvedValue({ data: clinic } as never);
  vi.mocked(api.availability).mockResolvedValue({
    data: [{ startsAt: '2026-11-20T17:00:00Z', endsAt: '2026-11-20T17:30:00Z' }],
    timeZone: 'America/Mexico_City',
  } as never);
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
  } as never);
  vi.stubGlobal('crypto', { randomUUID: () => 'test-key-123' });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AppointmentRequestPage', () => {
  it('sends the request with an idempotency key and links to its status', async () => {
    renderPage();

    await chooseSlot();
    const submit = await screen.findByRole('button', { name: 'Enviar solicitud' });
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

  it('explains a taken slot and keeps the request available', async () => {
    vi.mocked(api.createAppointment).mockRejectedValueOnce(
      new ApiError('Ese horario ya no está disponible', 409),
    );
    renderPage();

    await chooseSlot();
    fireEvent.click(await screen.findByRole('button', { name: 'Enviar solicitud' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ese horario ya no está disponible. Elige otra opción.',
    );
    expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeInTheDocument();
  });

  it('invites the person to sign in before sending', async () => {
    vi.mocked(currentUser).mockResolvedValue(null);
    renderPage();

    await chooseSlot();
    expect(await screen.findByRole('link', { name: 'Inicia sesión para agendar' })).toHaveAttribute(
      'href',
      '/iniciar-sesion',
    );
  });

  it('reuses the idempotency key when retrying the same request', async () => {
    const uuid = vi.fn(() => 'stable-key');
    vi.stubGlobal('crypto', { randomUUID: uuid });
    vi.mocked(api.createAppointment)
      .mockRejectedValueOnce(new ApiError('Error temporal', 500))
      .mockResolvedValueOnce({
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
      } as never);
    renderPage();

    await chooseSlot();
    expect(uuid).toHaveBeenCalledTimes(1);
    fireEvent.click(await screen.findByRole('button', { name: 'Enviar solicitud' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El servicio tiene un problema temporal',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    await screen.findByRole('link', { name: 'Ver el estado de mi solicitud' });
    expect(uuid).toHaveBeenCalledTimes(1);
    expect(vi.mocked(api.createAppointment).mock.calls[1]?.[1]).toBe('stable-key');
    expect(vi.mocked(api.createAppointment).mock.calls[0]?.[1]).toBe('stable-key');
  });

  it('keeps the same key when the selected slot is clicked again', async () => {
    const uuid = vi.fn(() => 'stable-key');
    vi.stubGlobal('crypto', { randomUUID: uuid });
    renderPage();

    const slot = await screen.findByRole('button', { name: /20 nov 2026/i });
    fireEvent.click(slot);
    fireEvent.click(slot);

    expect(uuid).toHaveBeenCalledTimes(1);
  });

  it('does not submit twice on a double click', async () => {
    renderPage();

    await chooseSlot();
    const submit = await screen.findByRole('button', { name: 'Enviar solicitud' });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(vi.mocked(api.createAppointment)).toHaveBeenCalledTimes(1);
  });

  it('does not request availability without a date', async () => {
    renderPage();
    await screen.findByRole('button', { name: /20 nov 2026/i });
    vi.mocked(api.availability).mockClear();

    fireEvent.change(screen.getByLabelText('Fecha de atención'), { target: { value: '' } });

    await waitFor(() => expect(api.availability).not.toHaveBeenCalled());
  });

  it('returns to sign-in when the session expired', async () => {
    vi.mocked(api.createAppointment).mockRejectedValueOnce(new ApiError('Tu sesión terminó', 401));
    renderPage();

    await chooseSlot();
    fireEvent.click(await screen.findByRole('button', { name: 'Enviar solicitud' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tu sesión terminó. Inicia sesión para enviar la solicitud.',
    );
    expect(await screen.findByRole('link', { name: 'Inicia sesión para agendar' })).toHaveAttribute(
      'href',
      '/iniciar-sesion',
    );
  });

  it('retries availability without losing the chosen service and dentist', async () => {
    vi.mocked(api.availability)
      .mockRejectedValueOnce(new ApiError('No pudimos consultar los horarios', 500))
      .mockResolvedValueOnce({
        data: [{ startsAt: '2026-11-20T17:00:00Z', endsAt: '2026-11-20T17:30:00Z' }],
        timeZone: 'America/Mexico_City',
      } as never);
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El servicio tiene un problema temporal',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar horarios' }));

    expect(await screen.findByRole('button', { name: /20 nov 2026/i })).toBeInTheDocument();
  });
});
