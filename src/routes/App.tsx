import { lazy, Suspense } from 'react';
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { ClinicListPage } from '../pages/ClinicListPage';
import { AuthProvider } from '../auth/AuthContext';
import { ThemeProvider } from '../theme/ThemeProvider';
import { ThemeToggle } from '../theme/ThemeToggle';
import { NetworkStatus } from '../components/NetworkStatus';
import { isClinicAdmin, hasRole } from '../lib/roles';
import { useAuth } from '../auth/AuthContext';

const ClinicDetailPage = lazy(() =>
  import('../pages/ClinicDetailPage').then((m) => ({ default: m.ClinicDetailPage })),
);
const DentistManagementPage = lazy(() =>
  import('../pages/DentistManagementPage').then((m) => ({ default: m.DentistManagementPage })),
);
const DentistProfilePage = lazy(() =>
  import('../pages/DentistProfilePage').then((m) => ({ default: m.DentistProfilePage })),
);
const AppointmentRequestPage = lazy(() =>
  import('../pages/AppointmentRequestPage').then((m) => ({ default: m.AppointmentRequestPage })),
);
const AppointmentManagementPage = lazy(() =>
  import('../pages/AppointmentManagementPage').then((m) => ({
    default: m.AppointmentManagementPage,
  })),
);
const AppointmentProposalPage = lazy(() =>
  import('../pages/AppointmentProposalPage').then((m) => ({ default: m.AppointmentProposalPage })),
);
const PatientAppointmentsPage = lazy(() =>
  import('../pages/PatientAppointmentsPage').then((m) => ({ default: m.PatientAppointmentsPage })),
);
const ClinicAppointmentsPage = lazy(() =>
  import('../pages/ClinicAppointmentsPage').then((m) => ({ default: m.ClinicAppointmentsPage })),
);
const AccountPage = lazy(() =>
  import('../pages/AuthPages').then((m) => ({ default: m.AccountPage })),
);
const LoginPage = lazy(() => import('../pages/AuthPages').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() =>
  import('../pages/AuthPages').then((m) => ({ default: m.RegisterPage })),
);
const VerifyPage = lazy(() =>
  import('../pages/AuthPages').then((m) => ({ default: m.VerifyPage })),
);
const PasswordRecoveryPage = lazy(() =>
  import('../pages/AuthPages').then((m) => ({ default: m.PasswordRecoveryPage })),
);
const NotificationsPage = lazy(() =>
  import('../pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
const ClinicApplicationPage = lazy(() =>
  import('../pages/ClinicApplicationPage').then((m) => ({ default: m.ClinicApplicationPage })),
);
const ClinicSettingsPage = lazy(() =>
  import('../pages/ClinicSettingsPage').then((m) => ({ default: m.ClinicSettingsPage })),
);

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { user } = useAuth();
  const hasClinicRole = Boolean(user) && isClinicAdmin(user?.role);
  const isPlatformAdmin = hasRole(user?.role, 'PLATFORM_ADMIN');

  return (
    <>
      <a className="skip-link" href="#main-content">
        Saltar al contenido principal
      </a>
      <header className="site-header">
        <div className="site-header-inner">
          <Link to="/clinics" className="brand" aria-label="DentalConnect, inicio">
            Dental<span>Connect</span>
          </Link>
          <p className="site-tagline">Directorio de atención odontológica</p>
          <nav className="header-nav" aria-label="Navegación principal">
            <NavLink to="/clinics" end>
              Consultorios
            </NavLink>
            <NavLink to="/registrar-consultorio">Registrar consultorio</NavLink>
            {isPlatformAdmin && <NavLink to="/plataforma/consultorios">Revisar altas</NavLink>}
            {hasClinicRole && (
              <>
                <NavLink to="/consultorio/citas">Citas</NavLink>
                <NavLink to="/consultorio/configuracion">Perfil y servicios</NavLink>
                <NavLink to="/administrar-solicitudes" aria-label="Solicitudes del consultorio">
                  Solicitudes
                </NavLink>
              </>
            )}
            {user && <NavLink to="/mis-citas">Mis citas</NavLink>}
            {user && <NavLink to="/notificaciones">Avisos</NavLink>}
            {user ? (
              <NavLink to="/mi-cuenta" className="header-nav-primary">
                Mi cuenta
              </NavLink>
            ) : (
              <>
                <NavLink to="/registro">Crear cuenta</NavLink>
                <NavLink to="/iniciar-sesion" className="header-nav-primary">
                  Iniciar sesión
                </NavLink>
              </>
            )}
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <NetworkStatus />
      <div id="main-content" className="main-content" tabIndex={-1}>
        <Suspense
          fallback={
            <main className="mx-auto min-h-[45vh] max-w-6xl px-4 py-10" role="status">
              <span className="sr-only">Cargando…</span>
              <div className="skeleton h-48 rounded-card" aria-hidden="true" />
            </main>
          }
        >
          <Routes>
            <Route path="/" element={<Navigate to="/clinics" replace />} />
            <Route path="/clinics" element={<ClinicListPage />} />
            <Route path="/clinics/:id" element={<ClinicDetailPage />} />
            <Route
              path="/clinics/:clinicId/dentistas/:dentistId"
              element={<DentistProfilePage />}
            />
            <Route path="/clinics/:clinicId/solicitar" element={<AppointmentRequestPage />} />
            <Route path="/registro" element={<RegisterPage />} />
            <Route path="/verificar-correo" element={<VerifyPage />} />
            <Route path="/iniciar-sesion" element={<LoginPage />} />
            <Route path="/recuperar-contrasena" element={<PasswordRecoveryPage />} />
            <Route
              path="/consultorio/iniciar-sesion"
              element={
                <Navigate to="/iniciar-sesion" replace state={{ from: '/consultorio/citas' }} />
              }
            />
            <Route path="/mi-cuenta" element={<AccountPage />} />
            <Route path="/registrar-consultorio" element={<ClinicApplicationPage />} />
            <Route path="/plataforma/consultorios" element={<ClinicApplicationPage />} />
            <Route path="/consultorio/configuracion" element={<ClinicSettingsPage />} />
            <Route path="/administrar-dentistas" element={<DentistManagementPage />} />
            <Route path="/consultorio/citas" element={<ClinicAppointmentsPage />} />
            <Route path="/administrar-solicitudes" element={<AppointmentManagementPage />} />
            <Route path="/mis-citas" element={<PatientAppointmentsPage />} />
            <Route path="/notificaciones" element={<NotificationsPage />} />
            <Route path="/mi-solicitud/:appointmentId" element={<AppointmentProposalPage />} />
            <Route path="/mi-solicitud" element={<AppointmentProposalPage />} />
            <Route path="*" element={<Navigate to="/clinics" replace />} />
          </Routes>
        </Suspense>
      </div>
      <footer className="site-footer">
        <span>DentalConnect</span>
        <span>Información de consultorios para ayudarte a elegir con claridad.</span>
        <Link to="/iniciar-sesion">Iniciar sesión</Link>
      </footer>
    </>
  );
}
