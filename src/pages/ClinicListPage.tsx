import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ClinicCard } from '../components/ClinicCard';
import { api, ApiError } from '../services/api';
import { filterNearbyClinics } from '../services/clinicSearch';
import type { Clinic, Service } from '../types/api';

type ClinicWithDistance = Clinic & { distanceKm?: number };
const PAGE_SIZE = 6;

function searchErrorMessage(cause: unknown) {
  if (cause instanceof ApiError) {
    if (cause.status >= 500)
      return 'El directorio tiene un problema temporal. Intenta de nuevo en unos minutos.';
    return cause.message;
  }
  if (
    cause instanceof TypeError ||
    (cause instanceof Error && /failed to fetch|network|load failed/i.test(cause.message))
  ) {
    return 'No pudimos conectar con el directorio. Revisa tu conexión e inténtalo de nuevo.';
  }
  return cause instanceof Error
    ? cause.message
    : 'No fue posible cargar los consultorios. Inténtalo de nuevo.';
}

function LoadingCards() {
  return (
    <div className="card-grid" aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <article className="clinic-card clinic-card-skeleton" key={index}>
          <div className="skeleton skeleton-img" />
          <div className="clinic-card-body">
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-text" />
            <div className="skeleton skeleton-text" />
            <div className="skeleton skeleton-btn" />
          </div>
        </article>
      ))}
    </div>
  );
}

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
  const [page, setPage] = useState(1);

  const services = useMemo(() => {
    const unique = new Map<string, Service>();
    catalog.forEach((clinic) =>
      clinic.services.forEach((service) => unique.set(service.id, service)),
    );
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [catalog]);

  const totalPages = Math.ceil(clinics.length / PAGE_SIZE);
  const firstPage = Math.max(1, Math.min(page - 2, totalPages - 4));
  const lastPage = Math.min(totalPages, firstPage + 4);
  const visibleClinics = clinics.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    let active = true;
    api
      .clinics()
      .then(({ data }) => {
        if (active) {
          setCatalog(data);
          setClinics(data);
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(searchErrorMessage(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const load = async (term: string, selectedService: string) => {
    setLoading(true);
    setError('');
    setNearby(false);
    setLocationMessage('');
    setPage(1);
    try {
      const { data } = await api.clinics(term.trim(), selectedService);
      setClinics(data);
      setCatalog((previous) => (previous.length ? previous : data));
    } catch (cause) {
      setError(searchErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void load(search, serviceId);
  };

  const clearFilters = () => {
    setSearch('');
    setServiceId('');
    void load('', '');
  };

  const searchNearby = () => {
    setError('');
    setLocationMessage('');
    setNearby(false);
    if (!navigator.geolocation) {
      setLocationMessage('Este navegador no permite usar la ubicación. Puedes buscar por zona.');
      return;
    }
    setLocating(true);
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const { data } = await api.clinics();
          setCatalog(data);
          setClinics(filterNearbyClinics(data, coords.latitude, coords.longitude, 10));
          setPage(1);
          setNearby(true);
          setLocationMessage(
            'Mostramos consultorios dentro de 10 km, ordenados por distancia. No guardamos tu ubicación.',
          );
        } catch (cause) {
          setError(searchErrorMessage(cause));
          setLocationMessage(
            'No pudimos consultar los consultorios cercanos. Puedes buscar por zona.',
          );
        } finally {
          setLocating(false);
          setLoading(false);
        }
      },
      (cause) => {
        setLocationMessage(
          cause.code === 1
            ? 'No se concedió el permiso de ubicación. Puedes buscar por zona manualmente.'
            : 'No se pudo obtener tu ubicación. Puedes buscar por zona manualmente.',
        );
        setLocating(false);
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
    );
  };

  return (
    <main>
      <section className="hero" aria-labelledby="directory-title">
        <div className="hero-content">
          <p className="eyebrow">Atención dental en tu zona</p>
          <h1 id="directory-title">Encuentra un consultorio que se adapte a ti.</h1>
          <p className="hero-description">
            Compara ubicación, servicios y datos de contacto antes de elegir.
          </p>

          <form onSubmit={submit} className="hero-search-form" aria-label="Buscar consultorios">
            <div className="search">
              <div className="search-input-group">
                <label htmlFor="search">Zona o código postal</label>
                <div className="search-control">
                  <span className="search-icon" aria-hidden="true">
                    ⌖
                  </span>
                  <input
                    id="search"
                    name="search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Ciudad, colonia o C.P."
                    maxLength={120}
                    autoComplete="postal-code"
                  />
                </div>
              </div>
              <div className="search-select-group">
                <label htmlFor="service-filter">Servicio dental</label>
                <select
                  id="service-filter"
                  name="serviceId"
                  value={serviceId}
                  onChange={(event) => setServiceId(event.target.value)}
                >
                  <option value="">Todos los servicios</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="search-submit" disabled={loading}>
                {loading ? 'Buscando…' : 'Buscar'}
              </button>
            </div>
            {(search || serviceId) && (
              <button
                type="button"
                className="text-button clear-filters"
                onClick={clearFilters}
                disabled={loading}
              >
                Limpiar filtros
              </button>
            )}
          </form>

          <div className="location-action">
            <button
              className="location-button"
              type="button"
              onClick={searchNearby}
              disabled={loading || locating}
              aria-describedby="location-help"
            >
              {locating ? 'Buscando cerca de ti…' : 'Usar mi ubicación'}
            </button>
            <p id="location-help" className="field-help">
              Solo solicitaremos permiso si eliges esta opción.
            </p>
            {locationMessage && (
              <p className="location-message" role="status" aria-live="polite">
                {locationMessage}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="directory" aria-labelledby="results-title" aria-busy={loading}>
        <div className="directory-header">
          <div>
            <h2 id="results-title">
              {nearby ? 'Consultorios cercanos' : 'Consultorios disponibles'}
            </h2>
            <p className="directory-intro">
              Información para comparar opciones y contactar directamente.
            </p>
          </div>
          {!loading && !error && clinics.length > 0 && (
            <p className="results-count" role="status" aria-live="polite">
              {clinics.length} {clinics.length === 1 ? 'consultorio' : 'consultorios'}
            </p>
          )}
        </div>

        {loading && (
          <div className="results-loading">
            <p className="loading-message" role="status" aria-live="polite">
              {locating ? 'Buscando consultorios cercanos…' : 'Cargando consultorios…'}
            </p>
            <LoadingCards />
          </div>
        )}

        {error && (
          <div className="notice error" role="alert">
            <div>
              <h3>No pudimos completar la búsqueda</h3>
              <p>{error}</p>
            </div>
            <button
              type="button"
              onClick={() => void load(search, serviceId)}
              className="button-retry"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && clinics.length === 0 && (
          <div className="empty-state notice" role="status">
            <h3>{nearby ? 'No hay consultorios cercanos' : 'No encontramos coincidencias'}</h3>
            <p>
              {nearby
                ? 'No hay consultorios con coordenadas registradas dentro de 10 km. Prueba una búsqueda por zona.'
                : 'Prueba otra zona o servicio. Puedes cambiar los filtros cuando quieras.'}
            </p>
            {(search || serviceId || nearby) && (
              <button type="button" className="button-outline" onClick={clearFilters}>
                Ver todos los consultorios
              </button>
            )}
          </div>
        )}

        {!loading && !error && clinics.length > 0 && (
          <>
            <div id="clinic-results" className="card-grid" aria-label="Resultados de consultorios">
              {visibleClinics.map((clinic) => (
                <ClinicCard clinic={clinic} key={clinic.id} />
              ))}
            </div>
            {totalPages > 1 && (
              <nav className="pagination-wrap" aria-label="Paginación de consultorios">
                <p className="pagination-summary" aria-live="polite" role="status">
                  Página {page} de {totalPages}
                </p>
                <ul className="pagination">
                  <li>
                    <button
                      type="button"
                      className="pagination-button"
                      onClick={() => setPage((current) => current - 1)}
                      disabled={page === 1}
                      aria-label="Página anterior"
                    >
                      Anterior
                    </button>
                  </li>
                  {Array.from(
                    { length: Math.max(0, lastPage - firstPage + 1) },
                    (_, index) => firstPage + index,
                  ).map((pageNumber) => (
                    <li key={pageNumber}>
                      <button
                        type="button"
                        className="pagination-button"
                        onClick={() => setPage(pageNumber)}
                        aria-label={`Ir a la página ${pageNumber}`}
                        aria-current={page === pageNumber ? 'page' : undefined}
                      >
                        {pageNumber}
                      </button>
                    </li>
                  ))}
                  <li>
                    <button
                      type="button"
                      className="pagination-button"
                      onClick={() => setPage((current) => current + 1)}
                      disabled={page === totalPages}
                      aria-label="Página siguiente"
                    >
                      Siguiente
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </>
        )}
      </section>
    </main>
  );
}
