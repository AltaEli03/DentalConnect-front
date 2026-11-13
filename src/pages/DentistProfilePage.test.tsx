import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DentistProfilePage } from './DentistProfilePage';
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
  return { api: { clinic: vi.fn() }, ApiError: MockApiError };
});

const clinic: Clinic = {
  id: 'clinic-1',
  name: 'Clínica Sonrisa',
  description: 'Atención familiar',
  phone: '555',
  email: 'hola@clinica.mx',
  address: 'Calle 1',
  municipality: 'Puebla',
  state: 'Puebla',
  postalCode: '72000',
  services: [],
  dentists: [
    {
      id: 'dentist-1',
      firstName: 'Luis',
      lastName: 'Mora',
      specialty: 'Ortodoncia',
      professionalLicense: '123',
      biography: 'Especialista en ortodoncia.',
      services: [
        {
          id: 'service-1',
          name: 'Ortodoncia',
          description: 'Brackets',
          estimatedDurationMinutes: 45,
        },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.clinic).mockResolvedValue({ data: clinic } as never);
});

describe('DentistProfilePage', () => {
  it('shows the dentist and keeps both ids in the booking link', async () => {
    render(
      <MemoryRouter initialEntries={['/clinics/clinic-1/dentistas/dentist-1']}>
        <Routes>
          <Route path="/clinics/:clinicId/dentistas/:dentistId" element={<DentistProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Luis Mora' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Elegir este servicio' })).toHaveAttribute(
      'href',
      '/clinics/clinic-1/solicitar?serviceId=service-1&dentistId=dentist-1',
    );
  });
});
