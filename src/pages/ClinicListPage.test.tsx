import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { clinics } = vi.hoisted(() => ({ clinics: vi.fn() }));
vi.mock('../services/api', () => ({ api: { clinics } }));

import { ClinicListPage } from './ClinicListPage';

const clinic = {
  id: 'abc',
  name: 'Clínica Sonrisa',
  description: 'Atención familiar',
  phone: '555',
  email: 'a@b.mx',
  address: 'Calle 1',
  municipality: 'Puebla',
  state: 'Puebla',
  postalCode: '72000',
  services: [
    { id: 's1', name: 'Limpieza', description: 'Dental', estimatedDurationMinutes: 30, priceFrom: 500 },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ClinicListPage />
    </MemoryRouter>,
  );
}

describe('ClinicListPage', () => {
  beforeEach(() => {
    clinics.mockReset();
  });

  it('lists the clinics returned by the API', async () => {
    clinics.mockResolvedValue({ data: [clinic] });
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Clínica Sonrisa' })).toBeInTheDocument();
  });

  it('shows a no-results message for an empty list', async () => {
    clinics.mockResolvedValue({ data: [] });
    renderPage();
    expect(await screen.findByText(/No encontramos resultados/)).toBeInTheDocument();
  });

  it('shows an error with a retry when the request fails', async () => {
    clinics.mockRejectedValue(new Error('No fue posible consultar la información.'));
    renderPage();
    expect(
      await screen.findByText('No fue posible consultar la información.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
