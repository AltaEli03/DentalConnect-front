import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../services/api';
import type { AvailabilitySlot, Clinic } from '../types/api';

const timeZone = 'America/Mexico_City';
const mexico = (value: string) =>
  new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(
    new Date(value),
  );
const localToday = () => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

function requestMessage(cause: unknown) {
  if (cause instanceof ApiError) {
    if (cause.status === 409) return 'Ese horario ya no está disponible. Elige otra opción.';
    if (cause.status === 401) return 'Tu sesión terminó. Inicia sesión para enviar la solicitud.';
    if (cause.status >= 500)
      return 'El servicio tiene un problema temporal. Inténtalo de nuevo en unos minutos.';
    return cause.message;
  }
  if (
    cause instanceof TypeError ||
    (cause instanceof Error && /failed to fetch|network|load failed/i.test(cause.message))
  ) {
    return 'No pudimos conectar con el servicio. Revisa tu conexión e inténtalo de nuevo.';
  }
  return cause instanceof Error
    ? cause.message
    : 'No se pudo completar la solicitud. Inténtalo de nuevo.';
}

export function AppointmentRequestPage() {
  const { clinicId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [clinic, setClinic] = useState<Clinic>();
  const [loadingClinic, setLoadingClinic] = useState(true);
  const [clinicError, setClinicError] = useState('');
  const [clinicAttempt, setClinicAttempt] = useState(0);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [availabilityAttempt, setAvailabilityAttempt] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedDate, setSelectedDate] = useState(localToday());

  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState(''); // NUEVO: Estado para errores
  const [requestResult, setRequestResult] = useState<{
    id: string;
    folio: string;
    status: string;
  }>();

  const serviceId = params.get('serviceId') || '';
  const dentistId = params.get('dentistId') || '';
  const selectedService = clinic?.services.find((s) => s.id === serviceId);
  const dentists = useMemo(
    () => clinic?.dentists?.filter((d) => d.services?.some((s) => s.id === serviceId)) || [],
    [clinic, serviceId],
  );
  const selectedDentist = dentists.find((d) => d.id === dentistId);

  useEffect(() => {
    let active = true;
    setLoadingClinic(true);
    setClinicError('');
    setClinic(undefined);
    api
      .clinic(clinicId)
      .then(({ data }) => {
        if (active) setClinic(data);
      })
      .catch((cause: unknown) => {
        if (active) setClinicError(requestMessage(cause));
      })
      .finally(() => {
        if (active) setLoadingClinic(false);
      });
    return () => {
      active = false;
    };
  }, [clinicAttempt, clinicId]);

  useEffect(() => {
    if (!clinic || !serviceId || !dentistId || !selectedService || !selectedDentist) {
      setSlots([]);
      setAvailabilityError('');
      setLoadingSlots(false);
      return;
    }
    let active = true;
    setLoadingSlots(true);
    setAvailabilityError('');
    setSlots([]);
    setSelectedSlot(''); // Limpiar slot al cambiar de fecha
    api
      .availability(clinicId, dentistId, serviceId, selectedDate)
      .then(({ data }) => {
        if (active) setSlots(data);
      })
      .catch((cause: unknown) => {
        if (active) setAvailabilityError(requestMessage(cause));
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [
    availabilityAttempt,
    clinic,
    clinicId,
    dentistId,
    selectedDate,
    selectedDentist,
    selectedService,
    serviceId,
  ]);

  function changeService(next: string) {
    const nextParams = new URLSearchParams();
    if (next) nextParams.set('serviceId', next);
    setParams(nextParams);
    setSelectedSlot('');
    setRequestError('');
  }

  function changeDentist(next: string) {
    const nextParams = new URLSearchParams();
    if (serviceId) nextParams.set('serviceId', serviceId);
    if (next) nextParams.set('dentistId', next);
    setParams(nextParams);
    setSelectedSlot('');
    setRequestError('');
  }

  async function submitRequest() {
    if (!user || !selectedSlot) return;
    setRequesting(true);
    setRequestError('');

    try {
      const result = await api.createAppointment(
        { clinicId, dentistId, dentalServiceId: serviceId, startsAt: selectedSlot },
        crypto.randomUUID(),
      );
      setRequestResult({
        id: result.data.id,
        folio: result.data.folio,
        status: result.data.status,
      });
    } catch (e) {
      // En lugar de un alert, mostramos el error en el componente
      setRequestError(requestMessage(e));
    } finally {
      setRequesting(false);
    }
  }

  if (loadingClinic)
    return (
      <main className="booking-page">
        <p className="loading-state" role="status" aria-live="polite">
          Cargando consultorio…
        </p>
      </main>
    );
  if (clinicError || !clinic)
    return (
      <main className="booking-page">
        <section className="notice error" role="alert">
          <h1>No pudimos cargar el consultorio</h1>
          <p>{clinicError || 'El consultorio no está disponible.'}</p>
          <div className="error-actions">
            <button
              type="button"
              className="button-retry"
              onClick={() => setClinicAttempt((current) => current + 1)}
            >
              Reintentar
            </button>
            <Link to="/clinics" className="button-outline">
              Volver al directorio
            </Link>
          </div>
        </section>
      </main>
    );

  return (
    <main className="booking-page" aria-labelledby="request-title">
      <nav className="breadcrumb">
        <Link to={`/clinics/${clinic.id}`}>← Volver a {clinic.name}</Link>
      </nav>
      <h1 id="request-title">Solicitar atención</h1>
      <p className="booking-intro">
        Selecciona un servicio, un dentista y un horario para enviar tu solicitud. El consultorio
        debe confirmarla.
      </p>

      <div className="booking-layout">
        {/* IZQUIERDA: PASOS */}
        <div className="booking-steps">
          {/* PASO 1: SERVICIO */}
          <section className="step-card" aria-labelledby="service-step-title">
            <div className="step-header">
              <div className="step-num" aria-hidden="true">
                1
              </div>
              <h2 id="service-step-title">Selecciona el servicio</h2>
            </div>
            <div className="input-group">
              <label htmlFor="service-select">Servicio de interés</label>
              <select
                id="service-select"
                value={serviceId}
                onChange={(e) => changeService(e.target.value)}
              >
                <option value="">Elige un servicio</option>
                {clinic.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · Desde {money.format(s.priceFrom)}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* PASO 2: DENTISTA */}
          <section
            className={`step-card ${!serviceId ? 'disabled-step' : ''}`}
            aria-labelledby="dentist-step-title"
          >
            <div className="step-header">
              <div className="step-num" aria-hidden="true">
                2
              </div>
              <h2 id="dentist-step-title">Elige a tu especialista</h2>
            </div>
            <div className="input-group">
              <label htmlFor="dentist-select">Especialista</label>
              <select
                id="dentist-select"
                value={dentistId}
                onChange={(e) => changeDentist(e.target.value)}
                disabled={!serviceId}
              >
                <option value="">Selecciona un dentista</option>
                {dentists.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.firstName} {d.lastName}
                  </option>
                ))}
              </select>
              {serviceId && dentists.length === 0 && (
                <p
                  className="alert alert-error"
                  style={{ marginTop: '0.5rem', padding: '0.5rem', fontSize: '0.85rem' }}
                >
                  No hay especialistas para este servicio.
                </p>
              )}
            </div>
          </section>

          {/* PASO 3: FECHA Y HORA */}
          <section
            className={`step-card ${!dentistId ? 'disabled-step' : ''}`}
            aria-labelledby="date-step-title"
          >
            <div className="step-header">
              <div className="step-num" aria-hidden="true">
                3
              </div>
              <h2 id="date-step-title">Selecciona fecha y hora</h2>
            </div>
            <div className="input-group">
              <label htmlFor="date-input">Fecha de atención</label>
              <input
                id="date-input"
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedSlot('');
                }}
                min={localToday()}
                disabled={!dentistId}
              />
            </div>

            {loadingSlots ? (
              <p className="loading-state" role="status" aria-live="polite">
                Consultando horarios disponibles…
              </p>
            ) : availabilityError ? (
              <div className="alert alert-error" role="alert">
                <p>{availabilityError}</p>
                <button
                  type="button"
                  className="button-retry"
                  onClick={() => setAvailabilityAttempt((current) => current + 1)}
                >
                  Reintentar horarios
                </button>
              </div>
            ) : slots.length === 0 && dentistId ? (
              <div className="notice info" role="status">
                No hay horarios disponibles para esta fecha. Elige otro día para consultar más
                opciones.
              </div>
            ) : (
              <div className="slots-grid">
                {slots.map((slot) => (
                  <button
                    key={slot.startsAt}
                    className={`slot-btn ${selectedSlot === slot.startsAt ? 'active' : ''}`}
                    onClick={() => setSelectedSlot(slot.startsAt)}
                    aria-pressed={selectedSlot === slot.startsAt}
                    aria-label={`${new Intl.DateTimeFormat('es-MX', { dateStyle: 'full', timeZone }).format(new Date(slot.startsAt))}, ${new Intl.DateTimeFormat('es-MX', { timeStyle: 'short', timeZone }).format(new Date(slot.startsAt))}`}
                    type="button"
                  >
                    {new Intl.DateTimeFormat('es-MX', { timeStyle: 'short', timeZone }).format(
                      new Date(slot.startsAt),
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* DERECHA: RESUMEN STICKY */}
        <aside className="summary-card" aria-labelledby="summary-title">
          <div className="summary-header">
            <h2 id="summary-title">Resumen de solicitud</h2>
          </div>
          <div className="summary-body">
            <div className="summary-item">
              <span className="icon" aria-hidden="true">
                🏥
              </span>
              <div>
                <small>Consultorio</small>
                <p>{clinic?.name}</p>
              </div>
            </div>
            <div className="summary-item">
              <span className="icon" aria-hidden="true">
                🦷
              </span>
              <div>
                <small>Servicio</small>
                <p>{selectedService?.name || 'Por seleccionar'}</p>
              </div>
            </div>
            <div className="summary-item">
              <span className="icon" aria-hidden="true">
                👨‍⚕️
              </span>
              <div>
                <small>Especialista</small>
                <p>
                  {selectedDentist
                    ? `${selectedDentist.firstName} ${selectedDentist.lastName}`
                    : 'Por seleccionar'}
                </p>
              </div>
            </div>
            <div className="summary-item">
              <span className="icon" aria-hidden="true">
                📅
              </span>
              <div>
                <small>Fecha y Hora</small>
                <p>{selectedSlot ? mexico(selectedSlot) : 'Por seleccionar'}</p>
              </div>
            </div>
          </div>
          <div className="summary-footer">
            {/* Mostrar error si falla el agendamiento */}
            {requestError && (
              <div className="alert alert-error" role="alert">
                {requestError}
              </div>
            )}

            {authLoading ? (
              <p className="loading-message" role="status" aria-live="polite">
                Verificando tu sesión…
              </p>
            ) : !user ? (
              <Link to="/iniciar-sesion" className="btn btn-primary btn-full">
                Inicia sesión para agendar
              </Link>
            ) : requestResult ? (
              <div className="alert alert-success" role="status" aria-live="polite">
                <div>
                  <strong>Solicitud enviada · pendiente de confirmación</strong>
                  <br />
                  Folio: {requestResult.folio}
                  <br />
                  <Link to={`/mi-solicitud/${encodeURIComponent(requestResult.id)}`}>
                    Ver el estado de mi solicitud
                  </Link>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-coral btn-full"
                disabled={!selectedSlot || requesting}
                onClick={submitRequest}
                type="button"
              >
                {requesting ? 'Enviando solicitud…' : 'Enviar solicitud pendiente'}
              </button>
            )}

            <p className="booking-note">
              Enviar la solicitud no confirma la cita. El consultorio revisará el horario y te
              responderá.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
