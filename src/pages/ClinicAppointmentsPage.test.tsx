import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { ClinicAppointmentsPage } from './ClinicAppointmentsPage';
import { currentUser } from '../services/cognito';
import { clinicRequest } from '../services/clinicApi';

vi.mock('../services/cognito', () => ({
  currentUser: vi.fn(),
  currentIdToken: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('../services/clinicApi', () => ({ clinicRequest: vi.fn() }));

const appointment = {
  id: 'apt-1',
  folio: 'DC-1',
  status: 'CONFIRMED',
  startsAt: new Date(Date.now() + 2 * 86400000).toISOString(),
  endsAt: new Date(Date.now() + 2 * 86400000 + 1800000).toISOString(),
  patient: { firstName: 'Ana', lastName: 'Pérez', phone: '5551234567' },
  dentist: { firstName: 'Luis', lastName: 'Mora' },
  service: { name: 'Limpieza' },
};

function LocationDisplay() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/consultorio/citas']}>
      <AuthProvider>
        <Routes>
          <Route path="/consultorio/citas" element={<ClinicAppointmentsPage />} />
          <Route path="*" element={<p>Destino</p>} />
        </Routes>
        <LocationDisplay />
      </AuthProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(currentUser).mockResolvedValue({
    email: 'admin@consultorio.com',
    firstName: 'Admin',
    lastName: 'Uno',
    role: 'CLINIC_ADMIN',
    clinicId: 'clinic-1',
  });
  vi.mocked(clinicRequest).mockResolvedValue({ data: [appointment] } as never);
});

describe('ClinicAppointmentsPage', () => {
  it('shows confirmed appointments with patient contact and management link', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Ana Pérez' })).toBeInTheDocument();
    expect(screen.getByText(/Limpieza/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '5551234567' })).toHaveAttribute(
      'href',
      'tel:5551234567',
    );
    expect(screen.getByRole('link', { name: 'Gestionar en solicitudes' })).toHaveAttribute(
      'href',
      '/administrar-solicitudes?appointmentId=apt-1',
    );
  });

  it('rejects a patient account without calling the clinic API', async () => {
    vi.mocked(currentUser).mockResolvedValue({
      email: 'paciente@example.com',
      firstName: 'Ana',
      lastName: 'Pérez',
      role: 'PACIENTE',
    });
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Esta cuenta es de paciente');
    expect(clinicRequest).not.toHaveBeenCalled();
  });

  it('redirects an anonymous visitor to the clinic login', async () => {
    vi.mocked(currentUser).mockResolvedValue(null);
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/consultorio/iniciar-sesion'),
    );
  });

  it('retries after an error', async () => {
    vi.mocked(clinicRequest)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ data: [appointment] } as never);
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('heading', { name: 'Ana Pérez' })).toBeInTheDocument();
  });
});
