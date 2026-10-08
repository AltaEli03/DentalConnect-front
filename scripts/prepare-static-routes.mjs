import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve('dist');
const routes = [
  'clinics',
  'clinics/clinic-demo-001',
  'registro',
  'verificar-correo',
  'iniciar-sesion',
  'mi-cuenta',
];

for (const route of routes) {
  const directory = resolve(output, route);
  await mkdir(directory, { recursive: true });
  await copyFile(resolve(output, 'index.html'), resolve(directory, 'index.html'));
}
