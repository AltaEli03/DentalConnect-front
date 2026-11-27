import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the title, body and action', () => {
    render(
      <EmptyState title="Sin citas" action={<button type="button">Ver directorio</button>}>
        Todavía no tienes citas.
      </EmptyState>,
    );

    expect(screen.getByRole('heading', { name: 'Sin citas' })).toBeInTheDocument();
    expect(screen.getByText('Todavía no tienes citas.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver directorio' })).toBeInTheDocument();
  });
});
