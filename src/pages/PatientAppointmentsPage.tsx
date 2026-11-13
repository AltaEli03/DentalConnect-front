import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Notice } from '../components/ui/Notice';
import { Skeleton } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';
import { buttonStyles } from '../components/ui/Button';
import { api, ApiError } from '../services/api';
import { formatDateTime } from '../lib/appointments';
import type { PatientAppointment } from '../types/api';

type View = 'upcoming' | 'history';

function listMessage(cause: unknown) {
  if (cause instanceof ApiError) {
    if (cause.status === 401)
      return 'Tu sesión terminó. Inicia sesión de nuevo para ver tus citas.';
    return cause.message;
  }
  if (
    cause instanceof TypeError ||
    (cause instanceof Error && /failed to fetch|network|load failed/i.test(cause.message))
  ) {
    return 'No pudimos conectar con tus citas. Revisa tu conexión e inténtalo de nuevo.';
  }
  return cause instanceof Error ? cause.message : 'No fue posible cargar tus citas.';
}

const isUpcoming = (appointment: PatientAppointment) => {
  const status = appointment.status?.toUpperCase();
  return (
    new Date(appointment.startsAt).getTime() >= Date.now() &&
    status !== 'REJECTED' &&
    status !== 'CANCELLED'
  );
};

const byStartAscending = (a: PatientAppointment, b: PatientAppointment) =>
  new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();

const byStartDescending = (a: PatientAppointment, b: PatientAppointment) =>
  new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();

export function PatientAppointmentsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const location = useLocation();
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState<View>('upcoming');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    api
      .myAppointments()
      .then(({ data }) => {
        if (active) setAppointments(data);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(listMessage(cause));
        if (cause instanceof ApiError && cause.status === 401) void logout();
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt, logout, user]);

  if (authLoading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6" role="status" aria-live="polite">
        <p className="sr-only">Cargando sesión…</p>
        <Skeleton className="h-40 w-full" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <section className="rounded-card border border-line bg-surface p-6 shadow-sm">
          <p className="text-sm font-semibold text-accent-strong">Mi cuenta</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-heading">Mis citas</h1>
          <Notice tone="info" className="mt-4">
            Inicia sesión con la cuenta que creó tus solicitudes para consultar tus citas.
          </Notice>
          <Link
            className={`${buttonStyles('primary', 'md')} mt-4`}
            to="/iniciar-sesion"
            state={{ from: `${location.pathname}${location.search}` }}
          >
            Iniciar sesión para ver mis citas
          </Link>
        </section>
      </main>
    );
  }

  const upcoming = appointments.filter(isUpcoming).sort(byStartAscending);
  const history = appointments
    .filter((appointment) => !isUpcoming(appointment))
    .sort(byStartDescending);
  const visible = view === 'upcoming' ? upcoming : history;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="text-sm font-semibold text-accent-strong">Mi cuenta</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-heading">Mis citas</h1>
          <p className="mt-2 text-muted">Consulta próximas citas e historial de tus solicitudes.</p>
        </div>
        <Link className={buttonStyles('outline', 'sm')} to="/clinics">
          Buscar consultorio
        </Link>
      </header>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filtrar citas">
        <button
          type="button"
          aria-pressed={view === 'upcoming'}
          onClick={() => setView('upcoming')}
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${
            view === 'upcoming'
              ? 'border-brand bg-brand text-white'
              : 'border-control bg-surface text-heading hover:bg-canvas'
          }`}
        >
          Próximas ({upcoming.length})
        </button>
        <button
          type="button"
          aria-pressed={view === 'history'}
          onClick={() => setView('history')}
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${
            view === 'history'
              ? 'border-brand bg-brand text-white'
              : 'border-control bg-surface text-heading hover:bg-canvas'
          }`}
        >
          Historial ({history.length})
        </button>
      </div>

      {loading && (
        <div className="mt-6 grid gap-4" role="status" aria-live="polite">
          <p className="sr-only">Cargando tus citas…</p>
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      )}

      {!loading && error && (
        <Notice tone="error" title="No pudimos cargar tus citas" className="mt-6">
          <p>{error}</p>
          <button
            type="button"
            className="mt-3 text-sm font-semibold text-danger-text underline underline-offset-4"
            onClick={() => setAttempt((current) => current + 1)}
          >
            Reintentar
          </button>
        </Notice>
      )}

      {!loading && !error && visible.length === 0 && (
        <Notice tone="info" className="mt-6">
          {view === 'upcoming'
            ? 'No tienes citas próximas. Busca un consultorio para solicitar una.'
            : 'Todavía no hay citas en tu historial.'}
        </Notice>
      )}

      {!loading && !error && visible.length > 0 && (
        <ul className="mt-6 grid gap-4">
          {visible.map((appointment) => {
            const status = appointment.status?.toUpperCase() ?? '';
            return (
              <li
                key={appointment.id}
                className="rounded-card border border-line bg-surface p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-accent-strong">
                      {appointment.clinic.name}
                    </p>
                    <h2 className="mt-1 font-display text-xl font-semibold text-heading">
                      {appointment.service.name}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      {appointment.dentist.firstName} {appointment.dentist.lastName}
                    </p>
                  </div>
                  <StatusBadge status={status} />
                </div>

                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-muted">Fecha y hora</dt>
                    <dd className="font-semibold text-ink">
                      {formatDateTime(appointment.startsAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-muted">Folio</dt>
                    <dd className="font-semibold text-ink">{appointment.folio}</dd>
                  </div>
                </dl>

                {status === 'PROPOSED' && appointment.proposedStartsAt && (
                  <Notice tone="info" className="mt-4" role="note">
                    El consultorio propone un nuevo horario:{' '}
                    <strong>{formatDateTime(appointment.proposedStartsAt)}</strong>.
                  </Notice>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {status === 'PROPOSED' && (
                    <Link
                      className={buttonStyles('coral', 'sm')}
                      to={`/mi-solicitud/${encodeURIComponent(appointment.id)}`}
                    >
                      Responder propuesta
                    </Link>
                  )}
                  <Link
                    className={buttonStyles('outline', 'sm')}
                    to={`/mi-solicitud/${encodeURIComponent(appointment.id)}`}
                  >
                    Ver detalle
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
