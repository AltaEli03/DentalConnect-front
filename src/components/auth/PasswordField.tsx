import { useState } from 'react';
import { passwordChecks } from '../../lib/password';
import { controlClass } from '../ui/Field';
import { Icon } from '../ui/Icon';

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  name?: string;
  confirmValue?: string;
  showRequirements?: boolean;
  error?: string;
  hint?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
};

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  name,
  confirmValue,
  showRequirements = false,
  error,
  hint,
  required = true,
  minLength,
  maxLength = 128,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const checks = passwordChecks(value, confirmValue);
  const requirementsId = showRequirements ? `${id}-requirements` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, requirementsId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id={id}
          name={name ?? id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${controlClass} pr-12`}
        />
        <button
          type="button"
          className="absolute right-0.5 inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-muted hover:bg-surface-soft hover:text-heading focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          aria-controls={id}
          onClick={() => setVisible((current) => !current)}
        >
          <Icon name={visible ? 'eye-off' : 'eye'} size={19} />
        </button>
      </div>
      {hint && (
        <p id={hintId} className="text-sm leading-relaxed text-muted">
          {hint}
        </p>
      )}
      {showRequirements && (
        <ul id={requirementsId} className="grid gap-1 text-xs leading-relaxed">
          <li className={checks.length ? 'text-success-text' : 'text-muted'}>
            12 caracteres como mínimo
          </li>
          <li className={checks.maxLength ? 'text-success-text' : 'text-muted'}>
            Hasta 128 caracteres
          </li>
          {confirmValue !== undefined && (
            <li className={checks.matches ? 'text-success-text' : 'text-muted'}>
              Las contraseñas coinciden
            </li>
          )}
          <li className={checks.variety ? 'text-success-text' : 'text-muted'}>
            Combina mayúsculas, minúsculas, números o símbolos (recomendado)
          </li>
        </ul>
      )}
      {error && (
        <p id={errorId} className="text-sm font-semibold text-danger-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
