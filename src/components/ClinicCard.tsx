import { Link } from 'react-router-dom';
import { PLACEHOLDER_CLINIC_IMAGE } from '../constants';
import type { Clinic } from '../types/api';

export function ClinicCard({ clinic }: { clinic: Clinic }) {
  return (
    <article className="clinic-card">
      <img src={clinic.imageUrl || PLACEHOLDER_CLINIC_IMAGE} alt={`Fachada de ${clinic.name}`} />
      <div>
        <p className="eyebrow">
          {clinic.municipality}, {clinic.state}
        </p>
        <h2>{clinic.name}</h2>
        <p>{clinic.description}</p>
        <p className="services">
          {clinic.services.map((service) => service.name).join(' · ') || 'Servicios por confirmar'}
        </p>
        <Link className="button" to={`/clinics/${clinic.id}`}>
          Ver consultorio
        </Link>
      </div>
    </article>
  );
}
