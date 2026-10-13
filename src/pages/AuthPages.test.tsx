import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../routes/App';
import { currentUser, signIn, signOut } from '../services/cognito';
import { api } from '../services/api';

vi.mock('../services/cognito', () => ({
  currentUser: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('../services/api', () => ({ api: { register: vi.fn(), verify: vi.fn(), resend: vi.fn() } }));

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
    expect(api.register).toHaveBeenCalledWith({
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'paciente@example.com',
      phone: '+522221234567',
      password: 'DentConnect123!',
      confirmPassword: 'DentConnect123!',
    });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'paciente@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Código de 6 dígitos'), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña elegida al registrarte (12 caracteres mínimo)'), {
      target: { value: 'DentConnect123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verificar cuenta' }));

    await screen.findByRole('heading', { name: 'Inicia sesión' });
    expect(api.verify).toHaveBeenCalledWith({ email: 'paciente@example.com', code: '123456', password: 'DentConnect123!' });
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

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible());
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
});
