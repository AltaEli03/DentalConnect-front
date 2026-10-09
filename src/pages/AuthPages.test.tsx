import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }));
vi.mock('../auth/AuthContext', () => ({ useAuth }));
vi.mock('../services/cognito', () => ({
  signUp: vi.fn(),
  confirm: vi.fn(),
  resend: vi.fn(),
  signIn: vi.fn(),
}));

import { AccountPage, RegisterPage } from './AuthPages';

function renderRegister() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

function submit() {
  const form = screen.getByRole('button', { name: 'Registrarme' }).closest('form')!;
  fireEvent.submit(form);
}

describe('RegisterPage', () => {
  it('blocks a password shorter than 12 characters', async () => {
    renderRegister();
    fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'short' } });
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La contraseña debe tener al menos 12 caracteres.',
    );
  });

  it('blocks a mismatched confirmation', async () => {
    renderRegister();
    fireEvent.change(screen.getByLabelText(/^Contraseña/), {
      target: { value: 'abcdefghijkl' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'abcdefghijkX' },
    });
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Las contraseñas no coinciden.');
  });
});

describe('AccountPage', () => {
  beforeEach(() => {
    useAuth.mockReset();
  });

  it('redirects a signed-out visitor to sign in', async () => {
    useAuth.mockReturnValue({ user: null, loading: false, logout: vi.fn() });
    render(
      <MemoryRouter initialEntries={['/mi-cuenta']}>
        <Routes>
          <Route path="/mi-cuenta" element={<AccountPage />} />
          <Route path="/iniciar-sesion" element={<p>Página de inicio de sesión</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Página de inicio de sesión')).toBeInTheDocument();
  });

  it('signs the patient out', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    useAuth.mockReturnValue({
      user: { firstName: 'Ana', lastName: 'López', email: 'a@b.mx' },
      loading: false,
      logout,
    });
    render(
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await waitFor(() => expect(logout).toHaveBeenCalled());
  });
});
