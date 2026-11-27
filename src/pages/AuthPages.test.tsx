import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../routes/App';
import { AuthProvider } from '../auth/AuthContext';
import { LoginPage, PasswordRecoveryPage } from './AuthPages';
import {
  currentUser,
  signIn,
  signOut,
  updateAccountProfile,
  requestPasswordReset,
  confirmPasswordReset,
} from '../services/cognito';
import { api } from '../services/api';

vi.mock('../services/cognito', () => ({
  currentUser: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  updateAccountProfile: vi.fn(),
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
}));
vi.mock('../services/api', () => ({
  api: { register: vi.fn(), verify: vi.fn(), resend: vi.fn() },
}));

const profile = {
  email: 'paciente@example.com',
  firstName: 'Ana',
  lastName: 'Pérez',
};

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(currentUser).mockResolvedValue(null);
});

afterEach(() => cleanup());

describe('Sprint 2 account flow', () => {
  it('registers, verifies the six digit code and returns to login', async () => {
    vi.mocked(api.register).mockResolvedValue({ data: { message: 'Código enviado' } });
    vi.mocked(api.verify).mockResolvedValue({ data: { message: 'Correo verificado' } });
    renderApp('/registro');

    await screen.findByLabelText('Nombre');
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Apellidos'), { target: { value: 'Pérez' } });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'paciente@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Teléfono'), {
      target: { value: '+52 abc 222 123 4567' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'DentConnect123!' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'DentConnect123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrarme' }));

    await screen.findByRole('heading', { name: 'Verifica tu correo' });
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('paciente@example.com');
    expect(api.register).toHaveBeenCalledWith({
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'paciente@example.com',
      phone: '522221234567',
      password: 'DentConnect123!',
    });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'paciente@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Código de 6 dígitos'), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña elegida al registrarte'), {
      target: { value: 'DentConnect123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verificar cuenta' }));

    await screen.findByRole('heading', { name: 'Inicia sesión' });
    expect(api.verify).toHaveBeenCalledWith({
      email: 'paciente@example.com',
      code: '123456',
      password: 'DentConnect123!',
    });
  });

  it('takes a verified patient to My Account and closes the session', async () => {
    vi.mocked(signIn).mockResolvedValue(profile);
    renderApp('/iniciar-sesion');

    await screen.findByLabelText('Correo electrónico');
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: profile.email },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'DentConnect123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await screen.findByRole('heading', { name: 'Mi cuenta' });
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText(profile.email)).toBeInTheDocument();
    expect(screen.getByText('Rol: PACIENTE')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible(),
    );
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('explains which login fields are missing before calling Cognito', async () => {
    renderApp('/iniciar-sesion');

    await screen.findByLabelText('Correo electrónico');
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Escribe tu correo electrónico.')).toBeInTheDocument();
    expect(screen.getByText('Escribe tu contraseña.')).toBeInTheDocument();
    expect(screen.getByText('Corrige los datos marcados para continuar.')).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('keeps the user on login when the provider rejects an unverified account', async () => {
    vi.mocked(signIn).mockRejectedValue(new Error('El usuario no está confirmado.'));
    renderApp('/iniciar-sesion');

    await screen.findByLabelText('Correo electrónico');
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: profile.email },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'DentConnect123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('todavía no está verificada');
    expect(screen.queryByRole('heading', { name: 'Mi cuenta' })).not.toBeInTheDocument();
  });

  it('returns to the requested page after signing in', async () => {
    vi.mocked(signIn).mockResolvedValue(profile);
    function LocationDisplay() {
      const location = useLocation();
      return (
        <output data-testid="location">
          {location.pathname}
          {location.search}
        </output>
      );
    }
    render(
      <MemoryRouter
        initialEntries={[{ pathname: '/iniciar-sesion', state: { from: '/clinics?q=Puebla' } }]}
      >
        <AuthProvider>
          <Routes>
            <Route path="/iniciar-sesion" element={<LoginPage />} />
            <Route path="*" element={<p>Destino</p>} />
          </Routes>
          <LocationDisplay />
        </AuthProvider>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: profile.email },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'DentConnect123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/clinics?q=Puebla'),
    );
  });

  it('does not start a countdown when leaving during an in-flight resend', async () => {
    let resolveResend!: (value: { data: { message: string } }) => void;
    vi.mocked(api.resend).mockReturnValue(
      new Promise((resolve) => {
        resolveResend = resolve;
      }) as never,
    );
    const setSpy = vi.spyOn(window, 'setInterval');
    const { unmount } = renderApp('/verificar-correo?email=paciente@example.com');

    await screen.findByRole('button', { name: 'Reenviar código' });
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar código' }));
    const callsBeforeUnmount = setSpy.mock.calls.length;
    unmount();
    resolveResend({ data: { message: 'Código reenviado' } });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(setSpy.mock.calls.length).toBe(callsBeforeUnmount);
    setSpy.mockRestore();
  });

  it('ignores an external redirect after signing in', async () => {
    vi.mocked(signIn).mockResolvedValue(profile);
    function LocationDisplay() {
      const location = useLocation();
      return <output data-testid="location">{location.pathname}</output>;
    }
    render(
      <MemoryRouter
        initialEntries={[
          { pathname: '/iniciar-sesion', state: { from: 'https://evil.example/steal' } },
        ]}
      >
        <AuthProvider>
          <Routes>
            <Route path="/iniciar-sesion" element={<LoginPage />} />
            <Route path="*" element={<p>Destino</p>} />
          </Routes>
          <LocationDisplay />
        </AuthProvider>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: profile.email },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'DentConnect123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/mi-cuenta'));
  });

  it('shows and hides the password and explains requirements', () => {
    renderApp('/registro');

    const password = screen.getByLabelText('Contraseña');
    expect(password).toHaveAttribute('type', 'password');
    expect(screen.getAllByText('12 caracteres como mínimo')).toHaveLength(1);
    expect(screen.getByLabelText('Teléfono')).toHaveAttribute('type', 'tel');
    expect(screen.getByLabelText('Teléfono')).toHaveAttribute('inputmode', 'numeric');

    fireEvent.click(screen.getAllByRole('button', { name: 'Mostrar contraseña' })[0]);
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('clears the resend countdown when leaving the page', async () => {
    vi.mocked(api.resend).mockResolvedValue({ data: { message: 'Código reenviado' } });
    const setSpy = vi.spyOn(window, 'setInterval');
    const clearSpy = vi.spyOn(window, 'clearInterval');
    const { unmount } = renderApp('/verificar-correo?email=paciente@example.com');

    await screen.findByRole('button', { name: 'Reenviar código' });
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar código' }));
    await screen.findByText('Reenviar en 60s');
    const timerId = setSpy.mock.results.at(-1)?.value;

    unmount();
    expect(timerId).toBeDefined();
    expect(clearSpy).toHaveBeenCalledWith(timerId);
    setSpy.mockRestore();
    clearSpy.mockRestore();
  });
});

