import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve('dist');
const routes = new Set([
  'clinics',
  'clinics/clinic-demo-001',
  'registro',
  'verificar-correo',
  'iniciar-sesion',
  'recuperar-contrasena',
  'mi-cuenta',
  'registrar-consultorio',
  'plataforma/consultorios',
  'consultorio/iniciar-sesion',
  'consultorio/configuracion',
  'consultorio/citas',
  'mis-citas',
  'notificaciones',
  'mi-solicitud',
  'administrar-dentistas',
  'administrar-solicitudes',
]);

const apiBaseUrl = process.env.VITE_API_BASE_URL?.replace(/\/$/, '');

async function getJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`No se pudieron preparar las rutas públicas: ${response.status} ${url}`);
  }
  return response.json();
}

if (apiBaseUrl) {
  const catalog = await getJson(`${apiBaseUrl}/clinics`);
  const clinics = Array.isArray(catalog.data) ? catalog.data : [];

  for (const clinic of clinics) {
    if (!clinic?.id) continue;
    routes.add(`clinics/${clinic.id}`);
    routes.add(`clinics/${clinic.id}/solicitar`);

    const detail = await getJson(`${apiBaseUrl}/clinics/${encodeURIComponent(clinic.id)}`);
    const dentists = detail.data?.dentists;
    if (!Array.isArray(dentists)) continue;

    for (const dentist of dentists) {
      if (dentist?.id) {
        routes.add(`clinics/${clinic.id}/dentistas/${dentist.id}`);
      }
    }
  }
}

for (const route of routes) {
  const directory = resolve(output, route);
  await mkdir(directory, { recursive: true });
  await copyFile(resolve(output, 'index.html'), resolve(directory, 'index.html'));
}

console.log(`Rutas estáticas preparadas: ${routes.size}`);
