import { Link } from 'react-router-dom';
import type { Clinic } from '../types/api';

type ClinicWithDistance = Clinic & { distanceKm?: number };

export function ClinicCard({ clinic }: { clinic: ClinicWithDistance }) {
  // Imagen por defecto en caso de que la API no devuelva ninguna o falle
  const fallbackImage = 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=900&q=80';

  return (
    <article className="clinic-card">
      {/* 1. Contenedor de imagen con altura fija */}
      <div className="clinic-card-img-wrapper">
        <img 
          src={clinic.imageUrl || fallbackImage} 
          alt={`Fachada de ${clinic.name}`} 
          onError={(e) => { e.currentTarget.src = fallbackImage; }}
        />
        <div className="clinic-rating">⭐ 4.9</div>
      </div>
      
      <div className="clinic-card-body">
        <p className="clinic-location">{clinic.municipality}, {clinic.state}</p>
        <h3>{clinic.name}</h3>
        
        <p className="clinic-desc">{clinic.description}</p>
        
        {/* 2. Mapeo de servicios (Arregla el texto amontonado) */}
        <div className="tags">
          {clinic.services.slice(0, 3).map((service) => (
            <span key={service.id} className="tag">{service.name}</span>
          ))}
          {clinic.services.length > 3 && (
            <span className="tag">+{clinic.services.length - 3} más</span>
          )}
        </div>
        
        {/* 3. Botón estilizado */}
        <Link className="btn btn-outline btn-full" to={`/clinics/${clinic.id}`}>
          Ver consultorio
        </Link>
      </div>
    </article>
  );
}