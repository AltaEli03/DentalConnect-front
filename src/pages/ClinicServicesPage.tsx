import {
  useEffect,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { api, ApiError } from '../services/api';
import { currentClinicId, currentIdToken, currentUser } from '../services/cognito';
import type { ClinicServiceInput, ClinicServiceManagement } from '../types/api';

type ServiceForm = {
  name: string;
  description: string;
  estimatedDurationMinutes: string;
};

const emptyForm: ServiceForm = { name: '', description: '', estimatedDurationMinutes: '' };

const toForm = (service: ClinicServiceManagement): ServiceForm => ({
  name: service.name,
  description: service.description,
  estimatedDurationMinutes: String(service.estimatedDurationMinutes),
});

function validate(form: ServiceForm): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const name = form.name.trim();
  if (name.length < 2 || name.length > 120) {
    errors.name = ['El nombre debe tener entre 2 y 120 caracteres.'];
  }
  if (form.description.trim().length > 1000) {
    errors.description = ['La descripción no puede exceder 1000 caracteres.'];
  }
  const duration = form.estimatedDurationMinutes.trim();
  if (!/^\d+$/.test(duration) || Number(duration) <= 0) {
    errors.estimatedDurationMinutes = ['La duración debe ser un entero positivo en minutos.'];
  }
  return errors;
}

type FieldProps = {
  name: keyof ServiceForm;
  label: string;
  error?: string;
  hint?: string;
  wide?: boolean;
};
type TextFieldProps = FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'id'>;
type TextAreaFieldProps = FieldProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'name' | 'id'>;

