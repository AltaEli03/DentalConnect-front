import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ClinicCard } from '../components/ClinicCard';
import { api } from '../services/api';
import type { Clinic, Service } from '../types/api';

export function ClinicListPage() {
  const [search, setSearch] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [catalog, setCatalog] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Extraer los servicios únicos para el select
  const services = useMemo(() => {
    const unique = new Map<string, Service>();
    catalog.forEach((clinic) => clinic.services.forEach((service) => unique.set(service.id, service)));
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [catalog]);

  useEffect(() => {
    api.clinics().then(({ data }) => {
      setCatalog(data);
      setClinics(data);
    }).catch((err) => {
      setError('No se pudieron cargar los consultorios.');
    }).finally(() => setLoading(false));
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    api.clinics(search, serviceId).then(({ data }) => {
      setClinics(data);
    }).catch(() => setError('Error en la búsqueda')).finally(() => setLoading(false));
  };

  return (
    <main>
      {/* SECCIÓN HERO CON BUSCADOR CORREGIDO */}
      <section className="hero">
        <p className="eyebrow">✦ Cuidado dental cerca de ti</p>
        <h1>Encuentra el consultorio ideal para tu sonrisa.</h1>
        
        <form className="search-bar" onSubmit={handleSearch}>
          <div className="search-group">
            <span aria-hidden="true">📍</span>
            <input 
              type="text" 
              placeholder="Ciudad, C.P. o Colonia" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="search-group border-left">
            <span aria-hidden="true">🦷</span>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">Todos los servicios</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          
          <button type="submit" className="btn btn-coral">
            Buscar
          </button>
        </form>
      </section>

      {/* SECCIÓN DIRECTORIO */}
      <section className="directory">
        <div className="directory-header">
          <h2>Consultorios disponibles</h2>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            {clinics.length} resultados
          </span>
        </div>

        {loading ? (
          <div className="loading-state">Cargando consultorios…</div>
        ) : error ? (
          <div className="alert alert-error">{error}</div>
        ) : clinics.length === 0 ? (
          <div className="loading-state">No encontramos resultados. Intenta con otra búsqueda.</div>
        ) : (
          <div className="card-grid">
            {clinics.map((clinic) => (
              <ClinicCard key={clinic.id} clinic={clinic} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}