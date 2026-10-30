import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { ClinicDetailPage } from '../pages/ClinicDetailPage';
import { ClinicListPage } from '../pages/ClinicListPage';
import { DentistManagementPage } from '../pages/DentistManagementPage';
import { DentistProfilePage } from '../pages/DentistProfilePage';
import { AppointmentRequestPage } from '../pages/AppointmentRequestPage';
import { AuthProvider } from '../auth/AuthContext';
import { AccountPage, LoginPage, RegisterPage, VerifyPage } from '../pages/AuthPages';

export function App() {
  return (
    <AuthProvider>
      <header>
        <Link to="/clinics" className="brand">Dental<span>Connect</span></Link>
        <p>Directorio de atención odontológica</p>
        <nav aria-label="Cuenta">
          <Link to="/registro">Crear cuenta</Link> · <Link to="/iniciar-sesion">Iniciar sesión</Link> · <Link to="/administrar-dentistas">Administrar consultorio</Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Navigate to="/clinics" replace />} />
        <Route path="/clinics" element={<ClinicListPage />} />
        <Route path="/clinics/:id" element={<ClinicDetailPage />} />
        <Route path="/clinics/:clinicId/dentistas/:dentistId" element={<DentistProfilePage />} />
        <Route path="/clinics/:clinicId/solicitar" element={<AppointmentRequestPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/verificar-correo" element={<VerifyPage />} />
        <Route path="/iniciar-sesion" element={<LoginPage />} />
        <Route path="/mi-cuenta" element={<AccountPage />} />
        <Route path="/administrar-dentistas" element={<DentistManagementPage />} />
        <Route path="*" element={<Navigate to="/clinics" replace />} />
      </Routes>
      <footer>DentalConnect · Sprint 4 · Búsqueda, equipo y selección de atención</footer>
    </AuthProvider>
  );
}
