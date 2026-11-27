import type { ReactNode } from 'react';

type SectionProps = {
  id?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Section({
  id,
  title,
  description,
  actions,
  children,
  className = '',
}: SectionProps) {
  return (
    <section id={id} className={`border-t border-line pt-6 ${className}`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-heading">{title}</h2>
          {description && (
            <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
