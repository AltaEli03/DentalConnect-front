import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AdminShell } from './AdminShell';

describe('AdminShell', () => {
  it('renders the page header, section navigation and active section', () => {
    render(
      <MemoryRouter>
        <AdminShell title="Perfil y servicios" active="profile">
          <p>Contenido</p>
        </AdminShell>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Perfil y servicios' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Perfil y servicios' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByText('Consultorio')).toBeInTheDocument();
    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });
});
