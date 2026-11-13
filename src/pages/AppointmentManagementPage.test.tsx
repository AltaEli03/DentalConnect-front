import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppointmentManagementPage } from './AppointmentManagementPage';
import { currentIdToken } from '../services/cognito';

vi.mock('../services/cognito', () => ({ currentIdToken: vi.fn() }));

const json = (body: unknown, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: async () => body } as Response);

const appointment = (overrides: Record<string, unknown> = {}) => ({
  id: 'apt-1',
  folio: 'DC-1',
  status: 'PENDING',
  createdAt: '2026-11-01T12:00:00Z',
  startsAt: '2026-11-20T17:00:00Z',
  endsAt: '2026-11-20T17:30:00Z',
  clinicId: 'clinic-1',
  patient: { firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.com', phone: '555' },
  dentist: { id: 'dentist-1', firstName: 'Luis', lastName: 'Mora' },
  service: { id: 'service-1', name: 'Limpieza', estimatedDurationMinutes: 30 },
  ...overrides,
});

const proposedAppointment = () =>
  appointment({
    status: 'PROPOSED',
    proposedStartsAt: '2026-11-21T18:00:00Z',
    proposedEndsAt: '2026-11-21T18:30:00Z',
    proposalExpiresAt: '2026-11-12T12:00:00Z',
  });

const availability = {
  data: [
    { startsAt: '2026-11-20T17:00:00Z', endsAt: '2026-11-20T17:30:00Z' },
    { startsAt: '2026-11-21T18:00:00Z', endsAt: '2026-11-21T18:30:00Z' },
  ],
  timeZone: 'America/Mexico_City',
};

const fetchMock = (handler: (url: string, init?: RequestInit) => Promise<Response>) =>
  vi.fn((input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init));

const openDetail = async () => {
  fireEvent.click(await screen.findByRole('button', { name: /Ana Pérez/ }));
  return screen.findByRole('heading', { name: 'Ana Pérez' });
};

const chooseAlternative = async () => {
  const slot = await screen.findByRole('button', { name: /12:00/ });
  fireEvent.click(slot);
  fireEvent.click(screen.getByRole('button', { name: 'Proponer horario seleccionado' }));
  return slot;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(currentIdToken).mockResolvedValue('token');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('HU-13 proponer horario alternativo', () => {
  // DENT-13 R1, R4, R5, R8, R9
  it('propone un horario alternativo y muestra ambos horarios', async () => {
    let proposed = false;
    vi.stubGlobal(
      'fetch',
      fetchMock(async (url, init) => {
        if (url.includes('/availability')) return json(availability);
        if (url.endsWith('/appointments/apt-1/propose') && init?.method === 'POST') {
          proposed = true;
          return json({ data: proposedAppointment() });
        }
        if (url.endsWith('/appointments/apt-1')) {
          return json({ data: proposed ? proposedAppointment() : appointment() });
        }
        return json({ data: [proposed ? proposedAppointment() : appointment()] });
      }),
    );

    render(<AppointmentManagementPage />);
    await openDetail();

    expect(
      await screen.findByRole('heading', { name: /Proponer (un )?horario alternativo/ }),
    ).toBeInTheDocument();
    const dateInput = screen.getByLabelText('Selecciona una fecha');
    expect(dateInput).toHaveAttribute('min');
    expect(dateInput.getAttribute('min')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(screen.queryByRole('button', { name: '11:00 a.m.' })).not.toBeInTheDocument();

    const availabilityCall = vi
      .mocked(fetch)
      .mock.calls.find(([url]) => String(url).includes('/availability'));
    expect(String(availabilityCall?.[0])).toContain(
      '/api/clinics/clinic-1/dentists/dentist-1/availability',
    );
    expect(String(availabilityCall?.[0])).toContain('serviceId=service-1');

    const slot = await chooseAlternative();
    expect(slot).toHaveAttribute('aria-pressed', 'true');

    const call = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === 'POST');
    const postUrl = String(call?.[0]);
    // DENT-13 R9: base con /api, ruta relativa y sin /api/api/.
    expect(postUrl).toContain('/api/appointments/apt-1/propose');
    expect(postUrl).not.toContain('/api/api/');
    expect(call?.[1]?.body).toBe(JSON.stringify({ proposedStartsAt: '2026-11-21T18:00:00Z' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/Propuesta enviada/);
    const detail = screen.getByLabelText('Detalle de solicitud');
    expect(within(detail).getByText('Fecha Solicitada:')).toBeInTheDocument();
    expect(within(detail).getByText('Horario Propuesto:')).toBeInTheDocument();
    expect(within(detail).getByText('Vence:')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Proponer horario seleccionado' })).not.toBeInTheDocument();
  });

  // DENT-13 R2
  it('informa el conflicto de disponibilidad y conserva la solicitud pendiente', async () => {
    vi.stubGlobal(
      'fetch',
      fetchMock(async (url, init) => {
        if (url.includes('/availability')) return json(availability);
        if (url.endsWith('/appointments/apt-1/propose') && init?.method === 'POST') {
          return json(
            {
              error: {
                code: 'SLOT_UNAVAILABLE',
                message: 'El horario propuesto no está disponible',
              },
            },
            409,
          );
        }
        if (url.endsWith('/appointments/apt-1')) return json({ data: appointment() });
        return json({ data: [appointment()] });
      }),
    );

    render(<AppointmentManagementPage />);
    await openDetail();
    await chooseAlternative();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El horario propuesto no está disponible',
    );
    expect(screen.queryByText(/Propuesta enviada/)).not.toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Detalle de solicitud')).getByText('Pendiente'),
    ).toBeInTheDocument();
  });

  // DENT-13 R3, R7
  it('muestra la propuesta activa con ambos horarios y vencimiento', async () => {
    vi.stubGlobal(
      'fetch',
      fetchMock(async (url) => {
        if (url.includes('/availability')) return json(availability);
        if (url.endsWith('/appointments/apt-1')) return json({ data: proposedAppointment() });
        return json({ data: [proposedAppointment()] });
      }),
    );

    render(<AppointmentManagementPage />);
    await openDetail();

    const detail = screen.getByLabelText('Detalle de solicitud');
    expect(within(detail).getByText('Con propuesta')).toBeInTheDocument();
    expect(within(detail).getByText('Horario Propuesto:')).toBeInTheDocument();
    expect(within(detail).getByText('Fecha Solicitada:')).toBeInTheDocument();
    expect(within(detail).getByText('Horario Propuesto:')).toBeInTheDocument();
    expect(within(detail).getByText('Vence:')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /Proponer (un )?horario alternativo/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Proponer horario seleccionado' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Con propuesta' })).toBeInTheDocument();
  });

  // DENT-13 R6
  it('filtra las solicitudes por estado propuesto', async () => {
    vi.stubGlobal(
      'fetch',
      fetchMock(async () => json({ data: [appointment()] })),
    );

    render(<AppointmentManagementPage />);
    await screen.findByRole('button', { name: /Ana Pérez/ });
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'PROPOSED' } });

    await waitFor(() =>
      expect(
        vi.mocked(fetch).mock.calls.some(([url]) => {
          const value = String(url);
          return (
            value.includes('/api/appointments?status=PROPOSED') && !value.includes('/api/api/')
          );
        }),
      ).toBe(true),
    );
  });

  // DENT-13 R2, R3
  it('refresca a propuesta activa cuando el servidor responde PROPOSAL_ALREADY_ACTIVE', async () => {
    let active = false;
    vi.stubGlobal(
      'fetch',
      fetchMock(async (url, init) => {
        if (url.includes('/availability')) return json(availability);
        if (url.endsWith('/appointments/apt-1/propose') && init?.method === 'POST') {
          active = true;
          return json(
            {
              error: {
                code: 'PROPOSAL_ALREADY_ACTIVE',
                message: 'Ya existe una propuesta activa para esta solicitud',
              },
            },
            409,
          );
        }
        if (url.endsWith('/appointments/apt-1')) {
          return json({ data: active ? proposedAppointment() : appointment() });
        }
        return json({ data: [active ? proposedAppointment() : appointment()] });
      }),
    );

    render(<AppointmentManagementPage />);
    await openDetail();
    await chooseAlternative();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya existe una propuesta activa para esta solicitud',
    );
    const detail = screen.getByLabelText('Detalle de solicitud');
    expect(within(detail).getByText('Fecha Solicitada:')).toBeInTheDocument();
    expect(within(detail).getByText('Horario Propuesto:')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Proponer horario seleccionado' })).not.toBeInTheDocument();
  });
});
