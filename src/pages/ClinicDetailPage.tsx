import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../services/api';
import { ContentImage } from '../components/ContentImage';
import type { Clinic } from '../types/api';

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export function ClinicDetailPage() {
  const { id = '' } = useParams();
  const [clinic, setClinic] = useState<Clinic>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setClinic(undefined);
    setError('');
    api
      .clinic(id)
      .then(({ data }) => {
        if (active) setClinic(data);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 404) {
          setError('No encontramos ese consultorio. Puede que ya no esté publicado.');
        } else if (cause instanceof ApiError && cause.status >= 500) {
          setError('El detalle tiene un problema temporal. Intenta de nuevo en unos minutos.');
        } else if (
          cause instanceof TypeError ||
          (cause instanceof Error && /failed to fetch|network|load failed/i.test(cause.message))
        ) {
          setError(
            'No pudimos conectar con DentalConnect. Revisa tu conexión e inténtalo de nuevo.',
          );
        } else {
          setError(
            cause instanceof Error ? cause.message : 'No fue posible cargar el consultorio.',
          );
        }
      });
    return () => {
      active = false;
    };
  }, [attempt, id]);

  if (error)
    return (
      <main className="page-container">
        <div className="alert alert-error" role="alert">
          <p>{error}</p>
          <div className="error-actions">
            <button
              type="button"
              className="button-retry"
              onClick={() => setAttempt((current) => current + 1)}
            >
              Reintentar
            </button>
            <Link to="/clinics" className="button-outline">
              Volver al directorio
            </Link>
          </div>
        </div>
      </main>
    );
  if (!clinic)
    return (
      <main className="page-container">
        <p className="loading-state" role="status" aria-live="polite">
          Cargando consultorio…
        </p>
      </main>
    );

  return (
    <main className="page-container">
      <nav className="breadcrumb">
        <Link to="/clinics">← Volver al directorio</Link>
      </nav>

      {/* HERO: Imagen a la izquierda, Info a la derecha */}
      <section className="clinic-hero" aria-labelledby="clinic-name">
        <div className="clinic-hero-img">
          <ContentImage src={clinic.imageUrl} alt={`Instalaciones de ${clinic.name}`} />
        </div>

        <div className="clinic-hero-info">
          <h1 id="clinic-name">{clinic.name}</h1>
          <p className="clinic-description">{clinic.description}</p>

          <div className="contact-info" aria-label="Datos de contacto">
            <p>
              <span aria-hidden="true">⌖</span>{' '}
              {[
                clinic.address,
                clinic.municipality,
                clinic.state,
                clinic.postalCode ? `C.P. ${clinic.postalCode}` : '',
              ]
                .filter(Boolean)
                .join(', ') || 'Dirección no disponible'}
            </p>
            <p>
              <span aria-hidden="true">Tel.</span>{' '}
              {clinic.phone ? (
                <a href={`tel:${clinic.phone}`}>{clinic.phone}</a>
              ) : (
                'Teléfono no disponible'
              )}
            </p>
            <p>
              <span aria-hidden="true">Email</span>{' '}
              {clinic.email ? (
                <a href={`mailto:${clinic.email}`}>{clinic.email}</a>
              ) : (
                'Correo no disponible'
              )}
            </p>
          </div>
        </div>
      </section>

      {/* SERVICIOS */}
      <section className="services-section">
        <h2 className="section-title" id="clinic-services">
          Servicios disponibles
        </h2>

        {clinic.services.length === 0 ? (
          <p className="notice info" role="status">
            Este consultorio aún no publica servicios.
          </p>
        ) : (
          <div className="services-grid">
            {clinic.services.map((service) => (
              <div className="service-card" key={service.id}>
                <div className="service-card-header">
                  <h3>{service.name}</h3>
                  <span className="price">Desde {money.format(service.priceFrom)}</span>
                </div>
                <p className="service-description">
                  {service.description || 'Descripción no disponible.'}
                </p>
                <div className="service-card-footer">
                  <span className="duration">⏱ {service.estimatedDurationMinutes} min</span>
                  <Link
                    to={`/clinics/${clinic.id}/solicitar?serviceId=${encodeURIComponent(service.id)}`}
                    className="btn btn-primary btn-sm"
                    aria-label={`Solicitar ${service.name} en ${clinic.name}`}
                  >
                    Solicitar atención
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* EQUIPO DENTAL (El Plus que faltaba) */}
      {clinic.dentists && clinic.dentists.length > 0 && (
        <section className="team-section" aria-labelledby="team-title">
          <h2 className="section-title" id="team-title">
            Equipo dental
          </h2>
          <div className="card-grid" style={{ marginTop: '1.5rem' }}>
            {clinic.dentists.map((dentist) => (
              <div className="clinic-card" key={dentist.id}>
                <div className="clinic-card-img">
                  <ContentImage
                    src={dentist.imageUrl}
                    alt={`Fotografía de ${dentist.firstName} ${dentist.lastName}`}
                  />
                </div>
                <div className="clinic-card-body">
                  <span className="tag" style={{ alignSelf: 'flex-start', marginBottom: '0.5rem' }}>
                    {dentist.specialty || 'Odontología General'}
                  </span>
                  <h3>
                    {dentist.firstName} {dentist.lastName}
                  </h3>
                  <p className="dentist-biography">
                    {dentist.biography || 'Biografía profesional no disponible.'}
                  </p>

                  <Link
                    to={`/clinics/${clinic.id}/dentistas/${dentist.id}`}
                    className="btn btn-outline"
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
