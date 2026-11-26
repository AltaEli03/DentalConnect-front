import { Children, cloneElement, type ReactElement } from 'react';

export const controlClass =
  'min-h-11 w-full rounded-control border border-control bg-surface px-3 text-base text-ink outline-none focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/20';

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  children: ReactElement;
};

export function Field({
  id,
  label,
  hint,
  error,
  required = false,
  className = '',
  labelClassName = 'text-sm font-semibold text-ink',
  children,
}: FieldProps) {
  const describedBy =
    [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  const control = cloneElement(Children.only(children) as ReactElement<Record<string, unknown>>, {
    id,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
  });

  return (
    <div className={`grid gap-1.5 ${className}`}>
      <label htmlFor={id} className={labelClassName}>
        {label}
        {required && (
          <span aria-hidden="true" className="text-danger-text">
            {' '}
            *
          </span>
        )}
      </label>
      {control}
      {hint && (
        <p id={`${id}-hint`} className="text-sm leading-relaxed text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm font-semibold leading-relaxed text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}
