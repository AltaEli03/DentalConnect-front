import { Link } from 'react-router-dom';
import { ContentImage } from './ContentImage';
import type { Clinic } from '../types/api';

type ClinicWithDistance = Clinic & { distanceKm?: number };

export function ClinicCard({ clinic }: { clinic: ClinicWithDistance }) {
  const location = [clinic.municipality, clinic.state].filter(Boolean).join(', ');
  const address = [clinic.address, clinic.postalCode ? `C.P. ${clinic.postalCode}` : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="clinic-card" aria-labelledby={`clinic-${clinic.id}-name`}>
      <div className="clinic-card-img-wrapper">
        <ContentImage src={clinic.imageUrl} alt={`Consultorio ${clinic.name}`} />
        {Number.isFinite(clinic.distanceKm) && (
          <span className="badge-distance">A {clinic.distanceKm!.toFixed(1)} km</span>
        )}
      </div>

      <div className="clinic-card-body">
        {location && <p className="badge-location">{location}</p>}
        <h3 id={`clinic-${clinic.id}-name`}>{clinic.name}</h3>
        {address && <p className="clinic-address">{address}</p>}
        <p className="clinic-card-description">
          {clinic.description || 'Consulta los datos de contacto y servicios disponibles.'}
        </p>

        <div className="clinic-card-services" aria-label="Servicios publicados">
          {clinic.services.slice(0, 3).map((service) => (
            <span key={service.id} className="service-pill">
              {service.name}
            </span>
          ))}
          {clinic.services.length > 3 && (
            <span className="service-pill more">y {clinic.services.length - 3} más</span>
          )}
          {clinic.services.length === 0 && (
            <span className="service-pill">Servicios por confirmar</span>
          )}
        </div>

        <div className="clinic-card-footer">
          <Link className="button-outline" to={`/clinics/${clinic.id}`}>
            Ver consultorio
          </Link>
        </div>
      </div>
    </article>
  );
}
