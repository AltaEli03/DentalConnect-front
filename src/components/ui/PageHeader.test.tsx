import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders the kicker, title and actions', () => {
    render(
      <PageHeader
        kicker="Consultorio"
        title="Citas agendadas"
        actions={<button type="button">Acción</button>}
      />,
    );

    expect(screen.getByText('Consultorio')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Citas agendadas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acción' })).toBeInTheDocument();
  });
});
