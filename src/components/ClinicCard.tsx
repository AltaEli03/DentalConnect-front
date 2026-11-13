import { Link } from 'react-router-dom';
import type { Clinic } from '../types/api';

type ClinicWithDistance = Clinic & { distanceKm?: number };

export function ClinicCard({ clinic }: { clinic: ClinicWithDistance }) {
  const fallbackImage = 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=900&q=80';
  const imageUrl = clinic.imageUrl || fallbackImage;

  return (
    <article className="clinic-card">
      <div className="clinic-card-img-wrapper">
        <img src={imageUrl} alt={`Fachada de ${clinic.name}`} loading="lazy" />
        <div className="clinic-card-rating">⭐ 4.9</div>
      </div>
      
      <div className="clinic-card-body">
        <div className="clinic-card-badges">
          <span className="badge-location">{clinic.municipality}, {clinic.state}</span>
          {Number.isFinite(clinic.distanceKm) && (
            <span className="badge-distance">📍 {clinic.distanceKm!.toFixed(1)} km</span>
          )}
        </div>
        
        <h2>{clinic.name}</h2>
        
        <p className="clinic-card-description">
          {clinic.description}
        </p>
        
        {/* Los servicios ahora son píldoras limpias */}
        <div className="clinic-card-services">
          {clinic.services.slice(0, 3).map((service) => (
            <span key={service.id} className="service-pill">{service.name}</span>
          ))}
          {clinic.services.length > 3 && (
            <span className="service-pill more">+{clinic.services.length - 3} más</span>
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