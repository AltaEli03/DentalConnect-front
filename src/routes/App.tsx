import { Navigate, Route, Routes } from 'react-router-dom';
import { ClinicDetailPage } from '../pages/ClinicDetailPage';
import { ClinicListPage } from '../pages/ClinicListPage';
import { AuthProvider } from '../auth/AuthContext';
import { SiteHeader } from '../components/SiteHeader';
import { AccountPage, LoginPage, RegisterPage, VerifyPage } from '../pages/AuthPages';

export function App() {
  return (
    <AuthProvider>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <SiteHeader />
      <main id="contenido">
        <Routes>
          <Route path="/" element={<Navigate to="/clinics" replace />} />
          <Route path="/clinics" element={<ClinicListPage />} />
          <Route path="/clinics/:id" element={<ClinicDetailPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/verificar-correo" element={<VerifyPage />} />
          <Route path="/iniciar-sesion" element={<LoginPage />} />
          <Route path="/mi-cuenta" element={<AccountPage />} />
          <Route path="*" element={<Navigate to="/clinics" replace />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="container">
          <p>DentalConnect · Sprints 1 y 2 · Información demostrativa</p>
        </div>
      </footer>
    </AuthProvider>
  );
}
