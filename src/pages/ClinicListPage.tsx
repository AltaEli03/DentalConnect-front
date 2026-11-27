import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { ClinicCard } from '../components/ClinicCard';
import { Button } from '../components/ui/Button';
import { Field, controlClass } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import { Skeleton } from '../components/ui/Skeleton';
import { api, ApiError } from '../services/api';
import { filterNearbyClinics } from '../services/clinicSearch';
import { getPageItems } from '../lib/pagination';
import { useSeo } from '../lib/useSeo';
import type { Clinic, Service } from '../types/api';

type ClinicWithDistance = Clinic & { distanceKm?: number };
const PAGE_SIZE = 6;
const FILTER_DEBOUNCE_MS = 350;

function filtersToParams(search: string, serviceId: string) {
  const next = new URLSearchParams();
  if (search.trim()) next.set('q', search);
  if (serviceId) next.set('servicio', serviceId);
  return next;
}
const directorySchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'DentalConnect',
  url: 'https://main.d63zai2tg2i2u.amplifyapp.com/clinics',
  inLanguage: 'es-MX',
  description: 'Directorio de consultorios dentales y servicios en México.',
};

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
  useSeo({
    title: 'Consultorios dentales cerca de ti',
    description:
      'Busca consultorios dentales por zona o servicio. Compara sus datos y consulta especialistas antes de solicitar atención.',
    path: '/clinics',
    structuredData: directorySchema,
  });
  const [params, setParams] = useSearchParams();
  const location = useLocation();
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
  const [pagination, setPagination] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
  const resultsRef = useRef<HTMLElement>(null);

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

  // La URL se actualiza sola para que el filtro no dependa del botón Buscar.
  useEffect(() => {
    const next = filtersToParams(search, selectedService);
    if (next.toString() === params.toString()) return;
    const timeout = window.setTimeout(() => {
      setParams(next, { replace: true });
      setPage(1);
      setNearby(false);
      setLocationMessage('');
    }, FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [search, selectedService, params, setParams]);

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
    if (nearby) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    api
      .clinics(q, serviceId, page, PAGE_SIZE)
      .then(({ data, pagination: pageInfo }) => {
        if (!active) return;
        setClinics(data);
        setPagination(pageInfo ?? { page, pageSize: PAGE_SIZE, totalItems: data.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
        setCatalog((current) => [...new Map([...current, ...data].map((clinic) => [clinic.id, clinic])).values()]);
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
  }, [attempt, q, serviceId, page, nearby]);

  const changeService = (value: string) => {
    setSelectedService(value);
    const next = filtersToParams(search, value);
    if (next.toString() !== params.toString()) {
      setParams(next, { replace: true });
      setPage(1);
      setNearby(false);
      setLocationMessage('');
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = filtersToParams(search, selectedService);
    if (next.toString() !== params.toString()) setParams(next);
    setPage(1);
    setNearby(false);
    setLocationMessage('');
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedService('');
    setParams(new URLSearchParams());
    setPage(1);
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
          const data: Clinic[] = [];
          let currentPage = 1;
          let totalPages = 1;
          while (currentPage <= totalPages) {
            const response = await api.clinics('', '', currentPage, 24);
            data.push(...response.data);
            totalPages = response.pagination.totalPages;
            currentPage += 1;
          }
          const nearbyClinics = filterNearbyClinics(data, coords.latitude, coords.longitude, 10);
          setCatalog(data);
          setClinics(nearbyClinics);
          setPagination({ page: 1, pageSize: PAGE_SIZE, totalItems: nearbyClinics.length, totalPages: Math.max(1, Math.ceil(nearbyClinics.length / PAGE_SIZE)), hasNextPage: nearbyClinics.length > PAGE_SIZE, hasPreviousPage: false });
          setPage(1);
          setNearby(true);
          setLocationMessage('Consultorios a menos de 10 km. Tu ubicación no se guarda.');
        } catch (cause) {
          setError(directoryMessage(cause));
        } finally {
          setLocating(false);
        }
      },
      (cause) => {
        setLocationMessage(
          cause.code === 1
            ? 'Permiso no concedido. Busca por zona.'
            : 'Ubicación no disponible. Busca por zona.',
        );
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
    );
  };

  const totalPages = Math.max(1, pagination.totalPages);
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visibleClinics = nearby ? clinics.slice(start, start + PAGE_SIZE) : clinics;
  const goToPage = (next: number) => {
    setPage(next);
    resultsRef.current?.scrollIntoView?.({ block: 'start' });
  };

  return (
    <main>
      <section className="border-b border-line bg-canvas">
        <div className="mx-auto w-full max-w-[1180px] px-5 pb-8 pt-12 sm:px-8 lg:pb-10 lg:pt-14">
          <p className="flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.17em] text-accent-strong">
            <span className="w-6 border-t border-accent" aria-hidden="true" />
            Directorio dental
          </p>
          <h1 className="mt-4 max-w-[16ch] font-display text-[clamp(2.25rem,4.8vw,3.375rem)] font-bold leading-[1.03] tracking-[-0.04em] text-heading">
            Encuentra tu consultorio dental.
          </h1>
          <p className="mt-3 max-w-[50ch] text-base leading-relaxed text-muted">
            Compara servicios, ubicación y especialistas antes de solicitar tu cita.
          </p>

          <form
            onSubmit={submit}
            className="mt-8 rounded-panel border border-line bg-surface p-3.5"
            aria-label="Buscar consultorios"
          >
            <div className="grid gap-3 md:grid-cols-[minmax(0,1.35fr)_minmax(0,0.75fr)] md:items-end">
              <div className="flex items-end gap-2">
                <Field
                  id="search"
                  label="Nombre, zona o código postal"
                  labelClassName="text-[10px] font-semibold uppercase tracking-[0.13em] text-subtle"
                  className="min-w-0 flex-1"
                >
                  <input
                    id="search"
                    name="search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Consultorio, ciudad, colonia o C.P."
                    maxLength={120}
                    autoComplete="off"
                    className={controlClass}
                  />
                </Field>
                <Button type="submit" className="shrink-0 px-4 md:min-w-28">
                  Buscar
                </Button>
              </div>
              <Field
                id="service-filter"
                label="Servicio dental"
                labelClassName="text-[10px] font-semibold uppercase tracking-[0.13em] text-subtle"
              >
                <select
                  id="service-filter"
                  name="serviceId"
                  value={selectedService}
                  onChange={(event) => changeService(event.target.value)}
                  className={controlClass}
                >
                  <option value="">Todos los servicios</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
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
                  className="text-sm font-semibold text-accent-strong underline underline-offset-4 hover:text-heading"
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
          </form>
        </div>
      </section>

      <section
        ref={resultsRef}
        className="mx-auto w-full max-w-[1180px] scroll-mt-20 px-5 py-10 sm:px-8"
        aria-live="polite"
        aria-busy={loading}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3 pb-3">
          <h2 className="font-display text-2xl font-bold tracking-[-0.025em] text-heading">
            {nearby ? 'Cerca de ti' : 'Resultados'}
          </h2>
          {!loading && !error && (
            <p className="text-[11px] uppercase tracking-[0.13em] text-subtle">
              {pagination.totalItems} {pagination.totalItems === 1 ? 'consultorio' : 'consultorios'}
            </p>
          )}
        </div>

        {loading && (
          <div
            className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
            role="status"
          >
            <p className="sr-only">Cargando consultorios…</p>
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-card border border-line bg-surface"
              >
                <Skeleton className="aspect-[16/9] w-full" />
                <div className="grid content-start gap-3 p-[18px]">
                  <Skeleton className="h-3 w-2/5" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <Notice tone="error" title="No pudimos cargar el directorio" className="mt-5">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 border-danger/40 text-danger-text hover:bg-danger/5"
              onClick={() => setAttempt((current) => current + 1)}
            >
              Reintentar
            </Button>
          </Notice>
        )}

        {!loading && !error && clinics.length === 0 && (
          <Notice tone="info" className="mt-5">
            No hay resultados. Prueba otra zona o servicio.
          </Notice>
        )}

        {!loading && !error && clinics.length > 0 && (
          <>
            <ul className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visibleClinics.map((clinic, index) => (
                <li key={clinic.id} className="min-w-0">
                  <ClinicCard
                    clinic={clinic}
                    from={location.search}
                    priority={index === 0 && start === 0}
                  />
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col items-center gap-3">
              <p className="text-[11px] text-subtle">
                Mostrando {pagination.totalItems ? start + 1 : 0}–
                {Math.min(start + PAGE_SIZE, pagination.totalItems)} de {pagination.totalItems}
              </p>
              {totalPages > 1 && (
                <nav
                  aria-label="Paginación de consultorios"
                  className="flex flex-wrap items-center justify-center gap-1"
                >
                  <button
                    type="button"
                    aria-label="Página anterior"
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-2 text-sm font-semibold text-subtle hover:bg-surface-soft hover:text-heading disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={currentPage === 1}
                    onClick={() => goToPage(Math.max(1, currentPage - 1))}
                  >
                    <span aria-hidden="true">‹</span>
                  </button>
                  {getPageItems(currentPage, totalPages).map((item, index) =>
                    item === 'ellipsis' ? (
                      <span key={`ellipsis-${index}`} aria-hidden="true" className="px-1 text-subtle">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        aria-label={`Página ${item}`}
                        aria-current={item === currentPage ? 'page' : undefined}
                        className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-2 text-sm font-semibold ${
                          item === currentPage
                            ? 'text-heading underline decoration-coral-text decoration-2 underline-offset-4'
                            : 'text-subtle hover:bg-surface-soft hover:text-heading'
                        }`}
                        onClick={() => goToPage(item)}
                      >
                        {item}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    aria-label="Página siguiente"
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-2 text-sm font-semibold text-subtle hover:bg-surface-soft hover:text-heading disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={currentPage === totalPages}
                    onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
                  >
                    <span aria-hidden="true">›</span>
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
