import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../services/api';
import type { AppointmentProposal } from '../types/api';

const timeZone = 'America/Mexico_City';
const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  PROPOSED: 'Con propuesta',
  CONFIRMED: 'Confirmada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
};
const dateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone,
      }).format(new Date(value))
    : 'No disponible';
const message = (cause: unknown) => {
  if (cause instanceof ApiError) {
    if (cause.status === 401) return 'Inicia sesión para consultar tu solicitud.';
    if (cause.status === 404) return 'La solicitud no existe o no pertenece a tu cuenta.';
    return cause.message;
  }
  return cause instanceof Error ? cause.message : 'No fue posible consultar la solicitud.';
};

export function AppointmentProposalPage() {
  const { appointmentId = '' } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [appointment, setAppointment] = useState<AppointmentProposal>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.proposal(appointmentId);
      setAppointment(data);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404) setAppointment(undefined);
      setError(message(cause));
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    if (!user || !appointmentId) return;
    let active = true;
    setLoading(true);
    setError('');
    api
      .proposal(appointmentId)
      .then(({ data }) => {
        if (active) setAppointment(data);
      })
      .catch((cause) => {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 404) setAppointment(undefined);
        setError(message(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appointmentId, user]);

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
      setNotice(
        accept
          ? 'Aceptaste el horario propuesto. Tu cita quedó confirmada.'
          : 'Rechazaste la propuesta. La solicitud quedó rechazada.',
      );
      return;
    } catch (cause) {
      failure = message(cause);
    } finally {
      setBusy(false);
    }
    setError(failure);
    await load();
  };

  if (authLoading)
    return (
      <main className="page-shell">
        <p>Cargando sesión…</p>
      </main>
    );
  if (!user)
    return (
      <main className="page-shell">
        <section className="panel">
          <p className="eyebrow">Mi solicitud</p>
          <h1>Solicitud de cita</h1>
          <p className="notice">Inicia sesión con la cuenta que creó la solicitud.</p>
          <Link to="/iniciar-sesion">Iniciar sesión para consultar mi solicitud</Link>
        </section>
      </main>
    );

  const status = appointment?.status?.toUpperCase() ?? '';
  const hasProposal =
    status === 'PROPOSED' &&
    Boolean(appointment?.proposedStartsAt) &&
    Boolean(appointment?.proposedEndsAt);

  return (
    <main className="page-shell">
      <section className="panel" aria-label="Mi solicitud">
        <p className="eyebrow">Respuesta a propuesta</p>
        <h1>{appointment ? `Solicitud ${appointment.folio}` : 'Solicitud de cita'}</h1>
        {loading && !appointment && <p>Cargando tu solicitud…</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        {!appointment && !loading && <Link to="/clinics">Volver al directorio</Link>}
        {appointment && (
          <>
            <p>
              <strong>Estado:</strong> {statusLabels[status] || appointment.status}
            </p>
            {hasProposal ? (
              <>
                <p>
                  <strong>Horario original:</strong> {dateTime(appointment.startsAt)} –{' '}
                  {dateTime(appointment.endsAt)}
                </p>
                <p>
                  <strong>Horario propuesto:</strong> {dateTime(appointment.proposedStartsAt)} –{' '}
                  {dateTime(appointment.proposedEndsAt)}
                </p>
                {appointment.proposalExpiresAt && (
                  <p>
                    <strong>Vence:</strong> {dateTime(appointment.proposalExpiresAt)}
                  </p>
                )}
                <section className="appointment-summary" aria-label="Responder propuesta">
                  <h2>¿Aceptas el horario propuesto?</h2>
                  <p>
                    Si aceptas, la cita queda confirmada en el horario propuesto. Si rechazas, la
                    solicitud queda rechazada y no se reserva ningún horario.
                  </p>
                  <div className="form-grid">
                    <button type="button" disabled={busy} onClick={() => void respond(true)}>
                      Aceptar horario propuesto
                    </button>
                    <button type="button" disabled={busy} onClick={() => void respond(false)}>
                      Rechazar propuesta
                    </button>
                  </div>
                </section>
              </>
            ) : (
              <>
                <p>
                  <strong>
                    {status === 'CONFIRMED'
                      ? 'Horario confirmado:'
                      : status === 'REJECTED' && appointment.proposedStartsAt
                        ? 'Horario original:'
                        : 'Horario:'}
                  </strong>{' '}
                  {dateTime(appointment.startsAt)} – {dateTime(appointment.endsAt)}
                </p>
                {status === 'REJECTED' && appointment.proposedStartsAt && (
                  <p>
                    <strong>Horario propuesto rechazado:</strong>{' '}
                    {dateTime(appointment.proposedStartsAt)} –{' '}
                    {dateTime(appointment.proposedEndsAt)}
                  </p>
                )}
                {status === 'PENDING' && (
                  <p className="notice">
                    No hay una propuesta activa. Tu solicitud sigue pendiente con el horario
                    original.
                  </p>
                )}
                {status === 'PROPOSED' && (
                  <p className="notice">
                    La propuesta está incompleta. Solicita un nuevo horario al consultorio.
                  </p>
                )}
                {status === 'CANCELLED' && <p className="notice">La solicitud fue cancelada.</p>}
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}
