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

const getStatusClass = (status: string) => {
  switch (status) {
    case 'CONFIRMED': return 'status-confirmed';
    case 'REJECTED':
    case 'CANCELLED': return 'status-cancelled';
    case 'PROPOSED': return 'status-proposed';
    default: return 'status-pending';
  }
};

const timeZone = 'America/Mexico_City';
const localToday = () => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());

const sameInstant = (a?: string, b?: string) =>
  Boolean(a && b && new Date(a).getTime() === new Date(b).getTime());

const dateTime = (value?: string) =>
  value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(value)) : 'No disponible';

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
  dentistName: item.dentistName || [item.dentist?.firstName, item.dentist?.lastName].filter(Boolean).join(' '),
  serviceName: item.serviceName || item.service?.name,
  rejectionReason: item.rejectionReason || item.rejection?.reason,
});

const patientName = (item: Appointment) =>
  [item.patientFirstName, item.patientLastName].filter(Boolean).join(' ') || 'Paciente sin nombre';

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
  
  // Estado para controlar la carga del panel derecho
  const [loadingDetail, setLoadingDetail] = useState(false);

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
      const message = body?.error?.message || body?.message || body?.title || (response.status === 403 ? 'Tu cuenta no tiene permisos...' : response.status === 404 ? 'La solicitud no existe...' : 'Error HTTP ' + response.status);
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
      const rows = (Array.isArray(data) ? data : (data?.data ?? data?.appointments ?? data?.items ?? [])).map(normalizeAppointment);
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

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    setSlots([]);
    setSelectedProposed('');
    setSlotError('');
    if (!selected || selected.status?.toUpperCase() !== 'PENDING' || !selected.clinicId || !selected.dentistId || !selected.dentalServiceId || !proposedDate) return;
    let active = true;
    setLoadingSlots(true);
    const params = new URLSearchParams({ serviceId: selected.dentalServiceId, date: proposedDate });
    request('/clinics/' + encodeURIComponent(selected.clinicId) + '/dentists/' + encodeURIComponent(selected.dentistId) + '/availability?' + params.toString())
      .then((data) => {
        if (!active) return;
        const rows = (data?.data ?? []) as AvailabilitySlot[];
        setSlots(rows.filter((slot) => !sameInstant(slot.startsAt, selected.startsAt)));
      })
      .catch((e) => { if (active) setSlotError(e instanceof Error ? e.message : 'No se pudieron consultar los horarios.'); })
      .finally(() => { if (active) setLoadingSlots(false); });
    return () => { active = false; };
  }, [request, selected, proposedDate]);

  const openDetail = async (id: string) => {
    setError('');
    setNotice('');
    setProposedDate(localToday());
    setSlots([]);
    setSelectedProposed('');
    setSlotError('');
    setLoadingDetail(true);
    try {
      const data = await request('/appointments/' + encodeURIComponent(id));
      setSelected(normalizeAppointment(data?.data ?? data?.appointment ?? data));
    } catch (e) {
      setSelected(null);
      setError(e instanceof Error ? e.message : 'No se pudo abrir el detalle.');
    } finally {
      setLoadingDetail(false);
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
      await request('/appointments/' + encodeURIComponent(selected.id) + '/' + action, { method: 'POST', body: payload });
      setReason('');
      setNotice(action === 'confirm' ? 'Solicitud confirmada; el horario quedó reservado.' : 'Solicitud rechazada y motivo guardado.');
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
      setNotice('Propuesta enviada. El paciente debe aceptarla o rechazarla.');
    }
  };

  const pendingCount = useMemo(() => items.filter((item) => item.status?.toUpperCase() === 'PENDING').length, [items]);

  return (
    <main className="dashboard-page">
      {/* HEADER Y FILTROS */}
      <section className="panel dashboard-header-panel">
        <div>
          <p className="eyebrow">Panel de Gestión</p>
          <h1>Solicitudes de Cita</h1>
          <p className="text-muted">Revisa, confirma o propone nuevos horarios a los pacientes.</p>
        </div>
        
        <div className="filter-bar">
          <label>Estado
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="premium-input">
              <option value="">Todas</option>
              <option value="PENDING">Pendientes</option>
              <option value="CONFIRMED">Confirmadas</option>
              <option value="REJECTED">Rechazadas</option>
              <option value="PROPOSED">Con propuesta</option>
            </select>
          </label>
          <label>Desde
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="premium-input" />
          </label>
          <label>Hasta
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="premium-input" />
          </label>
          <button onClick={() => void load()} disabled={loading} className="btn btn-primary">
            {loading ? 'Actualizando…' : 'Filtrar'}
          </button>
        </div>
      </section>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {notice && <div className="alert alert-success" role="status">{notice}</div>}

      <div className="management-layout">
        {/* COLUMNA IZQUIERDA: LISTA DE SOLICITUDES */}
        <aside className="panel inbox-panel">
          <div className="panel-header">
            <h2>Bandeja de Entrada</h2>
            <span className="badge">{pendingCount} pendientes</span>
          </div>
          
          {loading && items.length === 0 ? (
            <div className="loading-state"><p>Cargando solicitudes…</p></div>
          ) : items.length === 0 ? (
            <div className="loading-state"><p>No hay solicitudes con estos filtros.</p></div>
          ) : (
            <div className="request-list">
              {items.map((item) => {
                const s = item.status?.toUpperCase();
                return (
                  <button 
                    key={item.id} 
                    className={`request-card ${selected?.id === item.id ? 'active' : ''} border-${getStatusClass(s)}`}
                    onClick={() => void openDetail(item.id)}
                    aria-current={selected?.id === item.id ? 'true' : 'false'}
                  >
                    <div className="request-card-top">
                      <strong>{patientName(item)}</strong>
                      <span className={`status-dot ${getStatusClass(s)}`} title={statusLabels[s] || s}></span>
                    </div>
                    <p className="request-service">{item.serviceName || 'Servicio'}</p>
                    <div className="request-meta">
                      <span>📅 {dateTime(item.startsAt)}</span>
                    </div>
                    <span className="request-folio">Folio: {item.reference || item.folio || item.id.split('-')[0]}</span>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* COLUMNA DERECHA: DETALLE DE LA SOLICITUD */}
        <section className="panel detail-panel">
          {loadingDetail ? (
            <div className="loading-state" style={{ height: '100%' }}>
              <p>Cargando detalle de la solicitud…</p>
            </div>
          ) : selected ? (
            <>
              {/* Cabecera del Detalle */}
              <div className="detail-header">
                <div>
                  <h2>{patientName(selected)}</h2>
                  <span className={`status-badge ${getStatusClass(selected.status?.toUpperCase())}`}>
                    {statusLabels[selected.status?.toUpperCase()] || selected.status}
                  </span>
                </div>
                <div className="detail-folio">Ref: {selected.reference || selected.folio || selected.id}</div>
              </div>

              {/* Ficha del Paciente */}
              <div className="patient-card">
                <div className="patient-contact">
                  <div className="contact-item"><span className="icon">✉️</span> {selected.patientEmail || 'No disponible'}</div>
                  <div className="contact-item"><span className="icon">📞</span> {selected.patientPhone || 'No disponible'}</div>
                </div>
                <div className="appointment-info">
                  <div className="info-row">
                    <span>Servicio:</span> <strong>{selected.serviceName || 'No disponible'}</strong>
                  </div>
                  <div className="info-row">
                    <span>Especialista:</span> <strong>{selected.dentistName || 'No disponible'}</strong>
                  </div>
                  <div className="info-row highlight-row">
                    <span>Fecha Solicitada:</span> <strong>{dateTime(selected.startsAt)}</strong>
                  </div>
                </div>
              </div>

              {/* Estado de Propuesta */}
              {selected.proposedStartsAt && (
                <div className="proposal-status-box" style={{ margin: '0 2rem 1.5rem', padding: '1rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-accent)' }}>
                  <p style={{ margin: 0 }}><strong>Horario Propuesto:</strong> {dateTime(selected.proposedStartsAt)} – {dateTime(selected.proposedEndsAt)}</p>
                  {selected.proposalExpiresAt && <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Vence: {dateTime(selected.proposalExpiresAt)}</p>}
                </div>
              )}

              {/* ZONA DE ACCIONES (Solo si está PENDIENTE) */}
              {selected.status?.toUpperCase() === 'PENDING' && (
                <div className="action-zone">
                  <h3>Acciones Disponibles</h3>
                  
                  {/* 1. CONFIRMAR */}
                  <div className="action-block">
                    <button type="button" className="btn btn-primary btn-full confirm-btn" disabled={busy} onClick={() => void act('confirm')}>
                      {busy ? 'Guardando…' : '✓ Confirmar esta solicitud'}
                    </button>
                  </div>

                  <div className="action-divider"><span>o</span></div>

                  {/* 2. PROPONER NUEVO HORARIO */}
                  <div className="action-block propose-block">
                    <h4>Proponer un horario alternativo</h4>
                    <label className="date-label" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Selecciona una fecha</label>
                    <input type="date" className="premium-input btn-full" style={{ marginBottom: '1rem' }} min={localToday()} value={proposedDate} onChange={(e) => { setProposedDate(e.target.value); setSelectedProposed(''); }} />
                    
                    {loadingSlots && <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Buscando disponibilidad…</p>}
                    {slotError && <div className="alert alert-error" style={{ padding: '0.5rem', fontSize: '0.85rem' }}>{slotError}</div>}
                    {!loadingSlots && !slotError && slots.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No hay horarios para esta fecha.</p>}
                    
                    <div className="slots-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', marginBottom: '1rem' }}>
                      {slots.map((slot) => (
                        <button
                          type="button"
                          key={slot.startsAt}
                          className={`slot-btn ${selectedProposed === slot.startsAt ? 'active' : ''}`}
                          aria-pressed={selectedProposed === slot.startsAt}
                          onClick={() => setSelectedProposed(slot.startsAt)}
                        >
                          {new Intl.DateTimeFormat('es-MX', { timeStyle: 'short', timeZone }).format(new Date(slot.startsAt))}
                        </button>
                      ))}
                    </div>
                    <button type="button" className="btn btn-outline btn-full" disabled={!selectedProposed || proposing} onClick={() => void propose()}>
                      {proposing ? 'Enviando…' : 'Proponer horario seleccionado'}
                    </button>
                  </div>

                  <div className="action-divider"><span>o</span></div>

                  {/* 3. RECHAZAR */}
                  <div className="action-block danger-block" style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                    <h4>Rechazar solicitud</h4>
                    <textarea
                      className="premium-input"
                      rows={2}
                      minLength={10}
                      maxLength={250}
                      placeholder="Motivo del rechazo (10-250 caracteres)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      style={{ marginBottom: '1rem', resize: 'none' }}
                    />
                    <button type="button" className="btn btn-danger btn-full" disabled={busy || reason.trim().length < 10} onClick={() => void act('reject')}>
                      Rechazar solicitud
                    </button>
                  </div>
                </div>
              )}

              {selected.rejectionReason && (
                <div className="alert alert-error" style={{ margin: '0 2rem 2rem' }}>
                  <strong>Motivo de rechazo:</strong> {selected.rejectionReason}
                </div>
              )}
            </>
          ) : (
            <div className="empty-detail" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px', padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <div className="empty-icon" style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>📥</div>
              <h2 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>Selecciona una solicitud</h2>
              <p style={{ maxWidth: '300px' }}>Elige una cita de la bandeja izquierda para ver los detalles del paciente y gestionar la cita.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}