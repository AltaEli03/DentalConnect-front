import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AuthLayout } from '../components/auth/AuthLayout';
import { PasswordField } from '../components/auth/PasswordField';
import { friendlyAuthError } from '../lib/authErrors';
import { isClinicAdmin } from '../lib/roles';
import { signIn, signOut } from '../services/cognito';

export function ClinicLoginPage() {
  const { acceptLogin } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const profile = await signIn(email.trim(), password);
      if (!isClinicAdmin(profile.role)) {
        signOut();
        setError('Esta cuenta es de paciente. Usa el acceso de pacientes.');
        return;
      }
      if (!profile.clinicId) {
        signOut();
        setError('Tu cuenta no está vinculada a un consultorio. Contacta al administrador.');
        return;
      }
      acceptLogin(profile);
      nav('/consultorio/citas', { replace: true });
    } catch (cause) {
      setError(
        friendlyAuthError(
          cause,
          'No fue posible iniciar sesión. Revisa tus datos e inténtalo de nuevo.',
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Acceso para consultorios"
      visualTitle="Gestiona las citas de tu consultorio."
      visualText="Consulta las citas confirmadas, revisa solicitudes y mantén la agenda de tu equipo en un solo lugar."
    >
      <form onSubmit={submit} className="premium-form">
        <div className="input-group">
          <label htmlFor="clinic-email">Correo del consultorio</label>
          <input
            id="clinic-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="username"
            placeholder="admin@consultorio.com"
          />
        </div>
        <PasswordField
          id="clinic-password"
          label="Contraseña"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          hint="Usa la contraseña de tu cuenta de consultorio."
        />
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}
        <button className="btn btn-primary btn-full" disabled={busy} type="submit">
          {busy ? 'Validando…' : 'Entrar al consultorio'}
        </button>
      </form>
      <p className="auth-footer-text">
        ¿Eres paciente? <Link to="/iniciar-sesion">Inicia sesión aquí</Link>
      </p>
    </AuthLayout>
  );
}
