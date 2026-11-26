import { describe, expect, it } from 'vitest';
import { headerLinks } from './headerLinks';

describe('headerLinks', () => {
  it('shows the acquisition and login links without a session', () => {
    expect(headerLinks(null).primary.map((link) => link.label)).toEqual([
      'Consultorios',
      'Registrar consultorio',
      'Crear cuenta',
    ]);
    expect(headerLinks(null).account.map((link) => link.label)).toEqual(['Iniciar sesión']);
  });

  it('shows patient links for a patient', () => {
    expect(headerLinks({ role: 'PACIENTE' }).primary.map((link) => link.label)).toEqual([
      'Consultorios',
      'Mis citas',
      'Avisos',
    ]);
    expect(headerLinks({ role: 'PACIENTE' }).clinic).toEqual([]);
  });

  it('groups clinic links and keeps Avisos for clinic staff', () => {
    const links = headerLinks({ role: 'CLINIC_ADMIN' });
    expect(links.clinic.map((link) => link.label)).toEqual([
      'Citas',
      'Solicitudes',
      'Perfil y servicios',
      'Dentistas y horarios',
    ]);
    expect(links.primary.map((link) => link.label)).not.toContain('Mis citas');
    expect(links.primary.map((link) => link.label)).toContain('Avisos');
  });

  it('shows the platform review link for a platform admin', () => {
    const links = headerLinks({ role: 'PLATFORM_ADMIN' });
    expect(links.primary.map((link) => link.label)).toEqual(['Consultorios']);
    expect(links.platform.map((link) => link.label)).toEqual(['Revisar altas']);
  });

  it('shows both groups when the account has both roles', () => {
    const links = headerLinks({ role: 'CLINIC_ADMIN,PLATFORM_ADMIN' });
    expect(links.clinic.map((link) => link.label)).toContain('Solicitudes');
    expect(links.platform.map((link) => link.label)).toEqual(['Revisar altas']);
  });
});
