import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ClinicCard } from '../components/ClinicCard';
import { api } from '../services/api';
import { filterNearbyClinics } from '../services/clinicSearch';
import type { Clinic, Service } from '../types/api';

type ClinicWithDistance = Clinic & { distanceKm?: number };

export function ClinicListPage() {
  const [search, setSearch] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [catalog, setCatalog] = useState<Clinic[]>([]);
  const [clinics, setClinics] = useState<ClinicWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [nearby, setNearby] = useState(false);
  const [error, setError] = useState('');
  const [locationMessage, setLocationMessage] = useState('');

  const services = useMemo(() => {
    const unique = new Map<string, Service>();
    catalog.forEach((clinic) => clinic.services.forEach((service) => unique.set(service.id, service)));
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [catalog]);

  useEffect(() => {
    let active = true;
    api.clinics().then(({ data }) => {
      if (active) {
        setCatalog(data);
        setClinics(data);
      }
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Ocurrió un error.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const load = async (term: string, selectedService: string) => {
    setLoading(true);
    setError('');
    setNearby(false);
    setLocationMessage('');
    try {
      const { data } = await api.clinics(term, selectedService);
      setClinics(data);
      setCatalog((previous) => previous.length ? previous : data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ocurrió un error.');
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void load(search, serviceId);
  };

  const searchNearby = () => {
    setError('');
    setLocationMessage('');
    setNearby(false);
    if (!navigator.geolocation) {
      setLocationMessage('Este navegador no ofrece geolocalización. Puedes buscar por zona manualmente.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const { data } = await api.clinics();
        setCatalog(data);
        setClinics(filterNearbyClinics(data, coords.latitude, coords.longitude, 10));
        setNearby(true);
        setLocationMessage('Resultados dentro de 10 km, ordenados por distancia. Tus coordenadas no se guardan.');
      } catch (cause) {
        setLocationMessage(cause instanceof Error ? cause.message : 'No se pudieron cargar los consultorios. Usa la búsqueda manual.');
      } finally {
        setLocating(false);
      }
    }, (cause) => {
      setLocationMessage(cause.code === 1
        ? 'No se concedió el permiso de ubicación. Puedes buscar por zona manualmente.'
        : 'No se pudo obtener tu ubicación. Puedes buscar por zona manualmente.');
      setLocating(false);
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 });
  };

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Cuidado dental cerca de ti</p>
        <h1>Encuentra el consultorio ideal para tu sonrisa.</h1>
        <form onSubmit={submit}>
          <label htmlFor="search">Busca por ciudad, municipio, colonia o código postal</label>
          <div className="search-filters">
            <input id="search" value={search} onChange={(event) => setSearch(event.target.value)}
              placeholder="Ej. Puebla, Del Valle o 03100" />
            <label className="filter-label" htmlFor="service-filter">Servicio activo</label>
            <select id="service-filter" value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
              <option value="">Todos los servicios</option>
              {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
            </select>
            <button type="submit">Buscar</button>
          </div>
        </form>
        <button className="location-button" type="button" onClick={searchNearby} disabled={locating}>
          {locating ? 'Buscando cerca de ti…' : 'Usar mi ubicación (10 km)'}
        </button>
        {locationMessage && <p className="location-message" role="status">{locationMessage}</p>}
      </section>
      <section className="directory" aria-live="polite">
        <h2>{nearby ? 'Consultorios cercanos' : 'Consultorios disponibles'}</h2>
        {loading && <p>Cargando consultorios…</p>}
        {error && <div className="notice error"><p>{error}</p><button onClick={() => void load(search, serviceId)}>Reintentar</button></div>}
        {!loading && !error && clinics.length === 0 && (
          <p className="notice">{nearby ? 'No hay consultorios con coordenadas registradas dentro de 10 km.' : 'No encontramos coincidencias. Cambia la zona o el servicio para intentar de nuevo.'}</p>
        )}
        <div className="card-grid">{clinics.map((clinic) => <ClinicCard clinic={clinic} key={clinic.id} />)}</div>
      </section>
    </main>
  );
}
