import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders its label', () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });

  it('announces and blocks a loading action', () => {
    render(<Button loading>Guardar</Button>);
    const button = screen.getByRole('button', { name: 'Guardar' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('uses an opaque focus ring', () => {
    render(<Button>Guardar</Button>);
    const classes = screen.getByRole('button', { name: 'Guardar' }).className;
    expect(classes).toContain('focus-visible:ring-accent');
    expect(classes).not.toContain('ring-accent/30');
  });

  it('applies the coral call-to-action variant', () => {
    render(<Button variant="coral">Enviar solicitud</Button>);
    expect(screen.getByRole('button', { name: 'Enviar solicitud' }).className).toContain(
      'bg-coral',
    );
  });
});
