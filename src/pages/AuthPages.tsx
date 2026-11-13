import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { signIn } from '../services/cognito';
import { api } from '../services/api';
import { useAuth } from '../auth/AuthContext';

const message = (error: unknown) => error instanceof Error ? error.message : 'No fue posible completar la operación.';

type Registration = { firstName: string; lastName: string; email: string; phone: string; password: string; confirmPassword: string };

// ==========================================
// 1. PÁGINA DE REGISTRO
// ==========================================
export function RegisterPage() {
  const nav = useNavigate();
  const [error, setError] = useState('');
  const [data, setData] = useState<Registration>({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (data.password.length < 12) { setError('La contraseña debe tener al menos 12 caracteres.'); return; }
    if (data.password !== data.confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
    
    try {
      await api.register({ firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone, password: data.password });
      nav(`/verificar-correo?email=${encodeURIComponent(data.email)}`);
    } catch (cause) {
      setError(message(cause));
    }
  };

  return (
    <AuthForm title="Crea tu cuenta" subtitle="Únete a la red dental más exclusiva y agenda en segundos.">
      <form onSubmit={submit} className="premium-form">
        <div className="form-row">
          <label>Nombre(s)
            <input required type="text" autoComplete="given-name" value={data.firstName} onChange={e => setData({ ...data, firstName: e.target.value })} placeholder="Ej. Ana" />
          </label>
          <label>Apellidos
            <input required type="text" autoComplete="family-name" value={data.lastName} onChange={e => setData({ ...data, lastName: e.target.value })} placeholder="Ej. García" />
          </label>
        </div>
        
        <label>Correo electrónico
          <input required type="email" autoComplete="email" value={data.email} onChange={e => setData({ ...data, email: e.target.value })} placeholder="tu@correo.com" />
        </label>
        
        <label>Teléfono
          <input required type="tel" autoComplete="tel" value={data.phone} onChange={e => setData({ ...data, phone: e.target.value })} placeholder="10 dígitos" />
        </label>

        <div className="form-row">
          <label>Contraseña
            <input required type="password" minLength={12} autoComplete="new-password" value={data.password} onChange={e => setData({ ...data, password: e.target.value })} placeholder="Mín. 12 caracteres" />
          </label>
          <label>Confirmar contraseña
            <input required type="password" minLength={12} autoComplete="new-password" value={data.confirmPassword} onChange={e => setData({ ...data, confirmPassword: e.target.value })} placeholder="Repite tu contraseña" />
          </label>
        </div>

        {error && <div className="auth-alert" role="alert">{error}</div>}
        
        <button type="submit" className="primary-btn full-width">Crear cuenta</button>
      </form>
      
      <p className="auth-footer-text">¿Ya tienes cuenta? <Link to="/iniciar-sesion">Inicia sesión</Link></p>
    </AuthForm>
  );
}

// ==========================================
// 2. PÁGINA DE VERIFICACIÓN
// ==========================================
export function VerifyPage() {
  const params = new URLSearchParams(location.search);
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [seconds, setSeconds] = useState(0);
  const nav = useNavigate();

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api.verify({ email, code, password });
      nav('/iniciar-sesion');
    } catch (cause) {
      setNotice(message(cause));
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
      setNotice(message(cause));
    }
  };

  return (
    <AuthForm title="Verifica tu correo" subtitle="Enviamos un código de seguridad a tu bandeja de entrada.">
      <form onSubmit={verify} className="premium-form">
        <label>Correo electrónico
          <input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        
        <label>Código de 6 dígitos
          <input required className="otp-input" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value)} placeholder="000000" />
        </label>
        
        <label>Contraseña temporal
          <input required type="password" minLength={12} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="La elegida al registrarte" />
        </label>

        {notice && <div className="auth-alert" role="alert">{notice}</div>}
        
        <button type="submit" className="primary-btn full-width">Verificar cuenta</button>
      </form>

      <div className="auth-resend">
        <p>¿No recibiste el código?</p>
        <button type="button" className="text-btn" disabled={seconds > 0} onClick={() => void resendCode()}>
          {seconds ? `Reenviar en ${seconds}s` : 'Reenviar código ahora'}
        </button>
      </div>
    </AuthForm>
  );
}

// ==========================================
// 3. PÁGINA DE LOGIN
// ==========================================
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
    <AuthForm title="Bienvenido de nuevo" subtitle="Ingresa a tu cuenta para gestionar tus citas dentales.">
      <form onSubmit={submit} className="premium-form">
        <label>Correo electrónico
          <input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" />
        </label>
        
        <label>Contraseña
          <input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" />
        </label>

        {error && <div className="auth-alert" role="alert">{error}</div>}
        
        <button type="submit" disabled={busy} className="primary-btn full-width">
          {busy ? 'Validando…' : 'Iniciar sesión'}
        </button>
      </form>

      <div className="auth-footer-links">
        <Link to="/recuperar-password">¿Olvidaste tu contraseña?</Link>
        <p>¿No tienes cuenta? <Link to="/registro">Regístrate aquí</Link></p>
      </div>
    </AuthForm>
  );
}

// ==========================================
// 4. PÁGINA DE MI CUENTA (Perfil)
// ==========================================
export function AccountPage() {
  const { user, loading, logout } = useAuth();
  const nav = useNavigate();

  if (loading) return <div className="loading-state full-screen"><p>Cargando sesión segura…</p></div>;
  if (!user) return <Navigate to="/iniciar-sesion" replace />;

  return (
    <AuthForm title="Mi Perfil" subtitle="Administra tu información personal y de contacto." hideVisual={true}>
      <div className="profile-card">
        <div className="profile-avatar">
          {user.firstName?.[0]}{user.lastName?.[0]}
        </div>
        <div className="profile-info">
          <h2>{user.firstName} {user.lastName}</h2>
          <p className="profile-email">{user.email}</p>
          <span className="profile-badge">Paciente Verificado</span>
        </div>
      </div>

      <div className="profile-actions">
        <button onClick={() => void logout().then(() => nav('/iniciar-sesion'))} className="secondary-btn full-width">
          Cerrar sesión de forma segura
        </button>
      </div>
    </AuthForm>
  );
}

// ==========================================
// 5. WRAPPER (Contenedor Visual Premium)
// ==========================================
function AuthForm({ title, subtitle, children, hideVisual = false }: { title: string; subtitle?: string; children: ReactNode; hideVisual?: boolean }) {
  return (
    <main className={`auth-layout ${hideVisual ? 'no-visual' : ''}`}>
      {/* Lado Visual (Izquierdo) */}
      {!hideVisual && (
        <div className="auth-visual">
          <div className="visual-content">
            <span className="visual-badge">DentalConnect VIP</span>
            <h2>Sonríe con la tranquilidad de estar en las mejores manos.</h2>
            <p>Accede a los mejores consultorios, agenda citas en segundos y lleva un control total de tu salud bucal.</p>
            
            <div className="visual-features">
              <div className="v-feature"><span>✓</span> Clínicas verificadas</div>
              <div className="v-feature"><span>✓</span> Agendamiento 24/7</div>
              <div className="v-feature"><span>✓</span> Historial clínico seguro</div>
            </div>
          </div>
        </div>
      )}

      {/* Lado del Formulario (Derecho) */}
      <div className="auth-content">
        <div className="auth-card">
          <div className="auth-header">
            <h1>{title}</h1>
            {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}