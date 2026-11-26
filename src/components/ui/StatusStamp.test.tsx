import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusStamp } from './StatusStamp';

describe('StatusStamp', () => {
  it('shows the Spanish label for a confirmed appointment', () => {
    render(<StatusStamp status="CONFIRMED" />);
    expect(screen.getByText('Confirmada')).toBeInTheDocument();
  });
});
