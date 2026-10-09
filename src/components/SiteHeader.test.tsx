import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }));
vi.mock('../auth/AuthContext', () => ({ useAuth }));

import { SiteHeader } from './SiteHeader';

describe('SiteHeader', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ user: null, loading: false });
  });

  it('shows register and sign-in links when signed out', () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Mi cuenta' })).not.toBeInTheDocument();
  });

  it('shows the account link when signed in', () => {
    useAuth.mockReturnValue({
      user: { firstName: 'Ana', lastName: 'López', email: 'a@b.mx' },
      loading: false,
    });
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Mi cuenta' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Crear cuenta' })).not.toBeInTheDocument();
  });

  it('toggles the menu and reports aria-expanded', () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>,
    );
    const toggle = screen.getByRole('button', { name: /menú/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});
