import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../services/api';
import type { AvailabilitySlot, Clinic } from '../types/api';

const timeZone = 'America/Mexico_City';
const mexico = (value: string) =>
  new Intl.DateTimeFormat('es-MX', { dateStyle: 'full', timeStyle: 'short', timeZone }).format(new Date(value));
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
  const [requestResult, setRequestResult] = useState<{ id: string; folio: string; status: string; }>();
  const [idempotencyKey, setIdempotencyKey] = useState('');
  
  const serviceId = params.get('serviceId') || '';
  const dentistId = params.get('dentistId') || '';
  const selectedService = clinic?.services.find((service) => service.id === serviceId);
  const dentists = useMemo(
    () => clinic?.dentists?.filter((dentist) => dentist.services?.some((service) => service.id === serviceId)) || [],
    [clinic, serviceId],
  );
  const selectedDentist = dentists.find((dentist) => dentist.id === dentistId);

  useEffect(() => {
    let active = true;
    api.clinic(clinicId).then(({ data }) => {
      if (active) setClinic(data);
    }).catch((cause: unknown) => {
      if (active) setClinicError(cause instanceof Error ? cause.message : 'No se pudo cargar el consultorio.');
    }).finally(() => {
      if (active) setLoadingClinic(false);
    });
    return () => { active = false; };
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
    api.availability(clinicId, dentistId, serviceId, selectedDate).then(({ data }) => {
      if (active) setSlots(data);
    }).catch((cause: unknown) => {
      if (active) setSlotError(cause instanceof Error ? cause.message : 'No se pudieron consultar los horarios.');
    }).finally(() => {
      if (active) setLoadingSlots(false);
    });
    return () => { active = false; };
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
      setRequestResult({ id: result.data.id, folio: result.data.folio, status: result.data.status });
    } catch (cause) {
      setRequestError(cause instanceof Error ? cause.message : 'No se pudo enviar la solicitud.');
    } finally {
      setRequesting(false);
    }
  }

  if (loadingClinic) return <main className="directory"><div className="loading-state"><p>Cargando consultorio…</p></div></main>;
  if (clinicError || !clinic) return (
    <main className="directory">
      <div className="notice error"><p>{clinicError || 'Consultorio no disponible.'}</p><Link to="/clinics" className="button">Volver a búsqueda</Link></div>
    </main>
  );

  return (
    <main className="booking-page">
      <nav className="breadcrumb-nav">
        <Link to={'/clinics/' + clinic.id}>← Volver a {clinic.name}</Link>
      </nav>

      <div className="booking-layout">
        {/* COLUMNA IZQUIERDA: SELECCIÓN POR PASOS */}
        <div className="booking-selection">
          <div className="booking-header">
            <p className="eyebrow">Solicitud de atención</p>
            <h1>Agenda tu cita ideal</h1>
            <p className="text-muted">Sigue los pasos para elegir el servicio, especialista y horario perfecto para ti.</p>
          </div>

          {/* PASO 1: SERVICIO */}
          <section className="selection-step">
            <div className="step-header">
              <span className="step-number">1</span>
              <h2>Selecciona el servicio</h2>
            </div>
            <div className="step-content">
              <select 
                className="premium-select"
                value={serviceId} 
                onChange={(e) => changeService(e.target.value)}
              >
                <option value="">¿Qué necesitas hoy?</option>
                {clinic.services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} · {service.estimatedDurationMinutes} min
                  </option>
                ))}
              </select>
              {selectedService && (
                <div className="service-info-box">
                  <p>{selectedService.description}</p>
                  <span className="service-time">⏱ Duración estimada: {selectedService.estimatedDurationMinutes} minutos</span>
                </div>
              )}
            </div>
          </section>

          {/* PASO 2: DENTISTA */}
          <section className={`selection-step ${!serviceId ? 'disabled-step' : ''}`}>
            <div className="step-header">
              <span className="step-number">2</span>
              <h2>Elige a tu especialista</h2>
            </div>
            <div className="step-content">
              <select
                className="premium-select"
                value={dentistId}
                onChange={(e) => changeDentist(e.target.value)}
                disabled={!serviceId}
              >
                <option value="">Selecciona un dentista compatible</option>
                {dentists.map((dentist) => (
                  <option key={dentist.id} value={dentist.id}>
                    {dentist.firstName} {dentist.lastName} · {dentist.specialty}
                  </option>
                ))}
              </select>
              {serviceId && !dentists.length && (
                <p className="notice error compact">No hay dentistas activos que ofrezcan este servicio.</p>
              )}
            </div>
          </section>

          {/* PASO 3: FECHA Y HORA */}
          <section className={`selection-step ${!dentistId ? 'disabled-step' : ''}`}>
            <div className="step-header">
              <span className="step-number">3</span>
              <h2>Selecciona fecha y hora</h2>
            </div>
            <div className="step-content">
              <label className="date-label">Fecha de atención</label>
              <input
                type="date"
                className="premium-date-input"
                min={localToday()}
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setSelectedSlot('');
                  setRequestResult(undefined);
                  setIdempotencyKey('');
                }}
                disabled={!dentistId}
              />
              
              {loadingSlots && <p className="loading-text">Consultando horarios disponibles…</p>}
              {slotError && <p className="notice error compact" role="alert">{slotError}</p>}
              {!loadingSlots && !slotError && !slots.length && dentistId && (
                <p className="notice compact">No hay disponibilidad para esta fecha. Prueba con otro día.</p>
              )}
              
              {slots.length > 0 && (
                <div className="slot-grid">
                  {slots.map((slot) => (
                    <button
                      className={`time-slot ${selectedSlot === slot.startsAt ? 'selected' : ''}`}
                      type="button"
                      key={slot.startsAt}
                      aria-pressed={selectedSlot === slot.startsAt}
                      onClick={() => chooseSlot(slot)}
                    >
                      {new Intl.DateTimeFormat('es-MX', { timeStyle: 'short', timeZone }).format(new Date(slot.startsAt))}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* COLUMNA DERECHA: RESUMEN STICKY (CHECKOUT) */}
        <aside className="booking-summary-card">
          <div className="ticket-header">
            <h3>Resumen de tu cita</h3>
            <span className="ticket-badge">Pendiente de confirmar</span>
          </div>
          
          <div className="ticket-body">
            <div className="ticket-item">
              <span className="ticket-icon">🏥</span>
              <div>
                <small>Consultorio</small>
                <p>{clinic.name}</p>
              </div>
            </div>
            
            <div className={`ticket-item ${!selectedService ? 'empty' : ''}`}>
              <span className="ticket-icon">🦷</span>
              <div>
                <small>Servicio</small>
                <p>{selectedService?.name || 'Por seleccionar'}</p>
              </div>
            </div>
            
            <div className={`ticket-item ${!selectedDentist ? 'empty' : ''}`}>
              <span className="ticket-icon">👨‍⚕️</span>
              <div>
                <small>Especialista</small>
                <p>{selectedDentist ? `${selectedDentist.firstName} ${selectedDentist.lastName}` : 'Por seleccionar'}</p>
              </div>
            </div>
            
            <div className={`ticket-item ${!selectedSlot ? 'empty' : ''}`}>
              <span className="ticket-icon">📅</span>
              <div>
                <small>Fecha y Hora</small>
                <p>{selectedSlot ? mexico(selectedSlot) : 'Por seleccionar'}</p>
              </div>
            </div>
          </div>

          <div className="ticket-footer">
            {requestResult ? (
              <div className="success-state" role="status">
                <div className="success-icon">✓</div>
                <h4>¡Solicitud enviada!</h4>
                <p>Folio: <strong>{requestResult.folio}</strong></p>
                <p className="small-text">El consultorio debe confirmar la atención.</p>
                <Link to={`/mi-solicitud/${encodeURIComponent(requestResult.id)}`} className="primary-btn full-width">
                  Ver estado de mi solicitud
                </Link>
              </div>
            ) : (
              <>
                {!authLoading && !user && (
                  <div className="auth-warning">
                    <p>Inicia sesión para enviar la solicitud.</p>
                    <Link to="/iniciar-sesion" className="secondary-btn full-width">Iniciar sesión</Link>
                  </div>
                )}
                {requestError && <p className="notice error compact" role="alert">{requestError}</p>}
                
                <button
                  type="button"
                  className="primary-btn full-width checkout-btn"
                  onClick={() => void submitRequest()}
                  disabled={!user || authLoading || requesting || !selectedSlot}
                >
                  {requesting ? 'Enviando…' : 'Confirmar Solicitud'}
                </button>
                <p className="legal-text">
                  Al enviar, se crea una solicitud pendiente. No se confirma ni se cobra una cita en este paso.
                </p>
              </>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}