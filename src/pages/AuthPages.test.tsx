import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../routes/App';
import { AuthProvider } from '../auth/AuthContext';
import { LoginPage } from './AuthPages';
import { currentUser, signIn, signOut } from '../services/cognito';
import { api } from '../services/api';

vi.mock('../services/cognito', () => ({
  currentUser: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
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

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Apellidos'), { target: { value: 'Pérez' } });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'paciente@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '+522221234567' } });
    fireEvent.change(screen.getByLabelText('Contraseña (12 caracteres mínimo)'), {
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
      phone: '+522221234567',
      password: 'DentConnect123!',
    });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'paciente@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Código de 6 dígitos'), {
      target: { value: '123456' },
    });
    fireEvent.change(
      screen.getByLabelText('Contraseña elegida al registrarte (12 caracteres mínimo)'),
      {
        target: { value: 'DentConnect123!' },
      },
    );
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

  it('keeps the user on login when the provider rejects an unverified account', async () => {
    vi.mocked(signIn).mockRejectedValue(new Error('El usuario no está confirmado.'));
    renderApp('/iniciar-sesion');

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: profile.email },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'DentConnect123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El usuario no está confirmado.');
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

  it('clears the resend countdown when leaving the page', async () => {
    vi.mocked(api.resend).mockResolvedValue({ data: { message: 'Código reenviado' } });
    const setSpy = vi.spyOn(window, 'setInterval');
    const clearSpy = vi.spyOn(window, 'clearInterval');
    const { unmount } = renderApp('/verificar-correo?email=paciente@example.com');

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
