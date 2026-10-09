import { useEffect, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { confirm, resend, signIn, signUp } from '../services/cognito';
import { useAuth } from '../auth/AuthContext';

function message(error: unknown) {
  return error instanceof Error ? error.message : 'No fue posible completar la operación.';
}

function AuthForm({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="auth-page">
      <section className="auth-card">
        <h1>{title}</h1>
        {children}
      </section>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label>
      {label}
      <input {...props} />
    </label>
  );
}

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
  const [data, setData] = useState<Registration>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const update = (key: keyof Registration, value: string) => setData({ ...data, [key]: value });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (data.password.length < 12) {
      setError('La contraseña debe tener al menos 12 caracteres.');
      return;
    }
    if (data.password !== data.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    try {
      await signUp(data);
      nav(`/verificar-correo?email=${encodeURIComponent(data.email)}`);
    } catch (cause) {
      setError(message(cause));
    }
  };

  return (
    <AuthForm title="Crea tu cuenta">
      <form onSubmit={submit}>
        <Field
          label="Nombre"
          autoComplete="given-name"
          required
          value={data.firstName}
          onChange={(event) => update('firstName', event.target.value)}
        />
        <Field
          label="Apellidos"
          autoComplete="family-name"
          required
          value={data.lastName}
          onChange={(event) => update('lastName', event.target.value)}
        />
        <Field
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          required
          value={data.email}
          onChange={(event) => update('email', event.target.value)}
        />
        <Field
          label="Teléfono"
          type="tel"
          autoComplete="tel"
          required
          value={data.phone}
          onChange={(event) => update('phone', event.target.value)}
        />
        <Field
          label="Contraseña (12 caracteres mínimo)"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'register-error' : undefined}
          value={data.password}
          onChange={(event) => update('password', event.target.value)}
        />
        <Field
          label="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'register-error' : undefined}
          value={data.confirmPassword}
          onChange={(event) => update('confirmPassword', event.target.value)}
        />
        {error && (
          <p role="alert" id="register-error">
            {error}
          </p>
        )}
        <button>Registrarme</button>
      </form>
      <p>
        ¿Ya tienes cuenta? <Link to="/iniciar-sesion">Inicia sesión</Link>
      </p>
    </AuthForm>
  );
}

export function VerifyPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState('');
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds === 0) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds === 0]);

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await confirm(email, code);
      nav('/iniciar-sesion');
    } catch (cause) {
      setNotice(message(cause));
    }
  };

  const resendCode = async () => {
    try {
      await resend(email);
      setNotice('Se envió un nuevo código de verificación.');
      setSeconds(60);
    } catch (cause) {
      setNotice(message(cause));
    }
  };

  return (
    <AuthForm title="Verifica tu correo">
      <form onSubmit={verify}>
        <Field
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Field
          label="Código de 6 dígitos"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        {notice && <p role="alert">{notice}</p>}
        <button>Verificar cuenta</button>
      </form>
      <button
        type="button"
        className="button--ghost"
        disabled={seconds > 0}
        onClick={() => void resendCode()}
      >
        {seconds ? `Reenviar en ${seconds}s` : 'Reenviar código'}
      </button>
    </AuthForm>
  );
}

export function LoginPage() {
  const { user, acceptLogin } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/mi-cuenta" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const profile = await signIn(email, password);
      acceptLogin(profile);
      nav('/mi-cuenta', { replace: true });
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthForm title="Inicia sesión">
      <form onSubmit={submit}>
        <Field
          label="Correo electrónico"
          type="email"
          autoComplete="username"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'login-error' : undefined}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Field
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'login-error' : undefined}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && (
          <p role="alert" id="login-error">
            {error}
          </p>
        )}
        <button disabled={busy}>{busy ? 'Validando…' : 'Entrar'}</button>
      </form>
      <p>
        <Link to="/registro">Crear cuenta</Link>
      </p>
    </AuthForm>
  );
}

export function AccountPage() {
  const { user, loading, logout } = useAuth();
  const nav = useNavigate();

  if (loading) {
    return (
      <AuthForm title="Mi cuenta">
        <p>Cargando sesión…</p>
      </AuthForm>
    );
  }

  if (!user) return <Navigate to="/iniciar-sesion" replace />;

  return (
    <AuthForm title="Mi cuenta">
      <p>
        {user.firstName} {user.lastName}
      </p>
      <p>{user.email}</p>
      <p>Rol: PACIENTE</p>
      <button onClick={() => void logout().then(() => nav('/iniciar-sesion'))}>Cerrar sesión</button>
    </AuthForm>
  );
}
