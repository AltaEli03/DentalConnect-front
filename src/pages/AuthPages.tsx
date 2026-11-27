import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  signIn,
  updateAccountProfile,
  requestPasswordReset,
  confirmPasswordReset,
} from '../services/cognito';
import { api } from '../services/api';
import { AuthLayout } from '../components/auth/AuthLayout';
import { PasswordField } from '../components/auth/PasswordField';
import { Button } from '../components/ui/Button';
import { Field, controlClass } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import { friendlyAuthError } from '../lib/authErrors';
import { passwordChecks } from '../lib/password';
import { isClinicAdmin, isPatientRole } from '../lib/roles';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

function sanitizePhoneInput(value: string) {
  const digits = digitsOnly(value);
  return value.trimStart().startsWith('+') ? `+${digits}` : digits;
}

function emailErrorMessage(value: string) {
  const email = value.trim();
  if (!email) return 'Escribe tu correo electrónico.';
  if (!EMAIL_PATTERN.test(email)) {
    return 'Escribe un correo válido, por ejemplo nombre@dominio.com.';
  }
  return '';
}

function phoneErrorMessage(value: string) {
  const digits = digitsOnly(value);
  if (!digits) return 'Escribe tu número de teléfono.';
  if (digits.length < 10 || digits.length > 15) {
    return 'El teléfono debe tener entre 10 y 15 dígitos.';
  }
  return '';
}

// ==========================================
// 1. PÁGINA DE LOGIN
// ==========================================
type FormMessage = { title: string; message: string };

