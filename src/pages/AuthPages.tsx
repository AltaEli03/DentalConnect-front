import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { signIn } from '../services/cognito';
import { api } from '../services/api';
import { AuthLayout } from '../components/auth/AuthLayout';
import { PasswordField } from '../components/auth/PasswordField';
import { friendlyAuthError } from '../lib/authErrors';

// ==========================================
// 1. PÁGINA DE LOGIN
// ==========================================
export function LoginPage() {
  const { user, acceptLogin } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const requestedRedirect = (location.state as { from?: string } | null)?.from;
  const redirect =
    requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//')
      ? requestedRedirect
      : '/mi-cuenta';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={redirect} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const profile = await signIn(email.trim(), password);
      acceptLogin(profile);
      nav(redirect, { replace: true });
    } catch (err) {
      setError(
        friendlyAuthError(
          err,
          'No fue posible iniciar sesión. Revisa tus datos e inténtalo de nuevo.',
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Inicia sesión"
      visualTitle="Tu atención dental, más fácil de organizar."
      visualText="Inicia sesión para consultar tus solicitudes y mantener tus datos de cuenta en un solo lugar."
    >
      <form onSubmit={submit} className="premium-form">
        <div className="input-group">
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="tu@correo.com"
          />
        </div>
        <PasswordField
          id="password"
          label="Contraseña"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          hint="Mínimo 12 caracteres."
        />
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}
        <button className="btn btn-primary btn-full" disabled={busy} type="submit">
          {busy ? 'Validando…' : 'Entrar'}
        </button>
      </form>
      <p className="auth-footer-text">
        ¿No tienes cuenta? <Link to="/registro">Regístrate aquí</Link>
      </p>
      <p className="auth-footer-text">
        ¿Eres consultorio? <Link to="/consultorio/iniciar-sesion">Accede aquí</Link>
      </p>
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
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Registration>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!data.firstName.trim() || !data.lastName.trim()) {
      setError('Escribe tu nombre y apellidos para continuar.');
      return;
    }
    if (!data.email.trim() || !data.phone.trim()) {
      setError('Completa tu correo y teléfono para crear la cuenta.');
      return;
    }
    if (data.password.length < 12) {
      setError('La contraseña debe tener al menos 12 caracteres.');
      return;
    }
    if (data.password !== data.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    try {
      const cleanEmail = data.email.trim();
      await api.register({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: cleanEmail,
        phone: data.phone.trim(),
        password: data.password,
      });
      nav(`/verificar-correo?email=${encodeURIComponent(cleanEmail)}`);
    } catch (cause) {
      setError(
        friendlyAuthError(
          cause,
          'No fue posible crear la cuenta. Revisa tus datos e inténtalo de nuevo.',
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Crea tu cuenta"
      wide
      visualTitle="Crea tu cuenta en DentalConnect."
      visualText="Registra tus datos para verificar tu correo y solicitar atención en los consultorios disponibles."
    >
      <form onSubmit={submit} className="premium-form">
        <div className="form-row">
          <div className="input-group">
            <label htmlFor="firstName">Nombre</label>
            <input
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              maxLength={80}
              required
              value={data.firstName}
              onChange={(e) => setData({ ...data, firstName: e.target.value })}
              placeholder="Ej. Ana"
            />
          </div>
          <div className="input-group">
            <label htmlFor="lastName">Apellidos</label>
            <input
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              maxLength={100}
              required
              value={data.lastName}
              onChange={(e) => setData({ ...data, lastName: e.target.value })}
              placeholder="Ej. García"
            />
          </div>
        </div>
        <div className="input-group">
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            value={data.email}
            onChange={(e) => setData({ ...data, email: e.target.value })}
            placeholder="tu@correo.com"
          />
        </div>
        <div className="input-group">
          <label htmlFor="phone">Teléfono</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            maxLength={20}
            required
            value={data.phone}
            onChange={(e) => setData({ ...data, phone: e.target.value })}
            placeholder="+52 55 1234 5678"
            aria-describedby="phone-hint"
          />
          <p id="phone-hint" className="field-hint">
            Incluye lada. Ej. +52 55 1234 5678.
          </p>
        </div>
        <div className="form-row form-row-passwords">
          <PasswordField
            id="password"
            label="Contraseña"
            value={data.password}
            onChange={(value) => setData({ ...data, password: value })}
            autoComplete="new-password"
            showRequirements
            minLength={12}
          />
          <PasswordField
            id="confirmPassword"
            label="Confirmar contraseña"
            value={data.confirmPassword}
            onChange={(value) => setData({ ...data, confirmPassword: value })}
            autoComplete="new-password"
            confirmValue={data.password}
            showRequirements
            minLength={12}
          />
        </div>
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}
        <button className="btn btn-primary btn-full" disabled={busy} type="submit">
          {busy ? 'Creando cuenta…' : 'Registrarme'}
        </button>
      </form>
      <p className="auth-footer-text">
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
      visualTitle="Verifica que el correo sea tuyo."
      visualText="Escribe el código enviado a tu correo. La cuenta se activa cuando el código es válido."
    >
      <form onSubmit={verify} className="premium-form">
        <div className="input-group">
          <label htmlFor="vemail">Correo electrónico</label>
          <input
            id="vemail"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label htmlFor="code">Código de 6 dígitos</label>
          <input
            id="code"
            name="code"
            required
            className="otp-input"
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
            className={`alert ${noticeIsError ? 'alert-error' : 'alert-success'}`}
            role={noticeIsError ? 'alert' : 'status'}
            aria-live={noticeIsError ? 'assertive' : 'polite'}
          >
            {notice}
          </div>
        )}
        <button className="btn btn-primary btn-full" disabled={busy} type="submit" aria-busy={busy}>
          {busy ? 'Verificando…' : 'Verificar cuenta'}
        </button>
      </form>
      <div className="resend-code-action">
        <button
          type="button"
          className="btn btn-outline"
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
  const { user, loading, logout } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  if (loading)
    return (
      <main className="page-container">
        <p className="loading-state" role="status" aria-live="polite">
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

  return (
    <AuthLayout title="Mi cuenta" hideVisual={true}>
      <section className="account-card" aria-label="Datos de la cuenta">
        <div className="account-avatar" aria-hidden="true">
          {user.firstName?.[0]}
          {user.lastName?.[0]}
        </div>
        <div>
          <h2>
            {user.firstName} {user.lastName}
          </h2>
          <p>{user.email}</p>
          <span className="account-role">Rol: {user.role || 'PACIENTE'}</span>
          <p className="account-verification">
            {user.isEmailVerified === true
              ? 'Correo verificado'
              : user.isEmailVerified === false
                ? 'Correo pendiente de verificación'
                : 'Estado del correo no disponible'}
          </p>
        </div>
      </section>

      <Link
        className="btn btn-outline btn-full"
        to={user.role?.toUpperCase().includes('CLINIC_ADMIN') ? '/consultorio/citas' : '/mis-citas'}
      >
        {user.role?.toUpperCase().includes('CLINIC_ADMIN')
          ? 'Ver citas del consultorio'
          : 'Ver mis citas'}
      </Link>

      <button
        onClick={handleLogout}
        className="btn btn-outline btn-full"
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
