import { useCallback, useEffect, useMemo, useState } from 'react';
import { currentIdToken } from '../services/cognito';

type Appointment = { id: string; reference?: string; folio?: string; status: string; createdAt?: string; startsAt?: string; endsAt?: string; patientFirstName?: string; patientLastName?: string; patientEmail?: string; patientPhone?: string; serviceName?: string; dentistName?: string; rejectionReason?: string };
const apiBase = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const statusLabels: Record<string, string> = { PENDING: 'Pendiente', CONFIRMED: 'Confirmada', REJECTED: 'Rechazada', CANCELLED: 'Cancelada' };
const dateTime = (value?: string) => value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(value)) : 'No disponible';
const normalizeAppointment = (item: any): Appointment => ({ ...item, createdAt: item.createdAt || item.receivedAt, patientFirstName: item.patientFirstName || item.patient?.firstName, patientLastName: item.patientLastName || item.patient?.lastName, patientEmail: item.patientEmail || item.patient?.email, patientPhone: item.patientPhone || item.patient?.phone, dentistName: item.dentistName || [item.dentist?.firstName, item.dentist?.lastName].filter(Boolean).join(' '), serviceName: item.serviceName || item.service?.name, rejectionReason: item.rejectionReason || item.rejection?.reason });
const patientName = (item: Appointment) => [item.patientFirstName, item.patientLastName].filter(Boolean).join(' ') || 'Paciente';

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

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    if (!apiBase) throw new Error('La URL del API no está configurada para este ambiente.');
    const token = await currentIdToken();
    if (!token) throw new Error('Inicia sesión con una cuenta autorizada del consultorio.');
    const headers = new Headers(init.headers);
    headers.set('Authorization', 'Bearer ' + token);
    if (init.body) headers.set('Content-Type', 'application/json');
    const response = await fetch(apiBase + path, { ...init, headers });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = body?.error?.message || body?.message || body?.title || (response.status === 403 ? 'Tu cuenta no tiene permisos para administrar solicitudes de este consultorio.' : response.status === 404 ? 'La solicitud no existe o no pertenece a tu consultorio.' : 'Error HTTP ' + response.status);
      throw new Error(message);
    }
    return response.status === 204 ? null : response.json();
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (from) params.set('dateFrom', from);
      if (to) params.set('dateTo', to);
      const query = params.toString();
      const data = await request('/api/appointments' + (query ? '?' + query : ''));
      const rows = (Array.isArray(data) ? data : data?.data ?? data?.appointments ?? data?.items ?? []).map(normalizeAppointment);
      setItems(rows);
      if (selected) {
        const updated = rows.find((row: Appointment) => row.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron cargar las solicitudes.'); }
    finally { setLoading(false); }
  }, [request, status, from, to]);

  useEffect(() => { void load(); }, [load]);

  const openDetail = async (id: string) => {
    setError(''); setNotice('');
    try {
      const data = await request('/api/appointments/' + encodeURIComponent(id));
      setSelected(normalizeAppointment(data?.data ?? data?.appointment ?? data));
    } catch (e) { setSelected(null); setError(e instanceof Error ? e.message : 'No se pudo abrir el detalle.'); }
  };

  const act = async (action: 'confirm' | 'reject') => {
    if (!selected) return;
    if (action === 'reject' && (reason.trim().length < 10 || reason.trim().length > 250)) { setError('El motivo debe tener entre 10 y 250 caracteres.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = action === 'reject' ? JSON.stringify({ reason: reason.trim() }) : undefined;
      await request('/api/appointments/' + encodeURIComponent(selected.id) + '/' + action, { method: 'POST', body: payload });
      setReason(''); setNotice(action === 'confirm' ? 'Solicitud confirmada; el horario quedó reservado.' : 'Solicitud rechazada y motivo guardado.');
      await load();
      await openDetail(selected.id);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar la solicitud.'); }
    finally { setBusy(false); }
  };

  const pendingCount = useMemo(() => items.filter((item) => item.status?.toUpperCase() === 'PENDING').length, [items]);

  return <main className="page-shell">
    <section className="panel">
      <p className="eyebrow">Gestión del consultorio</p><h1>Solicitudes de cita</h1>
      <p>Revisa los datos de contacto y decide sobre las solicitudes pendientes. Solo verás solicitudes de tu consultorio.</p>
      <div className="form-grid">
        <label>Estado<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos</option><option value="PENDING">Pendientes</option><option value="CONFIRMED">Confirmadas</option><option value="REJECTED">Rechazadas</option></select></label>
        <label>Desde<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>Hasta<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button type="button" onClick={() => void load()} disabled={loading}>{loading ? 'Actualizando…' : 'Actualizar lista'}</button>
      </div>
      <p aria-live="polite">{pendingCount} pendientes · ordenadas de la más antigua a la más reciente</p>
      {error && <p className="error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
      {loading ? <p>Cargando solicitudes…</p> : items.length === 0 ? <div className="appointment-summary"><h2>Sin solicitudes</h2><p>No hay solicitudes que coincidan con los filtros actuales.</p></div> :
        <div className="slot-list">{items.map((item) => <article className="appointment-summary" key={item.id}>
          <div><strong>{item.reference || item.folio || item.id}</strong><span> · {statusLabels[item.status?.toUpperCase()] || item.status}</span></div>
          <p>{patientName(item)} · {item.serviceName || 'Servicio'} · {item.dentistName || 'Dentista'}</p>
          <p>{dateTime(item.startsAt)} · recibida {dateTime(item.createdAt)}</p>
          <button type="button" onClick={() => void openDetail(item.id)}>Ver detalle</button>
        </article>)}</div>}
    </section>
    {selected && <section className="panel" aria-label="Detalle de solicitud">
      <h2>Detalle · {selected.reference || selected.folio || selected.id}</h2>
      <p><strong>Paciente:</strong> {patientName(selected)}</p><p><strong>Correo:</strong> {selected.patientEmail || 'No disponible'}</p>
      <p><strong>Teléfono:</strong> {selected.patientPhone || 'No disponible'}</p><p><strong>Servicio:</strong> {selected.serviceName || 'No disponible'}</p>
      <p><strong>Dentista:</strong> {selected.dentistName || 'No disponible'}</p><p><strong>Horario:</strong> {dateTime(selected.startsAt)} – {dateTime(selected.endsAt)}</p>
      <p><strong>Estado:</strong> {statusLabels[selected.status?.toUpperCase()] || selected.status}</p>
      {selected.rejectionReason && <p><strong>Motivo:</strong> {selected.rejectionReason}</p>}
      {selected.status?.toUpperCase() === 'PENDING' && <div className="form-grid">
        <button type="button" disabled={busy} onClick={() => void act('confirm')}>{busy ? 'Guardando…' : 'Confirmar solicitud'}</button>
        <label>Motivo de rechazo (10–250 caracteres)<textarea minLength={10} maxLength={250} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Indica brevemente por qué no es posible atender esta solicitud." /></label>
        <button type="button" disabled={busy || reason.trim().length < 10} onClick={() => void act('reject')}>Rechazar solicitud</button>
      </div>}
    </section>}
  </main>;
}
