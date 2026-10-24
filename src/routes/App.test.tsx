import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('../services/cognito', () => ({
  currentUser: vi.fn().mockResolvedValue(null),
  signIn: vi.fn(),
  signOut: vi.fn(),
  currentIdToken: vi.fn(),
  currentClinicId: vi.fn(),
}));
vi.mock('../services/api', () => ({ api: {} }));

afterEach(() => cleanup());

describe('App navigation', () => {
  it('opens clinic profile, dental team and services administration as separate pages', async () => {
    render(
      <MemoryRouter initialEntries={['/iniciar-sesion']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Administrar consultorio' })).toHaveAttribute(
      'href',
      '/administrar-consultorio',
    );
    expect(screen.getByRole('link', { name: 'Equipo dental' })).toHaveAttribute(
      'href',
      '/administrar-dentistas',
    );
    expect(screen.getByRole('link', { name: 'Servicios' })).toHaveAttribute(
      'href',
      '/administrar-servicios',
    );

    fireEvent.click(screen.getByRole('link', { name: 'Administrar consultorio' }));
    expect(
      await screen.findByRole('heading', { name: 'Datos públicos del consultorio' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Equipo dental' }));
    expect(
      await screen.findByRole('heading', { name: 'Administración del equipo dental' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Servicios' }));
    expect(
      await screen.findByRole('heading', { name: 'Servicios del consultorio' }),
    ).toBeInTheDocument();
  });
});
