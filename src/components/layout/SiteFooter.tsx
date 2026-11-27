import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export function SiteFooter() {
  const { user } = useAuth();
  const account = user
    ? { to: '/mi-cuenta', label: 'Mi cuenta' }
    : { to: '/iniciar-sesion', label: 'Iniciar sesión' };

  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-4 px-5 py-6 lg:px-8">
        <Link
          to="/clinics"
          className="font-display text-lg font-extrabold tracking-[-0.04em] text-heading"
        >
          Dental<span className="text-accent">Connect</span>
        </Link>
        <p className="text-[11.5px] text-subtle">Directorio de atención odontológica en México</p>
        <nav className="flex flex-wrap gap-5 text-xs text-subtle" aria-label="Enlaces del pie">
          <Link to="/clinics" className="hover:text-heading hover:underline">
            Consultorios
          </Link>
          <Link to="/registrar-consultorio" className="hover:text-heading hover:underline">
            Registrar consultorio
          </Link>
          <Link to={account.to} className="hover:text-heading hover:underline">
            {account.label}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
