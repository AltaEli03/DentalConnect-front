import { describe, expect, it } from 'vitest';
import type { Clinic } from '../types/api';
import { distanceKm, filterNearbyClinics } from './clinicSearch';


const clinic = (id: string, latitude: number | null, longitude: number | null): Clinic => ({
  id, name: id, description: '', phone: '', email: '', address: '', municipality: '', state: '', postalCode: '', latitude, longitude, services: [],
});


describe('búsqueda por cercanía', () => {
  it('calcula aproximadamente la distancia entre Puebla y CDMX', () => {
    expect(distanceKm(19.0433, -98.2019, 19.4326, -99.1332)).toBeGreaterThan(100);
    expect(distanceKm(19.0433, -98.2019, 19.4326, -99.1332)).toBeLessThan(120);
  });


  it('excluye clínicas fuera del radio o sin coordenadas y ordena las restantes', () => {
    const nearby = [clinic('far', 19.2, -98.2), clinic('near', 19.05, -98.2), clinic('unknown', null, null)];
    const result = filterNearbyClinics(nearby, 19.0433, -98.2019, 10);
    expect(result.map((item) => item.id)).toEqual(['near']);
    expect(result[0].distanceKm).toBeGreaterThanOrEqual(0);
    expect(result[0].distanceKm).toBeLessThan(10);
  });


  it('no inventa resultados si las coordenadas del paciente son inválidas', () => {
    expect(filterNearbyClinics([clinic('a', 19, -98)], Number.NaN, -98)).toEqual([]);
  });
});

