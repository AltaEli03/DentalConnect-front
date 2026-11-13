import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ContentImage } from '../components/ContentImage';
import { buttonStyles } from '../components/ui/Button';
import { Notice } from '../components/ui/Notice';
import { Skeleton } from '../components/ui/Skeleton';
import { api, ApiError } from '../services/api';
import type { Clinic, Dentist } from '../types/api';

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
              className="rounded-control border border-danger/40 px-3 py-2 text-sm font-semibold text-danger hover:bg-danger/5"
              onClick={() => setAttempt((current) => current + 1)}
            >
              Reintentar
            </button>
            <Link className={buttonStyles('ghost', 'sm')} to={`/clinics/${clinicId}`}>
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
          <Link className={`${buttonStyles('outline', 'sm')} mt-4`} to={`/clinics/${clinicId}`}>
            Volver al consultorio
          </Link>
        </Notice>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <nav aria-label="Migas de pan" className="text-sm font-semibold">
        <Link
          className="text-accent-strong underline-offset-4 hover:underline"
          to={`/clinics/${clinic.id}`}
        >
          Volver a {clinic.name}
        </Link>
      </nav>

      <div className="mt-5 grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        <div className="overflow-hidden rounded-card border border-line bg-white shadow-sm">
          <div className="aspect-[4/5] w-full overflow-hidden bg-canvas">
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
            <h1 className="mt-1 font-display text-2xl font-semibold text-brand">
              {dentist.firstName} {dentist.lastName}
            </h1>
            {dentist.professionalLicense && (
              <p className="mt-2 text-sm text-muted">
                Cédula profesional: {dentist.professionalLicense}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-6">
          {dentist.biography && (
            <section className="rounded-card border border-line bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-display text-xl font-semibold text-brand">Acerca de</h2>
              <p className="mt-2 leading-relaxed text-muted">{dentist.biography}</p>
            </section>
          )}

          <section className="rounded-card border border-line bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-display text-xl font-semibold text-brand">Servicios activos</h2>
            {dentist.services?.length ? (
              <ul className="mt-4 grid gap-4">
                {dentist.services.map((service) => (
                  <li key={service.id} className="rounded-control border border-line bg-canvas p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-semibold text-brand">{service.name}</h3>
                      <span className="text-sm font-semibold text-muted">
                        {service.estimatedDurationMinutes} min
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{service.description}</p>
                    <Link
                      className={`${buttonStyles('primary', 'sm')} mt-3`}
                      to={`/clinics/${clinic.id}/solicitar?serviceId=${encodeURIComponent(service.id)}&dentistId=${encodeURIComponent(dentist.id)}`}
                    >
                      Elegir este servicio
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">
                Este perfil no tiene servicios activos publicados.
              </p>
            )}
          </section>

          <Notice tone="info">
            Elegir a un profesional conserva tu selección para consultar horarios; todavía no
            confirma una cita.
          </Notice>
        </div>
      </div>
    </main>
  );
}
