import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Clinic } from '../types/api';
import { api } from '../services/api';
import { ClinicDetailPage } from './ClinicDetailPage';

vi.mock('../services/api', () => ({ api: { clinic: vi.fn() } }));

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
  facebookUrl: 'https://facebook.com/sonrisa',
  instagramUrl: 'https://instagram.com/sonrisa',
  services: [],
  dentists: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => cleanup());

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/clinics/clinic-1']}>
      <Routes>
        <Route path="/clinics/:id" element={<ClinicDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ClinicDetailPage', () => {
  it('shows location, public links and a map link', async () => {
    vi.mocked(api.clinic).mockResolvedValue({ data: clinic });
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Sonrisa del Centro' })).toBeInTheDocument();
    expect(screen.getByText('Centro, Puebla')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sitio web' })).toHaveAttribute(
      'href',
      'https://sonrisa.example',
    );
    expect(screen.getByRole('link', { name: 'Facebook' })).toHaveAttribute(
      'href',
      'https://facebook.com/sonrisa',
    );
    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
      'href',
      'https://instagram.com/sonrisa',
    );
    expect(screen.getByRole('link', { name: 'Ver ubicación en el mapa' })).toHaveAttribute(
      'href',
      'https://www.google.com/maps?q=19.0433,-98.2019',
    );
  });

  it('omits links and map when the optional data is absent', async () => {
    vi.mocked(api.clinic).mockResolvedValue({
      data: {
        ...clinic,
        websiteUrl: null,
        facebookUrl: null,
        instagramUrl: null,
        latitude: null,
        longitude: null,
      },
    });
    renderPage();

    await screen.findByRole('heading', { name: 'Sonrisa del Centro' });
    expect(screen.queryByRole('heading', { name: 'Enlaces y ubicación' })).not.toBeInTheDocument();
  });

  it('omits the price when a service has no published price', async () => {
    vi.mocked(api.clinic).mockResolvedValue({
      data: {
        ...clinic,
        services: [
          {
            id: 'service-1',
            name: 'Limpieza dental',
            description: 'Profilaxis',
            estimatedDurationMinutes: 45,
            priceFrom: null,
          },
        ],
      },
    });
    renderPage();

    expect(await screen.findByText('Limpieza dental')).toBeInTheDocument();
    expect(screen.getByText(/Profilaxis/)).toBeInTheDocument();
    expect(screen.queryByText(/desde/)).not.toBeInTheDocument();
  });
});
