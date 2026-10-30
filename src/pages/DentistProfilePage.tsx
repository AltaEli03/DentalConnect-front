import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import type { Clinic, Dentist } from '../types/api';

export function DentistProfilePage() {
  const { clinicId = '', dentistId = '' } = useParams();
  const [clinic, setClinic] = useState<Clinic>();
  const [dentist, setDentist] = useState<Dentist>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setDentist(undefined);
    api.clinic(clinicId).then(({ data }) => {
      if (!active) return;
      setClinic(data);
      setDentist(data.dentists?.find((item) => item.id === dentistId));
    }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'No fue posible cargar el perfil.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [clinicId, dentistId]);
  if (loading) return <main className="directory"><p>Cargando perfil…</p></main>;
  if (error) return <main className="directory"><p className="notice error">{error}</p><Link to={`/clinics/${clinicId}`}>Volver al consultorio</Link></main>;
  if (!clinic || !dentist) return <main className="directory"><h1>Perfil no disponible</h1><p>Este dentista ya no está disponible en el consultorio seleccionado.</p><Link to={`/clinics/${clinicId}`}>Volver al consultorio</Link></main>;
  return <main className="detail"><Link to={`/clinics/${clinic.id}`}>← {clinic.name}</Link>
    {dentist.imageUrl && <img className="detail-image" src={dentist.imageUrl} alt={`Fotografía de ${dentist.firstName} ${dentist.lastName}`} />}
    <p className="eyebrow">Perfil profesional · {clinic.name}</p><h1>{dentist.firstName} {dentist.lastName}</h1>
    {dentist.specialty && <p className="lead">{dentist.specialty}</p>}
    {dentist.biography && <section><h2>Acerca de</h2><p>{dentist.biography}</p></section>}
    <section><h2>Servicios activos</h2>{dentist.services?.length ? <ul>{dentist.services.map((service) => <li key={service.id}><strong>{service.name}</strong> · {service.estimatedDurationMinutes} min<p>{service.description}</p><Link className="button" to={`/clinics/${clinic.id}/solicitar?serviceId=${encodeURIComponent(service.id)}&dentistId=${encodeURIComponent(dentist.id)}`}>Elegir este servicio y dentista</Link></li>)}</ul> : <p>Este perfil no tiene servicios activos publicados.</p>}</section>
    <p className="notice">Elegir a un profesional conserva tu selección para consultar horarios; todavía no confirma una cita.</p>
  </main>;
}
