import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Field, controlClass } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import { Notice } from '../components/ui/Notice';
import { SlotButton } from '../components/ui/SlotButton';
import { StatusStamp } from '../components/ui/StatusStamp';
import { AdminShell } from '../components/layout/AdminShell';
import { clinicRequest as request } from '../services/clinicApi';
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

type ClinicListResponse = {
  data?: AppointmentDto[];
  appointments?: AppointmentDto[];
  items?: AppointmentDto[];
};
type ClinicDetailResponse = { data?: AppointmentDto; appointment?: AppointmentDto };

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

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (from) params.set('dateFrom', from);
      if (to) params.set('dateTo', to);
      const query = params.toString();
      const data = await request<AppointmentDto[] | ClinicListResponse>(
        '/appointments' + (query ? '?' + query : ''),
      );
      const rows = (
        Array.isArray(data) ? data : (data?.data ?? data?.appointments ?? data?.items ?? [])
      )
        .map(normalizeAppointment)
        .sort(
          (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
        );
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
    request<{ data: AvailabilitySlot[] }>(
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
    setLoadingDetail(true);
    try {
      const data = await request<ClinicDetailResponse>('/appointments/' + encodeURIComponent(id));
      setSelected(normalizeAppointment(data?.data ?? data?.appointment ?? {}));
    } catch (e) {
      setSelected(null);
      setError(e instanceof Error ? e.message : 'No se pudo abrir el detalle.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const [searchParams] = useSearchParams();
  const appointmentFromUrl = searchParams.get('appointmentId');
  useEffect(() => {
    if (appointmentFromUrl) void openDetail(appointmentFromUrl);
  }, [appointmentFromUrl]);

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
      setNotice('Propuesta enviada. El paciente debe aceptarla o rechazarla.');
    }
  };

  const pendingCount = useMemo(
    () => items.filter((item) => item.status?.toUpperCase() === 'PENDING').length,
    [items],
  );

  return (
    <AdminShell
      title="Solicitudes de cita"
      description="Revisa, confirma o propone nuevos horarios a los pacientes."
      active="requests"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
        className="flex flex-wrap items-end gap-3 rounded-panel border border-line bg-surface p-4"
        aria-label="Filtrar solicitudes"
      >
        <Field id="request-status" label="Estado" className="min-w-44">
          <select
            id="request-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={controlClass}
          >
            <option value="">Todas</option>
            <option value="PENDING">Pendientes</option>
            <option value="CONFIRMED">Confirmadas</option>
            <option value="REJECTED">Rechazadas</option>
            <option value="PROPOSED">Con propuesta</option>
          </select>
        </Field>
        <Field id="request-from" label="Desde" className="min-w-40">
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className={controlClass}
          />
        </Field>
        <Field id="request-to" label="Hasta" className="min-w-40">
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

      {error && (
        <Notice tone="error" className="mt-5">
          <p>{error}</p>
        </Notice>
      )}
      {notice && (
        <Notice tone="success" className="mt-5">
          {notice}
        </Notice>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <section
          className={`rounded-panel border border-line bg-surface ${selected ? 'max-lg:hidden' : ''}`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="font-display text-lg font-semibold text-heading">Bandeja de entrada</h2>
            <span className="text-xs font-semibold text-subtle">{pendingCount} pendientes</span>
          </div>

          {loading && items.length === 0 ? (
            <p className="p-4 text-sm text-muted" role="status">
              Cargando solicitudes…
            </p>
          ) : items.length === 0 ? (
            <p className="p-4 text-sm text-muted">No hay solicitudes con estos filtros.</p>
          ) : (
            <ul aria-label="Solicitudes de cita" className="divide-y divide-line">
              {items.map((item) => {
                const itemStatus = item.status?.toUpperCase() ?? 'PENDING';
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`w-full px-4 py-4 text-left transition-colors hover:bg-surface-soft ${
                        selected?.id === item.id ? 'border-l-2 border-accent bg-surface-soft' : ''
                      }`}
                      onClick={() => void openDetail(item.id)}
                      aria-current={selected?.id === item.id ? 'true' : 'false'}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="font-display text-base font-semibold text-heading">
                          {patientName(item)}
                        </strong>
                        <StatusStamp status={itemStatus} />
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {item.serviceName || 'Servicio'}
                      </p>
                      <p className="mt-1 text-xs text-muted">{dateTime(item.startsAt)}</p>
                      <p className="mt-1 text-xs text-subtle">
                        Folio: {item.reference || item.folio || item.id.split('-')[0]}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          className={`rounded-panel border border-line bg-surface ${selected ? '' : 'max-lg:hidden'}`}
          aria-label="Detalle de solicitud"
        >
          {loadingDetail ? (
            <p className="p-6 text-sm text-muted" role="status">
              Cargando detalle de la solicitud…
            </p>
          ) : selected ? (
            <>
              <div className="p-4 pb-0 lg:hidden">
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                  Volver a solicitudes
                </Button>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-surface-soft p-5">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-heading">
                    {patientName(selected)}
                  </h2>
                  <div className="mt-2">
                    <StatusStamp status={selected.status?.toUpperCase()} />
                  </div>
                </div>
                <div className="text-right text-xs text-subtle">
                  Ref: {selected.reference || selected.folio || selected.id}
                </div>
              </div>

              <div className="grid gap-5 p-5">
                <div className="grid gap-3 rounded-control border border-line bg-canvas p-4 text-sm sm:grid-cols-2">
                  <p className="flex items-center gap-2">
                    <Icon name="mail" size={16} className="text-accent" />
                    {selected.patientEmail || 'No disponible'}
                  </p>
                  <p className="flex items-center gap-2">
                    <Icon name="phone" size={16} className="text-accent" />
                    {selected.patientPhone || 'No disponible'}
                  </p>
                </div>

                <dl className="grid gap-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2 border-b border-line pb-3">
                    <dt className="text-muted">Servicio:</dt>
                    <dd className="font-semibold text-heading">
                      {selected.serviceName || 'No disponible'}
                    </dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2 border-b border-line pb-3">
                    <dt className="text-muted">Especialista:</dt>
                    <dd className="font-semibold text-heading">
                      {selected.dentistName || 'No disponible'}
                    </dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2 border-b border-line pb-3">
                    <dt className="text-muted">Fecha Solicitada:</dt>
                    <dd className="font-semibold text-heading">{dateTime(selected.startsAt)}</dd>
                  </div>
                  {selected.proposedStartsAt && (
                    <div className="flex flex-wrap justify-between gap-2 border-b border-line pb-3">
                      <dt className="text-muted">Horario Propuesto:</dt>
                      <dd className="font-semibold text-heading">
                        {dateTime(selected.proposedStartsAt)} – {dateTime(selected.proposedEndsAt)}
                      </dd>
                    </div>
                  )}
                  {selected.proposalExpiresAt && (
                    <div className="flex flex-wrap justify-between gap-2 border-b border-line pb-3">
                      <dt className="text-muted">Vence:</dt>
                      <dd className="font-semibold text-heading">
                        {dateTime(selected.proposalExpiresAt)}
                      </dd>
                    </div>
                  )}
                </dl>

                {selected.status?.toUpperCase() === 'PENDING' && (
                  <div className="grid gap-5 border-t border-line pt-5">
                    <div>
                      <Button disabled={busy} onClick={() => void act('confirm')}>
                        {busy ? 'Guardando…' : 'Confirmar esta solicitud'}
                      </Button>
                    </div>

                    <div className="grid gap-3 rounded-control border border-line bg-canvas p-4">
                      <h3 className="font-display text-lg font-semibold text-heading">
                        Proponer un horario alternativo
                      </h3>
                      <Field id="proposed-date" label="Selecciona una fecha">
                        <input
                          type="date"
                          min={localToday()}
                          value={proposedDate}
                          onChange={(event) => {
                            setProposedDate(event.target.value);
                            setSelectedProposed('');
                          }}
                          className={controlClass}
                        />
                      </Field>
                      {loadingSlots && <p className="text-sm text-muted">Buscando disponibilidad…</p>}
                      {slotError && (
                        <Notice tone="error">
                          <p>{slotError}</p>
                        </Notice>
                      )}
                      {!loadingSlots && !slotError && slots.length === 0 && (
                        <p className="text-sm text-muted">No hay horarios para esta fecha.</p>
                      )}
                      {slots.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {slots.map((slot) => (
                            <SlotButton
                              key={slot.startsAt}
                              selected={selectedProposed === slot.startsAt}
                              onClick={() => setSelectedProposed(slot.startsAt)}
                            >
                              {new Intl.DateTimeFormat('es-MX', {
                                timeStyle: 'short',
                                timeZone,
                              }).format(new Date(slot.startsAt))}
                            </SlotButton>
                          ))}
                        </div>
                      )}
                      <Button
                        className="justify-self-start"
                        disabled={!selectedProposed || proposing}
                        loading={proposing}
                        onClick={() => void propose()}
                      >
                        {proposing ? 'Enviando…' : 'Proponer horario seleccionado'}
                      </Button>
                    </div>

                    <div className="grid gap-3 rounded-control border border-danger-border bg-danger-soft p-4">
                      <h3 className="font-display text-lg font-semibold text-heading">
                        Rechazar solicitud
                      </h3>
                      <Field id="rejection-reason" label="Motivo del rechazo">
                        <textarea
                          rows={2}
                          minLength={10}
                          maxLength={250}
                          placeholder="Motivo del rechazo (10-250 caracteres)"
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                          className={controlClass}
                        />
                      </Field>
                      <Button
                        variant="danger"
                        disabled={busy || reason.trim().length < 10}
                        onClick={() => void act('reject')}
                      >
                        Rechazar solicitud
                      </Button>
                    </div>
                  </div>
                )}

                {selected.rejectionReason && (
                  <Notice tone="error">
                    <strong>Motivo de rechazo:</strong> {selected.rejectionReason}
                  </Notice>
                )}
              </div>
            </>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="font-display text-lg font-semibold text-heading">
                Selecciona una solicitud
              </p>
              <p className="max-w-[40ch] text-sm text-muted">
                Elige una solicitud de la bandeja para revisar los datos del paciente y responder.
              </p>
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
