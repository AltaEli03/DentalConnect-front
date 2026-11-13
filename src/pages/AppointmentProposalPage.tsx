import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/Button';
import { Notice } from '../components/ui/Notice';
import { Skeleton } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';
import { api, ApiError } from '../services/api';
import { formatDateTime } from '../lib/appointments';
import type { AppointmentProposal } from '../types/api';

const message = (cause: unknown) => {
  if (cause instanceof ApiError) {
    if (cause.status === 401) return 'Inicia sesión para consultar tu solicitud.';
    if (cause.status === 404) return 'La solicitud no existe o no pertenece a tu cuenta.';
    return cause.message;
  }
  if (
    cause instanceof TypeError ||
    (cause instanceof Error && /failed to fetch|network|load failed/i.test(cause.message))
  ) {
    return 'No pudimos conectar con el servicio. Revisa tu conexión e inténtalo de nuevo.';
  }
  return cause instanceof Error ? cause.message : 'No fue posible consultar la solicitud.';
};

export function AppointmentProposalPage() {
  const { appointmentId = '' } = useParams();
  const { user, loading: authLoading, logout } = useAuth();
  const location = useLocation();
  const [appointment, setAppointment] = useState<AppointmentProposal>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorStatus, setErrorStatus] = useState<number>();
  const [notFound, setNotFound] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmingReject, setConfirmingReject] = useState(false);

  const load = useCallback(
    async (clearError = true) => {
      setLoading(true);
      if (clearError) setError('');
      try {
        const { data } = await api.proposal(appointmentId);
        setAppointment(data);
        setNotFound(false);
        setErrorStatus(undefined);
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 404) {
          setAppointment(undefined);
          setNotFound(true);
        } else {
          setNotFound(false);
        }
        setErrorStatus(cause instanceof ApiError ? cause.status : undefined);
        setError(message(cause));
        if (cause instanceof ApiError && cause.status === 401) void logout();
      } finally {
        setLoading(false);
      }
    },
    [appointmentId, logout],
  );

  useEffect(() => {
    if (!user || !appointmentId) return;
    setError('');
    setErrorStatus(undefined);
    setNotFound(false);
    setNotice('');
    void load();
  }, [appointmentId, load, user]);

  const respond = async (accept: boolean) => {
    setBusy(true);
    setError('');
    setNotice('');
    let failure = '';
    try {
      const { data } = await (accept
        ? api.acceptProposal(appointmentId)
        : api.rejectProposal(appointmentId));
      setAppointment(data);
      setConfirmingReject(false);
      setNotice(
        accept
          ? 'Aceptaste el horario propuesto. Tu cita quedó confirmada.'
          : 'Rechazaste la propuesta. La solicitud quedó rechazada.',
      );
      return;
    } catch (cause) {
      failure = message(cause);
      if (cause instanceof ApiError && cause.status === 401) void logout();
    } finally {
      setBusy(false);
    }
    setError(failure);
    await load(false);
  };

  if (authLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6" role="status" aria-live="polite">
        <p className="sr-only">Cargando sesión…</p>
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <section className="rounded-card border border-line bg-white p-6 shadow-sm">
          <h1 className="font-display text-3xl font-semibold text-brand">Mi solicitud</h1>
          {error ? (
            <Notice tone="error" className="mt-4">
              {error}
            </Notice>
          ) : (
            <Notice tone="info" className="mt-4">
              Inicia sesión con la cuenta que creó la solicitud.
            </Notice>
          )}
          <Link
            className="mt-4 inline-block font-semibold text-accent-strong underline underline-offset-4"
            to="/iniciar-sesion"
            state={{ from: `${location.pathname}${location.search}` }}
          >
            Iniciar sesión para consultar mi solicitud
          </Link>
        </section>
      </main>
    );
  }

  const status = appointment?.status?.toUpperCase() ?? '';
  const hasProposal =
    status === 'PROPOSED' &&
    Boolean(appointment?.proposedStartsAt) &&
    Boolean(appointment?.proposedEndsAt);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
      <section
        className="overflow-hidden rounded-card border border-line bg-white shadow-sm"
        aria-label="Mi solicitud"
      >
        <header className="border-b border-dashed border-line bg-gradient-to-b from-white to-canvas p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-accent-strong">Respuesta a propuesta</p>
              <h1 className="mt-1 font-display text-3xl font-semibold text-brand">
                {appointment ? `Solicitud ${appointment.folio}` : 'Solicitud de cita'}
              </h1>
            </div>
            {appointment && <StatusBadge status={status} />}
          </div>
        </header>

        <div className="p-5 sm:p-6">
          {loading && !appointment && (
            <div role="status" aria-live="polite">
              <p className="sr-only">Cargando tu solicitud…</p>
              <div className="grid gap-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          )}

          {error && (
            <Notice tone="error" className="mb-4">
              <p>{error}</p>
              {errorStatus === 401 ? (
                <Link
                  className="mt-3 inline-block text-sm font-semibold text-danger underline underline-offset-4"
                  to="/iniciar-sesion"
                  state={{ from: `${location.pathname}${location.search}` }}
                >
                  Iniciar sesión de nuevo
                </Link>
              ) : errorStatus === 404 ? (
                <Link
                  className="mt-3 inline-block text-sm font-semibold text-danger underline underline-offset-4"
                  to="/clinics"
                >
                  Volver al directorio
                </Link>
              ) : (
                <button
                  type="button"
                  className="mt-3 text-sm font-semibold text-danger underline underline-offset-4"
                  onClick={() => void load()}
                >
                  Reintentar
                </button>
              )}
            </Notice>
          )}
          {notice && (
            <Notice tone="success" className="mb-4">
              {notice}
            </Notice>
          )}

          {!appointment && !loading && notFound && (
            <div className="grid gap-4">
              <p className="text-muted">No pudimos encontrar esta solicitud.</p>
              <Link
                className="font-semibold text-accent-strong underline underline-offset-4"
                to="/clinics"
              >
                Volver al directorio
              </Link>
            </div>
          )}

          {appointment && hasProposal && (
            <div className="grid gap-5">
              <h2 className="font-display text-xl font-semibold text-brand">
                Revisa el cambio de horario
              </h2>

              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-control border border-dashed border-line-strong bg-canvas p-4">
                  <dt className="text-sm font-semibold text-muted">Horario original:</dt>
                  <dd className="mt-1 font-semibold text-brand">
                    {formatDateTime(appointment.startsAt)} – {formatDateTime(appointment.endsAt)}
                  </dd>
                </div>
                <div className="rounded-control border border-accent/40 bg-accent/5 p-4">
                  <dt className="text-sm font-semibold text-accent-strong">Horario propuesto:</dt>
                  <dd className="mt-1 font-semibold text-brand">
                    {formatDateTime(appointment.proposedStartsAt)} –{' '}
                    {formatDateTime(appointment.proposedEndsAt)}
                  </dd>
                </div>
              </dl>

              {appointment.proposalExpiresAt && (
                <Notice tone="info" role="note" title="Vence:">
                  {formatDateTime(appointment.proposalExpiresAt)}
                </Notice>
              )}

              <section
                className="rounded-card border border-line bg-canvas p-4"
                aria-label="Responder propuesta"
              >
                <h2 className="font-display text-lg font-semibold text-brand">
                  ¿Aceptas el nuevo horario?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Si aceptas, la cita queda confirmada en el horario propuesto. Si rechazas, la
                  solicitud queda rechazada y no se reserva ningún horario.
                </p>

                {confirmingReject ? (
                  <div className="mt-4 rounded-control border border-danger/30 bg-danger/5 p-4">
                    <p className="font-semibold text-ink">
                      ¿Seguro que quieres rechazar la propuesta?
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      La solicitud quedará rechazada y no se reservará ningún horario.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        autoFocus
                        loading={busy}
                        onClick={() => void respond(false)}
                      >
                        Sí, rechazar propuesta
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => setConfirmingReject(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Button
                      className="sm:flex-1"
                      disabled={busy}
                      loading={busy}
                      onClick={() => void respond(true)}
                    >
                      Aceptar horario propuesto
                    </Button>
                    <Button
                      variant="outline"
                      className="sm:flex-1 border-danger/40 text-danger hover:bg-danger/5"
                      disabled={busy}
                      onClick={() => setConfirmingReject(true)}
                    >
                      Rechazar propuesta
                    </Button>
                  </div>
                )}
              </section>
            </div>
          )}

          {appointment && !hasProposal && (
            <div className="grid gap-4">
              {status === 'CONFIRMED' && (
                <>
                  <p className="font-semibold text-brand">Horario confirmado:</p>
                  <p className="text-muted">
                    {formatDateTime(appointment.startsAt)} – {formatDateTime(appointment.endsAt)}
                  </p>
                </>
              )}
              {status === 'PENDING' && (
                <>
                  <p className="font-semibold text-brand">Horario:</p>
                  <p className="text-muted">
                    {formatDateTime(appointment.startsAt)} – {formatDateTime(appointment.endsAt)}
                  </p>
                  <Notice tone="info" role="note">
                    No hay una propuesta activa. Tu solicitud sigue pendiente con el horario
                    original.
                  </Notice>
                </>
              )}
              {status === 'PROPOSED' && (
                <Notice tone="error" role="note">
                  La propuesta está incompleta. Solicita un nuevo horario al consultorio.
                </Notice>
              )}
              {status === 'CANCELLED' && (
                <Notice tone="info" role="note">
                  La solicitud fue cancelada.
                </Notice>
              )}
              {status === 'REJECTED' && (
                <>
                  <p className="font-semibold text-brand">Horario original:</p>
                  <p className="text-muted">
                    {formatDateTime(appointment.startsAt)} – {formatDateTime(appointment.endsAt)}
                  </p>
                  {appointment.proposedStartsAt && (
                    <p className="text-sm text-muted">
                      <strong className="text-ink">Horario propuesto rechazado:</strong>{' '}
                      {formatDateTime(appointment.proposedStartsAt)} –{' '}
                      {formatDateTime(appointment.proposedEndsAt)}
                    </p>
                  )}
                </>
              )}

              <Link
                className="font-semibold text-accent-strong underline underline-offset-4"
                to="/clinics"
              >
                Volver al directorio
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
