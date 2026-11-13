import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ContentImage } from '../components/ContentImage';
import { Button, buttonStyles } from '../components/ui/Button';
import { Notice } from '../components/ui/Notice';
import { Skeleton } from '../components/ui/Skeleton';
import { api, ApiError } from '../services/api';
import type { Clinic } from '../types/api';

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

function detailMessage(cause: unknown) {
  if (cause instanceof ApiError) {
    if (cause.status === 404)
      return 'No encontramos ese consultorio. Puede que ya no esté publicado.';
    if (cause.status >= 500)
      return 'El detalle tiene un problema temporal. Inténtalo de nuevo en unos minutos.';
    return cause.message;
  }
  if (
    cause instanceof TypeError ||
    (cause instanceof Error && /failed to fetch|network|load failed/i.test(cause.message))
  ) {
    return 'No pudimos conectar con DentalConnect. Revisa tu conexión e inténtalo de nuevo.';
  }
  return cause instanceof Error ? cause.message : 'No fue posible cargar el consultorio.';
}

export function ClinicDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const fromState = (location.state as { from?: string } | null)?.from ?? '';
  const from = fromState.startsWith('?') ? fromState : fromState ? `?${fromState}` : '';
  const [clinic, setClinic] = useState<Clinic>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setClinic(undefined);
    setError('');
    api
      .clinic(id)
      .then(({ data }) => {
        if (active) setClinic(data);
      })
      .catch((cause: unknown) => {
        if (active) setError(detailMessage(cause));
      });
    return () => {
      active = false;
    };
  }, [attempt, id]);

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Notice tone="error" title="No pudimos cargar el consultorio">
          <p>{error}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-danger/40 text-danger hover:bg-danger/5"
              onClick={() => setAttempt((current) => current + 1)}
            >
              Reintentar
            </Button>
            <Link
              className={buttonStyles('ghost', 'sm')}
              to={from ? `/clinics${from}` : '/clinics'}
            >
              Volver al directorio
            </Link>
          </div>
        </Notice>
      </main>
    );
  }

  if (!clinic) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6" role="status" aria-live="polite">
        <p className="sr-only">Cargando consultorio…</p>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
          <div className="grid gap-6">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <nav aria-label="Migas de pan" className="text-sm font-semibold">
        <Link
          className="text-accent-strong underline-offset-4 hover:underline"
          to={from ? `/clinics${from}` : '/clinics'}
        >
          Volver al directorio
        </Link>
      </nav>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)] lg:items-start">
        <div className="grid gap-6">
          <section className="overflow-hidden rounded-card border border-line bg-white shadow-sm">
            <div className="aspect-[16/9] w-full overflow-hidden bg-canvas">
              <ContentImage
                src={clinic.imageUrl}
                alt={`Instalaciones de ${clinic.name}`}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-5 sm:p-6">
              <p className="text-sm font-semibold text-accent-strong">
                {clinic.municipality}, {clinic.state}
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-brand sm:text-4xl">
                {clinic.name}
              </h1>
              <p className="mt-3 max-w-2xl leading-relaxed text-muted">
                {clinic.description || 'Consulta los datos de contacto y servicios disponibles.'}
              </p>

              <dl className="mt-5 grid gap-3 rounded-control border border-line bg-canvas p-4 text-sm">
                <div>
                  <dt className="font-semibold text-brand">Dirección</dt>
                  <dd className="text-muted">
                    {[
                      clinic.address,
                      clinic.municipality,
                      clinic.state,
                      clinic.postalCode ? `C.P. ${clinic.postalCode}` : '',
                    ]
                      .filter(Boolean)
                      .join(', ') || 'Dirección no disponible'}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-brand">Teléfono</dt>
                  <dd>
                    {clinic.phone ? (
                      <a
                        className="text-accent-strong underline underline-offset-4"
                        href={`tel:${clinic.phone}`}
                      >
                        {clinic.phone}
                      </a>
                    ) : (
                      <span className="text-muted">Teléfono no disponible</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-brand">Correo</dt>
                  <dd>
                    {clinic.email ? (
                      <a
                        className="break-all text-accent-strong underline underline-offset-4"
                        href={`mailto:${clinic.email}`}
                      >
                        {clinic.email}
                      </a>
                    ) : (
                      <span className="text-muted">Correo no disponible</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <section aria-labelledby="services-title">
            <h2 id="services-title" className="font-display text-2xl font-semibold text-brand">
              Servicios disponibles
            </h2>
            {clinic.services.length === 0 ? (
              <Notice tone="info" className="mt-4">
                Este consultorio aún no publica servicios.
              </Notice>
            ) : (
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {clinic.services.map((service) => (
                  <li
                    key={service.id}
                    className="flex flex-col rounded-card border border-line bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-lg font-semibold text-brand">
                        {service.name}
                      </h3>
                      <span className="whitespace-nowrap rounded-full border border-accent/30 bg-accent/5 px-2.5 py-1 text-xs font-bold text-accent-strong">
                        Desde {money.format(service.priceFrom)}
                      </span>
                    </div>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                      {service.description || 'Descripción no disponible.'}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
                      <span className="text-sm font-semibold text-brand">
                        {service.estimatedDurationMinutes} min
                      </span>
                      <Link
                        className={buttonStyles('primary', 'sm')}
                        to={`/clinics/${clinic.id}/solicitar?serviceId=${encodeURIComponent(service.id)}`}
                        state={from ? { from } : undefined}
                        aria-label={`Solicitar ${service.name} en ${clinic.name}`}
                      >
                        Solicitar atención
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {clinic.dentists && clinic.dentists.length > 0 && (
            <section aria-labelledby="team-title">
              <h2 id="team-title" className="font-display text-2xl font-semibold text-brand">
                Equipo dental
              </h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {clinic.dentists.map((dentist) => (
                  <li
                    key={dentist.id}
                    className="overflow-hidden rounded-card border border-line bg-white shadow-sm"
                  >
                    <div className="h-44 w-full overflow-hidden bg-canvas">
                      <ContentImage
                        src={dentist.imageUrl}
                        alt={`Fotografía de ${dentist.firstName} ${dentist.lastName}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-5">
                      <p className="text-sm font-semibold text-accent-strong">
                        {dentist.specialty || 'Odontología general'}
                      </p>
                      <h3 className="mt-1 font-display text-lg font-semibold text-brand">
                        {dentist.firstName} {dentist.lastName}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
                        {dentist.biography || 'Biografía profesional no disponible.'}
                      </p>
                      <Link
                        className={`${buttonStyles('outline', 'sm')} mt-4 w-full`}
                        to={`/clinics/${clinic.id}/dentistas/${dentist.id}`}
                        state={from ? { from } : undefined}
                        aria-label={`Ver perfil de ${dentist.firstName} ${dentist.lastName}`}
                      >
                        Ver perfil
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="rounded-card border border-line bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-semibold text-brand">Solicita tu cita</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Elige un servicio y consulta horarios. Enviar la solicitud no confirma ni cobra la cita.
          </p>
          <ol className="mt-4 grid gap-3 text-sm text-ink">
            <li className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">
                1
              </span>
              Elige servicio y dentista.
            </li>
            <li className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">
                2
              </span>
              Consulta los horarios disponibles.
            </li>
            <li className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">
                3
              </span>
              El consultorio confirma tu cita.
            </li>
          </ol>
          <a className={`${buttonStyles('coral', 'md')} mt-5 w-full`} href="#services-title">
            Elegir servicio
          </a>
        </aside>
      </div>
    </main>
  );
}
