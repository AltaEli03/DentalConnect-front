import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClinicDetailPage } from './ClinicDetailPage';
import { ClinicListPage } from './ClinicListPage';
import { api } from '../services/api';
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
  return { api: { clinics: vi.fn(), clinic: vi.fn() }, ApiError: MockApiError };
});

const clinic: Clinic = {
  id: 'clinic-1',
  name: 'Clínica 1',
  description: 'Atención familiar',
  phone: '555',
  email: 'clinica@example.com',
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
};

function LocationDisplay() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
    </output>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.clinics).mockResolvedValue({ data: [clinic] } as never);
  vi.mocked(api.clinic).mockResolvedValue({ data: clinic } as never);
});

describe('Patient directory flow', () => {
  it('keeps the directory filters when returning from a clinic', async () => {
    render(
      <MemoryRouter initialEntries={['/clinics?q=Puebla&servicio=service-1']}>
        <Routes>
          <Route path="/clinics" element={<ClinicListPage />} />
          <Route path="/clinics/:id" element={<ClinicDetailPage />} />
        </Routes>
        <LocationDisplay />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('link', { name: /Ver consultorio/ }));
    expect(await screen.findByRole('heading', { name: 'Clínica 1' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: /Volver al directorio/ }));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/clinics?q=Puebla&servicio=service-1',
      ),
    );
  });
});
