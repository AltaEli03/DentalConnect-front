import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../services/api';
import type { AvailabilitySlot, Clinic } from '../types/api';

const timeZone = 'America/Mexico_City';
const mexico = (value: string) =>
  new Intl.DateTimeFormat('es-MX', { dateStyle: 'full', timeStyle: 'short', timeZone }).format(
    new Date(value),
  );
const localToday = () => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());

export function AppointmentRequestPage() {
  const { clinicId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [clinic, setClinic] = useState<Clinic>();
  const [loadingClinic, setLoadingClinic] = useState(true);
  const [clinicError, setClinicError] = useState('');
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedDate, setSelectedDate] = useState(localToday());
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestResult, setRequestResult] = useState<{
    id: string;
    folio: string;
    status: string;
  }>();
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const serviceId = params.get('serviceId') || '';
  const dentistId = params.get('dentistId') || '';
  const selectedService = clinic?.services.find((service) => service.id === serviceId);
  const dentists = useMemo(
    () =>
      clinic?.dentists?.filter((dentist) =>
        dentist.services?.some((service) => service.id === serviceId),
      ) || [],
    [clinic, serviceId],
  );
  const selectedDentist = dentists.find((dentist) => dentist.id === dentistId);

  useEffect(() => {
    let active = true;
    api
      .clinic(clinicId)
      .then(({ data }) => {
        if (active) setClinic(data);
      })
      .catch((cause: unknown) => {
        if (active)
          setClinicError(
            cause instanceof Error ? cause.message : 'No se pudo cargar el consultorio.',
          );
      })
      .finally(() => {
        if (active) setLoadingClinic(false);
      });
    return () => {
      active = false;
    };
  }, [clinicId]);

  useEffect(() => {
    setSlots([]);
    setSelectedSlot('');
    setSlotError('');
    setRequestError('');
    setRequestResult(undefined);
    setIdempotencyKey('');
    if (!clinic || !serviceId || !dentistId || !selectedService || !selectedDentist) return;
    let active = true;
    setLoadingSlots(true);
    api
      .availability(clinicId, dentistId, serviceId, selectedDate)
      .then(({ data }) => {
        if (active) setSlots(data);
      })
      .catch((cause: unknown) => {
        if (active)
          setSlotError(
            cause instanceof Error ? cause.message : 'No se pudieron consultar los horarios.',
          );
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [clinic, clinicId, dentistId, selectedDate, selectedDentist, selectedService, serviceId]);

  function changeService(next: string) {
    setSlots([]);
    setSelectedSlot('');
    setRequestResult(undefined);
    setIdempotencyKey('');
    setSlotError('');
    const nextParams = new URLSearchParams();
    if (next) nextParams.set('serviceId', next);
    setParams(nextParams);
  }
  function changeDentist(next: string) {
    setSlots([]);
    setSelectedSlot('');
    setRequestResult(undefined);
    setIdempotencyKey('');
    setSlotError('');
    const nextParams = new URLSearchParams();
    if (serviceId) nextParams.set('serviceId', serviceId);
    if (next) nextParams.set('dentistId', next);
    setParams(nextParams);
  }
  function chooseSlot(slot: AvailabilitySlot) {
    setSelectedSlot(slot.startsAt);
    setRequestResult(undefined);
    setRequestError('');
    setIdempotencyKey(crypto.randomUUID());
  }
  async function submitRequest() {
    if (!user || !selectedService || !selectedDentist || !selectedSlot || !idempotencyKey) return;
    setRequesting(true);
    setRequestError('');
    try {
      const result = await api.createAppointment(
        { clinicId, dentistId, dentalServiceId: serviceId, startsAt: selectedSlot },
        idempotencyKey,
      );
      setRequestResult({
        id: result.data.id,
        folio: result.data.folio,
        status: result.data.status,
      });
    } catch (cause) {
      setRequestError(cause instanceof Error ? cause.message : 'No se pudo enviar la solicitud.');
    } finally {
      setRequesting(false);
    }
  }

  if (loadingClinic)
    return (
      <main className="directory">
        <p>Cargando consultorio…</p>
      </main>
    );
  if (clinicError || !clinic)
    return (
      <main className="directory">
        <p className="notice error">{clinicError || 'Consultorio no disponible.'}</p>
        <Link to="/clinics">Volver a búsqueda</Link>
      </main>
    );
  return (
    <main className="page-shell">
      <section className="panel">
        <Link to={'/clinics/' + clinic.id}>← {clinic.name}</Link>
        <p className="eyebrow">Solicitud de atención</p>
        <h1>Elige servicio y dentista</h1>
        <label>
          Servicio activo
          <select value={serviceId} onChange={(event) => changeService(event.target.value)}>
            <option value="">Selecciona un servicio</option>
            {clinic.services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} · {service.estimatedDurationMinutes} min
              </option>
            ))}
          </select>
        </label>
        {selectedService && (
          <p>
            {selectedService.description} · duración estimada{' '}
            {selectedService.estimatedDurationMinutes} minutos.
          </p>
        )}
        <label>
          Dentista compatible
          <select
            value={dentistId}
            onChange={(event) => changeDentist(event.target.value)}
            disabled={!serviceId}
          >
            <option value="">Selecciona un dentista</option>
            {dentists.map((dentist) => (
              <option key={dentist.id} value={dentist.id}>
                {dentist.firstName} {dentist.lastName} · {dentist.specialty}
              </option>
            ))}
          </select>
        </label>
        {serviceId && !dentists.length && (
          <p className="notice">No hay dentistas activos que ofrezcan este servicio.</p>
        )}
      </section>
      {serviceId && dentistId && selectedService && selectedDentist && (
        <section className="panel" aria-live="polite">
          <h2>Horarios disponibles</h2>
          <p>
            Zona horaria: {timeZone}. Los horarios se consultan de nuevo en el servidor al enviar.
          </p>
          <label>
            Fecha de atención
            <input
              type="date"
              min={localToday()}
              value={selectedDate}
              onChange={(event) => {
                setSelectedDate(event.target.value);
                setSelectedSlot('');
                setRequestResult(undefined);
                setIdempotencyKey('');
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
            <p className="notice">
              No hay disponibilidad para esta fecha. Puedes elegir otra fecha o cambiar el servicio
              y dentista.
            </p>
          )}
          <div className="slot-list">
            {slots.map((slot) => (
              <button
                className={selectedSlot === slot.startsAt ? 'slot selected' : 'slot'}
                type="button"
                key={slot.startsAt}
                aria-pressed={selectedSlot === slot.startsAt}
                onClick={() => chooseSlot(slot)}
              >
                {mexico(slot.startsAt)} –{' '}
                {new Intl.DateTimeFormat('es-MX', { timeStyle: 'short', timeZone }).format(
                  new Date(slot.endsAt),
                )}
              </button>
            ))}
          </div>
          {selectedSlot && (
            <section className="appointment-summary" aria-label="Resumen de solicitud">
              <h3>Revisa tu solicitud</h3>
              <p>
                <strong>Consultorio:</strong> {clinic.name}
              </p>
              <p>
                <strong>Dentista:</strong> {selectedDentist.firstName} {selectedDentist.lastName}
              </p>
              <p>
                <strong>Servicio:</strong> {selectedService.name} ·{' '}
                {selectedService.estimatedDurationMinutes} min
              </p>
              <p>
                <strong>Fecha y hora:</strong> {mexico(selectedSlot)}
              </p>
              {requestResult ? (
                <p className="notice" role="status">
                  Solicitud enviada. Folio <strong>{requestResult.folio}</strong> · estado{' '}
                  <strong>{requestResult.status}</strong>. El consultorio debe confirmar la
                  atención.{' '}
                  <Link to={`/mi-solicitud/${encodeURIComponent(requestResult.id)}`}>
                    Ver el estado de mi solicitud
                  </Link>
                  {/* NOTE (DENT-16): el listado persistente de citas del paciente es HU-16. */}
                </p>
              ) : (
                <>
                  {!authLoading && !user && (
                    <p className="notice">
                      Inicia sesión con una cuenta verificada para enviar la solicitud.{' '}
                      <Link to="/iniciar-sesion">Iniciar sesión</Link>
                    </p>
                  )}
                  {requestError && (
                    <p className="notice error" role="alert">
                      {requestError}
                    </p>
                  )}
                  <button
                    type="button"
                    className="button-primary"
                    onClick={() => void submitRequest()}
                    disabled={!user || authLoading || requesting}
                  >
                    {requesting ? 'Enviando…' : 'Enviar solicitud pendiente'}
                  </button>
                  <p>
                    Al enviar, se crea una solicitud pendiente; no se confirma ni se cobra una cita.
                  </p>
                </>
              )}
            </section>
          )}
        </section>
      )}
    </main>
  );
}
