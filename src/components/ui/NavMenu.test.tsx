import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { NavMenu } from './NavMenu';

const groups = [
  { label: 'Explorar', items: [{ to: '/clinics', label: 'Consultorios' }] },
];

describe('NavMenu', () => {
  it('opens, exposes its links and closes with Escape returning focus', () => {
    render(
      <MemoryRouter>
        <NavMenu label="Menú" groups={groups} />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole('button', { name: 'Menú' });
    fireEvent.click(trigger);
    expect(screen.getByRole('link', { name: 'Consultorios' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('link', { name: 'Consultorios' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps the mobile menu above the page and closes when clicking outside', () => {
    render(
      <MemoryRouter>
        <NavMenu label="Menú" groups={groups} portal />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Menú' }));
    const panel = screen.getByRole('navigation', { name: 'Menú opciones' });
    expect(panel).toHaveStyle({ position: 'fixed', top: '58px' });
    expect(panel).toHaveClass('z-[1000]');
    expect(screen.getByRole('link', { name: 'Consultorios' })).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('navigation', { name: 'Menú opciones' })).not.toBeInTheDocument();
  });
});
