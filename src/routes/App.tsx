import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { ClinicDetailPage } from '../pages/ClinicDetailPage';
import { ClinicListPage } from '../pages/ClinicListPage';
import { DentistManagementPage } from '../pages/DentistManagementPage';
import { DentistProfilePage } from '../pages/DentistProfilePage';
import { AppointmentRequestPage } from '../pages/AppointmentRequestPage';
import { AppointmentManagementPage } from '../pages/AppointmentManagementPage';
import { AppointmentProposalPage } from '../pages/AppointmentProposalPage';
import { PatientAppointmentsPage } from '../pages/PatientAppointmentsPage';
import { ClinicAppointmentsPage } from '../pages/ClinicAppointmentsPage';
import { AuthProvider } from '../auth/AuthContext';
import { ThemeProvider } from '../theme/ThemeProvider';
import { ThemeToggle } from '../theme/ThemeToggle';
import { NetworkStatus } from '../components/NetworkStatus';
import { useAuth } from '../auth/AuthContext';
import { AccountPage, LoginPage, RegisterPage, VerifyPage } from '../pages/AuthPages';
import { ClinicLoginPage } from '../pages/ClinicLoginPage';

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
  const role = user?.role?.toLocaleUpperCase('es-MX');
  const isPatient = role === 'PACIENTE' || role === 'PATIENT';
  const hasClinicRole = Boolean(user) && !isPatient;

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
            {hasClinicRole && (
              <>
                <NavLink to="/consultorio/citas">Citas</NavLink>
                <NavLink to="/administrar-solicitudes" aria-label="Solicitudes del consultorio">
                  Solicitudes
                </NavLink>
              </>
            )}
            {user && isPatient && <NavLink to="/mis-citas">Mis citas</NavLink>}
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
        <Routes>
          <Route path="/" element={<Navigate to="/clinics" replace />} />
          <Route path="/clinics" element={<ClinicListPage />} />
          <Route path="/clinics/:id" element={<ClinicDetailPage />} />
          <Route path="/clinics/:clinicId/dentistas/:dentistId" element={<DentistProfilePage />} />
          <Route path="/clinics/:clinicId/solicitar" element={<AppointmentRequestPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/verificar-correo" element={<VerifyPage />} />
          <Route path="/iniciar-sesion" element={<LoginPage />} />
          <Route path="/consultorio/iniciar-sesion" element={<ClinicLoginPage />} />
          <Route path="/mi-cuenta" element={<AccountPage />} />
          <Route path="/administrar-dentistas" element={<DentistManagementPage />} />
          <Route path="/consultorio/citas" element={<ClinicAppointmentsPage />} />
          <Route path="/administrar-solicitudes" element={<AppointmentManagementPage />} />
          <Route path="/mis-citas" element={<PatientAppointmentsPage />} />
          <Route path="/mi-solicitud/:appointmentId" element={<AppointmentProposalPage />} />
          <Route path="*" element={<Navigate to="/clinics" replace />} />
        </Routes>
      </div>
      <footer className="site-footer">
        <span>DentalConnect</span>
        <span>Información de consultorios para ayudarte a elegir con claridad.</span>
        <Link to="/consultorio/iniciar-sesion">Acceso consultorio</Link>
      </footer>
    </>
  );
}
