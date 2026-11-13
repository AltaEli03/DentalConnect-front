import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../services/api';
import type { AvailabilitySlot, Clinic } from '../types/api';

const timeZone = 'America/Mexico_City';
const mexico = (value: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(value));
const localToday = () => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());

export function AppointmentRequestPage() {
  const { clinicId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  
  const [clinic, setClinic] = useState<Clinic>();
  const [loadingClinic, setLoadingClinic] = useState(true);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedDate, setSelectedDate] = useState(localToday());
  
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState(''); // NUEVO: Estado para errores
  const [requestResult, setRequestResult] = useState<{ id: string; folio: string; status: string; }>();
  
  const serviceId = params.get('serviceId') || '';
  const dentistId = params.get('dentistId') || '';
  const selectedService = clinic?.services.find((s) => s.id === serviceId);
  const dentists = useMemo(() => clinic?.dentists?.filter((d) => d.services?.some((s) => s.id === serviceId)) || [], [clinic, serviceId]);
  const selectedDentist = dentists.find((d) => d.id === dentistId);

  useEffect(() => {
    api.clinic(clinicId).then(({ data }) => setClinic(data)).finally(() => setLoadingClinic(false));
  }, [clinicId]);

  useEffect(() => {
    if (!clinic || !serviceId || !dentistId || !selectedService || !selectedDentist) return;
    setLoadingSlots(true);
    setSelectedSlot(''); // Limpiar slot al cambiar de fecha
    api.availability(clinicId, dentistId, serviceId, selectedDate)
      .then(({ data }) => setSlots(data))
      .finally(() => setLoadingSlots(false));
  }, [clinic, clinicId, dentistId, selectedDate, selectedDentist, selectedService, serviceId]);

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
      const result = await api.createAppointment({ clinicId, dentistId, dentalServiceId: serviceId, startsAt: selectedSlot }, crypto.randomUUID());
      setRequestResult({ id: result.data.id, folio: result.data.folio, status: result.data.status });
    } catch (e) {
      // En lugar de un alert, mostramos el error en el componente
      setRequestError(e instanceof Error ? e.message : 'No se pudo agendar la cita. Intenta de nuevo.');
    } finally {
      setRequesting(false);
    }
  }

  if (loadingClinic) return <main className="booking-page"><div className="loading-state">Cargando consultorio…</div></main>;

  return (
    <main className="booking-page">
      <nav className="breadcrumb">
        <Link to={`/clinics/${clinic?.id}`}>← Volver a {clinic?.name}</Link>
      </nav>

      <div className="booking-layout">
        {/* IZQUIERDA: PASOS */}
        <div className="booking-steps">
          
          {/* PASO 1: SERVICIO */}
          <div className="step-card">
            <div className="step-header">
              <div className="step-num">1</div>
              <h3>Selecciona el servicio</h3>
            </div>
            <div className="input-group">
              <label htmlFor="service-select">Servicio de interés</label>
              <select 
                id="service-select" 
                value={serviceId} 
                onChange={(e) => changeService(e.target.value)}
              >
                <option value="">¿Qué necesitas hoy?</option>
                {clinic?.services.map(s => (
                  <option key={s.id} value={s.id}>{s.name} · Desde ${s.priceFrom}</option>
                ))}
              </select>
            </div>
          </div>

          {/* PASO 2: DENTISTA */}
          <div className={`step-card ${!serviceId ? 'disabled-step' : ''}`}>
            <div className="step-header">
              <div className="step-num">2</div>
              <h3>Elige a tu especialista</h3>
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
                {dentists.map(d => (
                  <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>
                ))}
              </select>
              {serviceId && dentists.length === 0 && (
                <p className="alert alert-error" style={{ marginTop: '0.5rem', padding: '0.5rem', fontSize: '0.85rem' }}>
                  No hay especialistas para este servicio.
                </p>
              )}
            </div>
          </div>

          {/* PASO 3: FECHA Y HORA */}
          <div className={`step-card ${!dentistId ? 'disabled-step' : ''}`}>
            <div className="step-header">
              <div className="step-num">3</div>
              <h3>Selecciona fecha y hora</h3>
            </div>
            <div className="input-group">
              <label htmlFor="date-input">Fecha de atención</label>
              <input 
                id="date-input"
                type="date" 
                value={selectedDate} 
                onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(''); }} 
                min={localToday()} 
                disabled={!dentistId}
              />
            </div>
            
            {loadingSlots ? (
              <p className="loading-state" style={{ padding: '1rem 0' }}>Consultando horarios disponibles…</p>
            ) : slots.length === 0 && dentistId ? (
              <div className="alert alert-error" style={{ fontSize: '0.9rem' }}>
                No hay horarios disponibles para esta fecha. Por favor, elige otro día.
              </div>
            ) : (
              <div className="slots-grid">
                {slots.map(slot => (
                  <button 
                    key={slot.startsAt} 
                    className={`slot-btn ${selectedSlot === slot.startsAt ? 'active' : ''}`}
                    onClick={() => setSelectedSlot(slot.startsAt)}
                    aria-pressed={selectedSlot === slot.startsAt}
                    type="button"
                  >
                    {new Intl.DateTimeFormat('es-MX', { timeStyle: 'short', timeZone }).format(new Date(slot.startsAt))}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* DERECHA: RESUMEN STICKY */}
        <aside className="summary-card">
          <div className="summary-header">
            <h3>Resumen de cita</h3>
          </div>
          <div className="summary-body">
            <div className="summary-item">
              <span className="icon" aria-hidden="true">🏥</span>
              <div><small>Consultorio</small><p>{clinic?.name}</p></div>
            </div>
            <div className="summary-item">
              <span className="icon" aria-hidden="true">🦷</span>
              <div><small>Servicio</small><p>{selectedService?.name || 'Por seleccionar'}</p></div>
            </div>
            <div className="summary-item">
              <span className="icon" aria-hidden="true">👨‍⚕️</span>
              <div><small>Especialista</small><p>{selectedDentist ? `${selectedDentist.firstName} ${selectedDentist.lastName}` : 'Por seleccionar'}</p></div>
            </div>
            <div className="summary-item">
              <span className="icon" aria-hidden="true">📅</span>
              <div><small>Fecha y Hora</small><p>{selectedSlot ? mexico(selectedSlot) : 'Por seleccionar'}</p></div>
            </div>
          </div>
          <div className="summary-footer">
            {/* Mostrar error si falla el agendamiento */}
            {requestError && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {requestError}
              </div>
            )}

            {!user ? (
              <Link to="/iniciar-sesion" className="btn btn-primary btn-full">Inicia sesión para agendar</Link>
            ) : requestResult ? (
              <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                <div>
                  <strong>¡Cita solicitada!</strong><br/>
                  Folio: {requestResult.folio}
                </div>
              </div>
            ) : (
              <button 
                className="btn btn-coral btn-full" 
                disabled={!selectedSlot || requesting} 
                onClick={submitRequest}
                type="button"
              >
                {requesting ? 'Enviando solicitud…' : 'Confirmar Cita'}
              </button>
            )}
            
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '1rem', marginBottom: 0 }}>
              Al confirmar, se crea una solicitud pendiente. El consultorio deberá confirmarla.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}