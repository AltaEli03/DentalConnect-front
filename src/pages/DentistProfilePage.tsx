import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../services/api';
import { ContentImage } from '../components/ContentImage';
import type { Clinic, Dentist } from '../types/api';

export function DentistProfilePage() {
  const { clinicId = '', dentistId = '' } = useParams();
  const [clinic, setClinic] = useState<Clinic>();
  const [dentist, setDentist] = useState<Dentist>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setDentist(undefined);
    setClinic(undefined);

    api
      .clinic(clinicId)
      .then(({ data }) => {
        if (!active) return;
        setClinic(data);
        setDentist(data.dentists?.find((item) => item.id === dentistId));
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 404) {
          setError('No encontramos este consultorio. Puede que ya no esté publicado.');
        } else if (cause instanceof ApiError && cause.status >= 500) {
          setError('El perfil tiene un problema temporal. Intenta de nuevo en unos minutos.');
        } else if (
          cause instanceof TypeError ||
          (cause instanceof Error && /failed to fetch|network|load failed/i.test(cause.message))
        ) {
          setError(
            'No pudimos conectar con DentalConnect. Revisa tu conexión e inténtalo de nuevo.',
          );
        } else {
          setError(cause instanceof Error ? cause.message : 'No fue posible cargar el perfil.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [attempt, clinicId, dentistId]);

  if (loading) {
    return (
      <main className="directory">
        <div className="loading-state">
          <p>Cargando perfil del especialista…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="directory">
        <div className="notice error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="button-retry"
            onClick={() => setAttempt((current) => current + 1)}
          >
            Reintentar
          </button>
          <Link to={`/clinics/${clinicId}`} className="button">
            Volver al consultorio
          </Link>
        </div>
      </main>
    );
  }

  if (!clinic || !dentist) {
    return (
      <main className="directory">
        <div className="notice">
          <h1>Perfil no disponible</h1>
          <p>Este dentista ya no está disponible en el consultorio seleccionado.</p>
          <Link to={`/clinics/${clinicId}`} className="button">
            Volver al consultorio
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="detail">
      {/* Navegación de regreso (Breadcrumb) */}
      <nav className="breadcrumb-nav">
        <Link to={`/clinics/${clinic.id}`}>← Volver a {clinic.name}</Link>
      </nav>

      {/* Cabecera del Perfil (Layout de dos columnas) */}
      <header className="dentist-header">
        <div className="dentist-image-wrapper">
          <ContentImage
            src={dentist.imageUrl}
            alt={`Fotografía de ${dentist.firstName} ${dentist.lastName}`}
          />
        </div>

        <div className="dentist-info">
          <p className="eyebrow">Perfil profesional · {clinic.name}</p>
          <h1>
            {dentist.firstName} {dentist.lastName}
          </h1>
          {dentist.specialty && <p className="lead">{dentist.specialty}</p>}
        </div>
      </header>

      {/* Biografía */}
      {dentist.biography && (
        <section className="bio-section">
          <h2>Acerca de</h2>
          <p>{dentist.biography}</p>
        </section>
      )}

      {/* Servicios */}
      <section className="services-section">
        <h2>Servicios activos</h2>
        {dentist.services?.length ? (
          <ul className="services-list">
            {dentist.services.map((service) => (
              <li key={service.id}>
                <div className="service-header">
                  <strong>{service.name}</strong>
                  <span className="service-time">⏱ {service.estimatedDurationMinutes} min</span>
                </div>
                <p className="service-description">{service.description}</p>
                <Link
                  className="button service-button"
                  to={`/clinics/${clinic.id}/solicitar?serviceId=${encodeURIComponent(service.id)}&dentistId=${encodeURIComponent(dentist.id)}`}
                >
                  Elegir este servicio
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="notice">Este perfil no tiene servicios activos publicados.</p>
        )}
      </section>

      <p className="notice info-notice">
        ℹ️ Elegir a un profesional conserva tu selección para consultar horarios; todavía no
        confirma una cita.
      </p>
    </main>
  );
}
