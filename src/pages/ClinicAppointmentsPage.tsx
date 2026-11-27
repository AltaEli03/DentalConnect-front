import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button, buttonStyles } from '../components/ui/Button';
import { Field, controlClass } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import { Skeleton } from '../components/ui/Skeleton';
import { AdminShell } from '../components/layout/AdminShell';
import { StatusStamp } from '../components/ui/StatusStamp';
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
    <AdminShell
      title="Citas agendadas"
      description="Consulta las citas confirmadas de tu consultorio."
      active="appointments"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setAttempt((current) => current + 1);
        }}
        className="flex flex-wrap items-end gap-3 rounded-panel border border-line bg-surface p-4"
      >
        <Field id="from-date" label="Desde" className="max-w-44">
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className={controlClass}
          />
        </Field>
        <Field id="to-date" label="Hasta" className="max-w-44">
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className={controlClass}
          />
        </Field>
        <Button type="submit" disabled={loading}>
          {loading ? 'Actualizando…' : 'Filtrar'}
        </Button>
      </form>

      {loading && (
        <div className="mt-6 grid gap-3" role="status" aria-live="polite">
          <p className="sr-only">Cargando citas…</p>
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {!loading && error && (
        <Notice tone="error" title="No pudimos cargar las citas" className="mt-6">
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

      {!loading && !error && appointments.length === 0 && (
        <Notice tone="info" className="mt-6">
          No hay citas confirmadas con estos filtros.
        </Notice>
      )}

      {!loading && !error && appointments.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table aria-label="Citas agendadas" className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-strong text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">
                <th className="py-3 pr-4">Paciente</th>
                <th className="py-3 pr-4">Servicio</th>
                <th className="py-3 pr-4">Dentista</th>
                <th className="py-3 pr-4">Fecha y hora</th>
                <th className="py-3 pr-4">Estado</th>
                <th className="py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {appointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td className="py-4 pr-4 align-top">
                    <p className="font-display text-lg font-semibold text-heading">
                      {patientName(appointment)}
                    </p>
                    {appointment.patient?.phone && (
                      <a
                        className="mt-1 block text-accent-strong underline underline-offset-4"
                        href={`tel:${appointment.patient.phone}`}
                      >
                        {appointment.patient.phone}
                      </a>
                    )}
                    <p className="mt-1 text-xs text-subtle">Folio: {appointment.folio}</p>
                  </td>
                  <td className="py-4 pr-4 align-top text-muted">
                    {appointment.service?.name ?? 'Servicio'}
                  </td>
                  <td className="py-4 pr-4 align-top text-muted">
                    {[appointment.dentist?.firstName, appointment.dentist?.lastName]
                      .filter(Boolean)
                      .join(' ') || 'Dentista'}
                  </td>
                  <td className="py-4 pr-4 align-top text-muted">
                    {formatDateTime(appointment.startsAt)}
                  </td>
                  <td className="py-4 pr-4 align-top">
                    <StatusStamp status={appointment.status} />
                  </td>
                  <td className="py-4 align-top">
                    <Link
                      className={buttonStyles('outline', 'sm')}
                      to={`/administrar-solicitudes?appointmentId=${encodeURIComponent(appointment.id)}`}
                    >
                      Gestionar en solicitudes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