describe('Unified role-based login', () => {
  it('explains how to request clinic registration before signing in', async () => {
    renderApp('/registrar-consultorio');

    expect(
      await screen.findByRole('heading', { name: 'Solicita el registro de tu consultorio' }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('link', { name: 'Iniciar sesión' })
        .some((link) => link.getAttribute('href') === '/iniciar-sesion'),
    ).toBe(true);
    expect(
      screen
        .getAllByRole('link', { name: 'Crear cuenta' })
        .some((link) => link.getAttribute('href') === '/registro'),
    ).toBe(true);
    expect(
      screen.getByText(/Inicia sesión con esa cuenta para registrar y administrar un consultorio/),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toHaveTextContent(
      'Registrar consultorio',
    );
  });

  it('uses the shared login form for the clinic access URL', async () => {
    renderApp('/consultorio/iniciar-sesion');

    await screen.findByRole('heading', { name: 'Inicia sesión' });
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.queryByLabelText('Correo del consultorio')).not.toBeInTheDocument();
  });

  it('routes a linked clinic administrator to the clinic workspace after the shared login', async () => {
    vi.mocked(signIn).mockResolvedValue({
      ...profile,
      role: 'CLINIC_ADMIN',
      clinicId: 'clinic-test',
    });
    function LocationDisplay() {
      const location = useLocation();
      return <output data-testid="location">{location.pathname}</output>;
    }
    render(
      <MemoryRouter initialEntries={['/iniciar-sesion']}>
        <AuthProvider>
          <Routes>
            <Route path="/iniciar-sesion" element={<LoginPage />} />
            <Route path="*" element={<p>Destino</p>} />
          </Routes>
          <LocationDisplay />
        </AuthProvider>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: profile.email },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'ClinicPassword123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/consultorio/citas'),
    );
  });
});

