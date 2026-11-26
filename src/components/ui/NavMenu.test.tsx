import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { NavMenu } from './NavMenu';

describe('NavMenu', () => {
  it('opens, exposes its links and closes with Escape returning focus', () => {
    render(
      <MemoryRouter>
        <NavMenu
          label="Menú"
          groups={[
            { label: 'Explorar', items: [{ to: '/clinics', label: 'Consultorios' }] },
          ]}
        />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole('button', { name: 'Menú' });
    fireEvent.click(trigger);
    expect(screen.getByRole('link', { name: 'Consultorios' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('link', { name: 'Consultorios' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
