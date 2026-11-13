import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClinicCard } from '../components/ClinicCard';
import { Button, buttonStyles } from '../components/ui/Button';
import { Notice } from '../components/ui/Notice';
import { Skeleton } from '../components/ui/Skeleton';
import { api, ApiError } from '../services/api';
import { filterNearbyClinics } from '../services/clinicSearch';
import type { Clinic, Service } from '../types/api';

type ClinicWithDistance = Clinic & { distanceKm?: number };
const PAGE_SIZE = 6;

function directoryMessage(cause: unknown) {
  if (cause instanceof ApiError) {
    if (cause.status >= 500) {
      return 'El directorio tiene un problema temporal. Inténtalo de nuevo en unos minutos.';
    }
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

export function ClinicListPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const serviceId = params.get('servicio') ?? '';
  const [search, setSearch] = useState(q);
  const [selectedService, setSelectedService] = useState(serviceId);
  const [catalog, setCatalog] = useState<Clinic[]>([]);
  const [clinics, setClinics] = useState<ClinicWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [nearby, setNearby] = useState(false);
  const [error, setError] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(1);

  const services = useMemo(() => {
    const unique = new Map<string, Service>();
    [...catalog, ...clinics].forEach((clinic) =>
      clinic.services.forEach((service) => unique.set(service.id, service)),
    );
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [catalog, clinics]);

  useEffect(() => {
    setSearch(q);
    setSelectedService(serviceId);
  }, [q, serviceId]);

  useEffect(() => {
    if (!q && !serviceId) return;
    let active = true;
    api
      .clinics()
      .then(({ data }) => {
        if (active) setCatalog(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api
      .clinics(q, serviceId)
      .then(({ data }) => {
        if (!active) return;
        setClinics(data);
        setPage(1);
        if (!q && !serviceId) setCatalog(data);
      })
      .catch((cause: unknown) => {
        if (active) setError(directoryMessage(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt, q, serviceId]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = new URLSearchParams();
    if (search.trim()) next.set('q', search.trim());
    if (selectedService) next.set('servicio', selectedService);
    setParams(next);
    setNearby(false);
    setLocationMessage('');
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedService('');
    setParams(new URLSearchParams());
    setNearby(false);
    setLocationMessage('');
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
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const data = catalog.length ? catalog : (await api.clinics()).data;
          if (!catalog.length) setCatalog(data);
          setClinics(filterNearbyClinics(data, coords.latitude, coords.longitude, 10));
          setPage(1);
          setNearby(true);
          setLocationMessage(
            'Mostramos consultorios dentro de 10 km, ordenados por distancia. No guardamos tu ubicación.',
          );
        } catch (cause) {
          setError(directoryMessage(cause));
        } finally {
          setLocating(false);
        }
      },
      (cause) => {
        setLocationMessage(
          cause.code === 1
            ? 'No se concedió el permiso de ubicación. Puedes buscar por zona manualmente.'
            : 'No se pudo obtener tu ubicación. Puedes buscar por zona manualmente.',
        );
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
    );
  };

  const totalPages = Math.max(1, Math.ceil(clinics.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visibleClinics = clinics.slice(start, start + PAGE_SIZE);

  return (
    <main>
      <section className="border-b border-line bg-gradient-to-b from-white to-canvas">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <p className="inline-flex rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-sm font-semibold text-accent-strong">
            Atención dental en tu zona
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold tracking-tight text-brand sm:text-5xl lg:text-6xl">
            Encuentra un consultorio que se adapte a ti.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
            Compara ubicación, servicios y datos de contacto antes de elegir.
          </p>

          <form
            onSubmit={submit}
            className="mt-8 rounded-card border border-line bg-white p-4 shadow-sm sm:p-5"
            aria-label="Buscar consultorios"
          >
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
              <label className="grid gap-1.5 text-sm font-semibold text-ink">
                Zona o código postal
                <input
                  id="search"
                  name="search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Ciudad, colonia o C.P."
                  maxLength={120}
                  autoComplete="postal-code"
                  className="min-h-11 rounded-control border border-line-strong bg-white px-3 text-base font-normal text-ink outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-ink">
                Servicio dental
                <select
                  id="service-filter"
                  name="serviceId"
                  value={selectedService}
                  onChange={(event) => setSelectedService(event.target.value)}
                  className="min-h-11 rounded-control border border-line-strong bg-white px-3 text-base font-normal text-ink outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
                >
                  <option value="">Todos los servicios</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" className="md:min-w-32">
                Buscar
              </Button>
            </div>
          </form>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={searchNearby}
              disabled={locating}
              loading={locating}
            >
              {locating ? 'Buscando cerca de ti…' : 'Usar mi ubicación'}
            </Button>
            {(search || selectedService) && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-semibold text-accent-strong underline underline-offset-4 hover:text-brand"
              >
                Limpiar filtros
              </button>
            )}
            {locationMessage && (
              <p role="status" className="text-sm leading-relaxed text-muted">
                {locationMessage}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-live="polite" aria-busy={loading}>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
          <h2 className="font-display text-2xl font-semibold text-brand">
            {nearby ? 'Consultorios cercanos' : 'Consultorios disponibles'}
          </h2>
          {!loading && !error && (
            <p className="text-sm text-muted">
              {clinics.length} {clinics.length === 1 ? 'consultorio' : 'consultorios'}
            </p>
          )}
        </div>

        {loading && (
          <div className="mt-6 grid gap-6" role="status">
            <p className="sr-only">Cargando consultorios…</p>
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="grid gap-4 py-5 sm:grid-cols-[10rem_1fr]">
                <Skeleton className="h-32 w-full" />
                <div className="grid content-start gap-3">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <Notice tone="error" title="No pudimos cargar el directorio" className="mt-6">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 border-danger/40 text-danger hover:bg-danger/5"
              onClick={() => setAttempt((current) => current + 1)}
            >
              Reintentar
            </Button>
          </Notice>
        )}

        {!loading && !error && clinics.length === 0 && (
          <Notice tone="info" className="mt-6">
            No encontramos coincidencias. Cambia la zona o el servicio.
          </Notice>
        )}

        {!loading && !error && clinics.length > 0 && (
          <>
            <ul className="divide-y divide-line border-b border-line">
              {visibleClinics.map((clinic) => (
                <li key={clinic.id}>
                  <ClinicCard clinic={clinic} from={params.toString()} />
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col items-center gap-3">
              <p className="text-sm text-muted">
                Mostrando {start + 1}–{Math.min(start + PAGE_SIZE, clinics.length)} de{' '}
                {clinics.length}
              </p>
              {totalPages > 1 && (
                <nav aria-label="Paginación de consultorios" className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    className={buttonStyles('ghost', 'sm')}
                    disabled={currentPage === 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Anterior
                  </button>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
                    <button
                      key={number}
                      type="button"
                      aria-label={`Página ${number}`}
                      aria-current={number === currentPage ? 'page' : undefined}
                      className={buttonStyles(
                        number === currentPage ? 'primary' : 'outline',
                        'sm',
                        'min-w-10',
                      )}
                      onClick={() => setPage(number)}
                    >
                      {number}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={buttonStyles('ghost', 'sm')}
                    disabled={currentPage === totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  >
                    Siguiente
                  </button>
                </nav>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
