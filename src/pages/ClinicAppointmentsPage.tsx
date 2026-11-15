import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { buttonStyles } from '../components/ui/Button';
import { Notice } from '../components/ui/Notice';
import { Skeleton } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatDateTime } from '../lib/appointments';
import { isClinicAdmin as hasClinicAdminRole } from '../lib/roles';
import { clinicRequest } from '../services/clinicApi';

type ClinicAppointment = {
  id: string;
  folio: string;
  status: string;
  startsAt: string;
  endsAt: string;
  patient?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  dentist?: { firstName?: string; lastName?: string };
  service?: { name?: string };
};

function clinicMessage(cause: unknown) {
  if (
    cause instanceof TypeError ||
    (cause instanceof Error && /failed to fetch|network|load failed/i.test(cause.message))
  ) {
    return 'No pudimos conectar con el consultorio. Revisa tu conexión e inténtalo de nuevo.';
  }
  return cause instanceof Error
    ? cause.message
    : 'No se pudieron cargar las citas del consultorio.';
}

const patientName = (appointment: ClinicAppointment) =>
  [appointment.patient?.firstName, appointment.patient?.lastName].filter(Boolean).join(' ') ||
  'Paciente';

export function ClinicAppointmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [appointments, setAppointments] = useState<ClinicAppointment[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const isClinicAdmin = Boolean(user) && hasClinicAdminRole(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ status: 'CONFIRMED' });
      if (from) params.set('dateFrom', from);
      if (to) params.set('dateTo', to);
      const { data } = await clinicRequest<{ data: ClinicAppointment[] }>(
        '/appointments?' + params.toString(),
      );
      setAppointments(
        [...data].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
      );
    } catch (cause) {
      setError(clinicMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    if (!isClinicAdmin) {
      setLoading(false);
      return;
    }
    void load();
  }, [attempt, isClinicAdmin, load]);

  if (authLoading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6" role="status" aria-live="polite">
        <p className="sr-only">Cargando sesión…</p>
        <Skeleton className="h-40 w-full" />
      </main>
    );
  }

  if (!user) return <Navigate to="/consultorio/iniciar-sesion" replace />;

  if (!isClinicAdmin) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Notice tone="error" title="Acceso de consultorio">
          Esta cuenta es de paciente. Usa el acceso de pacientes para consultar tus citas.
        </Notice>
        <Link className={`${buttonStyles('outline', 'sm')} mt-4`} to="/mis-citas">
          Ir a mis citas
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="text-sm font-semibold text-accent-strong">Panel del consultorio</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-heading">Citas agendadas</h1>
          <p className="mt-2 text-muted">Consulta las citas confirmadas de tu consultorio.</p>
        </div>
        <Link className={buttonStyles('outline', 'sm')} to="/administrar-solicitudes">
          Ver solicitudes
        </Link>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setAttempt((current) => current + 1);
        }}
        className="mt-5 flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface p-4"
      >
        <label className="grid gap-1 text-sm font-semibold text-ink">
          Desde
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="min-h-11 rounded-control border border-control bg-surface px-3 font-normal text-ink focus-visible:ring-4 focus-visible:ring-accent"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-ink">
          Hasta
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="min-h-11 rounded-control border border-control bg-surface px-3 font-normal text-ink focus-visible:ring-4 focus-visible:ring-accent"
          />
        </label>
        <button className={buttonStyles('primary', 'sm')} type="submit" disabled={loading}>
          {loading ? 'Actualizando…' : 'Filtrar'}
        </button>
      </form>

      {loading && (
        <div className="mt-6 grid gap-4" role="status" aria-live="polite">
          <p className="sr-only">Cargando citas…</p>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {!loading && error && (
        <Notice tone="error" title="No pudimos cargar las citas" className="mt-6">
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

      {!loading && !error && appointments.length === 0 && (
        <Notice tone="info" className="mt-6">
          No hay citas confirmadas con estos filtros.
        </Notice>
      )}

      {!loading && !error && appointments.length > 0 && (
        <ul className="mt-6 grid gap-4">
          {appointments.map((appointment) => (
            <li
              key={appointment.id}
              className="rounded-card border border-line bg-surface p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-accent-strong">
                    {formatDateTime(appointment.startsAt)}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-semibold text-heading">
                    {patientName(appointment)}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {appointment.service?.name ?? 'Servicio'} ·{' '}
                    {[appointment.dentist?.firstName, appointment.dentist?.lastName]
                      .filter(Boolean)
                      .join(' ') || 'Dentista'}
                  </p>
                  {appointment.patient?.phone && (
                    <p className="mt-1 text-sm text-muted">
                      Teléfono:{' '}
                      <a
                        className="text-accent-strong underline underline-offset-4"
                        href={`tel:${appointment.patient.phone}`}
                      >
                        {appointment.patient.phone}
                      </a>
                    </p>
                  )}
                  <p className="mt-1 text-xs text-subtle">Folio: {appointment.folio}</p>
                </div>
                <StatusBadge status={appointment.status} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  className={buttonStyles('outline', 'sm')}
                  to={`/administrar-solicitudes?appointmentId=${encodeURIComponent(appointment.id)}`}
                >
                  Gestionar en solicitudes
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
