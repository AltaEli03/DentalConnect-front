import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../routes/App';
import { currentIdToken, currentUser } from '../services/cognito';

vi.mock('../services/cognito', () => ({
  currentUser: vi.fn(),
  currentIdToken: vi.fn(),
  signOut: vi.fn(),
}));

const profile = { email: 'paciente@example.com', firstName: 'Ana', lastName: 'Pérez' };
const json = (body: unknown, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: async () => body } as Response);
const fetchMock = (handler: (url: string, init?: RequestInit) => Promise<Response>) =>
  vi.fn((input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init));

const proposed = (overrides: Record<string, unknown> = {}) => ({
  id: 'apt-1',
  folio: 'DC-1',
  status: 'PROPOSED',
  clinicId: 'clinic-1',
  dentistId: 'dentist-1',
  dentalServiceId: 'service-1',
  startsAt: '2026-11-20T17:00:00Z',
  endsAt: '2026-11-20T17:30:00Z',
  proposedStartsAt: '2026-11-21T18:00:00Z',
  proposedEndsAt: '2026-11-21T18:30:00Z',
  proposalExpiresAt: '2026-11-12T12:00:00Z',
  timeZoneId: 'America/Mexico_City',
  ...overrides,
});
const confirmed = () =>
  proposed({
    status: 'CONFIRMED',
    startsAt: '2026-11-21T18:00:00Z',
    endsAt: '2026-11-21T18:30:00Z',
    proposedStartsAt: null,
    proposedEndsAt: null,
    proposalExpiresAt: null,
  });
const pending = () =>
  proposed({
    status: 'PENDING',
    proposedStartsAt: null,
    proposedEndsAt: null,
    proposalExpiresAt: null,
  });

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/mi-solicitud/apt-1']}>
      <App />
    </MemoryRouter>,
  );
