import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  it('saves a service offering and creates a new service', async () => {
    const calls: Array<{ path: string; init?: RequestInit }> = [];
    vi.mocked(clinicRequest).mockImplementation(async (path: string, init?: RequestInit) => {
      calls.push({ path, init });
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

    render(
      <MemoryRouter>
        <ClinicSettingsPage />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'Perfil y servicios' });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.path.endsWith('/management/services/service-1') && call.init?.method === 'PUT',
        ),
      ).toBe(true),
    );

    const addForm = screen.getByRole('form', { name: 'Agregar servicio personalizado' });
    fireEvent.change(within(addForm).getByLabelText('Nombre'), {
      target: { value: 'Ortodoncia' },
    });
    fireEvent.change(within(addForm).getByLabelText('Duración en minutos'), {
      target: { value: '45' },
    });
    fireEvent.change(within(addForm).getByLabelText('Descripción'), {
      target: { value: 'Brackets' },
    });
    fireEvent.change(within(addForm).getByLabelText('Precio inicial'), {
      target: { value: '900' },
    });
    fireEvent.click(within(addForm).getByRole('button', { name: 'Agregar servicio' }));

    await waitFor(() =>
      expect(
        calls.some(
          (call) => call.path.endsWith('/management/services') && call.init?.method === 'POST',
        ),
      ).toBe(true),
    );
  });
});
