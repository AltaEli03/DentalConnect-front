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

// Función para obtener las clases CSS del badge según el estado
const getStatusClass = (status: string) => {
  switch (status) {
    case 'CONFIRMED':
      return 'status-confirmed';
    case 'PROPOSED':
      return 'status-proposed';
    case 'REJECTED':
    case 'CANCELLED':
      return 'status-cancelled';
    default:
      return 'status-pending';
  }
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

  // --- ESTADOS DE CARGA / LOGIN ---
  if (authLoading) {
    return (
      <main className="page-shell">
        <div className="loading-state">
          <p>Cargando sesión…</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page-shell">
        <section className="panel auth-required-panel">
          <div className="auth-icon">🔒</div>
          <h1>Acceso Restringido</h1>
          <p className="text-muted">Inicia sesión con la cuenta que creó la solicitud.</p>
          <Link to="/iniciar-sesion" className="primary-btn">
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
    <main className="page-shell proposal-page-shell">
      <section className="panel proposal-panel" aria-label="Mi solicitud">
        {/* CABECERA DEL TICKET */}
        <div className="proposal-header">
          <div>
            <p className="eyebrow">Detalle de la Solicitud</p>
            <h1>{appointment ? `Solicitud ${appointment.folio}` : 'Solicitud de cita'}</h1>
          </div>
          {appointment && (
            <span className={`status-badge ${getStatusClass(status)}`}>
              {statusLabels[status] || appointment.status}
            </span>
          )}
        </div>

        {loading && !appointment && <p className="loading-text">Cargando tu solicitud…</p>}

        {error && (
          <div className="notice error" role="alert">
            <p>{error}</p>
          </div>
        )}
        {notice && (
          <div className="notice" role="status">
            <p>{notice}</p>
          </div>
        )}

        {!appointment && !loading && (
          <div className="empty-state">
            <p>No pudimos encontrar esta solicitud.</p>
            <Link to="/clinics" className="secondary-btn">
              Volver al directorio
            </Link>
          </div>
        )}

        {appointment && (
          <>
            {hasProposal ? (
              <div className="proposal-content">
                <h2 className="section-title">Revisa el cambio de horario</h2>

                {/* COMPARACIÓN VISUAL DE HORARIOS */}
                <div className="time-comparison">
                  {/* Horario Original */}
                  <div className="time-card original">
                    <span className="time-label">Horario original:</span>
                    <div className="time-value">{dateTime(appointment.startsAt)}</div>
                    <div className="time-value end">hasta {dateTime(appointment.endsAt)}</div>
                  </div>

                  {/* Flecha de transición */}
                  <div className="time-arrow">➔</div>

                  {/* Horario Propuesto */}
                  <div className="time-card proposed">
                    <span className="time-label">Horario propuesto:</span>
                    <div className="time-value highlight">
                      {dateTime(appointment.proposedStartsAt)}
                    </div>
                    <div className="time-value end">
                      hasta {dateTime(appointment.proposedEndsAt)}
                    </div>
                  </div>
                </div>

                {/* Alerta de Expiración */}
                {appointment.proposalExpiresAt && (
                  <div className="expiration-alert">
                    <span className="alert-icon">⏳</span>
                    <div>
                      <strong>Vence:</strong>
                      <p>{dateTime(appointment.proposalExpiresAt)}</p>
                    </div>
                  </div>
                )}

                {/* Acciones */}
                <section className="proposal-actions" aria-label="Responder propuesta">
                  <h3>¿Aceptas el nuevo horario?</h3>
                  <p className="action-description">
                    Si aceptas, la cita queda confirmada en el horario propuesto. Si rechazas, la
                    solicitud queda rechazada y no se reserva ningún horario.
                  </p>
                  <div className="action-buttons">
                    <button
                      className="primary-btn accept-btn"
                      type="button"
                      aria-label="Aceptar horario propuesto"
                      disabled={busy}
                      onClick={() => void respond(true)}
                    >
                      {busy ? 'Procesando…' : '✓ Aceptar horario propuesto'}
                    </button>
                    <button
                      className="secondary-btn reject-btn"
                      type="button"
                      aria-label="Rechazar propuesta"
                      disabled={busy}
                      onClick={() => void respond(false)}
                    >
                      ✕ Rechazar propuesta
                    </button>
                  </div>
                </section>
              </div>
            ) : (
              /* ESTADOS SIN PROPUESTA (Confirmada, Pendiente, Rechazada) */
              <div className="proposal-static-content">
                <div className="static-info-card">
                  <div className="static-icon">
                    {status === 'CONFIRMED' ? '🎉' : status === 'REJECTED' ? '❌' : '⏳'}
                  </div>
                  <div>
                    <h3>
                      {status === 'CONFIRMED'
                        ? '¡Cita Confirmada!'
                        : status === 'REJECTED'
                          ? 'Solicitud Rechazada'
                          : 'Solicitud en Revisión'}
                    </h3>
                    <p className="static-date">
                      <strong>
                        {status === 'CONFIRMED'
                          ? 'Horario confirmado:'
                          : status === 'REJECTED'
                            ? 'Horario original:'
                            : 'Horario:'}
                      </strong>{' '}
                      {dateTime(appointment.startsAt)} – {dateTime(appointment.endsAt)}
                    </p>
                  </div>
                </div>

                {status === 'PENDING' && (
                  <p className="notice info">
                    No hay una propuesta activa. Tu solicitud sigue pendiente con el horario
                    original.
                  </p>
                )}
                {status === 'PROPOSED' && (
                  <p className="notice error">
                    La propuesta está incompleta. Solicita un nuevo horario al consultorio.
                  </p>
                )}
                {status === 'CANCELLED' && (
                  <p className="notice error">La solicitud fue cancelada.</p>
                )}
                {status === 'REJECTED' && appointment.proposedStartsAt && (
                  <p className="notice">
                    <strong>Horario propuesto rechazado:</strong>{' '}
                    {dateTime(appointment.proposedStartsAt)}.
                  </p>
                )}

                <div className="static-actions">
                  <Link to="/clinics" className="secondary-btn">
                    Volver al directorio
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
