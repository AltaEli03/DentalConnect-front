import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Notice } from './Notice';

describe('Notice', () => {
  it('announces errors assertively', () => {
    render(<Notice tone="error">No se pudo cargar</Notice>);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar');
  });

  it('announces success politely', () => {
    render(<Notice tone="success">Solicitud enviada</Notice>);
    expect(screen.getByRole('status')).toHaveTextContent('Solicitud enviada');
  });
});
