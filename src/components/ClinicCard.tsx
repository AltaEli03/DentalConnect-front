import { Link } from 'react-router-dom';
import type { Clinic } from '../types/api';

type ClinicWithDistance = Clinic & { distanceKm?: number };

export function ClinicCard({ clinic }: { clinic: ClinicWithDistance }) {
  // Fallback image
  const fallbackImage = 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=900&q=80';
  const imageUrl = clinic.imageUrl || fallbackImage;

  return (
    <article className="clinic-card">
      <div className="img-container">
        <img src={imageUrl} alt={`Fachada de ${clinic.name}`} loading="lazy" />
        {/* Floating distance badge */}
        {Number.isFinite(clinic.distanceKm) && (
          <span className="distance-badge">
            📍 A {clinic.distanceKm!.toFixed(1)} km
          </span>
        )}
        {/* Placeholder for rating */}
        <span className="rating-badge">
          ⭐ 4.9
        </span>
      </div>
      
      <div className="clinic-card-content">
        <div className="clinic-card-header">
          <p className="eyebrow">{clinic.municipality}, {clinic.state}</p>
          <h2>{clinic.name}</h2>
        </div>
        
        <p className="clinic-description">{clinic.description}</p>
        
        <div className="clinic-address">
          <span className="icon">📌</span>
          <span>{clinic.address}{clinic.postalCode ? ` · C.P. ${clinic.postalCode}` : ''}</span>
        </div>
        
        <div className="clinic-services-chips">
          {clinic.services.slice(0, 3).map((service) => (
            <span key={service.id} className="service-chip">{service.name}</span>
          ))}
          {clinic.services.length > 3 && (
            <span className="service-chip more">+{clinic.services.length - 3} más</span>
          )}
        </div>
        
        <div className="clinic-card-footer">
          <Link className="button outline-button" to={`/clinics/${clinic.id}`}>
            Ver consultorio
          </Link>
        </div>
      </div>
    </article>
  );
}