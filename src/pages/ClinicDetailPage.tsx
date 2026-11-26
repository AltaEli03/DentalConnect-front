import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ContentImage } from '../components/ContentImage';
import { Button, buttonStyles } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Notice } from '../components/ui/Notice';
import { PageHeader } from '../components/ui/PageHeader';
import { Section } from '../components/ui/Section';
import { Skeleton } from '../components/ui/Skeleton';
import { api, ApiError } from '../services/api';
import { useSeo } from '../lib/useSeo';
import { formatPriceFrom } from '../lib/clinicPrice';
import type { Clinic } from '../types/api';

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

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

  useSeo({
    title: clinic ? `${clinic.name} | Consultorio dental` : 'Perfil del consultorio dental',
    description: clinic
      ? `${clinic.name} en ${clinic.municipality}, ${clinic.state}. Consulta sus servicios, especialistas y datos de contacto.`
      : 'Consulta servicios, especialistas y datos de contacto de consultorios dentales.',
    path: `/clinics/${encodeURIComponent(id)}`,
    structuredData: clinic
      ? {
          '@context': 'https://schema.org',
          '@type': 'Dentist',
          name: clinic.name,
          description: clinic.description,
          url: `https://main.d63zai2tg2i2u.amplifyapp.com/clinics/${encodeURIComponent(id)}`,
          telephone: clinic.phone || undefined,
          email: clinic.email || undefined,
          image: clinic.imageUrl || undefined,
          address: {
            '@type': 'PostalAddress',
            streetAddress: clinic.address,
            addressLocality: clinic.municipality,
            addressRegion: clinic.state,
            postalCode: clinic.postalCode,
            addressCountry: 'MX',
          },
        }
      : undefined,
  });

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
              className="border-danger/40 text-danger-text hover:bg-danger/5"
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
    <main className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-8 lg:py-10">
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
          <section className="overflow-hidden rounded-card border border-line bg-surface">
            <div className="aspect-[21/9] w-full overflow-hidden bg-canvas">
              <ContentImage
                src={clinic.imageUrl}
                alt={`Instalaciones de ${clinic.name}`}
                className="h-full w-full object-cover"
                fallbackLabel={initials(clinic.name)}
                priority
              />
            </div>
            <div className="p-5 sm:p-6">
              <PageHeader
                kicker={[clinic.municipality, clinic.state].filter(Boolean).join(', ')}
                title={clinic.name}
                description={
                  clinic.description || 'Consulta los datos de contacto y servicios disponibles.'
                }
              />

              <dl className="mt-5 grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-2">
                <div className="flex gap-2.5">
                  <Icon name="pin" size={18} className="mt-0.5 shrink-0 text-accent" />
                  <div>
                    <dt className="font-semibold text-heading">Dirección</dt>
                    <dd className="mt-0.5 text-muted">
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
                </div>
                <div className="flex gap-2.5">
                  <Icon name="phone" size={18} className="mt-0.5 shrink-0 text-accent" />
                  <div>
                    <dt className="font-semibold text-heading">Teléfono</dt>
                    <dd className="mt-0.5 text-muted">
                      {clinic.phone ? (
                        <a
                          className="text-accent-strong underline underline-offset-4"
                          href={`tel:${clinic.phone}`}
                        >
                          {clinic.phone}
                        </a>
                      ) : (
                        'Teléfono no disponible'
                      )}
                    </dd>
                  </div>
                </div>
                <div className="flex gap-2.5 sm:col-span-2">
                  <Icon name="mail" size={18} className="mt-0.5 shrink-0 text-accent" />
                  <div>
                    <dt className="font-semibold text-heading">Correo</dt>
                    <dd className="mt-0.5 break-all text-muted">
                      {clinic.email ? (
                        <a
                          className="text-accent-strong underline underline-offset-4"
                          href={`mailto:${clinic.email}`}
                        >
                          {clinic.email}
                        </a>
                      ) : (
                        'Correo no disponible'
                      )}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          </section>

          <Section id="servicios" title="Servicios disponibles">
            {clinic.services.length === 0 ? (
              <Notice tone="info">Este consultorio aún no publica servicios.</Notice>
            ) : (
              <ul aria-label="Servicios disponibles" className="divide-y divide-line">
                {clinic.services.map((service) => (
                  <li
                    key={service.id}
                    className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-semibold text-heading">
                        {service.name}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        {service.description || 'Descripción no disponible.'}
                      </p>
                      <p className="mt-1 text-xs text-subtle">
                        {service.estimatedDurationMinutes} min
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                      <span className="text-sm font-semibold text-heading">
                        Desde {formatPriceFrom(service.priceFrom)}
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
          </Section>

          {clinic.dentists && clinic.dentists.length > 0 && (
            <Section title="Equipo dental">
              <ul className="divide-y divide-line">
                {clinic.dentists.map((dentist) => (
                  <li key={dentist.id} className="flex flex-wrap items-start gap-4 py-4">
                    <div className="size-16 shrink-0 overflow-hidden rounded-[4px] bg-canvas">
                      <ContentImage
                        src={dentist.imageUrl}
                        alt={`Fotografía de ${dentist.firstName} ${dentist.lastName}`}
                        className="h-full w-full object-cover"
                        fallbackLabel={initials(`${dentist.firstName} ${dentist.lastName}`)}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent-strong">
                        {dentist.specialty || 'Odontología general'}
                      </p>
                      <h3 className="mt-1 font-display text-lg font-semibold text-heading">
                        {dentist.firstName} {dentist.lastName}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">
                        {dentist.biography || 'Biografía profesional no disponible.'}
                      </p>
                    </div>
                    <Link
                      className={`${buttonStyles('outline', 'sm')} shrink-0`}
                      to={`/clinics/${clinic.id}/dentistas/${dentist.id}`}
                      state={from ? { from } : undefined}
                      aria-label={`Ver perfil de ${dentist.firstName} ${dentist.lastName}`}
                    >
                      Ver perfil
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        <aside className="rounded-panel border border-line bg-surface p-5 lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-semibold text-heading">Solicita tu cita</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Elige un servicio y consulta horarios. Enviar la solicitud no confirma ni cobra la
            cita.
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
          <a className={`${buttonStyles('coral', 'md')} mt-5 w-full`} href="#servicios">
            Elegir servicio
          </a>
          {(clinic.phone || clinic.email) && (
            <div className="mt-5 grid gap-2 border-t border-line pt-4 text-sm">
              {clinic.phone && (
                <a
                  className="flex items-center gap-2 text-accent-strong hover:underline"
                  href={`tel:${clinic.phone}`}
                >
                  <Icon name="phone" size={16} />
                  {clinic.phone}
                </a>
              )}
              {clinic.email && (
                <a
                  className="flex items-center gap-2 break-all text-accent-strong hover:underline"
                  href={`mailto:${clinic.email}`}
                >
                  <Icon name="mail" size={16} />
                  {clinic.email}
                </a>
              )}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
