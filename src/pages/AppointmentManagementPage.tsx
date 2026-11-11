import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiBaseUrl } from '../services/api';
import { currentIdToken } from '../services/cognito';
import type { AvailabilitySlot } from '../types/api';

type Appointment = {
  id: string;
  reference?: string;
  folio?: string;
  status: string;
  createdAt?: string;
  startsAt?: string;
  endsAt?: string;
  proposedStartsAt?: string;
  proposedEndsAt?: string;
  proposalExpiresAt?: string;
  clinicId?: string;
  dentistId?: string;
  dentalServiceId?: string;
  estimatedDurationMinutes?: number;
  patientFirstName?: string;
  patientLastName?: string;
  patientEmail?: string;
  patientPhone?: string;
  serviceName?: string;
  dentistName?: string;
  rejectionReason?: string;
};
const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
  PROPOSED: 'Con propuesta',
};
const timeZone = 'America/Mexico_City';
const localToday = () => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
const sameInstant = (a?: string, b?: string) =>
  Boolean(a && b && new Date(a).getTime() === new Date(b).getTime());
const dateTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone,
      }).format(new Date(value))
    : 'No disponible';
type AppointmentDto = Partial<Appointment> & {
  receivedAt?: string;
  patient?: { firstName?: string; lastName?: string; email?: string; phone?: string };
  dentist?: { id?: string; firstName?: string; lastName?: string };
  service?: { id?: string; name?: string; estimatedDurationMinutes?: number };
  rejection?: { reason?: string };
};
const normalizeAppointment = (item: AppointmentDto): Appointment => ({
  ...item,
  id: item.id || '',
  status: item.status || 'PENDING',
  createdAt: item.createdAt || item.receivedAt,
  clinicId: item.clinicId,
  dentistId: item.dentistId || item.dentist?.id,
  dentalServiceId: item.dentalServiceId || item.service?.id,
  estimatedDurationMinutes: item.estimatedDurationMinutes ?? item.service?.estimatedDurationMinutes,
  patientFirstName: item.patientFirstName || item.patient?.firstName,
  patientLastName: item.patientLastName || item.patient?.lastName,
  patientEmail: item.patientEmail || item.patient?.email,
  patientPhone: item.patientPhone || item.patient?.phone,
  dentistName:
    item.dentistName || [item.dentist?.firstName, item.dentist?.lastName].filter(Boolean).join(' '),
  serviceName: item.serviceName || item.service?.name,
  rejectionReason: item.rejectionReason || item.rejection?.reason,
});
const patientName = (item: Appointment) =>
  [item.patientFirstName, item.patientLastName].filter(Boolean).join(' ') || 'Paciente';

