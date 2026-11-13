import { useState } from 'react';
import { passwordChecks } from '../../lib/password';

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

const EyeIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="m3 3 18 18" />
    <path d="M10.6 6.2A10.7 10.7 0 0 1 12 6c6.5 0 10 6 10 6a17.7 17.7 0 0 1-3.2 3.8M6.2 6.2A17.4 17.4 0 0 0 2 12s3.5 6 10 6a10.6 10.6 0 0 0 4.2-.9" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);

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
    <div className="input-group">
      <label htmlFor={id}>{label}</label>
      <div className="password-control">
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
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          aria-controls={id}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {hint && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {showRequirements && (
        <ul id={requirementsId} className="password-requirements">
          <li data-ok={checks.length}>12 caracteres como mínimo</li>
          <li data-ok={checks.maxLength}>Hasta 128 caracteres</li>
          {confirmValue !== undefined && (
            <li data-ok={checks.matches}>Las contraseñas coinciden</li>
          )}
          <li data-ok={checks.variety}>
            Combina mayúsculas, minúsculas, números o símbolos (recomendado)
          </li>
        </ul>
      )}
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
