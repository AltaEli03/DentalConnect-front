import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { clinic } = vi.hoisted(() => ({ clinic: vi.fn() }));
vi.mock('../services/api', () => ({ api: { clinic } }));

import { ClinicDetailPage } from './ClinicDetailPage';

const detail = {
  id: 'abc',
  name: 'Clínica Sonrisa',
  description: 'Atención familiar',
  phone: '5551234567',
  email: 'a@b.mx',
  address: 'Calle 1',
  municipality: 'Puebla',
  state: 'Puebla',
  postalCode: '72000',
  services: [
    { id: 's1', name: 'Limpieza', description: 'Dental', estimatedDurationMinutes: 30, priceFrom: 500 },
  ],
  dentists: [{ id: 'd1', firstName: 'Ana', lastName: 'López', specialty: 'Ortodoncia' }],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/clinics/abc']}>
      <Routes>
        <Route path="/clinics/:id" element={<ClinicDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ClinicDetailPage', () => {
  beforeEach(() => {
    clinic.mockReset();
  });

  it('shows contact, services and specialists for a clinic', async () => {
    clinic.mockResolvedValue({ data: detail });
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Clínica Sonrisa' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '5551234567' })).toBeInTheDocument();
    expect(screen.getByText(/Limpieza/)).toBeInTheDocument();
    expect(screen.getByText(/Ortodoncia/)).toBeInTheDocument();
  });

  it('shows an error and a link back when the clinic cannot be loaded', async () => {
    clinic.mockRejectedValue(new Error('No encontramos ese consultorio.'));
    renderPage();
    expect(await screen.findByText('No encontramos ese consultorio.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al directorio' })).toBeInTheDocument();
  });
});