export function AppointmentManagementPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [proposedDate, setProposedDate] = useState(localToday());
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState('');
  const [selectedProposed, setSelectedProposed] = useState('');
  const [proposing, setProposing] = useState(false);

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const base = apiBaseUrl();
    const token = await currentIdToken();
    if (!token) throw new Error('Inicia sesión con una cuenta autorizada del consultorio.');
    const headers = new Headers(init.headers);
    headers.set('Authorization', 'Bearer ' + token);
    if (init.body) headers.set('Content-Type', 'application/json');
    const response = await fetch(base + path, { ...init, headers });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message =
        body?.error?.message ||
        body?.message ||
        body?.title ||
        (response.status === 403
          ? 'Tu cuenta no tiene permisos para administrar solicitudes de este consultorio.'
          : response.status === 404
            ? 'La solicitud no existe o no pertenece a tu consultorio.'
            : 'Error HTTP ' + response.status);
      throw new Error(message);
    }
    return response.status === 204 ? null : response.json();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (from) params.set('dateFrom', from);
      if (to) params.set('dateTo', to);
      const query = params.toString();
      const data = await request('/appointments' + (query ? '?' + query : ''));
      const rows = (
        Array.isArray(data) ? data : (data?.data ?? data?.appointments ?? data?.items ?? [])
      ).map(normalizeAppointment);
      setItems(rows);
      setSelected((current) => {
        if (!current) return current;
        const updated = rows.find((row: Appointment) => row.id === current.id);
        return updated || current;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las solicitudes.');
    } finally {
      setLoading(false);
    }
  }, [request, status, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSlots([]);
    setSelectedProposed('');
    setSlotError('');
    if (
      !selected ||
      selected.status?.toUpperCase() !== 'PENDING' ||
      !selected.clinicId ||
      !selected.dentistId ||
      !selected.dentalServiceId ||
      !proposedDate
    )
      return;
    let active = true;
    setLoadingSlots(true);
    const params = new URLSearchParams({ serviceId: selected.dentalServiceId, date: proposedDate });
    request(
      '/clinics/' +
        encodeURIComponent(selected.clinicId) +
        '/dentists/' +
        encodeURIComponent(selected.dentistId) +
        '/availability?' +
        params.toString(),
    )
      .then((data) => {
        if (!active) return;
        const rows = (data?.data ?? []) as AvailabilitySlot[];
        setSlots(rows.filter((slot) => !sameInstant(slot.startsAt, selected.startsAt)));
      })
      .catch((e) => {
        if (active)
          setSlotError(e instanceof Error ? e.message : 'No se pudieron consultar los horarios.');
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [request, selected, proposedDate]);

  const openDetail = async (id: string) => {
    setError('');
    setNotice('');
    setProposedDate(localToday());
    setSlots([]);
    setSelectedProposed('');
    setSlotError('');
    try {
      const data = await request('/appointments/' + encodeURIComponent(id));
      setSelected(normalizeAppointment(data?.data ?? data?.appointment ?? data));
    } catch (e) {
      setSelected(null);
      setError(e instanceof Error ? e.message : 'No se pudo abrir el detalle.');
    }
  };

  const act = async (action: 'confirm' | 'reject') => {
    if (!selected) return;
    if (action === 'reject' && (reason.trim().length < 10 || reason.trim().length > 250)) {
      setError('El motivo debe tener entre 10 y 250 caracteres.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const payload = action === 'reject' ? JSON.stringify({ reason: reason.trim() }) : undefined;
      await request('/appointments/' + encodeURIComponent(selected.id) + '/' + action, {
        method: 'POST',
        body: payload,
      });
      setReason('');
      setNotice(
        action === 'confirm'
          ? 'Solicitud confirmada; el horario quedó reservado.'
          : 'Solicitud rechazada y motivo guardado.',
      );
      await load();
      await openDetail(selected.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar la solicitud.');
    } finally {
      setBusy(false);
    }
  };

  const propose = async () => {
    if (!selected || !selectedProposed) return;
    const id = selected.id;
    setProposing(true);
    setError('');
    setNotice('');
    let failure = '';
    try {
      await request('/appointments/' + encodeURIComponent(id) + '/propose', {
        method: 'POST',
        body: JSON.stringify({ proposedStartsAt: selectedProposed }),
      });
    } catch (e) {
      failure = e instanceof Error ? e.message : 'No se pudo proponer el horario.';
    } finally {
      setProposing(false);
    }
    await load();
    await openDetail(id);
    if (failure) setError(failure);
    else {
      setSelectedProposed('');
      setNotice(
        'Propuesta enviada. El paciente debe aceptarla o rechazarla; el horario no queda reservado.',
      );
    }
  };

  const pendingCount = useMemo(
    () => items.filter((item) => item.status?.toUpperCase() === 'PENDING').length,
    [items],
  );

  return (
    <main className="page-shell">
      <section className="panel">
        <p className="eyebrow">Gestión del consultorio</p>
        <h1>Solicitudes de cita</h1>
        <p>
          Revisa los datos de contacto y decide sobre las solicitudes pendientes. Solo verás
          solicitudes de tu consultorio.
        </p>
        <div className="form-grid">
          <label>
            Estado
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="PENDING">Pendientes</option>
              <option value="CONFIRMED">Confirmadas</option>
              <option value="REJECTED">Rechazadas</option>
              <option value="PROPOSED">Con propuesta</option>
            </select>
          </label>
          <label>
            Desde
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            Hasta
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button type="button" onClick={() => void load()} disabled={loading}>
            {loading ? 'Actualizando…' : 'Actualizar lista'}
          </button>
        </div>
        <p aria-live="polite">
          {pendingCount} pendientes · ordenadas de la más antigua a la más reciente
        </p>
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
        {loading ? (
          <p>Cargando solicitudes…</p>
        ) : items.length === 0 ? (
          <div className="appointment-summary">
            <h2>Sin solicitudes</h2>
            <p>No hay solicitudes que coincidan con los filtros actuales.</p>
          </div>
        ) : (
          <div className="slot-list">
            {items.map((item) => (
              <article className="appointment-summary" key={item.id}>
                <div>
                  <strong>{item.reference || item.folio || item.id}</strong>
                  <span> · {statusLabels[item.status?.toUpperCase()] || item.status}</span>
                </div>
                <p>
                  {patientName(item)} · {item.serviceName || 'Servicio'} ·{' '}
                  {item.dentistName || 'Dentista'}
                </p>
                <p>
                  {dateTime(item.startsAt)} · recibida {dateTime(item.createdAt)}
                </p>
                {item.status?.toUpperCase() === 'PROPOSED' && item.proposedStartsAt && (
                  <p>Propuesta: {dateTime(item.proposedStartsAt)}</p>
                )}
                <button type="button" onClick={() => void openDetail(item.id)}>
                  Ver detalle
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
      {selected && (
        <section className="panel" aria-label="Detalle de solicitud">
          <h2>Detalle · {selected.reference || selected.folio || selected.id}</h2>
          <p>
            <strong>Paciente:</strong> {patientName(selected)}
          </p>
          <p>
            <strong>Correo:</strong> {selected.patientEmail || 'No disponible'}
          </p>
          <p>
            <strong>Teléfono:</strong> {selected.patientPhone || 'No disponible'}
          </p>
          <p>
            <strong>Servicio:</strong> {selected.serviceName || 'No disponible'}
          </p>
          <p>
            <strong>Dentista:</strong> {selected.dentistName || 'No disponible'}
          </p>
          {selected.proposedStartsAt ? (
            <>
              <p>
                <strong>Horario original:</strong> {dateTime(selected.startsAt)} –{' '}
                {dateTime(selected.endsAt)}
              </p>
              <p>
                <strong>Propuesta:</strong> {dateTime(selected.proposedStartsAt)} –{' '}
                {dateTime(selected.proposedEndsAt)}
              </p>
              {selected.proposalExpiresAt && (
                <p>
                  <strong>Vence:</strong> {dateTime(selected.proposalExpiresAt)}
                </p>
              )}
              <p className="notice">
                El paciente debe aceptar o rechazar la propuesta. La propuesta no reserva el
                horario.
              </p>
              {/* NOTE (DENT-31): el vencimiento y la reversión a PENDING son de TEC-07. */}
            </>
          ) : (
            <p>
              <strong>Horario:</strong> {dateTime(selected.startsAt)} – {dateTime(selected.endsAt)}
            </p>
          )}
          <p>
            <strong>Estado:</strong>{' '}
            {statusLabels[selected.status?.toUpperCase()] || selected.status}
          </p>
          {selected.rejectionReason && (
            <p>
              <strong>Motivo:</strong> {selected.rejectionReason}
            </p>
          )}
          {selected.status?.toUpperCase() === 'PENDING' && (
            <div className="form-grid">
              <button type="button" disabled={busy} onClick={() => void act('confirm')}>
                {busy ? 'Guardando…' : 'Confirmar solicitud'}
              </button>
              <label>
                Motivo de rechazo (10–250 caracteres)
                <textarea
                  minLength={10}
                  maxLength={250}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Indica brevemente por qué no es posible atender esta solicitud."
                />
              </label>
              <button
                type="button"
                disabled={busy || reason.trim().length < 10}
                onClick={() => void act('reject')}
              >
                Rechazar solicitud
              </button>
            </div>
          )}
          {selected.status?.toUpperCase() === 'PENDING' && (
            <section className="appointment-summary" aria-label="Proponer horario alternativo">
              <h3>Proponer horario alternativo</h3>
              <p>
                Elige una fecha y un horario disponible. Se conservará el horario original y la
                propuesta no reserva el intervalo.
              </p>
              <label>
                Fecha alternativa
                <input
                  type="date"
                  min={localToday()}
                  value={proposedDate}
                  onChange={(e) => {
                    setProposedDate(e.target.value);
                    setSelectedProposed('');
                  }}
                />
              </label>
              {loadingSlots && <p>Consultando horarios…</p>}
              {slotError && (
                <p className="notice error" role="alert">
                  {slotError}
                </p>
              )}
              {!loadingSlots && !slotError && !slots.length && (
                <p className="notice">No hay horarios disponibles para esta fecha.</p>
              )}
              <div className="slot-list">
                {slots.map((slot) => (
                  <button
                    type="button"
                    key={slot.startsAt}
                    className={selectedProposed === slot.startsAt ? 'slot selected' : 'slot'}
                    aria-pressed={selectedProposed === slot.startsAt}
                    onClick={() => setSelectedProposed(slot.startsAt)}
                  >
                    {dateTime(slot.startsAt)} –{' '}
                    {new Intl.DateTimeFormat('es-MX', { timeStyle: 'short', timeZone }).format(
                      new Date(slot.endsAt),
                    )}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={!selectedProposed || proposing}
                onClick={() => void propose()}
              >
                {proposing ? 'Enviando…' : 'Proponer este horario'}
              </button>
            </section>
          )}
        </section>
      )}
    </main>
  );
}
