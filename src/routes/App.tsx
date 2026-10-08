import { Navigate, Route, Routes } from 'react-router-dom';
import { ClinicDetailPage } from '../pages/ClinicDetailPage';
import { ClinicListPage } from '../pages/ClinicListPage';

export function App() {
  return (
    <>
      <header>
        <a href="/clinics" className="brand">
          Dental<span>Connect</span>
        </a>
        <p>Directorio de atención odontológica</p>
      </header>
      <Routes>
        <Route path="/" element={<Navigate to="/clinics" replace />} />
        <Route path="/clinics" element={<ClinicListPage />} />
        <Route path="/clinics/:id" element={<ClinicDetailPage />} />
        <Route path="*" element={<Navigate to="/clinics" replace />} />
      </Routes>
      <footer>DentalConnect · Sprint 1 · Información demostrativa</footer>
    </>
  );
}
