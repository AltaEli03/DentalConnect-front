import {
  useEffect,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../services/api';
import { currentClinicId, currentIdToken, currentUser } from '../services/cognito';
import type { Clinic, ClinicProfileInput } from '../types/api';

type ProfileForm = {
  name: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  municipality: string;
  neighborhood: string;
  state: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  websiteUrl: string;
  facebookUrl: string;
  instagramUrl: string;
};

const emptyForm: ProfileForm = {
  name: '',
  description: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  municipality: '',
  neighborhood: '',
  state: '',
  postalCode: '',
  latitude: '',
  longitude: '',
  websiteUrl: '',
  facebookUrl: '',
  instagramUrl: '',
};

const optional = (value: string) => value.trim() || null;
const coordinate = (value: string) => {
  const number = Number(value);
  return value.trim() && Number.isFinite(number) ? number : null;
};

function toForm(clinic: Clinic): ProfileForm {
  return {
    name: clinic.name,
    description: clinic.description,
    phone: clinic.phone,
    email: clinic.email,
    address: clinic.address,
    city: clinic.city,
    municipality: clinic.municipality,
    neighborhood: clinic.neighborhood,
    state: clinic.state,
    postalCode: clinic.postalCode,
    latitude: clinic.latitude?.toString() ?? '',
    longitude: clinic.longitude?.toString() ?? '',
    websiteUrl: clinic.websiteUrl ?? '',
    facebookUrl: clinic.facebookUrl ?? '',
    instagramUrl: clinic.instagramUrl ?? '',
  };
}

function toPayload(form: ProfileForm): ClinicProfileInput {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    address: form.address.trim(),
    city: form.city.trim(),
    municipality: form.municipality.trim(),
    neighborhood: form.neighborhood.trim(),
    state: form.state.trim(),
    postalCode: form.postalCode.trim(),
    latitude: coordinate(form.latitude),
    longitude: coordinate(form.longitude),
    websiteUrl: optional(form.websiteUrl),
    facebookUrl: optional(form.facebookUrl),
    instagramUrl: optional(form.instagramUrl),
  };
}