export function LoginPage() {
  const { user, acceptLogin } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const requestedRedirect = (location.state as { from?: string } | null)?.from;
  const safeRedirect =
    requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//')
      ? requestedRedirect
      : undefined;
  const defaultDestination = (role?: string) =>
    isClinicAdmin(role) ? '/consultorio/citas' : '/mi-cuenta';
  const destinationForRole = (role?: string) => {
    if (!safeRedirect) return defaultDestination(role);
    const clinicAdmin = isClinicAdmin(role);
    const redirectTargetsClinic =
      safeRedirect.startsWith('/consultorio/') || safeRedirect.startsWith('/administrar-');
    return clinicAdmin === redirectTargetsClinic ? safeRedirect : defaultDestination(role);
  };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberSession, setRememberSession] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<FormMessage | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={destinationForRole(user.role)} replace />;

  const clearFieldError = (field: 'email' | 'password') => {
    setFieldErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: { email?: string; password?: string } = {};
    const emailError = emailErrorMessage(email);
    if (emailError) nextErrors.email = emailError;
    if (!password) nextErrors.password = 'Escribe tu contraseña.';

    setFieldErrors(nextErrors);
    setError(null);
    if (Object.keys(nextErrors).length) {
      setError({
        title: 'Revisa tus datos',
        message: 'Corrige los datos marcados para continuar.',
      });
      document.getElementById(nextErrors.email ? 'email' : 'password')?.focus();
      return;
    }

    setBusy(true);
    try {
      const cognitoProfile = await signIn(email.trim(), password, rememberSession);
      let profile = cognitoProfile;
      try {
        const response = await api.me();
        profile = {
          ...cognitoProfile,
          ...response.data.user,
          clinicId: response.data.user.clinicId || cognitoProfile.clinicId,
        };
      } catch {
        // Conserva el inicio de sesión si la API tiene una interrupción temporal.
      }
      acceptLogin(profile);
      nav(destinationForRole(profile.role), { replace: true });
    } catch (err) {
      setError({
        title: 'No pudimos iniciar sesión',
        message: friendlyAuthError(
          err,
          'No fue posible iniciar sesión. Revisa tus datos e inténtalo de nuevo.',
        ),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Inicia sesión"
      description="Accede a tus citas, solicitudes y datos de cuenta."
    >
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <Field id="email" label="Correo electrónico" error={fieldErrors.email}>
          <input
            className={`${controlClass} ${fieldErrors.email ? 'border-danger-border' : ''}`}
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearFieldError('email');
            }}
            required
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="tu@correo.com"
          />
        </Field>
        <PasswordField
          id="password"
          label="Contraseña"
          value={password}
          onChange={(value) => {
            setPassword(value);
            clearFieldError('password');
          }}
          autoComplete="current-password"
          error={fieldErrors.password}
          labelAction={
            <Link
              to="/recuperar-contrasena"
              className="text-sm font-semibold text-accent-strong underline underline-offset-4 hover:text-heading"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          }
        />
        <label
          htmlFor="remember-session"
          className="flex cursor-pointer items-start gap-3 rounded-control border border-line bg-canvas p-3"
        >
          <input
            id="remember-session"
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-accent"
            checked={rememberSession}
            onChange={(event) => setRememberSession(event.target.checked)}
            aria-describedby="remember-session-hint"
          />
          <span className="grid gap-0.5">
            <span className="text-sm font-semibold text-ink">Mantener la sesión 5 días</span>
            <span id="remember-session-hint" className="text-sm leading-relaxed text-muted">
              Úsalo solo en un dispositivo privado. Sin marcar, la sesión dura 15 minutos.
            </span>
          </span>
        </label>
        {error && (
          <Notice tone="error" title={error.title}>
            {error.message}
          </Notice>
        )}
        <Button type="submit" loading={busy} className="w-full">
          {busy ? 'Validando…' : 'Entrar'}
        </Button>
      </form>
      <div className="mt-5 grid gap-2 border-t border-line pt-4 text-center text-sm leading-relaxed text-muted">
        <p>
          ¿No tienes cuenta? <Link to="/registro">Regístrate aquí</Link>
        </p>
        <p>
          ¿Administras un consultorio?{' '}
          <Link to="/registrar-consultorio">Registrar consultorio</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

// ==========================================
// 2. PÁGINA DE REGISTRO
// ==========================================
type Registration = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

export function RegisterPage() {
  const nav = useNavigate();
  const [error, setError] = useState<FormMessage | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Registration, string>>>({});
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Registration>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const update = (patch: Partial<Registration>) => {
    setData((current) => ({ ...current, ...patch }));
    setFieldErrors((current) => {
      const next = { ...current };
      (Object.keys(patch) as (keyof Registration)[]).forEach((key) => delete next[key]);
      if ('password' in patch) delete next.confirmPassword;
      return next;
    });
    setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof Registration, string>> = {};
    if (!data.firstName.trim()) nextErrors.firstName = 'Escribe tu nombre.';
    if (!data.lastName.trim()) nextErrors.lastName = 'Escribe tus apellidos.';
    const emailError = emailErrorMessage(data.email);
    if (emailError) nextErrors.email = emailError;
    const phoneError = phoneErrorMessage(data.phone);
    if (phoneError) nextErrors.phone = phoneError;
    const checks = passwordChecks(data.password, data.confirmPassword);
    if (!checks.length) nextErrors.password = 'La contraseña debe tener al menos 12 caracteres.';
    if (!data.confirmPassword) nextErrors.confirmPassword = 'Confirma tu contraseña.';
    else if (!checks.matches) nextErrors.confirmPassword = 'Las contraseñas no coinciden.';

    setFieldErrors(nextErrors);
    setError(null);
    const firstInvalid = Object.keys(nextErrors)[0] as keyof Registration | undefined;
    if (firstInvalid) {
      setError({
        title: 'Revisa tus datos',
        message: 'Corrige los campos marcados para continuar.',
      });
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setBusy(true);
    try {
      const cleanEmail = data.email.trim();
      await api.register({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: cleanEmail,
        phone: data.phone,
        password: data.password,
      });
      nav(`/verificar-correo?email=${encodeURIComponent(cleanEmail)}`);
    } catch (cause) {
      setError({
        title: 'No pudimos crear la cuenta',
        message: friendlyAuthError(
          cause,
          'No fue posible crear la cuenta. Revisa tus datos e inténtalo de nuevo.',
        ),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Crea tu cuenta"
      wide
      description="Registra tus datos para verificar tu correo y solicitar atención en los consultorios disponibles."
    >
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="firstName" label="Nombre" error={fieldErrors.firstName}>
            <input
              className={`${controlClass} ${fieldErrors.firstName ? 'border-danger-border' : ''}`}
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              maxLength={50}
              required
              value={data.firstName}
              onChange={(event) => update({ firstName: event.target.value })}
              placeholder="Ej. Ana"
            />
          </Field>
          <Field id="lastName" label="Apellidos" error={fieldErrors.lastName}>
            <input
              className={`${controlClass} ${fieldErrors.lastName ? 'border-danger-border' : ''}`}
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              maxLength={50}
              required
              value={data.lastName}
              onChange={(event) => update({ lastName: event.target.value })}
              placeholder="Ej. García"
            />
          </Field>
        </div>
        <Field id="email" label="Correo electrónico" error={fieldErrors.email}>
          <input
            className={`${controlClass} ${fieldErrors.email ? 'border-danger-border' : ''}`}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={254}
            required
            value={data.email}
            onChange={(event) => update({ email: event.target.value })}
            placeholder="tu@correo.com"
          />
        </Field>
        <Field
          id="phone"
          label="Teléfono"
          hint="Solo números. Puedes empezar con + para conservar un prefijo internacional; si no lo escribes, agregamos +52."
          error={fieldErrors.phone}
        >
          <input
            className={`${controlClass} ${fieldErrors.phone ? 'border-danger-border' : ''}`}
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            pattern="[+]?[0-9]*"
            maxLength={16}
            required
            value={data.phone}
            onChange={(event) => update({ phone: sanitizePhoneInput(event.target.value) })}
            placeholder="+525512345678"
          />
        </Field>
        <div className="grid items-start gap-4 md:grid-cols-2">
          <PasswordField
            id="password"
            label="Contraseña"
            value={data.password}
            onChange={(value) => update({ password: value })}
            autoComplete="new-password"
            showRequirements
            minLength={12}
            error={fieldErrors.password}
          />
          <PasswordField
            id="confirmPassword"
            label="Confirmar contraseña"
            value={data.confirmPassword}
            onChange={(value) => update({ confirmPassword: value })}
            autoComplete="new-password"
            confirmValue={data.password}
            minLength={12}
            error={fieldErrors.confirmPassword}
          />
        </div>
        {error && (
          <Notice tone="error" title={error.title}>
            {error.message}
          </Notice>
        )}
        <Button type="submit" loading={busy} className="w-full">
          {busy ? 'Creando cuenta…' : 'Registrarme'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm leading-relaxed text-muted">
        ¿Ya tienes cuenta? <Link to="/iniciar-sesion">Inicia sesión</Link>
      </p>
    </AuthLayout>
  );
}

// ==========================================
// 3. PÁGINA DE VERIFICACIÓN
// ==========================================
export function VerifyPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [noticeIsError, setNoticeIsError] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const resendTimer = useRef<number | undefined>(undefined);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (resendTimer.current !== undefined) window.clearInterval(resendTimer.current);
    };
  }, []);

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    setNoticeIsError(false);
    try {
      await api.verify({ email: email.trim(), code, password });
      nav('/iniciar-sesion');
    } catch (cause) {
      setNotice(
        friendlyAuthError(
          cause,
          'No se pudo verificar la cuenta. Revisa el código e inténtalo de nuevo.',
        ),
      );
      setNoticeIsError(true);
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    setResending(true);
    setNotice('');
    setNoticeIsError(false);
    try {
      await api.resend(email.trim());
      if (!mounted.current) return;
      setNotice(
        'Se envió un nuevo código de verificación. Revisa también tu carpeta de correo no deseado.',
      );
      setSeconds(60);
      if (resendTimer.current !== undefined) window.clearInterval(resendTimer.current);
      resendTimer.current = window.setInterval(
        () =>
          setSeconds((value) => {
            if (value <= 1) {
              if (resendTimer.current !== undefined) window.clearInterval(resendTimer.current);
              resendTimer.current = undefined;
              return 0;
            }
            return value - 1;
          }),
        1000,
      );
    } catch (cause) {
      if (!mounted.current) return;
      setNotice(friendlyAuthError(cause, 'No fue posible reenviar el código. Inténtalo de nuevo.'));
      setNoticeIsError(true);
    } finally {
      if (mounted.current) setResending(false);
    }
  };

  return (
    <AuthLayout
      title="Verifica tu correo"
      description="Escribe el código enviado a tu correo. La cuenta se activa cuando el código es válido."
    >
      <form onSubmit={verify} className="grid gap-4">
        <div className="grid gap-1.5">
          <label htmlFor="vemail" className="text-sm font-semibold text-ink">
            Correo electrónico
          </label>
          <input
            className={controlClass}
            id="vemail"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="code" className="text-sm font-semibold text-ink">
            Código de 6 dígitos
          </label>
          <input
            id="code"
            name="code"
            required
            className={`${controlClass} text-center text-xl font-bold tracking-[0.5em]`}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6 dígitos"
          />
        </div>
        <PasswordField
          id="vpass"
          label="Contraseña elegida al registrarte"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          hint="Mínimo 12 caracteres."
          minLength={12}
        />
        {notice && (
          <div
            className={`rounded-control border px-4 py-3 text-sm font-semibold ${
              noticeIsError
                ? 'border-danger-border bg-danger-soft text-danger-text'
                : 'border-success-border bg-success-soft text-success-text'
            }`}
            role={noticeIsError ? 'alert' : 'status'}
            aria-live={noticeIsError ? 'assertive' : 'polite'}
          >
            {notice}
          </div>
        )}
        <button
          className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-brand px-5 font-semibold text-white transition-colors hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-subtle"
          disabled={busy}
          type="submit"
          aria-busy={busy}
        >
          {busy ? 'Verificando…' : 'Verificar cuenta'}
        </button>
      </form>
      <div className="mt-3">
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center rounded-control border border-control bg-surface px-4 text-sm font-semibold text-heading transition-colors hover:border-brand hover:bg-canvas"
          disabled={seconds > 0 || busy || resending || !email.trim()}
          onClick={resendCode}
          aria-busy={resending}
        >
          {resending ? 'Enviando código…' : seconds ? `Reenviar en ${seconds}s` : 'Reenviar código'}
        </button>
      </div>
    </AuthLayout>
  );
}

// ==========================================
// 4. PÁGINA DE MI CUENTA
// ==========================================
export function AccountPage() {
  const { user, loading, logout, updateProfile } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileMessage, setProfileMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setPhone(sanitizePhoneInput(user.phone ?? ''));
  }, [user]);

  if (loading)
    return (
      <main className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-8">
        <p
          className="flex min-h-32 items-center justify-center p-8 text-muted"
          role="status"
          aria-live="polite"
        >
          Cargando sesión…
        </p>
      </main>
    );
  if (!user) return <Navigate to="/iniciar-sesion" replace />;

  const handleLogout = async () => {
    setBusy(true);
    try {
      await logout();
      nav('/iniciar-sesion');
    } finally {
      setBusy(false);
    }
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError('');
    setProfileMessage('');
    if (!firstName.trim() || !lastName.trim()) {
      setProfileError('Escribe tu nombre y apellidos.');
      return;
    }
    const phoneError = phoneErrorMessage(phone);
    if (phoneError) {
      setProfileError(phoneError);
      return;
    }

    setSavingProfile(true);
    try {
      const profile = await updateAccountProfile({ profile: user, firstName, lastName, phone });
      updateProfile(profile);
      setProfileMessage('Tus datos de contacto se guardaron correctamente.');
    } catch (cause) {
      setProfileError(
        cause instanceof Error
          ? cause.message
          : 'No se pudieron guardar tus datos. Inténtalo de nuevo.',
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const canEditPatientProfile = isPatientRole(user.role);

  return (
    <AuthLayout title="Mi cuenta" description="Consulta y actualiza los datos de tu cuenta.">
      <section
        className="flex flex-wrap items-center gap-4 rounded-panel border border-line bg-surface p-5"
        aria-label="Datos de la cuenta"
      >
        <div
          className="grid size-14 shrink-0 place-items-center rounded-full bg-brand text-lg font-bold text-white"
          aria-hidden="true"
        >
          {user.firstName?.[0]}
          {user.lastName?.[0]}
        </div>
        <div>
          <h2>
            {user.firstName} {user.lastName}
          </h2>
          <p>{user.email}</p>
          <span className="inline-flex rounded-[4px] border border-line bg-surface-soft px-2 py-1 text-xs font-semibold text-heading">
            Rol: {user.role || 'PACIENTE'}
          </span>
          <p className="text-sm text-muted">
            {user.isEmailVerified === true
              ? 'Correo verificado'
              : user.isEmailVerified === false
                ? 'Correo pendiente de verificación'
                : 'Estado del correo no disponible'}
          </p>
        </div>
      </section>

      {canEditPatientProfile && (
        <form
          className="grid gap-4 rounded-panel border border-line bg-surface p-5"
          onSubmit={handleProfileSubmit}
          noValidate
        >
          <h2>Datos de contacto</h2>
          <p>Tu correo se mantiene como dato de acceso y no se puede editar aquí.</p>
          <label htmlFor="profile-first-name" className="text-sm font-semibold text-ink">
            Nombre
          </label>
          <input
            className={controlClass}
            id="profile-first-name"
            name="firstName"
            autoComplete="given-name"
            required
            maxLength={50}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
          <label htmlFor="profile-last-name" className="text-sm font-semibold text-ink">
            Apellidos
          </label>
          <input
            className={controlClass}
            id="profile-last-name"
            name="lastName"
            autoComplete="family-name"
            required
            maxLength={50}
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
          <label htmlFor="profile-email" className="text-sm font-semibold text-ink">
            Correo electrónico
          </label>
          <input
            className={controlClass}
            id="profile-email"
            name="email"
            type="email"
            value={user.email}
            readOnly
          />
          <label htmlFor="profile-phone" className="text-sm font-semibold text-ink">
            Teléfono
          </label>
          <input
            className={controlClass}
            id="profile-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            pattern="[+]?[0-9]*"
            maxLength={16}
            required
            aria-describedby="profile-phone-hint"
            value={phone}
            onChange={(event) => setPhone(sanitizePhoneInput(event.target.value))}
          />
          <small id="profile-phone-hint">
            Solo números, entre 10 y 15 dígitos. Puedes conservar el prefijo internacional con +.
          </small>
          {profileError && (
            <p role="alert" className="text-sm font-semibold text-danger-text">
              {profileError}
            </p>
          )}
          {profileMessage && (
            <p role="status" aria-live="polite" className="text-sm font-semibold text-success-text">
              {profileMessage}
            </p>
          )}
          <button
            className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-brand px-5 font-semibold text-white transition-colors hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-subtle"
            type="submit"
            disabled={savingProfile}
            aria-busy={savingProfile}
          >
            {savingProfile ? 'Guardando datos…' : 'Guardar datos de contacto'}
          </button>
        </form>
      )}

      <Link
        className="inline-flex min-h-11 w-full items-center justify-center rounded-control border border-control bg-surface px-5 font-semibold text-heading transition-colors hover:border-brand hover:bg-canvas focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent"
        to={isClinicAdmin(user.role) ? '/consultorio/citas' : '/mis-citas'}
      >
        {isClinicAdmin(user.role) ? 'Ver citas del consultorio' : 'Ver mis citas'}
      </Link>

      <button
        onClick={handleLogout}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-control border border-control bg-surface px-5 font-semibold text-heading transition-colors hover:border-brand hover:bg-canvas focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent"
        disabled={busy}
        aria-busy={busy}
      >
        {busy ? 'Cerrando sesión…' : 'Cerrar sesión'}
      </button>
    </AuthLayout>
  );
}

// ==========================================
// WRAPPER (Contenedor Visual)
// ==========================================

export function PasswordRecoveryPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [requested, setRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const requestCode = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    const emailError = emailErrorMessage(email);
    if (emailError) {
      setError(emailError);
      document.getElementById('recovery-email')?.focus();
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setRequested(true);
      setNotice(
        'Si la cuenta existe, recibirás un código de recuperación en el correo registrado.',
      );
    } catch {
      setError(
        'No se pudo procesar la solicitud en este momento. Espera un poco e inténtalo de nuevo.',
      );
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (code.length !== 6) {
      setError('Escribe el código de 6 dígitos que recibiste por correo.');
      document.getElementById('recovery-code')?.focus();
      return;
    }
    const checks = passwordChecks(password, confirmation);
    if (!checks.length) {
      setError('La contraseña debe tener al menos 12 caracteres.');
      document.getElementById('new-password')?.focus();
      return;
    }
    if (!checks.matches) {
      setError('Las contraseñas no coinciden.');
      document.getElementById('confirm-new-password')?.focus();
      return;
    }
    setBusy(true);
    try {
      await confirmPasswordReset(email.trim(), code.trim(), password);
      setNotice('La contraseña se actualizó. Ya puedes iniciar sesión.');
      setCode('');
      setPassword('');
      setConfirmation('');
    } catch (cause) {
      setError(
        friendlyAuthError(
          cause,
          'El código no es válido o venció. Solicita uno nuevo e inténtalo otra vez.',
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Recupera tu contraseña"
      description="Usa el código enviado al correo asociado a tu cuenta para crear una contraseña nueva."
    >
      {!requested ? (
        <form onSubmit={requestCode} className="grid gap-4" noValidate>
          <Field id="recovery-email" label="Correo electrónico">
            <input
              className={controlClass}
              id="recovery-email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={254}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError('');
              }}
            />
          </Field>
          {error && <Notice tone="error">{error}</Notice>}
          {notice && <Notice tone="info">{notice}</Notice>}
          <Button type="submit" loading={busy} className="w-full">
            {busy ? 'Enviando código…' : 'Enviar código'}
          </Button>
        </form>
      ) : (
        <form onSubmit={changePassword} className="grid gap-4" noValidate>
          <p className="text-center text-sm leading-relaxed text-muted" role="status">
            {notice}
          </p>
          <Field
            id="recovery-code"
            label="Código de recuperación"
            hint="Ingresa los 6 dígitos recibidos por correo."
          >
            <input
              className={controlClass}
              id="recovery-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              minLength={6}
              maxLength={6}
              pattern="[0-9]{6}"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </Field>
          <PasswordField
            id="new-password"
            label="Nueva contraseña"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            showRequirements
            minLength={12}
          />
          <PasswordField
            id="confirm-new-password"
            label="Confirma la nueva contraseña"
            value={confirmation}
            onChange={setConfirmation}
            autoComplete="new-password"
            confirmValue={password}
            minLength={12}
          />
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" loading={busy} className="w-full">
            {busy ? 'Actualizando…' : 'Cambiar contraseña'}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => {
              setRequested(false);
              setCode('');
              setError('');
              setNotice('');
            }}
          >
            {busy ? 'Espera…' : 'Solicitar otro código'}
          </Button>
        </form>
      )}
      <p className="mt-4 text-center text-sm leading-relaxed text-muted">
        <Link to="/iniciar-sesion">Volver a iniciar sesión</Link>
      </p>
    </AuthLayout>
  );
}
