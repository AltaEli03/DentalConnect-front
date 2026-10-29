import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import { api } from '../services/api';
import type { AvailabilitySlot, Clinic } from '../types/api';

const mexico = (value: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(value));

export function AppointmentRequestPage() {
  const { clinicId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const [clinic, setClinic] = useState<Clinic>();
  const [loadingClinic, setLoadingClinic] = useState(true);
  const [clinicError, setClinicError] = useState('');
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const serviceId = params.get('serviceId') || '';
  const dentistId = params.get('dentistId') || '';
  const selectedService = clinic?.services.find((service) => service.id === serviceId);
  const dentists = useMemo(() => clinic?.dentists?.filter((dentist) => dentist.services?.some((service) => service.id === serviceId)) || [], [clinic, serviceId]);

  useEffect(() => {
    let active = true;
    api.clinic(clinicId).then(({ data }) => { if (active) setClinic(data); })
      .catch((cause: unknown) => { if (active) setClinicError(cause instanceof Error ? cause.message : 'No se pudo cargar el consultorio.'); })
      .finally(() => { if (active) setLoadingClinic(false); });
    return () => { active = false; };
  }, [clinicId]);

  useEffect(() => {
    setSlots([]); setSelectedSlot(''); setSlotError('');
    if (!clinic || !serviceId || !dentistId || !selectedService || !dentists.some((dentist) => dentist.id === dentistId)) return;
    let active = true; setLoadingSlots(true);
    api.availability(clinicId, dentistId, serviceId).then(({ data }) => { if (active) setSlots(data); })
      .catch((cause: unknown) => { if (active) setSlotError(cause instanceof Error ? cause.message : 'No se pudieron consultar los horarios.'); })
      .finally(() => { if (active) setLoadingSlots(false); });
    return () => { active = false; };
  }, [clinic, clinicId, dentistId, dentists, selectedService, serviceId]);

  function changeService(next: string) {
    setSlots([]); setSelectedSlot(''); setSlotError('');
    const nextParams = new URLSearchParams(); if (next) nextParams.set('serviceId', next);
    setParams(nextParams);
  }
  function changeDentist(next: string) {
    setSlots([]); setSelectedSlot(''); setSlotError('');
    const nextParams = new URLSearchParams(); if (serviceId) nextParams.set('serviceId', serviceId); if (next) nextParams.set('dentistId', next);
    setParams(nextParams);
  }
  if (loadingClinic) return <main className="directory"><p>Cargando consultorio…</p></main>;
  if (clinicError || !clinic) return <main className="directory"><p className="notice error">{clinicError || 'Consultorio no disponible.'}</p><Link to="/clinics">Volver a búsqueda</Link></main>;
  return <main className="page-shell"><section className="panel"><Link to={`/clinics/${clinic.id}`}>← {clinic.name}</Link><p className="eyebrow">Consulta de horarios · sin reservación</p><h1>Elige servicio y dentista</h1>
    <label>Servicio activo<select value={serviceId} onChange={(event) => changeService(event.target.value)}><option value="">Selecciona un servicio</option>{clinic.services.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.estimatedDurationMinutes} min</option>)}</select></label>
    {selectedService && <p>{selectedService.description} · duración estimada {selectedService.estimatedDurationMinutes} minutos.</p>}
    <label>Dentista compatible<select value={dentistId} onChange={(event) => changeDentist(event.target.value)} disabled={!serviceId}><option value="">Selecciona un dentista</option>{dentists.map((dentist) => <option key={dentist.id} value={dentist.id}>{dentist.firstName} {dentist.lastName} · {dentist.specialty}</option>)}</select></label>
    {serviceId && !dentists.length && <p className="notice">No hay dentistas activos que ofrezcan este servicio.</p>}
  </section>
  {serviceId && dentistId && selectedService && <section className="panel" aria-live="polite"><h2>Horarios publicados (14 días)</h2><p>Zona horaria: America/Mexico_City. Seleccionar un horario solo conserva tu elección en esta pantalla; no solicita ni confirma una cita.</p>
    {loadingSlots && <p>Consultando horarios…</p>}{slotError && <p className="notice error" role="alert">{slotError}</p>}
    {!loadingSlots && !slotError && !slots.length && <p className="notice">No hay intervalos publicados para esta combinación. Puedes cambiar servicio o dentista.</p>}
    <div className="slot-list">{slots.map((slot) => <button className={selectedSlot === slot.startsAt ? 'slot selected' : 'slot'} type="button" key={slot.startsAt} aria-pressed={selectedSlot === slot.startsAt} onClick={() => setSelectedSlot(slot.startsAt)}>{mexico(slot.startsAt)} – {new Intl.DateTimeFormat('es-MX',{timeStyle:'short',timeZone:'America/Mexico_City'}).format(new Date(slot.endsAt))}</button>)}</div>
    {selectedSlot && <p className="notice" role="status">Horario seleccionado: {mexico(selectedSlot)}. Todavía no se crea una solicitud ni se bloquea el horario.</p>}
  </section>}</main>;
}