type FieldProps = {
  name: keyof ProfileForm;
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

export function ClinicProfilePage() {
  const [clinicId, setClinicId] = useState('');
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const update = (name: keyof ProfileForm, value: string) =>
    setForm((current) => ({ ...current, [name]: value }));
  const errorFor = (name: keyof ProfileForm) => fieldErrors[name]?.[0];

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
        const { data } = await api.clinic(id);
        if (!active) return;
        setForm(toForm(data));
        setReady(true);
      } catch (cause) {
        if (active)
          setStatus({
            kind: 'error',
            text: cause instanceof Error ? cause.message : 'No fue posible cargar el consultorio.',
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
    if (!clinicId) return;
    setSaving(true);
    setStatus(null);
    setFieldErrors({});
    try {
      const token = await currentIdToken();
      if (!token) throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
      const { data } = await api.updateClinic(clinicId, toPayload(form), token);
      setForm(toForm(data));
      setStatus({
        kind: 'success',
        text: 'Cambios guardados. La ficha pública ya muestra la información actualizada.',
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
          text: cause instanceof Error ? cause.message : 'No fue posible guardar los cambios.',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="profile-page">
        <p>Cargando consultorio…</p>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <section className="profile-panel">
        <p className="eyebrow">Mi consultorio</p>
        <h1>Datos públicos del consultorio</h1>
        <p className="profile-intro">
          Actualiza la información que verán los pacientes en el directorio.
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
          <form className="profile-form" onSubmit={save}>
            <fieldset>
              <legend>Información general</legend>
              <div className="profile-fields">
                <TextField
                  wide
                  name="name"
                  label="Nombre"
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="organization"
                  value={form.name}
                  onChange={(event) => update('name', event.target.value)}
                  error={errorFor('name')}
                />
                <TextAreaField
                  wide
                  name="description"
                  label="Descripción"
                  maxLength={1000}
                  rows={4}
                  value={form.description}
                  onChange={(event) => update('description', event.target.value)}
                  error={errorFor('description')}
                />
              </div>
            </fieldset>

            <fieldset>
              <legend>Ubicación</legend>
              <div className="profile-fields">
                <TextField
                  wide
                  name="address"
                  label="Dirección"
                  required
                  minLength={5}
                  maxLength={300}
                  autoComplete="street-address"
                  value={form.address}
                  onChange={(event) => update('address', event.target.value)}
                  error={errorFor('address')}
                />
                <TextField
                  name="city"
                  label="Ciudad"
                  maxLength={120}
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(event) => update('city', event.target.value)}
                  error={errorFor('city')}
                />
                <TextField
                  name="municipality"
                  label="Municipio"
                  maxLength={120}
                  autoComplete="address-level2"
                  value={form.municipality}
                  onChange={(event) => update('municipality', event.target.value)}
                  error={errorFor('municipality')}
                />
                <TextField
                  name="neighborhood"
                  label="Colonia"
                  maxLength={120}
                  autoComplete="address-level3"
                  value={form.neighborhood}
                  onChange={(event) => update('neighborhood', event.target.value)}
                  error={errorFor('neighborhood')}
                />
                <TextField
                  name="state"
                  label="Estado"
                  maxLength={120}
                  autoComplete="address-level1"
                  value={form.state}
                  onChange={(event) => update('state', event.target.value)}
                  error={errorFor('state')}
                />
                <TextField
                  name="postalCode"
                  label="Código postal"
                  inputMode="numeric"
                  pattern="[0-9]{5}"
                  maxLength={5}
                  autoComplete="postal-code"
                  value={form.postalCode}
                  onChange={(event) => update('postalCode', event.target.value)}
                  error={errorFor('postalCode')}
                />
              </div>
            </fieldset>

            <fieldset>
              <legend>Contacto</legend>
              <div className="profile-fields">
                <TextField
                  name="phone"
                  label="Teléfono"
                  type="tel"
                  required
                  minLength={8}
                  maxLength={20}
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(event) => update('phone', event.target.value)}
                  error={errorFor('phone')}
                />
                <TextField
                  name="email"
                  label="Correo electrónico"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => update('email', event.target.value)}
                  error={errorFor('email')}
                />
              </div>
            </fieldset>

            <fieldset>
              <legend>Ubicación en el mapa</legend>
              <div className="profile-fields">
                <TextField
                  name="latitude"
                  label="Latitud"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="-90"
                  max="90"
                  hint="Opcional. Si agregas una coordenada, agrega también la otra."
                  value={form.latitude}
                  onChange={(event) => update('latitude', event.target.value)}
                  error={errorFor('latitude')}
                />
                <TextField
                  name="longitude"
                  label="Longitud"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="-180"
                  max="180"
                  value={form.longitude}
                  onChange={(event) => update('longitude', event.target.value)}
                  error={errorFor('longitude')}
                />
              </div>
            </fieldset>

            <fieldset>
              <legend>Enlaces públicos</legend>
              <div className="profile-fields">
                <TextField
                  wide
                  name="websiteUrl"
                  label="Sitio web"
                  type="url"
                  maxLength={500}
                  placeholder="https://..."
                  hint="Opcional. Usa una URL absoluta que empiece con https://."
                  value={form.websiteUrl}
                  onChange={(event) => update('websiteUrl', event.target.value)}
                  error={errorFor('websiteUrl')}
                />
                <TextField
                  name="facebookUrl"
                  label="Facebook"
                  type="url"
                  maxLength={500}
                  placeholder="https://facebook.com/..."
                  value={form.facebookUrl}
                  onChange={(event) => update('facebookUrl', event.target.value)}
                  error={errorFor('facebookUrl')}
                />
                <TextField
                  name="instagramUrl"
                  label="Instagram"
                  type="url"
                  maxLength={500}
                  placeholder="https://instagram.com/..."
                  value={form.instagramUrl}
                  onChange={(event) => update('instagramUrl', event.target.value)}
                  error={errorFor('instagramUrl')}
                />
              </div>
            </fieldset>

            <div className="form-actions">
              <button disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
              <Link to={`/clinics/${clinicId}`}>Ver ficha pública</Link>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
