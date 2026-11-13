import { useState, useEffect, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { signIn } from '../services/cognito';
import { api } from '../services/api';

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
      const profile = await signIn(email, password);
      acceptLogin(profile);
      nav('/mi-cuenta', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciales incorrectas.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout 
      title="Inicia sesión" 
      visualTitle="Bienvenido de nuevo a DentalConnect." 
      visualText="Accede a tu cuenta para gestionar tus citas, ver tu historial y contactar con los mejores especialistas."
    >
      <form onSubmit={submit} className="premium-form">
        <div className="input-group">
          <label htmlFor="email">Correo electrónico</label>
          <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="tu@correo.com" />
        </div>
        <div className="input-group">
          <label htmlFor="password">Contraseña</label>
          <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••••••" />
        </div>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
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
type Registration = { firstName: string; lastName: string; email: string; phone: string; password: string; confirmPassword: string };

export function RegisterPage() {
  const nav = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Registration>({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (data.password.length < 12) { setError('La contraseña debe tener al menos 12 caracteres.'); return; }
    if (data.password !== data.confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
    setBusy(true);
    try {
      await api.register({ firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone, password: data.password });
      nav(`/verificar-correo?email=${encodeURIComponent(data.email)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error al crear la cuenta.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout 
      title="Crea tu cuenta" 
      visualTitle="Sonríe con la tranquilidad de estar en las mejores manos." 
      visualText="Únete a la red dental más exclusiva, agenda citas en segundos y lleva un control total de tu salud bucal."
    >
      <form onSubmit={submit} className="premium-form">
        <div className="form-row">
          <div className="input-group">
            <label htmlFor="firstName">Nombre(s)</label>
            <input id="firstName" required value={data.firstName} onChange={e => setData({ ...data, firstName: e.target.value })} placeholder="Ej. Ana" />
          </div>
          <div className="input-group">
            <label htmlFor="lastName">Apellidos</label>
            <input id="lastName" required value={data.lastName} onChange={e => setData({ ...data, lastName: e.target.value })} placeholder="Ej. García" />
          </div>
        </div>
        <div className="input-group">
          <label htmlFor="email">Correo electrónico</label>
          <input id="email" type="email" required value={data.email} onChange={e => setData({ ...data, email: e.target.value })} placeholder="tu@correo.com" />
        </div>
        <div className="input-group">
          <label htmlFor="phone">Teléfono</label>
          <input id="phone" type="tel" required value={data.phone} onChange={e => setData({ ...data, phone: e.target.value })} placeholder="10 dígitos" />
        </div>
        <div className="form-row">
          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" required minLength={12} value={data.password} onChange={e => setData({ ...data, password: e.target.value })} placeholder="Mín. 12 caracteres" />
          </div>
          <div className="input-group">
            <label htmlFor="confirmPassword">Confirmar</label>
            <input id="confirmPassword" type="password" required minLength={12} value={data.confirmPassword} onChange={e => setData({ ...data, confirmPassword: e.target.value })} placeholder="Repite contraseña" />
          </div>
        </div>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
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
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      await api.verify({ email, code, password });
      nav('/iniciar-sesion');
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Código incorrecto.');
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    try {
      await api.resend(email);
      setNotice('Se envió un nuevo código de verificación.');
      setSeconds(60);
      const interval = window.setInterval(() => setSeconds(value => {
        if (value <= 1) { window.clearInterval(interval); return 0; }
        return value - 1;
      }), 1000);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Error al reenviar código.');
    }
  };

  return (
    <AuthLayout 
      title="Verifica tu correo" 
      visualTitle="Estás a un paso de agendar." 
      visualText="Hemos enviado un código de seguridad a tu bandeja de entrada para confirmar tu identidad."
    >
      <form onSubmit={verify} className="premium-form">
        <div className="input-group">
          <label htmlFor="vemail">Correo electrónico</label>
          <input id="vemail" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="input-group">
          <label htmlFor="code">Código de 6 dígitos</label>
          <input id="code" required className="otp-input" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value)} placeholder="000000" style={{ letterSpacing: '0.5em', textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold' }} />
        </div>
        <div className="input-group">
          <label htmlFor="vpass">Contraseña temporal</label>
          <input id="vpass" type="password" required minLength={12} value={password} onChange={e => setPassword(e.target.value)} placeholder="La elegida al registrarte" />
        </div>
        {notice && <div className="alert alert-error" role="alert">{notice}</div>}
        <button className="btn btn-primary btn-full" disabled={busy} type="submit">
          {busy ? 'Verificando…' : 'Verificar cuenta'}
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <button type="button" className="btn btn-outline" disabled={seconds > 0} onClick={resendCode} style={{ width: '100%' }}>
          {seconds ? `Reenviar en ${seconds}s` : 'Reenviar código'}
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

  if (loading) return <div className="loading-state" style={{ minHeight: '100vh' }}>Cargando sesión…</div>;
  if (!user) return <Navigate to="/iniciar-sesion" replace />;

  const handleLogout = async () => {
    await logout();
    nav('/iniciar-sesion');
  };

  return (
    <AuthLayout 
      title="Mi Perfil" 
      hideVisual={true}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'var(--color-bg)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold' }}>
          {user.firstName?.[0]}{user.lastName?.[0]}
        </div>
        <div>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>{user.firstName} {user.lastName}</h2>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>{user.email}</p>
          <span style={{ display: 'inline-block', marginTop: '0.5rem', background: '#E0F2FE', color: '#0369A1', padding: '0.2rem 0.8rem', borderRadius: 'var(--radius-pill)', fontSize: '0.75rem', fontWeight: 'bold' }}>Paciente Verificado</span>
        </div>
      </div>
      
      <button onClick={handleLogout} className="btn btn-outline btn-full">
        Cerrar sesión de forma segura
      </button>
    </AuthLayout>
  );
}

// ==========================================
// WRAPPER (Contenedor Visual)
// ==========================================
function AuthLayout({ title, visualTitle, visualText, children, hideVisual = false }: { title: string, visualTitle?: string, visualText?: string, children: ReactNode, hideVisual?: boolean }) {
  return (
    <main className={`auth-layout ${hideVisual ? 'no-visual' : ''}`}>
      {!hideVisual && (
        <div className="auth-visual">
          <h2>{visualTitle || 'DentalConnect'}</h2>
          <p>{visualText || 'La mejor plataforma para tu salud dental.'}</p>
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