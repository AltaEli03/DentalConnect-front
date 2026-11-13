import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { signIn } from '../services/cognito';
import { api } from '../services/api';

function friendlyAuthError(cause: unknown, fallback: string) {
  if (
    cause instanceof TypeError ||
    (cause instanceof Error && /failed to fetch|network|load failed/i.test(cause.message))
  ) {
    return 'No pudimos conectar con el servicio. Revisa tu conexión e inténtalo de nuevo.';
  }
  return cause instanceof Error ? cause.message : fallback;
}

// ==========================================
// 1. PÁGINA DE LOGIN
// ==========================================
export function LoginPage() {
  const { user, acceptLogin } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/mi-cuenta" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const profile = await signIn(email.trim(), password);
      acceptLogin(profile);
      nav('/mi-cuenta', { replace: true });
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
        <div className="input-group">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="Escribe tu contraseña"
          />
        </div>
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
            placeholder="Incluye lada si aplica"
          />
        </div>
        <div className="form-row">
          <div className="input-group">
            <label htmlFor="password">Contraseña (12 caracteres mínimo)</label>
            <input
              id="password"
              name="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              value={data.password}
              onChange={(e) => setData({ ...data, password: e.target.value })}
              placeholder="Mínimo 12 caracteres"
            />
          </div>
          <div className="input-group">
            <label htmlFor="confirmPassword">Confirmar contraseña</label>
            <input
              id="confirmPassword"
              name="new-password-confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              value={data.confirmPassword}
              onChange={(e) => setData({ ...data, confirmPassword: e.target.value })}
              placeholder="Escribe la misma contraseña"
            />
          </div>
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

  useEffect(
    () => () => {
      if (resendTimer.current !== undefined) window.clearInterval(resendTimer.current);
    },
    [],
  );

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
      setNotice(friendlyAuthError(cause, 'No fue posible reenviar el código. Inténtalo de nuevo.'));
      setNoticeIsError(true);
    } finally {
      setResending(false);
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
        <div className="input-group">
          <label htmlFor="vpass">Contraseña elegida al registrarte (12 caracteres mínimo)</label>
          <input
            id="vpass"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="La que usaste al registrarte"
          />
        </div>
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
function AuthLayout({
  title,
  visualTitle,
  visualText,
  children,
  hideVisual = false,
}: {
  title: string;
  visualTitle?: string;
  visualText?: string;
  children: ReactNode;
  hideVisual?: boolean;
}) {
  return (
    <main className={`auth-layout ${hideVisual ? 'no-visual' : ''}`}>
      {!hideVisual && (
        <div className="auth-visual">
          <h2>{visualTitle || 'DentalConnect'}</h2>
          <p>
            {visualText || 'Consulta consultorios y organiza tus solicitudes de atención dental.'}
          </p>
        </div>
      )}
      <div className="auth-content">
        <div className="auth-form-box">
          <h1>{title}</h1>
          {children}
        </div>
      </div>
    </main>
  );
}
