import { Link } from 'react-router-dom';
import { ContentImage } from './ContentImage';
import { buttonStyles } from './ui/Button';
import type { Clinic } from '../types/api';

type ClinicWithDistance = Clinic & { distanceKm?: number };

export function ClinicCard({
  clinic,
  from = '',
  priority = false,
}: {
  clinic: ClinicWithDistance;
  from?: string;
  priority?: boolean;
}) {
  const location = [clinic.municipality, clinic.state].filter(Boolean).join(', ');
  const address = [clinic.address, clinic.postalCode ? `C.P. ${clinic.postalCode}` : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <article
      className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none"
      aria-labelledby={`clinic-${clinic.id}-name`}
    >
      <div className="aspect-[16/9] overflow-hidden bg-canvas">
        <ContentImage
          src={clinic.imageUrl}
          alt={`Consultorio ${clinic.name}`}
          className="h-full w-full object-cover"
          priority={priority}
        />
      </div>

      <div className="flex flex-1 flex-col p-5">
        {location && <p className="mb-1 text-sm font-semibold text-accent-strong">{location}</p>}
        <h3
          id={`clinic-${clinic.id}-name`}
          className="font-display text-xl font-semibold leading-snug text-heading"
        >
          {clinic.name}
        </h3>
        {address && <p className="mt-2 line-clamp-2 text-sm text-muted">{address}</p>}
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted">
          {clinic.description || 'Consulta servicios y datos de contacto.'}
        </p>

        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Servicios publicados">
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
              Sin servicios publicados
            </li>
          )}
        </ul>

        {Number.isFinite(clinic.distanceKm) && (
          <p className="mt-2 text-sm font-semibold text-accent-strong">
            A {clinic.distanceKm!.toFixed(1)} km aproximadamente
          </p>
        )}
      </div>

      <div className="mt-auto px-5 pb-5 pt-4">
        <Link
          className={`${buttonStyles('outline', 'sm')} w-full`}
          to={`/clinics/${clinic.id}`}
          state={from ? { from } : undefined}
          aria-label={`Ver consultorio ${clinic.name}`}
        >
          Ver detalles
        </Link>
      </div>
    </article>
  );
}
