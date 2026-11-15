import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContentImage } from './ContentImage';

describe('ContentImage', () => {
  it('shows an accessible placeholder when there is no source', () => {
    render(<ContentImage alt="Consultorio" />);
    expect(screen.getByRole('img', { name: /Imagen no disponible/ })).toBeInTheDocument();
  });

  it('falls back when the image fails to load', () => {
    render(<ContentImage src="https://example.com/broken.jpg" alt="Consultorio" />);
    fireEvent.error(screen.getByRole('img', { name: 'Consultorio' }));
    expect(screen.getByRole('img', { name: /Imagen no disponible/ })).toBeInTheDocument();
  });
});
