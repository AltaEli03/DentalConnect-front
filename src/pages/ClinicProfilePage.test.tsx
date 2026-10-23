import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Clinic } from '../types/api';
import { api, ApiError } from '../services/api';
import { currentClinicId, currentIdToken, currentUser } from '../services/cognito';
import { ClinicProfilePage } from './ClinicProfilePage';

vi.mock('../services/cognito', () => ({
  currentClinicId: vi.fn(),
  currentIdToken: vi.fn(),
  currentUser: vi.fn(),
}));
vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, api: { ...actual.api, clinic: vi.fn(), updateClinic: vi.fn() } };
});

const clinic: Clinic = {
  id: 'clinic-1',
  name: 'Sonrisa del Centro',
  description: 'Consultorio ficticio.',
  phone: '2225550101',
  email: 'centro@ejemplo.dental',
  address: 'Av. Ejemplo 101',
  city: 'Puebla',
  neighborhood: 'Centro',
  municipality: 'Puebla',
  state: 'Puebla',
  postalCode: '72000',
  latitude: 19.0433,
  longitude: -98.2019,
  imageUrl: null,
  websiteUrl: 'https://sonrisa.example',
  facebookUrl: null,
  instagramUrl: null,
  services: [],
  dentists: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(currentClinicId).mockResolvedValue('clinic-1');
  vi.mocked(currentIdToken).mockResolvedValue('token');
  vi.mocked(currentUser).mockResolvedValue({
    email: 'admin@example.com',
    firstName: 'Ana',
    lastName: 'Pérez',
  });
  vi.mocked(api.clinic).mockResolvedValue({ data: clinic });
});

afterEach(() => cleanup());

function renderPage() {
  return render(
    <MemoryRouter>
      <ClinicProfilePage />
    </MemoryRouter>,
  );
}

describe('ClinicProfilePage', () => {
  it('loads the clinic from the session claim and saves changes', async () => {
    renderPage();

    expect(await screen.findByLabelText('Nombre')).toHaveValue('Sonrisa del Centro');
    expect(screen.getByRole('link', { name: 'Ver ficha pública' })).toHaveAttribute(
      'href',
      '/clinics/clinic-1',
    );
    fireEvent.change(screen.getByLabelText('Dirección'), {
      target: { value: 'Av. Nueva 202' },
    });
    fireEvent.change(screen.getByLabelText('Sitio web'), {
      target: { value: 'https://nueva.example' },
    });
    vi.mocked(api.updateClinic).mockResolvedValue({
      data: { ...clinic, address: 'Av. Nueva 202', websiteUrl: 'https://nueva.example' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Cambios guardados');
    expect(api.updateClinic).toHaveBeenCalledWith(
      'clinic-1',
      expect.objectContaining({
        address: 'Av. Nueva 202',
        websiteUrl: 'https://nueva.example',
        facebookUrl: null,
        latitude: 19.0433,
        longitude: -98.2019,
      }),
      'token',
    );
  });

  it('shows backend field errors without reporting success', async () => {
    renderPage();
    await screen.findByLabelText('Nombre');
    vi.mocked(api.updateClinic).mockRejectedValue(
      new ApiError('Datos inválidos', 400, {
        websiteUrl: ['La URL debe ser absoluta y usar https'],
      }),
    );

    fireEvent.change(screen.getByLabelText('Sitio web'), {
      target: { value: 'http://nueva.example' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Datos inválidos');
    expect(screen.getByText('La URL debe ser absoluta y usar https')).toBeInTheDocument();
    expect(screen.getByLabelText('Sitio web')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('does not show the form when the account has no clinic claim', async () => {
    vi.mocked(currentClinicId).mockResolvedValue(null);
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('no tiene un consultorio asignado');
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument();
  });

  it('asks for a session when there is no authenticated user', async () => {
    vi.mocked(currentUser).mockResolvedValue(null);
    vi.mocked(currentClinicId).mockResolvedValue(null);
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Inicia sesión');
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument();
  });
});
