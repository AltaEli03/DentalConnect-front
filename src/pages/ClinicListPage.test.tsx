import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClinicListPage } from './ClinicListPage';
import { api } from '../services/api';
import type { Clinic } from '../types/api';

vi.mock('../services/api', () => {
  class ApiError extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
    }
  }
  return { api: { clinics: vi.fn() }, ApiError };
});

const clinic = (index: number): Clinic => ({
  id: `clinic-${index}`,
  name: `Clínica ${index}`,
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
});

function LocationDisplay() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
    </output>
  );
}

const renderPage = (initialEntry = '/clinics') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ClinicListPage />
      <LocationDisplay />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.clinics).mockResolvedValue({ data: [] } as never);
});

describe('ClinicListPage', () => {
  it('reads the search and service from the URL', async () => {
    vi.mocked(api.clinics).mockResolvedValue({ data: [clinic(1)] } as never);
    renderPage('/clinics?q=Puebla&servicio=service-1');

    await waitFor(() =>
      expect(api.clinics).toHaveBeenCalledWith('Puebla', 'service-1'),
    );
    expect(await screen.findByRole('heading', { name: 'Clínica 1' })).toBeInTheDocument();
    expect(screen.getByLabelText('Zona o código postal')).toHaveValue('Puebla');
    expect(screen.getByLabelText('Servicio dental')).toHaveValue('service-1');
  });

  it('updates the URL when the form is submitted', async () => {
    vi.mocked(api.clinics).mockResolvedValue({ data: [clinic(1)] } as never);
    renderPage();
    await screen.findByRole('heading', { name: 'Clínica 1' });

    fireEvent.change(screen.getByLabelText('Zona o código postal'), {
      target: { value: 'Centro' },
    });
    fireEvent.change(screen.getByLabelText('Servicio dental'), {
      target: { value: 'service-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/clinics?q=Centro&servicio=service-1',
      ),
    );
  });

  it('explains a connection error and retries without losing context', async () => {
    vi.mocked(api.clinics)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ data: [clinic(1)] } as never);

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos conectar con el directorio',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('heading', { name: 'Clínica 1' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows six results per page and moves to the second page', async () => {
    vi.mocked(api.clinics).mockResolvedValue({
      data: Array.from({ length: 7 }, (_, index) => clinic(index + 1)),
    } as never);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Clínica 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Clínica 6' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Clínica 7' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));

    expect(await screen.findByRole('heading', { name: 'Clínica 7' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Clínica 1' })).not.toBeInTheDocument();
  });

  it('invites the person to change filters when there are no results', async () => {
    renderPage();

    expect(
      await screen.findByText('No encontramos coincidencias. Cambia la zona o el servicio.'),
    ).toBeInTheDocument();
  });
});
