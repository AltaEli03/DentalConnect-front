import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DentistManagementPage } from './DentistManagementPage';
import { clinicRequest } from '../services/clinicApi';
import { api } from '../services/api';

const auth = vi.hoisted(() => ({
  value: { user: { role: 'CLINIC_ADMIN' }, loading: false },
}));

vi.mock('../auth/AuthContext', () => ({ useAuth: () => auth.value }));
vi.mock('../services/clinicApi', () => ({ clinicRequest: vi.fn() }));
vi.mock('../services/api', () => ({ api: { clinic: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.clinic).mockResolvedValue({
    data: { services: [{ id: 'service-1', name: 'Limpieza dental' }] },
  } as never);
  vi.mocked(clinicRequest).mockImplementation(async (path: string) => {
    if (path === '/clinics/mine') {
      return { data: { clinicId: 'clinic-1', name: 'Clínica Sonrisa' } } as never;
    }
    return {
      data: [
        {
          id: 'dentist-1',
          firstName: 'Luis',
          lastName: 'Mora',
          professionalLicense: '123',
          specialty: 'Ortodoncia',
          biography: 'Especialista',
          isActive: true,
          services: [{ id: 'service-1', name: 'Limpieza dental' }],
        },
      ],
    } as never;
  });
});

describe('DentistManagementPage', () => {
  it('renders the team and schedule controls inside the admin shell', async () => {
    render(
      <MemoryRouter>
        <DentistManagementPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Dentistas y horarios' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Equipo dental' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Horarios' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Nuevo dentista' })).toBeInTheDocument();
  });

  it('toggles a dentist status', async () => {
    const calls: Array<{ path: string; init?: RequestInit }> = [];
    vi.mocked(clinicRequest).mockImplementation(async (path: string, init?: RequestInit) => {
      calls.push({ path, init });
      if (path === '/clinics/mine') {
        return { data: { clinicId: 'clinic-1', name: 'Clínica Sonrisa' } } as never;
      }
      return {
        data: [
          {
            id: 'dentist-1',
            firstName: 'Luis',
            lastName: 'Mora',
            professionalLicense: '123',
            specialty: 'Ortodoncia',
            biography: 'Especialista',
            isActive: true,
            services: [{ id: 'service-1', name: 'Limpieza dental' }],
          },
        ],
      } as never;
    });

    render(
      <MemoryRouter>
        <DentistManagementPage />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'Dentistas y horarios' });
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.path.endsWith('/dentists/dentist-1/status') && call.init?.method === 'PATCH',
        ),
      ).toBe(true),
    );
  });

  it('adds a weekly schedule entry', async () => {
    const calls: Array<{ path: string; init?: RequestInit }> = [];
    vi.mocked(clinicRequest).mockImplementation(async (path: string, init?: RequestInit) => {
      calls.push({ path, init });
      if (path === '/clinics/mine') {
        return { data: { clinicId: 'clinic-1', name: 'Clínica Sonrisa' } } as never;
      }
      if (path.endsWith('/schedule') && init?.method === 'POST') {
        return { data: { id: 'weekly-1', dayOfWeek: 1, startsAt: '09:00', endsAt: '18:00' } } as never;
      }
      if (path.endsWith('/schedule') || path.endsWith('/blocks')) {
        return { data: [] } as never;
      }
      return {
        data: [
          {
            id: 'dentist-1',
            firstName: 'Luis',
            lastName: 'Mora',
            professionalLicense: '123',
            specialty: 'Ortodoncia',
            biography: 'Especialista',
            isActive: true,
            services: [{ id: 'service-1', name: 'Limpieza dental' }],
          },
        ],
      } as never;
    });

    render(
      <MemoryRouter>
        <DentistManagementPage />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'Dentistas y horarios' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Horarios' })[0]);
    fireEvent.change(await screen.findByLabelText('Dentista'), {
      target: { value: 'dentist-1' },
    });
    await screen.findByRole('heading', { name: 'Agenda del equipo' });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir jornada' }));

    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.path.endsWith('/dentists/dentist-1/schedule') && call.init?.method === 'POST',
        ),
      ).toBe(true),
    );
  });
});