const proposalGets = () =>
  vi
    .mocked(fetch)
    .mock.calls.filter(
      ([url, init]) => String(url).endsWith('/appointments/apt-1/proposal') && !init?.method,
    );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(currentUser).mockResolvedValue(profile);
  vi.mocked(currentIdToken).mockResolvedValue('token');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('HU-14 aceptar o rechazar un horario alternativo', () => {
  // DENT-14 R1, R2, R9, R10
  it('muestra ambos horarios y acepta la propuesta', async () => {
    vi.stubGlobal(
      'fetch',
      fetchMock(async (url, init) => {
        if (url.endsWith('/proposal/accept') && init?.method === 'POST')
          return json({ data: confirmed() });
        if (url.endsWith('/proposal')) return json({ data: proposed() });
        return json({ data: [] });
      }),
    );
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Solicitud DC-1' })).toBeInTheDocument();
    expect(screen.getByText('Horario original:')).toBeInTheDocument();
    expect(screen.getByText('Horario propuesto:')).toBeInTheDocument();
    expect(screen.getByText('Vence:')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Responder propuesta' })).toBeInTheDocument();
    expect(
      screen.getByText(/Si aceptas, la cita queda confirmada en el horario propuesto/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aceptar horario propuesto' }).tagName).toBe(
      'BUTTON',
    );

    const getCall = proposalGets()[0];
    expect(new Headers(getCall?.[1]?.headers).get('Authorization')).toBe('Bearer token');

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar horario propuesto' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Aceptaste el horario propuesto. Tu cita quedó confirmada.',
    );
    expect(screen.getByText('Confirmada')).toBeInTheDocument();
    expect(screen.getByText('Horario confirmado:')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Aceptar horario propuesto' }),
    ).not.toBeInTheDocument();

    const post = vi
      .mocked(fetch)
      .mock.calls.find(([url]) => String(url).endsWith('/proposal/accept'));
    expect(String(post?.[0])).toContain('/api/appointments/apt-1/proposal/accept');
    expect(String(post?.[0])).not.toContain('/api/api/');
  });

  // DENT-14 R3
  it('rechaza la propuesta y conserva el horario original', async () => {
    vi.stubGlobal(
      'fetch',
      fetchMock(async (url, init) => {
        if (url.endsWith('/proposal/reject') && init?.method === 'POST')
          return json({ data: proposed({ status: 'REJECTED' }) });
        if (url.endsWith('/proposal')) return json({ data: proposed() });
        return json({ data: [] });
      }),
    );
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Rechazar propuesta' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Rechazaste la propuesta. La solicitud quedó rechazada.',
    );
    expect(screen.getByText('Rechazada')).toBeInTheDocument();
    expect(screen.getByText('Horario original:')).toBeInTheDocument();
    expect(screen.getByText('Horario propuesto rechazado:')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rechazar propuesta' })).not.toBeInTheDocument();
  });

  // DENT-14 R4
  it('informa el conflicto de disponibilidad sin confirmar', async () => {
    vi.stubGlobal(
      'fetch',
      fetchMock(async (url, init) => {
        if (url.endsWith('/proposal/accept') && init?.method === 'POST')
          return json(
            {
              error: {
                code: 'SLOT_UNAVAILABLE',
                message: 'El horario propuesto ya no está disponible',
              },
            },
            409,
          );
        if (url.endsWith('/proposal')) return json({ data: proposed() });
        return json({ data: [] });
      }),
    );
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Aceptar horario propuesto' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El horario propuesto ya no está disponible',
    );
    await waitFor(() => expect(proposalGets()).toHaveLength(2));
    expect(screen.getByText('Con propuesta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aceptar horario propuesto' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  // DENT-14 R5
  it('impide aceptar una propuesta vencida y muestra la solicitud pendiente', async () => {
    let gets = 0;
    vi.stubGlobal(
      'fetch',
      fetchMock(async (url, init) => {
        if (url.endsWith('/proposal/accept') && init?.method === 'POST')
          return json(
            {
              error: {
                code: 'PROPOSAL_EXPIRED',
                message: 'La propuesta venció; la solicitud volvió a pendiente',
              },
            },
            409,
          );
        if (url.endsWith('/proposal')) {
          gets += 1;
          return json({ data: gets === 1 ? proposed() : pending() });
        }
        return json({ data: [] });
      }),
    );
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Aceptar horario propuesto' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La propuesta venció; la solicitud volvió a pendiente',
    );
    await waitFor(() => expect(screen.getByText('Pendiente')).toBeInTheDocument());
    expect(screen.getByText('Horario:')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Aceptar horario propuesto' }),
    ).not.toBeInTheDocument();
  });

  // DENT-14 R6
  it('refresca a confirmada cuando la propuesta ya fue respondida', async () => {
    let gets = 0;
    vi.stubGlobal(
      'fetch',
      fetchMock(async (url, init) => {
        if (url.endsWith('/proposal/accept') && init?.method === 'POST')
          return json(
            {
              error: {
                code: 'PROPOSAL_NOT_ACTIVE',
                message: 'La solicitud no tiene una propuesta activa',
              },
            },
            409,
          );
        if (url.endsWith('/proposal')) {
          gets += 1;
          return json({ data: gets === 1 ? proposed() : confirmed() });
        }
        return json({ data: [] });
      }),
    );
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Aceptar horario propuesto' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La solicitud no tiene una propuesta activa',
    );
    await waitFor(() => expect(screen.getByText('Confirmada')).toBeInTheDocument());
    expect(screen.getByText('Horario confirmado:')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Aceptar horario propuesto' }),
    ).not.toBeInTheDocument();
  });

  // DENT-14 R7
  it('no consulta el API sin sesión', async () => {
    vi.mocked(currentUser).mockResolvedValue(null);
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    renderPage();

    expect(
      await screen.findByText('Inicia sesión con la cuenta que creó la solicitud.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Iniciar sesión para consultar mi solicitud' }),
    ).toHaveAttribute('href', '/iniciar-sesion');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // DENT-14 R7
  it('muestra el mensaje de sesión requerida con 401', async () => {
    vi.stubGlobal(
      'fetch',
      fetchMock(async () => json(null, 401)),
    );
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Inicia sesión para consultar tu solicitud.',
    );
  });

  // DENT-14 R7
  it('oculta la solicitud de otra cuenta con 404', async () => {
    vi.stubGlobal(
      'fetch',
      fetchMock(async () => json(null, 404)),
    );
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La solicitud no existe o no pertenece a tu cuenta.',
    );
    expect(screen.queryByRole('heading', { name: 'Solicitud DC-1' })).not.toBeInTheDocument();
  });
});