describe('HU-18 patient contact profile', () => {
  it('shows editable contact fields and saves name and phone while keeping email read-only', async () => {
    vi.mocked(currentUser).mockResolvedValue({
      ...profile,
      role: 'PACIENTE',
      phone: '+525551234567',
    });
    vi.mocked(updateAccountProfile).mockResolvedValue({
      ...profile,
      firstName: 'Ana María',
      lastName: 'Pérez López',
      role: 'PACIENTE',
      phone: '+525558765432',
    });
    renderApp('/mi-cuenta');

    await screen.findByRole('heading', { name: 'Mi cuenta' });
    await waitFor(() => expect(screen.getByLabelText('Nombre')).toHaveValue('Ana'));
    await waitFor(() => expect(screen.getByLabelText('Teléfono')).toHaveValue('525551234567'));
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('readonly');
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana María' } });
    fireEvent.change(screen.getByLabelText('Apellidos'), { target: { value: 'Pérez López' } });
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '+525558765432' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar datos de contacto' }));

    expect(await screen.findByRole('status')).toHaveTextContent('se guardaron correctamente');
    expect(updateAccountProfile).toHaveBeenCalledWith({
      profile: { ...profile, role: 'PACIENTE', phone: '+525551234567' },
      firstName: 'Ana María',
      lastName: 'Pérez López',
      phone: '525558765432',
    });
    expect(await screen.findByText('Ana María Pérez López')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue(profile.email);
  });

  it('rejects a phone with letters or fewer than ten digits without calling Cognito', async () => {
    vi.mocked(currentUser).mockResolvedValue({
      ...profile,
      role: 'PACIENTE',
      phone: '+525551234567',
    });
    renderApp('/mi-cuenta');

    await screen.findByRole('heading', { name: 'Mi cuenta' });
    await waitFor(() => expect(screen.getByLabelText('Teléfono')).toHaveValue('525551234567'));
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '12345abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar datos de contacto' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('entre 10 y 15 dígitos');
    expect(updateAccountProfile).not.toHaveBeenCalled();
  });
});

describe('Password recovery', () => {
  it('requests and confirms a Cognito recovery code', async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue();
    vi.mocked(confirmPasswordReset).mockResolvedValue();
    render(
      <MemoryRouter initialEntries={['/recuperar-contrasena']}>
        <PasswordRecoveryPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'paciente@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }));
    expect(await screen.findByText(/Si la cuenta existe, recibirás un código/)).toBeInTheDocument();
    expect(requestPasswordReset).toHaveBeenCalledWith('paciente@example.com');

    fireEvent.change(screen.getByLabelText('Código de recuperación'), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'DentalConnect!2026' },
    });
    fireEvent.change(screen.getByLabelText('Confirma la nueva contraseña'), {
      target: { value: 'DentalConnect!2026' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    expect(
      await screen.findByText('La contraseña se actualizó. Ya puedes iniciar sesión.'),
    ).toBeInTheDocument();
    expect(confirmPasswordReset).toHaveBeenCalledWith(
      'paciente@example.com',
      '123456',
      'DentalConnect!2026',
    );
  });

  it('uses the canvas background for the auth shell', async () => {
    renderApp('/iniciar-sesion');
    await screen.findByRole('heading', { name: 'Inicia sesión' });
    expect(screen.getByRole('main')).toHaveClass('bg-canvas');
  });
});
