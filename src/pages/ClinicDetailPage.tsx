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
    api.clinic(id).then(({ data }) => { 
      if (active) setClinic(data); 
    })
    .catch((cause: unknown) => { 
      if (active) setError(cause instanceof Error ? cause.message : 'No fue posible cargar el consultorio.'); 
    });
    return () => { active = false; };
  }, [id]);

  if (error) {
    return (
      <main className="directory">
        <div className="notice error">
          <p>{error}</p>
          <Link to="/clinics" className="button">Volver al directorio</Link>
        </div>
      </main>
    );
  }

  if (!clinic) {
    return (
      <main className="directory">
        <div className="loading-state"><p>Cargando consultorio…</p></div>
      </main>
    );
  }

  return (
    <main className="detail">
      {/* Navegación superior */}
      <nav className="breadcrumb-nav">
        <Link to="/clinics">← Volver al directorio</Link>
      </nav>

      {/* Cabecera de la Clínica (Split Layout) */}
      <header className="clinic-detail-header">
        <div className="clinic-image-wrapper">
          {clinic.imageUrl ? (
            <img src={clinic.imageUrl} alt={`Instalaciones de ${clinic.name}`} />
          ) : (
            <div className="clinic-image-placeholder">🏥</div>
          )}
        </div>
        
        <div className="clinic-info-wrapper">
          <p className="eyebrow">
            {clinic.municipality}, {clinic.state} · C.P. {clinic.postalCode}
          </p>
          <h1>{clinic.name}</h1>
          <p className="lead">{clinic.description}</p>
          
          {/* Bloque de Contacto Integrado */}
          <div className="contact-grid">
            <div className="contact-item">
              <span className="contact-icon">📍</span>
              <span>{clinic.address}</span>
            </div>
            <div className="contact-item">
              <span className="contact-icon">📞</span>
              <a href={`tel:${clinic.phone}`}>{clinic.phone}</a>
            </div>
            <div className="contact-item">
              <span className="contact-icon">✉️</span>
              <a href={`mailto:${clinic.email}`}>{clinic.email}</a>
            </div>
          </div>
        </div>
      </header>

      {/* Sección de Servicios */}
      <section className="services-section">
        <h2>Servicios Disponibles</h2>
        {clinic.services.length ? (
          <ul className="services-list">
            {clinic.services.map(service => (
              <li key={service.id}>
                <div className="service-header">
                  <strong>{service.name}</strong>
                  <span className="service-price">Desde ${service.priceFrom}</span>
                </div>
                <p className="service-description">{service.description}</p>
                <div className="service-footer">
                  <span className="service-time">⏱ {service.estimatedDurationMinutes} min</span>
                  <Link 
                    className="button" 
                    to={`/clinics/${clinic.id}/solicitar?serviceId=${encodeURIComponent(service.id)}`}
                  >
                    Elegir servicio
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="notice">Sin servicios activos publicados.</p>
        )}
      </section>

      {/* Sección del Equipo Dental */}
      <section className="team-section">
        <h2>Nuestro Equipo Dental</h2>
        {clinic.dentists?.length ? (
          <div className="team-grid">
            {clinic.dentists.map(dentist => (
              <article className="team-card" key={dentist.id}>
                <div className="team-avatar">
                  {dentist.imageUrl ? (
                    <img src={dentist.imageUrl} alt={`Fotografía de ${dentist.firstName} ${dentist.lastName}`} />
                  ) : (
                    <div className="team-avatar-placeholder">👨‍⚕️</div>
                  )}
                </div>
                
                <div className="team-info">
                  <p className="eyebrow">{dentist.specialty}</p>
                  <h3>{dentist.firstName} {dentist.lastName}</h3>
                  <p className="team-bio">{dentist.biography || 'Perfil profesional del consultorio.'}</p>
                  
                  {dentist.services && dentist.services.length > 0 && (
                    <p className="team-services">
                      {dentist.services.map(s => s.name).join(' • ')}
                    </p>
                  )}
                  
                  <Link 
                    className="button outline-button" 
                    to={`/clinics/${clinic.id}/dentistas/${dentist.id}`}
                  >
                    Ver perfil completo
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="notice">No hay dentistas activos publicados.</p>
        )}
      </section>
    </main>
  );
}