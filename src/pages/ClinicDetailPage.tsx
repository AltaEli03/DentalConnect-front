import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PLACEHOLDER_CLINIC_IMAGE } from '../constants';
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

  if (error) {
    return (
      <div className="detail">
        <div>
          <p className="notice error">{error}</p>
          <Link to="/clinics">Volver al directorio</Link>
        </div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="detail">
        <div>
          <p>Cargando consultorio…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="detail">
      <div>
        <Link to="/clinics">← Volver al directorio</Link>
        <img
          className="detail-image"
          src={clinic.imageUrl || PLACEHOLDER_CLINIC_IMAGE}
          alt={`Instalaciones de ${clinic.name}`}
        />
        <p className="eyebrow">
          {clinic.municipality}, {clinic.state}
        </p>
        <h1>{clinic.name}</h1>
        <p className="lead">{clinic.description}</p>
        <section>
          <h2>Contacto</h2>
          <p>
            {clinic.address}, C.P. {clinic.postalCode}
          </p>
          <p>
            <a href={`tel:${clinic.phone}`}>{clinic.phone}</a> ·{' '}
            <a href={`mailto:${clinic.email}`}>{clinic.email}</a>
          </p>
        </section>
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
            {clinic.dentists?.length ? (
              clinic.dentists.map((dentist) => (
                <li key={dentist.id}>
                  <strong>
                    {dentist.firstName} {dentist.lastName}
                  </strong>{' '}
                  — {dentist.specialty}
                </li>
              ))
            ) : (
              <li>Información por confirmar.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
