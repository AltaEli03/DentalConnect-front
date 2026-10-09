import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function SiteHeader() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header className="site-header">
      <div className="container site-header__bar">
        <Link to="/clinics" className="brand">
          Dental<span>Connect</span>
        </Link>
        <p className="tagline">Directorio de atención odontológica</p>
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="nav-toggle__icon" aria-hidden="true" />
          Menú
        </button>
        <nav id="primary-nav" className="site-nav" data-open={open} aria-label="Cuenta">
          {user ? (
            <Link to="/mi-cuenta">Mi cuenta</Link>
          ) : (
            <>
              <Link to="/registro">Crear cuenta</Link>
              <Link to="/iniciar-sesion">Iniciar sesión</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
