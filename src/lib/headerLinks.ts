import type { CognitoProfile } from '../services/cognito';
import { hasRole, isClinicAdmin } from './roles';

export type HeaderLink = {
  to: string;
  label: string;
  end?: boolean;
};

export type HeaderGroups = {
  primary: HeaderLink[];
  clinic: HeaderLink[];
  platform: HeaderLink[];
  account: HeaderLink[];
};

const consultorios: HeaderLink = { to: '/clinics', label: 'Consultorios', end: true };
const avisos: HeaderLink = { to: '/notificaciones', label: 'Avisos' };
const account: HeaderLink = { to: '/mi-cuenta', label: 'Mi cuenta' };

const clinicLinks: HeaderLink[] = [
  { to: '/consultorio/citas', label: 'Citas' },
  { to: '/administrar-solicitudes', label: 'Solicitudes' },
  { to: '/consultorio/configuracion', label: 'Perfil y servicios' },
  { to: '/administrar-dentistas', label: 'Dentistas y horarios' },
];

export function headerLinks(user: Pick<CognitoProfile, 'role'> | null): HeaderGroups {
  if (!user) {
    return {
      primary: [
        consultorios,
        { to: '/registrar-consultorio', label: 'Registrar consultorio' },
        { to: '/registro', label: 'Crear cuenta' },
      ],
      clinic: [],
      platform: [],
      account: [{ to: '/iniciar-sesion', label: 'Iniciar sesión' }],
    };
  }

  const clinicAdmin = isClinicAdmin(user.role);
  const platformAdmin = hasRole(user.role, 'PLATFORM_ADMIN');

  if (clinicAdmin) {
    return {
      primary: [consultorios, avisos],
      clinic: clinicLinks,
      platform: platformAdmin ? [{ to: '/plataforma/consultorios', label: 'Revisar altas' }] : [],
      account: [account],
    };
  }

  if (platformAdmin) {
    return {
      primary: [consultorios],
      clinic: [],
      platform: [{ to: '/plataforma/consultorios', label: 'Revisar altas' }],
      account: [account],
    };
  }

  return {
    primary: [consultorios, { to: '/mis-citas', label: 'Mis citas' }, avisos],
    clinic: [],
    platform: [],
    account: [account],
  };
}
