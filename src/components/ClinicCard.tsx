import { Link } from 'react-router-dom';
import { ContentImage } from './ContentImage';
import { buttonStyles } from './ui/Button';
import type { Clinic } from '../types/api';

type ClinicWithDistance = Clinic & { distanceKm?: number };

export function ClinicCard({ clinic, from = '' }: { clinic: ClinicWithDistance; from?: string }) {
  const location = [clinic.municipality, clinic.state].filter(Boolean).join(', ');
  const address = [clinic.address, clinic.postalCode ? `C.P. ${clinic.postalCode}` : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <article
      className="grid gap-4 py-5 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-center"
      aria-labelledby={`clinic-${clinic.id}-name`}
    >
      <div className="h-44 overflow-hidden rounded-control bg-canvas sm:h-32">
        <ContentImage
          src={clinic.imageUrl}
          alt={`Consultorio ${clinic.name}`}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="min-w-0">
        {location && <p className="text-sm font-semibold text-accent-strong">{location}</p>}
        <h3
          id={`clinic-${clinic.id}-name`}
          className="mt-1 font-display text-xl font-semibold text-heading"
        >
          {clinic.name}
        </h3>
        {address && <p className="mt-1 text-sm text-muted">{address}</p>}
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
          {clinic.description || 'Consulta los datos de contacto y servicios disponibles.'}
        </p>

        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Servicios publicados">
          {clinic.services.slice(0, 3).map((service) => (
            <li
              key={service.id}
              className="rounded-full border border-line bg-canvas px-2.5 py-1 text-xs font-semibold text-ink"
            >
              {service.name}
            </li>
          ))}
          {clinic.services.length > 3 && (
            <li className="rounded-full border border-line bg-canvas px-2.5 py-1 text-xs font-semibold text-muted">
              y {clinic.services.length - 3} más
            </li>
          )}
          {clinic.services.length === 0 && (
            <li className="rounded-full border border-line bg-canvas px-2.5 py-1 text-xs font-semibold text-muted">
              Servicios por confirmar
            </li>
          )}
        </ul>

        {Number.isFinite(clinic.distanceKm) && (
          <p className="mt-2 text-sm font-semibold text-accent-strong">
            A {clinic.distanceKm!.toFixed(1)} km aproximadamente
          </p>
        )}
      </div>

      <div className="sm:justify-self-end">
        <Link
          className={buttonStyles('outline', 'sm')}
          to={`/clinics/${clinic.id}`}
          state={from ? { from } : undefined}
          aria-label={`Ver consultorio ${clinic.name}`}
        >
          Ver consultorio
        </Link>
      </div>
    </article>
  );
}
