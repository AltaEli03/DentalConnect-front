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

  if (error) return <main className="page-container"><div className="alert alert-error">{error}</div></main>;
  if (!clinic) return <main className="page-container"><div className="loading-state">Cargando consultorio…</div></main>;

  const fallbackImage = 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=900&q=80';
  const dentistFallback = 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80';

  return (
    <main className="page-container">
      <nav className="breadcrumb">
        <Link to="/clinics">← Volver al directorio</Link>
      </nav>

      {/* HERO: La imagen está estrictamente contenida aquí */}
      <header className="clinic-hero">
        <div className="clinic-hero-img">
          <img 
            src={clinic.imageUrl || fallbackImage} 
            alt={`Instalaciones de ${clinic.name}`} 
            onError={(e) => { e.currentTarget.src = fallbackImage; }}
          />
        </div>
        
        <div className="clinic-hero-info">
          <h1>{clinic.name}</h1>
          <p className="clinic-description">{clinic.description}</p>
          
          <div className="contact-info">
            <p><span aria-hidden="true">📍</span> {clinic.address} {clinic.postalCode && `· C.P. ${clinic.postalCode}`}</p>
            <p><span aria-hidden="true">📞</span> <a href={`tel:${clinic.phone}`}>{clinic.phone}</a></p>
            <p><span aria-hidden="true">✉️</span> <a href={`mailto:${clinic.email}`}>{clinic.email}</a></p>
          </div>
        </div>
      </header>

      {/* SERVICIOS */}
      <section className="services-section">
        <h2 className="section-title">Servicios Disponibles</h2>
        
        {clinic.services.length === 0 ? (
          <p className="alert alert-error">Este consultorio aún no tiene servicios publicados.</p>
        ) : (
          <div className="services-grid">
            {clinic.services.map(service => (
              <div className="service-card" key={service.id}>
                <div className="service-card-header">
                  <h3>{service.name}</h3>
                  <span className="price">Desde ${service.priceFrom}</span>
                </div>
                <p className="service-description">
                  {service.description}
                </p>
                <div className="service-card-footer">
                  <span className="duration">⏱ {service.estimatedDurationMinutes} min</span>
                  <Link 
                    to={`/clinics/${clinic.id}/solicitar?serviceId=${encodeURIComponent(service.id)}`}
                    className="btn btn-primary btn-sm"
                  >
                    Agendar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* EQUIPO DENTAL */}
      {clinic.dentists && clinic.dentists.length > 0 && (
        <section className="team-section">
          <h2 className="section-title">Nuestro Equipo Dental</h2>
          <div className="card-grid" style={{ marginTop: '1.5rem' }}>
            {clinic.dentists.map(dentist => (
              <div className="clinic-card" key={dentist.id}>
                <div className="clinic-card-img-wrapper" style={{ height: '200px' }}>
                  <img 
                    src={dentist.imageUrl || dentistFallback} 
                    alt={`Dr. ${dentist.firstName} ${dentist.lastName}`} 
                    onError={(e) => { e.currentTarget.src = dentistFallback; }}
                  />
                </div>
                <div className="clinic-card-body">
                  <span className="tag" style={{ alignSelf: 'flex-start', marginBottom: '0.5rem' }}>
                    {dentist.specialty || 'Odontología General'}
                  </span>
                  <h3>{dentist.firstName} {dentist.lastName}</h3>
                  <p className="clinic-desc">{dentist.biography || 'Especialista certificado de DentalConnect.'}</p>
                  
                  <Link 
                    to={`/clinics/${clinic.id}/dentistas/${dentist.id}`}
                    className="btn btn-outline btn-full"
                    style={{ marginTop: 'auto' }}
                  >
                    Ver perfil
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}