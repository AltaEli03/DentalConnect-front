import { useState, type ReactNode } from 'react';
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
  labelAction?: ReactNode;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
};

function Requirement({ met, children }: { met: boolean; children: ReactNode }) {
  return (
    <li className={`flex items-start gap-2 ${met ? 'text-success-text' : 'text-muted'}`}>
      <span
        aria-hidden="true"
        className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${
          met ? 'border-success-border bg-success-soft' : 'border-line-strong bg-surface'
        }`}
      >
        {met && <Icon name="check" size={11} />}
      </span>
      <span className="text-xs leading-relaxed">
        <span className="sr-only">{met ? 'Cumplido: ' : 'Pendiente: '}</span>
        {children}
      </span>
    </li>
  );
}

function SecurityChip({ met, children }: { met: boolean; children: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-chip border px-2 py-0.5 text-[11px] font-medium ${
        met
          ? 'border-success-border bg-success-soft text-success-text'
          : 'border-line bg-surface text-subtle'
      }`}
    >
      {met && <Icon name="check" size={11} />}
      <span className="sr-only">{met ? 'Incluida: ' : 'No incluida: '}</span>
      {children}
    </span>
  );
}

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
  labelAction,
  required = true,
  minLength,
  maxLength = 128,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const checks = passwordChecks(value, confirmValue);
  const showChecklist = showRequirements || confirmValue !== undefined;
  const requirementsId = showChecklist ? `${id}-requirements` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, requirementsId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="grid content-start gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        {labelAction}
      </div>
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
          className={`${controlClass} pr-12 ${error ? 'border-danger-border' : ''}`}
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
      {showChecklist && (
        <ul id={requirementsId} className="grid gap-1">
          {showRequirements && (
            <>
              <Requirement met={checks.length}>12 caracteres como mínimo</Requirement>
              <Requirement met={checks.maxLength}>Hasta 128 caracteres</Requirement>
              <li className="mt-1">
                <p className="mb-1.5 text-xs font-medium text-muted">
                  Para mayor seguridad (recomendado)
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  <li>
                    <SecurityChip met={checks.lowercase}>Minúscula</SecurityChip>
                  </li>
                  <li>
                    <SecurityChip met={checks.uppercase}>Mayúscula</SecurityChip>
                  </li>
                  <li>
                    <SecurityChip met={checks.number}>Número</SecurityChip>
                  </li>
                  <li>
                    <SecurityChip met={checks.symbol}>Símbolo</SecurityChip>
                  </li>
                </ul>
              </li>
            </>
          )}
          {confirmValue !== undefined && (
            <Requirement met={checks.matches === true}>Las contraseñas coinciden</Requirement>
          )}
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
