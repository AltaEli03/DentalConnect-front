import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import type { Clinic } from '../types/api';

export function ClinicDetailPage() {
  const { id = '' } = useParams();
  const [clinic, setClinic] = useState<Clinic>();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api.clinic(id).then(({ data }) => { if (active) setClinic(data); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'No fue posible cargar el consultorio.'); });
    return () => { active = false; };
  }, [id]);
  if (error) return <main className="directory"><p className="notice error">{error}</p><Link to="/clinics">Volver al directorio</Link></main>;
  if (!clinic) return <main className="directory"><p>Cargando consultorio…</p></main>;
  return <main className="detail">
    <Link to="/clinics">← Volver al directorio</Link>
    {clinic.imageUrl && <img className="detail-image" src={clinic.imageUrl} alt={`Instalaciones de ${clinic.name}`} />}
    <p className="eyebrow">{clinic.municipality}, {clinic.state} · C.P. {clinic.postalCode}</p>
    <h1>{clinic.name}</h1><p className="lead">{clinic.description}</p>
    <section><h2>Contacto</h2><p>{clinic.address}</p><p><a href={`tel:${clinic.phone}`}>{clinic.phone}</a> · <a href={`mailto:${clinic.email}`}>{clinic.email}</a></p></section>
    <section><h2>Servicios</h2>{clinic.services.length ? <ul>{clinic.services.map(service => <li key={service.id}><strong>{service.name}</strong>: {service.description} · {service.estimatedDurationMinutes} min · desde ${service.priceFrom} <Link to={`/clinics/${clinic.id}/solicitar?serviceId=${encodeURIComponent(service.id)}`}>Elegir servicio</Link></li>)}</ul> : <p>Sin servicios activos publicados.</p>}</section>
    <section><h2>Equipo dental</h2>{clinic.dentists?.length ? <div className="card-grid">{clinic.dentists.map(dentist => <article className="clinic-card" key={dentist.id}>{dentist.imageUrl && <img src={dentist.imageUrl} alt={`Fotografía de ${dentist.firstName} ${dentist.lastName}`} />}<div><p className="eyebrow">{dentist.specialty}</p><h3>{dentist.firstName} {dentist.lastName}</h3><p>{dentist.biography || 'Perfil profesional del consultorio.'}</p><p className="services">{dentist.services?.map(s => s.name).join(' · ')}</p><Link className="button" to={`/clinics/${clinic.id}/dentistas/${dentist.id}`}>Ver perfil</Link></div></article>)}</div> : <p>No hay dentistas activos publicados.</p>}</section>
  </main>;
}
