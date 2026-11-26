import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ClinicCard } from './ClinicCard';

describe('ClinicCard', () => {
  it('shows clinic data and its route', () => {
    render(
      <MemoryRouter>
        <ClinicCard
          clinic={{
            id: 'abc',
            name: 'Clínica Sonrisa',
            description: 'Atención familiar',
            phone: '555',
            email: 'a@b.mx',
            address: 'Calle 1',
            municipality: 'Puebla',
            state: 'Puebla',
            postalCode: '72000',
            services: [
              {
                id: 's1',
                name: 'Limpieza',
                description: 'Dental',
                estimatedDurationMinutes: 30,
                priceFrom: 500,
              },
            ],
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Clínica Sonrisa' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver consultorio/ })).toHaveAttribute(
      'href',
      '/clinics/abc',
    );
    expect(screen.getByRole('list', { name: 'Servicios publicados' })).toBeInTheDocument();
    expect(screen.getByText('$500')).toBeInTheDocument();
    expect(screen.getByText(/Desde/)).toBeInTheDocument();
  });

  it('uses the clinic initials and hides the price when there are no services', () => {
    render(
      <MemoryRouter>
        <ClinicCard
          clinic={{
            id: 'abc',
            name: 'Clínica Sonrisa',
            description: 'Atención familiar',
            phone: '555',
            email: 'a@b.mx',
            address: 'Calle 1',
            municipality: 'Puebla',
            state: 'Puebla',
            postalCode: '72000',
            imageUrl: null,
            services: [],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('CS')).toBeInTheDocument();
    expect(screen.queryByText(/Desde/)).not.toBeInTheDocument();
  });
});
