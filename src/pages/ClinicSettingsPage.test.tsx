import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClinicSettingsPage } from './ClinicSettingsPage';
import { clinicRequest } from '../services/clinicApi';

const auth = vi.hoisted(() => ({
  value: { user: { role: 'CLINIC_ADMIN' }, loading: false },
}));

vi.mock('../auth/AuthContext', () => ({ useAuth: () => auth.value }));
vi.mock('../services/clinicApi', () => ({ clinicRequest: vi.fn() }));

const clinic = {
  id: 'clinic-1',
  name: 'Clínica Sonrisa',
  description: 'Atención familiar',
  phone: '555',
  email: 'hola@clinica.mx',
  address: 'Calle 1',
  municipality: 'Puebla',
  state: 'Puebla',
  postalCode: '72000',
  imageUrl: null,
  latitude: null,
  longitude: null,
  isActive: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(clinicRequest).mockImplementation(async (path: string) => {
    if (path === '/clinics/mine') {
      return { data: { clinicId: 'clinic-1', name: 'Clínica Sonrisa' } } as never;
    }
    return {
      data: {
        clinic,
        services: [
          {
            id: 'service-1',
            name: 'Limpieza dental',
            description: 'Limpieza',
            estimatedDurationMinutes: 30,
            isOffered: true,
            priceFrom: 500,
          },
        ],
      },
    } as never;
  });
});

describe('ClinicSettingsPage', () => {
  it('renders the profile and services sections inside the admin shell', async () => {
    render(
      <MemoryRouter>
        <ClinicSettingsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Perfil y servicios' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Información pública' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Servicios del consultorio' })).toBeInTheDocument();
  });
});
