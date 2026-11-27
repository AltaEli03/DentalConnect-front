import { render, screen } from '@testing-library/react';
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
});