function Field({ name, label, error, hint, wide, children }: FieldProps & { children: ReactNode }) {
  return (
    <div className={wide ? 'field wide' : 'field'}>
      <label htmlFor={name}>{label}</label>
      {children}
      {hint && (
        <span className="field-hint" id={`${name}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field-error" id={`${name}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}

function TextField({ name, label, error, hint, wide, ...input }: TextFieldProps) {
  return (
    <Field name={name} label={label} error={error} hint={hint} wide={wide}>
      <input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [hint ? `${name}-hint` : '', error ? `${name}-error` : ''].filter(Boolean).join(' ') ||
          undefined
        }
        {...input}
      />
    </Field>
  );
}

function TextAreaField({ name, label, error, hint, wide, ...input }: TextAreaFieldProps) {
  return (
    <Field name={name} label={label} error={error} hint={hint} wide={wide}>
      <textarea
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [hint ? `${name}-hint` : '', error ? `${name}-error` : ''].filter(Boolean).join(' ') ||
          undefined
        }
        {...input}
      />
    </Field>
  );
}

export function ClinicServicesPage() {
  const [clinicId, setClinicId] = useState('');
  const [services, setServices] = useState<ClinicServiceManagement[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState('');

  const update = (name: keyof ServiceForm, value: string) =>
    setForm((current) => ({ ...current, [name]: value }));
  const errorFor = (name: keyof ServiceForm) => fieldErrors[name]?.[0];
  const busy = saving || Boolean(togglingId);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [id, profile] = await Promise.all([currentClinicId(), currentUser()]);
      if (!active) return;
      if (!profile) {
        setStatus({
          kind: 'error',
          text: 'Inicia sesión con una cuenta administradora del consultorio.',
        });
        setLoading(false);
        return;
      }
      if (!id) {
        setStatus({
          kind: 'error',
          text: 'Tu cuenta no tiene un consultorio asignado. Contacta al administrador de tu cuenta.',
        });
        setLoading(false);
        return;
      }
      setClinicId(id);
      try {
        const token = await currentIdToken();
        if (!token) throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
        const { data } = await api.clinicServices(id, token);
        if (!active) return;
        setServices(data);
        setReady(true);
      } catch (cause) {
        if (active)
          setStatus({
            kind: 'error',
            text: cause instanceof Error ? cause.message : 'No fue posible cargar los servicios.',
          });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!clinicId || busy) return;
    const clientErrors = validate(form);
    setFieldErrors(clientErrors);
    setStatus(null);
    const firstError = Object.keys(clientErrors)[0];
    if (firstError) {
      document.getElementById(firstError)?.focus();
      return;
    }

    const editing = Boolean(selectedId);
    setSaving(true);
    try {
      const token = await currentIdToken();
      if (!token) throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
      const input: ClinicServiceInput = {
        name: form.name.trim(),
        description: form.description.trim(),
        estimatedDurationMinutes: Number(form.estimatedDurationMinutes),
      };
      if (editing) {
        await api.updateClinicService(clinicId, selectedId, input, token);
      } else {
        await api.createClinicService(clinicId, input, token);
      }
      const { data } = await api.clinicServices(clinicId, token);
      setServices(data);
      setSelectedId('');
      setForm(emptyForm);
      setStatus({
        kind: 'success',
        text: editing ? 'Servicio actualizado.' : 'Servicio agregado a la oferta.',
      });
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFieldErrors(cause.fieldErrors);
        setStatus({ kind: 'error', text: cause.message });
        const first = Object.keys(cause.fieldErrors)[0];
        if (first) document.getElementById(first)?.focus();
      } else {
        setStatus({
          kind: 'error',
          text: cause instanceof Error ? cause.message : 'No fue posible guardar el servicio.',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (service: ClinicServiceManagement) => {
    if (!clinicId || busy) return;
    setTogglingId(service.id);
    setStatus(null);
    try {
      const token = await currentIdToken();
      if (!token) throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
      await api.setClinicServiceStatus(clinicId, service.id, !service.isActive, token);
      const { data } = await api.clinicServices(clinicId, token);
      setServices(data);
      setStatus({
        kind: 'success',
        text: service.isActive
          ? 'Servicio desactivado. Ya no aparece en la ficha pública.'
          : 'Servicio reactivado.',
      });
    } catch (cause) {
      setStatus({
        kind: 'error',
        text:
          cause instanceof Error ? cause.message : 'No fue posible cambiar el estado del servicio.',
      });
    } finally {
      setTogglingId('');
    }
  };

  const edit = (service: ClinicServiceManagement) => {
    if (busy) return;
    setSelectedId(service.id);
    setForm(toForm(service));
    setFieldErrors({});
    setStatus(null);
    document.getElementById('name')?.focus();
  };

  const cancel = () => {
    setSelectedId('');
    setForm(emptyForm);
    setFieldErrors({});
    setStatus(null);
  };

  if (loading) {
    return (
      <main className="profile-page">
        <p>Cargando servicios…</p>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <section className="profile-panel">
        <p className="eyebrow">Mi consultorio</p>
        <h1>Servicios del consultorio</h1>
        <p className="profile-intro">
          Administra la oferta vigente. Los servicios inactivos dejan de mostrarse a los pacientes,
          pero conservan su historial.
        </p>
        {status && (
          <p
            className={status.kind === 'error' ? 'notice error' : 'notice'}
            role={status.kind === 'error' ? 'alert' : 'status'}
          >
            {status.text}
          </p>
        )}
        {ready && (
          <>
            <form className="profile-form" onSubmit={save} noValidate>
              <fieldset>
                <legend>{selectedId ? 'Editar servicio' : 'Agregar servicio'}</legend>
                <div className="profile-fields">
                  <TextField
                    name="name"
                    label="Nombre"
                    required
                    minLength={2}
                    maxLength={120}
                    value={form.name}
                    onChange={(event) => update('name', event.target.value)}
                    error={errorFor('name')}
                  />
                  <TextField
                    name="estimatedDurationMinutes"
                    label="Duración (minutos)"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    required
                    value={form.estimatedDurationMinutes}
                    onChange={(event) => update('estimatedDurationMinutes', event.target.value)}
                    error={errorFor('estimatedDurationMinutes')}
                  />
                  <TextAreaField
                    wide
                    name="description"
                    label="Descripción"
                    maxLength={1000}
                    rows={3}
                    value={form.description}
                    onChange={(event) => update('description', event.target.value)}
                    error={errorFor('description')}
                  />
                </div>
              </fieldset>
              <div className="form-actions">
                <button type="submit" disabled={busy}>
                  {saving ? 'Guardando…' : selectedId ? 'Guardar cambios' : 'Agregar servicio'}
                </button>
                {selectedId && (
                  <button type="button" onClick={cancel} disabled={busy}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>

            <section aria-labelledby="service-list-heading">
              <h2 id="service-list-heading">Oferta registrada</h2>
              {services.length === 0 ? (
                <p>Aún no hay servicios registrados.</p>
              ) : (
                <ul className="service-list">
                  {services.map((service) => (
                    <li key={service.id} className="service-item">
                      <div>
                        <h3>{service.name}</h3>
                        <p>{service.description || 'Sin descripción.'}</p>
                        <p>
                          {service.estimatedDurationMinutes} min ·{' '}
                          <strong>{service.isActive ? 'Activo' : 'Inactivo'}</strong>
                        </p>
                      </div>
                      <div className="service-actions">
                        <button
                          type="button"
                          onClick={() => edit(service)}
                          disabled={busy}
                          aria-label={`Editar ${service.name}`}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggle(service)}
                          disabled={busy}
                          aria-label={`${service.isActive ? 'Desactivar' : 'Activar'} ${service.name}`}
                        >
                          {togglingId === service.id
                            ? 'Guardando…'
                            : service.isActive
                              ? 'Desactivar'
                              : 'Activar'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}
