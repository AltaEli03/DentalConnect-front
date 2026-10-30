import { Link } from 'react-router-dom';
import type { Clinic } from '../types/api';

type ClinicWithDistance = Clinic & { distanceKm?: number };

export function ClinicCard({ clinic }: { clinic: ClinicWithDistance }) {
  return (
    <article className="clinic-card">
      <img src={clinic.imageUrl || 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=900&q=80'} alt={`Fachada de ${clinic.name}`} />
      <div>
        <p className="eyebrow">{clinic.municipality}, {clinic.state}</p>
        <h2>{clinic.name}</h2>
        <p>{clinic.description}</p>
        <p>{clinic.address}{clinic.postalCode ? ` · C.P. ${clinic.postalCode}` : ''}</p>
        {Number.isFinite(clinic.distanceKm) && <p className="eyebrow">A {clinic.distanceKm!.toFixed(1)} km aproximadamente</p>}
        <p className="services">{clinic.services.map((service) => service.name).join(' · ') || 'Servicios por confirmar'}</p>
        <Link className="button" to={`/clinics/${clinic.id}`}>Ver consultorio</Link>
      </div>
    </article>
  );
}
