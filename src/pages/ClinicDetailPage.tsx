import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import type { Clinic } from '../types/api';

export function ClinicDetailPage() {
  const { id = '' } = useParams();
  const [clinic, setClinic] = useState<Clinic>();
  const [error, setError] = useState('');
  useEffect(() => {
    api
      .clinic(id)
      .then(({ data }) => setClinic(data))
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : 'No fue posible cargar el consultorio.'),
      );
  }, [id]);
  if (error)
    return (
      <main className="directory">
        <p className="notice error">{error}</p>
        <Link to="/clinics">Volver al directorio</Link>
      </main>
    );
  if (!clinic)
    return (
      <main className="directory">
        <p>Cargando consultorio…</p>
      </main>
    );
  const location = Array.from(
    new Set([clinic.neighborhood, clinic.city, clinic.municipality, clinic.state].filter(Boolean)),
  ).join(', ');
  const mapUrl =
    clinic.latitude != null && clinic.longitude != null
      ? `https://www.google.com/maps?q=${clinic.latitude},${clinic.longitude}`
      : null;
  const hasLinks = Boolean(clinic.websiteUrl || clinic.facebookUrl || clinic.instagramUrl);
  return (
    <main className="detail">
      <Link to="/clinics">← Volver al directorio</Link>
      <img
        className="detail-image"
        src={
          clinic.imageUrl ||
          'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1200&q=80'
        }
        alt={`Instalaciones de ${clinic.name}`}
      />
      {location && <p className="eyebrow">{location}</p>}
      <h1>{clinic.name}</h1>
      <p className="lead">{clinic.description}</p>
      <section>
        <h2>Contacto</h2>
        <p>
          {clinic.address}
          {clinic.postalCode ? `, C.P. ${clinic.postalCode}` : ''}
        </p>
        <p>
          <a href={`tel:${clinic.phone}`}>{clinic.phone}</a> ·{' '}
          <a href={`mailto:${clinic.email}`}>{clinic.email}</a>
        </p>
      </section>
      {(hasLinks || mapUrl) && (
        <section>
          <h2>Enlaces y ubicación</h2>
          <ul className="public-links">
            {clinic.websiteUrl && (
              <li>
                <a href={clinic.websiteUrl} target="_blank" rel="noreferrer">
                  Sitio web
                </a>
              </li>
            )}
            {clinic.facebookUrl && (
              <li>
                <a href={clinic.facebookUrl} target="_blank" rel="noreferrer">
                  Facebook
                </a>
              </li>
            )}
            {clinic.instagramUrl && (
              <li>
                <a href={clinic.instagramUrl} target="_blank" rel="noreferrer">
                  Instagram
                </a>
              </li>
            )}
            {mapUrl && (
              <li>
                <a href={mapUrl} target="_blank" rel="noreferrer">
                  Ver ubicación en el mapa
                </a>
              </li>
            )}
          </ul>
        </section>
      )}
      <section>
        <h2>Servicios</h2>
        <ul>
          {clinic.services.map((service) => (
            <li key={service.id}>
              <strong>{service.name}</strong>: {service.description} · desde ${service.priceFrom}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Especialistas</h2>
        <ul>
          {clinic.dentists?.map((dentist) => (
            <li key={dentist.id}>
              <strong>
                {dentist.firstName} {dentist.lastName}
              </strong>{' '}
              — {dentist.specialty}
            </li>
          )) || <li>Información por confirmar.</li>}
        </ul>
      </section>
    </main>
  );
}
