import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { ClinicLoginPage } from './ClinicLoginPage';
import { currentUser, signIn, signOut } from '../services/cognito';

vi.mock('../services/cognito', () => ({
  currentUser: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

function LocationDisplay() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/consultorio/iniciar-sesion']}>
      <AuthProvider>
        <Routes>
          <Route path="/consultorio/iniciar-sesion" element={<ClinicLoginPage />} />
          <Route path="*" element={<p>Destino</p>} />
        </Routes>
        <LocationDisplay />
      </AuthProvider>
    </MemoryRouter>,
  );

const submit = () => {
  fireEvent.change(screen.getByLabelText('Correo del consultorio'), {
    target: { value: 'admin@consultorio.com' },
  });
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: 'DentConnect123!' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar al consultorio' }));
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(currentUser).mockResolvedValue(null);
});

describe('ClinicLoginPage', () => {
  it('rejects a patient account and clears the session', async () => {
    vi.mocked(signIn).mockResolvedValue({
      email: 'paciente@example.com',
      firstName: 'Ana',
      lastName: 'Pérez',
      role: 'PACIENTE',
    });
    renderPage();
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Esta cuenta es de paciente. Usa el acceso de pacientes.',
    );
    expect(signOut).toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent('/consultorio/iniciar-sesion');
  });

  it('rejects a clinic admin without a linked clinic', async () => {
    vi.mocked(signIn).mockResolvedValue({
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'Uno',
      role: 'CLINIC_ADMIN',
    });
    renderPage();
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tu cuenta no está vinculada a un consultorio',
    );
    expect(signOut).toHaveBeenCalled();
  });

  it('sends a valid clinic admin to the clinic appointments page', async () => {
    vi.mocked(signIn).mockResolvedValue({
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'Uno',
      role: 'CLINIC_ADMIN',
      clinicId: 'clinic-1',
    });
    renderPage();
    submit();

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/consultorio/citas'),
    );
  });
});
