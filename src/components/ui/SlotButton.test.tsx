import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SlotButton } from './SlotButton';

describe('SlotButton', () => {
  it('exposes the selected state with aria-pressed', () => {
    render(<SlotButton selected>09:00</SlotButton>);
    expect(screen.getByRole('button', { name: '09:00' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders an unselected slot as unpressed', () => {
    render(<SlotButton>10:00</SlotButton>);
    expect(screen.getByRole('button', { name: '10:00' })).toHaveAttribute('aria-pressed', 'false');
  });
});
