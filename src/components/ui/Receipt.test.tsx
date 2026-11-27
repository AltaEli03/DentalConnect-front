import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Receipt } from './Receipt';

describe('Receipt', () => {
  it('renders the title, rows and footer', () => {
    render(
      <Receipt
        title="Resumen"
        rows={[
          { label: 'Servicio', value: 'Limpieza' },
          { label: 'Duración', value: '30 min' },
        ]}
        footer={<span>Sin cargo</span>}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Resumen' })).toBeInTheDocument();
    expect(screen.getByText('Servicio')).toBeInTheDocument();
    expect(screen.getByText('Limpieza')).toBeInTheDocument();
    expect(screen.getByText('Duración')).toBeInTheDocument();
    expect(screen.getByText('Sin cargo')).toBeInTheDocument();
  });
});
