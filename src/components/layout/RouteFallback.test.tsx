import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RouteFallback } from './RouteFallback';

describe('RouteFallback', () => {
  it('renders a real skeleton block instead of the removed legacy skeleton class', () => {
    const { container } = render(<RouteFallback />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(container.querySelector('.skeleton')).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});
