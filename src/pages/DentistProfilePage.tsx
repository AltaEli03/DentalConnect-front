import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ContentImage } from '../components/ContentImage';
import { buttonStyles } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Notice } from '../components/ui/Notice';
import { PageHeader } from '../components/ui/PageHeader';
import { Section } from '../components/ui/Section';
import { Skeleton } from '../components/ui/Skeleton';
import { api, ApiError } from '../services/api';
import type { Clinic, Dentist } from '../types/api';

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

function profileMessage(cause: unknown) {
  if (cause instanceof ApiError) {
    if (cause.status === 404)
      return 'No encontramos este consultorio. Puede que ya no esté publicado.';
    if (cause.status >= 500)
      return 'El perfil tiene un problema temporal. Inténtalo de nuevo en unos minutos.';
    return cause.message;
  }
  if (
    cause instanceof TypeError ||
    (cause instanceof Error && /failed to fetch|network|load failed/i.test(cause.message))
  ) {
    return 'No pudimos conectar con DentalConnect. Revisa tu conexión e inténtalo de nuevo.';
  }
  return cause instanceof Error ? cause.message : 'No fue posible cargar el perfil.';
}

export function DentistProfilePage() {
  const { clinicId = '', dentistId = '' } = useParams();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '';
  const [clinic, setClinic] = useState<Clinic>();
  const [dentist, setDentist] = useState<Dentist>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setDentist(undefined);
    setClinic(undefined);

    api
      .clinic(clinicId)
      .then(({ data }) => {
        if (!active) return;
        setClinic(data);
        setDentist(data.dentists?.find((item) => item.id === dentistId));
      })
      .catch((cause: unknown) => {
        if (active) setError(profileMessage(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [attempt, clinicId, dentistId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6" role="status" aria-live="polite">
        <p className="sr-only">Cargando perfil del especialista…</p>
        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Notice tone="error" title="No pudimos cargar el perfil">
          <p>{error}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-control border border-danger/40 px-3 py-2 text-sm font-semibold text-danger-text hover:bg-danger/5"
              onClick={() => setAttempt((current) => current + 1)}
            >
              Reintentar
            </button>
            <Link
              className={buttonStyles('ghost', 'sm')}
              to={`/clinics/${clinicId}`}
              state={from ? { from } : undefined}
            >
              Volver al consultorio
            </Link>
          </div>
        </Notice>
      </main>
    );
  }

  if (!clinic || !dentist) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Notice tone="info" title="Perfil no disponible">
          <p>Este dentista ya no está disponible en el consultorio seleccionado.</p>
          <Link
            className={`${buttonStyles('outline', 'sm')} mt-4`}
            to={`/clinics/${clinicId}`}
            state={from ? { from } : undefined}
          >
            Volver al consultorio
          </Link>
        </Notice>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-8 lg:py-10">
      <nav aria-label="Migas de pan" className="text-sm font-semibold">
        <Link
          className="text-accent-strong underline-offset-4 hover:underline"
          to={`/clinics/${clinic.id}`}
          state={from ? { from } : undefined}
        >
          Volver a {clinic.name}
        </Link>
      </nav>

      <div className="mt-5 grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        <div className="grid gap-4">
          <section className="overflow-hidden rounded-card border border-line bg-surface">
            <div className="aspect-[4/5] w-full overflow-hidden bg-canvas">
              <ContentImage
                src={dentist.imageUrl}
                alt={`Fotografía de ${dentist.firstName} ${dentist.lastName}`}
                className="h-full w-full object-cover"
                fallbackLabel={initials(`${dentist.firstName} ${dentist.lastName}`)}
              />
            </div>
          </section>

          <div className="rounded-panel border border-line bg-surface p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent-strong">
              Consultorio
            </p>
            <Link
              className="mt-1 block font-display text-lg font-semibold text-heading hover:underline"
              to={`/clinics/${clinic.id}`}
              state={from ? { from } : undefined}
            >
              {clinic.name}
            </Link>
            <p className="mt-0.5 text-sm text-muted">
              {[clinic.municipality, clinic.state].filter(Boolean).join(', ')}
            </p>
            <div className="mt-3 grid gap-2 border-t border-line pt-3 text-sm">
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
          </div>
        </div>

        <div className="grid gap-6">
          <div>
            <PageHeader
              kicker={dentist.specialty || 'Odontología general'}
              title={`${dentist.firstName} ${dentist.lastName}`}
              description={
                dentist.professionalLicense
                  ? `Cédula profesional: ${dentist.professionalLicense}`
                  : undefined
              }
            />
            {dentist.biography && (
              <p className="mt-4 max-w-[65ch] leading-relaxed text-muted">{dentist.biography}</p>
            )}
          </div>

          <Section title="Servicios activos">
            {dentist.services?.length ? (
              <ul aria-label="Servicios activos" className="divide-y divide-line">
                {dentist.services.map((service) => (
                  <li key={service.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-semibold text-heading">
                        {service.name}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        {service.description}
                      </p>
                      <p className="mt-1 text-xs text-subtle">
                        {service.estimatedDurationMinutes} min
                      </p>
                    </div>
                    <Link
                      className={buttonStyles('primary', 'sm')}
                      to={`/clinics/${clinic.id}/solicitar?serviceId=${encodeURIComponent(service.id)}&dentistId=${encodeURIComponent(dentist.id)}`}
                      state={from ? { from } : undefined}
                      aria-label={`Elegir ${service.name}`}
                    >
                      Elegir servicio
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                Este perfil no tiene servicios activos publicados.
              </p>
            )}
          </Section>

          <Notice tone="info">
            Elegir a un profesional conserva tu selección para consultar horarios; todavía no
            confirma una cita.
          </Notice>
        </div>
      </div>
    </main>
  );
}
