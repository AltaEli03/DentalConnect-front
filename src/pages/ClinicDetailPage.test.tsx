import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClinicDetailPage } from './ClinicDetailPage';
import { api, ApiError } from '../services/api';
import type { Clinic } from '../types/api';

vi.mock('../services/api', () => {
  class MockApiError extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
    }
  }
  return { api: { clinic: vi.fn() }, ApiError: MockApiError };
});

const clinic: Clinic = {
  id: 'clinic-1',
  name: 'Clínica Sonrisa',
  description: 'Atención familiar',
  phone: '555 123 4567',
  email: 'hola@clinica.mx',
  address: 'Calle 1',
  municipality: 'Puebla',
  state: 'Puebla',
  postalCode: '72000',
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
    },
  ],
};

const renderPage = (state?: { from: string }) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/clinics/clinic-1', state }]}>
      <Routes>
        <Route path="/clinics/:id" element={<ClinicDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.clinic).mockResolvedValue({ data: clinic } as never);
});

describe('ClinicDetailPage', () => {
  it('shows the clinic, its services and the booking link', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Clínica Sonrisa' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Solicitar Limpieza/ })).toHaveAttribute(
      'href',
      '/clinics/clinic-1/solicitar?serviceId=service-1',
    );
    expect(screen.getByRole('link', { name: /Ver perfil/ })).toHaveAttribute(
      'href',
      '/clinics/clinic-1/dentistas/dentist-1',
    );
  });

  it('returns to the directory preserving the previous filters', async () => {
    renderPage({ from: '?q=Puebla&servicio=service-1' });

    expect(await screen.findByRole('link', { name: /Volver al directorio/ })).toHaveAttribute(
      'href',
      '/clinics?q=Puebla&servicio=service-1',
    );
  });

  it('explains a missing clinic and allows retrying', async () => {
    vi.mocked(api.clinic)
      .mockRejectedValueOnce(new ApiError('No encontrado', 404))
      .mockResolvedValueOnce({ data: clinic } as never);

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No encontramos ese consultorio',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('heading', { name: 'Clínica Sonrisa' })).toBeInTheDocument();
  });
});
