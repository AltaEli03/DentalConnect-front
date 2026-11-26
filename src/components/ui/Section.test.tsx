import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Section } from './Section';

describe('Section', () => {
  it('renders its heading, description and content', () => {
    render(
      <Section title="Servicios" description="Lo que ofrece el consultorio">
        <p>Contenido</p>
      </Section>,
    );

    expect(screen.getByRole('heading', { name: 'Servicios' })).toBeInTheDocument();
    expect(screen.getByText('Lo que ofrece el consultorio')).toBeInTheDocument();
    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });
});
