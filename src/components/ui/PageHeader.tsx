import type { ReactNode } from 'react';

type PageHeaderProps = {
  kicker?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  kicker,
  title,
  description,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <header className={`flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {kicker && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-strong">
            {kicker}
          </p>
        )}
        <h1 className="mt-1 font-display text-[clamp(1.75rem,3vw,2.25rem)] font-bold tracking-[-0.03em] text-heading">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-[65ch] leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
