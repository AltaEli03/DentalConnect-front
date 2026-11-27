import { Link } from 'react-router-dom';
import { ContentImage } from './ContentImage';
import { clinicFromPrice, formatPriceFrom } from '../lib/clinicPrice';
import type { Clinic } from '../types/api';

type ClinicWithDistance = Clinic & { distanceKm?: number };

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

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
  const fromPrice = clinicFromPrice(clinic.services);

  return (
    <article
      className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface transition-colors hover:border-accent"
      aria-labelledby={`clinic-${clinic.id}-name`}
    >
      <div className="aspect-[16/9] overflow-hidden bg-canvas">
        <ContentImage
          src={clinic.imageUrl}
          alt={`Consultorio ${clinic.name}`}
          className="h-full w-full object-cover"
          priority={priority}
          fallbackLabel={initials(clinic.name)}
        />
      </div>

      <div className="flex flex-1 flex-col px-[18px] pt-[17px]">
        {location && (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-accent-strong">
            {location}
          </p>
        )}
        <h3
          id={`clinic-${clinic.id}-name`}
          className="font-display text-[19px] font-semibold leading-snug tracking-[-0.015em] text-heading"
        >
          {clinic.name}
        </h3>
        {address && <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{address}</p>}
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">
          {clinic.description || 'Consulta servicios y datos de contacto.'}
        </p>

        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Servicios publicados">
          {clinic.services.slice(0, 3).map((service) => (
            <li
              key={service.id}
              className="rounded-[4px] bg-surface-soft px-2 py-1 text-[10px] font-semibold text-ink"
            >
              {service.name}
            </li>
          ))}
          {clinic.services.length > 3 && (
            <li className="rounded-[4px] bg-surface-soft px-2 py-1 text-[10px] font-semibold text-muted">
              y {clinic.services.length - 3} más
            </li>
          )}
          {clinic.services.length === 0 && (
            <li className="rounded-[4px] bg-surface-soft px-2 py-1 text-[10px] font-semibold text-muted">
              Sin servicios publicados
            </li>
          )}
        </ul>

        {Number.isFinite(clinic.distanceKm) && (
          <p className="mt-2 text-xs font-semibold text-accent-strong">
            A {clinic.distanceKm!.toFixed(1)} km aproximadamente
          </p>
        )}
      </div>

      <div className="mt-auto px-[18px] pb-[18px] pt-3">
        {fromPrice !== undefined && (
          <p className="mb-2 text-[11px] text-subtle">
            Desde <b className="text-[13px] font-semibold text-heading">{formatPriceFrom(fromPrice)}</b>
          </p>
        )}
        <Link
          className="inline-flex min-h-11 w-full items-center justify-center rounded-control border border-accent px-3 text-sm font-semibold text-accent-strong transition-colors hover:border-heading hover:bg-surface-soft hover:text-heading"
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
