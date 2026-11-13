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
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Error al cargar.'); });
    return () => { active = false; };
  }, [id]);

  if (error) return <main className="page-container"><div className="notice error">{error}</div></main>;
  if (!clinic) return <main className="page-container"><p>Cargando consultorio…</p></main>;

  return (
    <main className="page-container">
      {/* Botón de regreso sutil */}
      <nav className="breadcrumb-nav">
        <Link to="/clinics">← Volver al directorio</Link>
      </nav>

      {/* HERO DE LA CLÍNICA (Layout dividido) */}
      <header className="clinic-hero">
        <div className="clinic-hero-image">
          <img 
            src={clinic.imageUrl || 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=900&q=80'} 
            alt={`Instalaciones de ${clinic.name}`} 
          />
        </div>
        
        <div className="clinic-hero-info">
          <span className="badge-location">{clinic.municipality}, {clinic.state}</span>
          <h1>{clinic.name}</h1>
          <p className="clinic-lead">{clinic.description}</p>
          
          <div className="clinic-contact-box">
            <p><span className="icon">📍</span> {clinic.address} {clinic.postalCode && `· C.P. ${clinic.postalCode}`}</p>
            <p><span className="icon">📞</span> <a href={`tel:${clinic.phone}`}>{clinic.phone}</a></p>
            <p><span className="icon">✉️</span> <a href={`mailto:${clinic.email}`}>{clinic.email}</a></p>
          </div>
        </div>
      </header>

      {/* SERVICIOS (Tarjetas limpias) */}
      <section className="clinic-section">
        <h2 className="section-title">Servicios Disponibles</h2>
        <div className="services-grid">
          {clinic.services.map(service => (
            <div key={service.id} className="service-card">
              <div className="service-card-header">
                <h3>{service.name}</h3>
                <span className="service-price">Desde ${service.priceFrom}</span>
              </div>
              <p className="service-card-desc">{service.description}</p>
              <div className="service-card-footer">
                <span className="service-duration">⏱ {service.estimatedDurationMinutes} min</span>
                <Link className="button-solid" to={`/clinics/${clinic.id}/solicitar?serviceId=${encodeURIComponent(service.id)}`}>
                  Agendar
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}