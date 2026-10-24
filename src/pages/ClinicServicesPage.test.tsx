import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../services/api';
import { currentClinicId, currentIdToken, currentUser } from '../services/cognito';
import type { ClinicServiceManagement } from '../types/api';
import { ClinicServicesPage } from './ClinicServicesPage';

vi.mock('../services/cognito', () => ({
  currentClinicId: vi.fn(),
  currentIdToken: vi.fn(),
  currentUser: vi.fn(),
}));
vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      clinicServices: vi.fn(),
      createClinicService: vi.fn(),
      updateClinicService: vi.fn(),
      setClinicServiceStatus: vi.fn(),
    },
  };
});

const services: ClinicServiceManagement[] = [
  {
    id: 'service-1',
    name: 'Limpieza dental',
    description: 'Profilaxis',
    estimatedDurationMinutes: 45,
    isActive: true,
    priceFrom: 700,
  },
  {
    id: 'service-2',
    name: 'Endodoncia',
    description: 'Tratamiento de conducto',
    estimatedDurationMinutes: 90,
    isActive: false,
    priceFrom: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(currentClinicId).mockResolvedValue('clinic-1');
  vi.mocked(currentIdToken).mockResolvedValue('token');
  vi.mocked(currentUser).mockResolvedValue({
    email: 'admin@example.com',
    firstName: 'Ana',
    lastName: 'Pérez',
  });
  vi.mocked(api.clinicServices).mockResolvedValue({ data: services });
});

afterEach(() => cleanup());

function renderPage() {
  return render(
    <MemoryRouter>
      <ClinicServicesPage />
    </MemoryRouter>,
  );
}

async function fillAndSubmit(name: string, duration: string, description = '') {
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: name } });
  fireEvent.change(screen.getByLabelText('Duración (minutos)'), {
    target: { value: duration },
  });
  if (description) {
    fireEvent.change(screen.getByLabelText('Descripción'), {
      target: { value: description },
    });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Agregar servicio' }));
}

describe('ClinicServicesPage', () => {
  it('loads the clinic services from the session claim and shows active and inactive', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Limpieza dental' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Endodoncia' })).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
    expect(api.clinicServices).toHaveBeenCalledWith('clinic-1', 'token');
    expect(screen.queryByRole('button', { name: /Eliminar|Borrar/ })).not.toBeInTheDocument();
  });

  it('creates a valid service and reloads the list', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Limpieza dental' });
    vi.mocked(api.createClinicService).mockResolvedValue({
      data: {
        id: 'service-3',
        name: 'Blanqueamiento',
        description: 'Aclaramiento',
        estimatedDurationMinutes: 60,
        isActive: true,
        priceFrom: null,
      },
    });
    vi.mocked(api.clinicServices).mockResolvedValue({
      data: [
        ...services,
        {
          id: 'service-3',
          name: 'Blanqueamiento',
          description: 'Aclaramiento',
          estimatedDurationMinutes: 60,
          isActive: true,
          priceFrom: null,
        },
      ],
    });

    await fillAndSubmit('Blanqueamiento', '60', 'Aclaramiento');

    await waitFor(() =>
      expect(api.createClinicService).toHaveBeenCalledWith(
        'clinic-1',
        {
          name: 'Blanqueamiento',
          description: 'Aclaramiento',
          estimatedDurationMinutes: 60,
        },
        'token',
      ),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Servicio agregado a la oferta');
    expect(screen.getByRole('heading', { name: 'Blanqueamiento' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('');
  });

  it.each([
    ['zero', '0'],
    ['negative', '-5'],
    ['fractional', '1.5'],
    ['empty', ''],
  ])('rejects a %s duration without calling the API', async (_label, duration) => {
    renderPage();
    await screen.findByRole('heading', { name: 'Limpieza dental' });

    await fillAndSubmit('Limpieza dental', duration);

    expect(
      await screen.findByText('La duración debe ser un entero positivo en minutos.'),
    ).toBeInTheDocument();
    expect(api.createClinicService).not.toHaveBeenCalled();
  });

  it('edits a service and shows the returned duration', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Limpieza dental' });
    fireEvent.click(screen.getByRole('button', { name: 'Editar Limpieza dental' }));

    expect(screen.getByLabelText('Nombre')).toHaveValue('Limpieza dental');
    fireEvent.change(screen.getByLabelText('Duración (minutos)'), { target: { value: '60' } });
    vi.mocked(api.updateClinicService).mockResolvedValue({
      data: { ...services[0], estimatedDurationMinutes: 60 },
    });
    vi.mocked(api.clinicServices).mockResolvedValue({
      data: [{ ...services[0], estimatedDurationMinutes: 60 }, services[1]],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(api.updateClinicService).toHaveBeenCalledWith(
        'clinic-1',
        'service-1',
        {
          name: 'Limpieza dental',
          description: 'Profilaxis',
          estimatedDurationMinutes: 60,
        },
        'token',
      ),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Servicio actualizado');
    expect(screen.getByText('60 min ·')).toBeInTheDocument();
  });

  it('deactivates a service and keeps it in the list', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Limpieza dental' });
    vi.mocked(api.setClinicServiceStatus).mockResolvedValue({
      data: { ...services[0], isActive: false },
    });
    vi.mocked(api.clinicServices).mockResolvedValue({
      data: [{ ...services[0], isActive: false }, services[1]],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Desactivar Limpieza dental' }));

    await waitFor(() =>
      expect(api.setClinicServiceStatus).toHaveBeenCalledWith(
        'clinic-1',
        'service-1',
        false,
        'token',
      ),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Servicio desactivado');
    expect(screen.getByRole('heading', { name: 'Limpieza dental' })).toBeInTheDocument();
    expect(screen.getAllByText('Inactivo')).toHaveLength(2);
  });

  it('reactivates a service', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Endodoncia' });
    vi.mocked(api.setClinicServiceStatus).mockResolvedValue({
      data: { ...services[1], isActive: true },
    });
    vi.mocked(api.clinicServices).mockResolvedValue({
      data: [services[0], { ...services[1], isActive: true }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Activar Endodoncia' }));

    await waitFor(() =>
      expect(api.setClinicServiceStatus).toHaveBeenCalledWith(
        'clinic-1',
        'service-2',
        true,
        'token',
      ),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Servicio reactivado');
  });

  it('shows backend field errors without reporting success', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Limpieza dental' });
    vi.mocked(api.createClinicService).mockRejectedValue(
      new ApiError('Datos inválidos', 400, {
        estimatedDurationMinutes: ['La duración debe ser un entero positivo en minutos'],
      }),
    );

    await fillAndSubmit('Limpieza dental', '45');

    expect(await screen.findByRole('alert')).toHaveTextContent('Datos inválidos');
    expect(
      screen.getByText('La duración debe ser un entero positivo en minutos'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Duración (minutos)')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the API permission error and no form', async () => {
    vi.mocked(api.clinicServices).mockRejectedValue(
      new ApiError('No tienes permiso para administrar este consultorio.', 403),
    );
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tienes permiso para administrar este consultorio.',
    );
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument();
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
